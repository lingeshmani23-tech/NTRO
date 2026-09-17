from backend.models.schemas import ComplianceScore, ComplianceCheck
from backend.services.ai.analyst import AIAnalyst


def test_ai_analyst_fallback():
    score = ComplianceScore(score=75, rating="NEEDS_REVISION", ledger=[])
    checks = [
        ComplianceCheck(rule_id="LM-005", field="cc", title="Consumer Care", status="FAIL", severity="HIGH", message="Missing CC", recommendation="Add helpline", reference="Rule 6"),
    ]
    analyst = AIAnalyst()
    assessment = analyst.generate_assessment(score, checks)
    assert assessment.provider == "fallback"
    assert "75/100" in assessment.executive_summary
    assert len(assessment.top_priorities) >= 1
