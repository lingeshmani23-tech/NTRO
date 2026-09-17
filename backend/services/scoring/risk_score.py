from typing import List, Dict
from backend.models.schemas import Finding, RiskScore, ScoreLedgerItem

SEVERITY_WEIGHTS = {
    "CRITICAL": 30,
    "HIGH": 20,
    "MEDIUM": 10,
    "LOW": 5,
    "INFO": 0,
}


def compute_rating(score: int) -> str:
    if score >= 90:
        return "SECURE"
    elif score >= 70:
        return "LOW RISK"
    elif score >= 50:
        return "HIGH RISK"
    else:
        return "CRITICAL RISK"



def calculate_risk_score(findings: List[Finding]) -> RiskScore:
    # Count occurrences per distinct rule_id and track highest severity
    rule_counts: Dict[str, int] = {}
    rule_severities: Dict[str, str] = {}

    for finding in findings:
        rid = finding.rule_id
        rule_counts[rid] = rule_counts.get(rid, 0) + 1
        rule_severities[rid] = finding.severity

    ledger: List[ScoreLedgerItem] = []
    total_penalty = 0

    # Sort ledger by severity weight descending, then rule_id ascending for strict determinism
    sorted_rule_ids = sorted(
        rule_counts.keys(),
        key=lambda r: (-SEVERITY_WEIGHTS.get(rule_severities[r], 0), r),
    )

    for rid in sorted_rule_ids:
        sev = rule_severities[rid]
        penalty = SEVERITY_WEIGHTS.get(sev, 0)
        occurrences = rule_counts[rid]
        ledger.append(
            ScoreLedgerItem(
                rule_id=rid,
                severity=sev,
                penalty=penalty,
                occurrences=occurrences,
            )
        )
        total_penalty += penalty

    score = max(0, 100 - total_penalty)
    rating = compute_rating(score)

    return RiskScore(
        score=score,
        rating=rating,
        ledger=ledger,
        total_penalty=total_penalty,
    )
