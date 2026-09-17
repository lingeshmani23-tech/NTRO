from backend.models.schemas import Finding, FindingEvidence
from backend.services.scoring.risk_score import calculate_risk_score


def test_score_calculation_clean():
    score = calculate_risk_score([])
    assert score.score == 100
    assert score.rating == "SECURE"


def test_score_calculation_penalties():
    findings = [
        Finding(
            finding_id="TLS-005-SMTP-002",
            rule_id="TLS-005",
            title="Plaintext Email",
            severity="CRITICAL",
            protocol="SMTP",
            session_id="SMTP-002",
            evidence=FindingEvidence(session_id="SMTP-002", field="session.encryption", observed_value="False"),
            impact="Exposes traffic",
            recommendation="Enforce TLS",
            reference="RFC 8314",
        ),
        Finding(
            finding_id="TLS-001-SMTP-003",
            rule_id="TLS-001",
            title="Legacy TLS 1.0",
            severity="HIGH",
            protocol="SMTP",
            session_id="SMTP-003",
            evidence=FindingEvidence(session_id="SMTP-003", field="tls.handshake.version", observed_value="TLS 1.0"),
            impact="Legacy TLS",
            recommendation="Disable TLS 1.0",
            reference="RFC 8996",
        ),
    ]
    score = calculate_risk_score(findings)
    # 100 - 30 (CRITICAL) - 20 (HIGH) = 50
    assert score.score == 50
    assert score.rating == "HIGH RISK"
    assert len(score.ledger) == 2
