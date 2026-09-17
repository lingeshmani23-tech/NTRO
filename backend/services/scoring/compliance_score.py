from typing import List
from backend.models.schemas import ComplianceCheck, ComplianceScore, ScoreLedgerItem


def calculate_compliance_score(checks: List[ComplianceCheck]) -> ComplianceScore:
    """
    Pure deterministic calculation of Legal Metrology Compliance Score (0 - 100).
    """
    total_penalty = 0
    ledger: List[ScoreLedgerItem] = []

    for check in checks:
        if check.status == "PASS":
            continue

        deduction = 0
        if check.status == "FAIL":
            if check.severity == "CRITICAL":
                deduction = 25
            elif check.severity == "HIGH":
                deduction = 15
            elif check.severity == "MEDIUM":
                deduction = 10
            else:
                deduction = 5
        elif check.status == "WARNING":
            if check.severity == "CRITICAL":
                deduction = 15
            elif check.severity == "HIGH":
                deduction = 10
            elif check.severity == "MEDIUM":
                deduction = 5
            else:
                deduction = 2

        if deduction > 0:
            total_penalty += deduction
            ledger.append(
                ScoreLedgerItem(
                    rule_id=check.rule_id,
                    severity=check.severity,
                    deduction=deduction,
                    reason=f"{check.status}: {check.message}",
                )
            )

    final_score = max(0, min(100, 100 - total_penalty))

    if final_score >= 90:
        rating = "COMPLIANT"
    elif final_score >= 60:
        rating = "NEEDS_REVISION"
    else:
        rating = "NON_COMPLIANT"

    return ComplianceScore(
        score=final_score,
        rating=rating,
        ledger=ledger,
    )
