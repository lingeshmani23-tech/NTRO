from backend.models.schemas import ComplianceCheck
from backend.services.scoring.compliance_score import calculate_compliance_score


def test_score_calculation_100():
    checks = [
        ComplianceCheck(rule_id="LM-001", field="mrp", title="MRP", status="PASS", severity="CRITICAL", message="OK", recommendation="OK", reference="Ref"),
        ComplianceCheck(rule_id="LM-002", field="net_qty", title="Qty", status="PASS", severity="CRITICAL", message="OK", recommendation="OK", reference="Ref"),
    ]
    score = calculate_compliance_score(checks)
    assert score.score == 100
    assert score.rating == "COMPLIANT"


def test_score_calculation_deductions():
    checks = [
        ComplianceCheck(rule_id="LM-001", field="mrp", title="MRP", status="FAIL", severity="CRITICAL", message="Missing", recommendation="Fix", reference="Ref"),
        ComplianceCheck(rule_id="LM-005", field="cc", title="CC", status="FAIL", severity="HIGH", message="Missing", recommendation="Fix", reference="Ref"),
    ]
    score = calculate_compliance_score(checks)
    # 100 - 25 (CRITICAL FAIL) - 15 (HIGH FAIL) = 60
    assert score.score == 60
    assert score.rating == "NEEDS_REVISION"
    assert len(score.ledger) == 2
