import pytest
from backend.models.schemas import (
    NormalizedSession,
    StartTLSSummary,
    CertificateInfo,
    AuthenticationSummary,
    EvidenceItem,
)
from backend.services.rules.rule_engine import RuleEngine


def make_null_session() -> NormalizedSession:
    return NormalizedSession(
        session_id="NULL-001",
        protocol="SMTP",
        transport="TCP",
        source="10.0.0.1",
        destination="10.0.0.2",
        destination_host=None,
        port=25,
        tcp_stream=0,
        packet_count=10,
        first_packet=1,
        last_packet=10,
        start_time=None,
        end_time=None,
        encryption=None,
        starttls=None,
        tls_version=None,
        cipher_suite=None,
        cipher_hex=None,
        certificate=None,
        authentication=None,
        evidence=[],
    )


def test_rules_no_evidence():
    engine = RuleEngine()
    null_session = make_null_session()
    findings = engine.evaluate_session(null_session)
    assert len(findings) == 0, f"Expected 0 findings for all-null session, got {findings}"


def test_precedence_plaintext_suppresses_tls_checks():
    engine = RuleEngine()
    session = make_null_session()
    session.protocol = "SMTP"
    session.encryption = False
    session.tls_version = "TLS 1.0"  # Would trigger TLS-001 if encryption was set
    session.starttls = StartTLSSummary(offered=True, issued=False)  # Would trigger TLS-006

    findings = engine.evaluate_session(session)
    rule_ids = {f.rule_id for f in findings}

    assert "TLS-005" in rule_ids, "Plaintext email session must fire TLS-005"
    assert "TLS-001" not in rule_ids, "TLS-001 must be suppressed when TLS-005 fires"
    assert "TLS-006" not in rule_ids, "TLS-006 must be suppressed when TLS-005 fires"


def test_precedence_tls10_suppresses_tls003():
    engine = RuleEngine()
    session = make_null_session()
    session.encryption = True
    session.tls_version = "TLS 1.0"
    session.cipher_suite = "TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA"  # CBC cipher

    findings = engine.evaluate_session(session)
    rule_ids = {f.rule_id for f in findings}

    assert "TLS-001" in rule_ids
    assert "TLS-003" not in rule_ids, "TLS-003 must be suppressed when TLS-001 fires on same session"


def test_rules_each_fires_expected():
    engine = RuleEngine()

    # TLS-001
    s1 = make_null_session()
    s1.encryption = True
    s1.tls_version = "TLS 1.0"
    r1 = {f.rule_id for f in engine.evaluate_session(s1)}
    assert "TLS-001" in r1

    # TLS-002
    s2 = make_null_session()
    s2.encryption = True
    s2.tls_version = "TLS 1.1"
    r2 = {f.rule_id for f in engine.evaluate_session(s2)}
    assert "TLS-002" in r2

    # TLS-004
    s4 = make_null_session()
    s4.encryption = True
    s4.tls_version = "TLS 1.2"
    s4.cipher_suite = "TLS_RSA_WITH_RC4_128_SHA"
    r4 = {f.rule_id for f in engine.evaluate_session(s4)}
    assert "TLS-004" in r4

    # TLS-005
    s5 = make_null_session()
    s5.encryption = False
    r5 = {f.rule_id for f in engine.evaluate_session(s5)}
    assert "TLS-005" in r5

    # TLS-006
    s6 = make_null_session()
    s6.encryption = None
    s6.starttls = StartTLSSummary(offered=True, issued=False)
    r6 = {f.rule_id for f in engine.evaluate_session(s6)}
    assert "TLS-006" in r6

    # TLS-007
    s7 = make_null_session()
    s7.starttls = StartTLSSummary(downgrade_suspected=True)
    r7 = {f.rule_id for f in engine.evaluate_session(s7)}
    assert "TLS-007" in r7

    # CERT-001
    sc1 = make_null_session()
    sc1.certificate = CertificateInfo(present=True, expired=True)
    rc1 = {f.rule_id for f in engine.evaluate_session(sc1)}
    assert "CERT-001" in rc1

    # CERT-003
    sc3 = make_null_session()
    sc3.certificate = CertificateInfo(present=True, hostname_valid=False)
    rc3 = {f.rule_id for f in engine.evaluate_session(sc3)}
    assert "CERT-003" in rc3

    # CERT-004
    sc4 = make_null_session()
    sc4.certificate = CertificateInfo(present=True, key_size=1024)
    rc4 = {f.rule_id for f in engine.evaluate_session(sc4)}
    assert "CERT-004" in rc4

    # CERT-005
    sc5 = make_null_session()
    sc5.certificate = CertificateInfo(present=True, signature_algorithm="SHA1-RSA")
    rc5 = {f.rule_id for f in engine.evaluate_session(sc5)}
    assert "CERT-005" in rc5

    # AUTH-001
    sa1 = make_null_session()
    sa1.authentication = AuthenticationSummary(plaintext_exposed=True)
    ra1 = {f.rule_id for f in engine.evaluate_session(sa1)}
    assert "AUTH-001" in ra1

    # SEC-001 & SEC-002
    sec = make_null_session()
    sec.encryption = True
    sec.tls_version = "TLS 1.2"
    sec.cipher_suite = "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"
    rsec = {f.rule_id for f in engine.evaluate_session(sec)}
    assert "SEC-001" in rsec
    assert "SEC-002" in rsec
