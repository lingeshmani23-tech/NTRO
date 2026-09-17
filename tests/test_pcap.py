import os
import pytest
from backend.services.pcap.validator import (
    validate_pcap_file,
    UnsupportedExtensionError,
    TSharkUnavailableError,
)
from backend.services.pcap.parser import parse_tsv_lines
from backend.services.pcap.protocol_detector import detect_packet_protocol
from backend.services.pcap.session_reconstructor import reconstruct_sessions

FIXTURE_PATH = os.path.join(
    os.path.dirname(__file__), "..", "test_pcaps", "fixtures", "tshark_output_sample.tsv"
)


def test_validator_unsupported_extension(tmp_path):
    invalid_file = tmp_path / "test.txt"
    invalid_file.write_text("not a pcap")
    with pytest.raises(UnsupportedExtensionError):
        validate_pcap_file(str(invalid_file))


def test_detect_tshark_structure():
    from backend.services.pcap.validator import detect_tshark

    info = detect_tshark()
    assert "available" in info
    assert "path" in info
    assert "version" in info
    assert "error" in info
    assert isinstance(info["available"], bool)


def test_tshark_missing_behavior(tmp_path, monkeypatch):
    monkeypatch.setenv("TSHARK_PATH", "nonexistent_tshark_binary_xyz")
    # Also patch shutil.which to return None so local system tshark doesn't override test
    import shutil
    monkeypatch.setattr(shutil, "which", lambda x: None)
    pcap_file = tmp_path / "test.pcap"
    pcap_file.write_bytes(b"\xd4\xc3\xb2\xa1\x02\x00\x04\x00")  # dummy pcap header
    with pytest.raises(TSharkUnavailableError):
        validate_pcap_file(str(pcap_file))



def test_fixture_tsv_parser():
    assert os.path.exists(FIXTURE_PATH), f"Fixture not found at {FIXTURE_PATH}"
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        lines = f.readlines()

    packets = parse_tsv_lines(lines)
    assert len(packets) == 8
    assert packets[0]["frame.number"] == "1"
    assert packets[0]["_ws.col.Protocol"] == "SMTP"
    assert packets[4]["tls.handshake.version"] == "0x0303"


def test_protocol_detector():
    # Authoritative
    p_smtp = {"_ws.col.Protocol": "SMTP", "tcp.srcport": "54321", "tcp.dstport": "587"}
    proto, method = detect_packet_protocol(p_smtp)
    assert proto == "SMTP"
    assert method == "authoritative"

    # Port fallback
    p_imap = {"_ws.col.Protocol": "TCP", "tcp.srcport": "54322", "tcp.dstport": "993"}
    proto, method = detect_packet_protocol(p_imap)
    assert proto == "IMAP"
    assert method == "port"


def test_session_reconstruction_from_fixture():
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        lines = f.readlines()

    packets = parse_tsv_lines(lines)
    sessions, stats = reconstruct_sessions(packets)

    assert len(sessions) == 2
    s1 = sessions[0]
    assert s1.session_id == "SMTP-001"
    assert s1.protocol == "SMTP"
    assert s1.tcp_stream == 0
    assert s1.packet_count == 6
    assert s1.starttls is not None
    assert s1.starttls.offered is True
    assert s1.starttls.issued is True
