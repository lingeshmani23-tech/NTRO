from backend.models.schemas import RiskScore, Finding, FindingEvidence
from backend.services.ai.analyst import AIAnalyst


def test_ai_analyst_fallback():
    score = RiskScore(score=50, rating="HIGH RISK", critical=1, high=1, medium=0, low=0, ledger=[])
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
        )
    ]
    analyst = AIAnalyst()
    assessment = analyst.generate_assessment(score, findings)
    assert assessment.provider == "fallback"
    assert "50/100" in assessment.executive_summary
    assert len(assessment.top_priorities) >= 1
