from backend.services.crypto.tls_analyzer import map_tls_version, map_cipher_suite
from backend.services.crypto.certificate_analyzer import (
    calculate_key_size_from_modulus,
    analyze_certificate,
)
from backend.services.crypto.starttls_analyzer import analyze_starttls


def test_tls_version_mapping():
    assert map_tls_version("0x0301") == "TLS 1.0"
    assert map_tls_version("0x0302") == "TLS 1.1"
    assert map_tls_version("0x0303") == "TLS 1.2"
    assert map_tls_version("0x0304") == "TLS 1.3"
    assert map_tls_version(None) is None


def test_cipher_suite_mapping():
    assert map_cipher_suite("0xc030") == "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"
    assert map_cipher_suite("0x1302") == "TLS_AES_256_GCM_SHA384"
    assert map_cipher_suite("0xffff") is None  # unmapped returns None


def test_key_size_calculation():
    # 256 hex characters = 1024 bits
    mod_1024 = "a" * 256
    assert calculate_key_size_from_modulus(mod_1024) == 1024

    # 512 hex characters = 2048 bits
    mod_2048 = "f" * 512
    assert calculate_key_size_from_modulus(mod_2048) == 2048


def test_cert_expiry_relative_to_capture():
    cert = analyze_certificate(
        subject_cn="mail.example.com",
        not_after="2026-02-01T00:00:00Z",
        capture_end_time="2026-02-11T09:00:00Z",
    )
    assert cert.expired is True

    cert_valid = analyze_certificate(
        subject_cn="mail.example.com",
        not_after="2027-02-01T00:00:00Z",
        capture_end_time="2026-02-11T09:00:00Z",
    )
    assert cert_valid.expired is False


def test_cert_hostname_validation():
    cert_match = analyze_certificate(
        subject_cn="mail.example.com",
        destination_host="mail.example.com",
    )
    assert cert_match.hostname_valid is True

    cert_mismatch = analyze_certificate(
        subject_cn="mail.example.com",
        destination_host="attacker.com",
    )
    assert cert_mismatch.hostname_valid is False

    # Unknown when SNI/CN absent
    cert_unknown = analyze_certificate(
        subject_cn=None,
        destination_host="mail.example.com",
    )
    assert cert_unknown.hostname_valid is None


def test_starttls_downgrade_detection():
    packets_downgrade = [
        {"smtp.rsp.parameter": "250-STARTTLS", "smtp.req.command": "EHLO"},
        {"smtp.req.command": "STARTTLS", "smtp.rsp.code": "554 Transaction Failed"},
    ]
    st = analyze_starttls(packets_downgrade)
    assert st is not None
    assert st.downgrade_suspected is True
