import os
from backend.services.pcap.validator import detect_tshark, validate_pcap_file
from backend.services.demo.dataset import build_demo_sessions, generate_demo_analysis_result


def test_tshark_detection():
    info = detect_tshark()
    assert "available" in info


def test_demo_sessions_generation():
    sessions = build_demo_sessions()
    assert len(sessions) == 7
    protocols = {s.protocol for s in sessions}
    assert "SMTP" in protocols
    assert "IMAP" in protocols
    assert "POP3" in protocols


def test_demo_analysis_result():
    res = generate_demo_analysis_result()
    assert res.score.score <= 100
    assert len(res.findings) > 0
    assert res.ai.executive_summary is not None
