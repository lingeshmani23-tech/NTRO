from backend.models.schemas import NormalizedSession, StartTLSSummary, CertificateInfo, AuthenticationSummary
from backend.services.rules.rule_engine import RuleEngine


def test_rule_engine_tls10_detection():
    session = NormalizedSession(
        session_id="SMTP-003",
        stream_id=3,
        protocol="SMTP",
        source_ip="10.0.0.17",
        destination_ip="203.0.113.25",
        source_port=54323,
        destination_port=465,
        encryption=True,
        tls_version="TLS 1.0",
        cipher_suite="TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA",
    )
    engine = RuleEngine()
    findings = engine.evaluate_session(session)
    rule_ids = {f.rule_id for f in findings}
    assert "TLS-001" in rule_ids


def test_rule_engine_unencrypted_email_session():
    session = NormalizedSession(
        session_id="SMTP-002",
        stream_id=2,
        protocol="SMTP",
        source_ip="10.0.0.16",
        destination_ip="203.0.113.25",
        source_port=54322,
        destination_port=25,
        encryption=False,
    )
    engine = RuleEngine()
    findings = engine.evaluate_session(session)
    rule_ids = {f.rule_id for f in findings}
    assert "TLS-005" in rule_ids
