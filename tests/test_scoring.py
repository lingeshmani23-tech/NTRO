import random
from backend.models.schemas import Finding, FindingEvidence
from backend.services.scoring.risk_score import calculate_risk_score


def make_dummy_finding(rule_id: str, severity: str, session_id: str = "S-01") -> Finding:
    return Finding(
        rule_id=rule_id,
        title=f"Title for {rule_id}",
        severity=severity,
        protocol="SMTP",
        session_id=session_id,
        description="desc",
        evidence=FindingEvidence(
            session_id=session_id,
            packet_number=10,
            field="test.field",
            observed_value="val",
        ),
        impact="imp",
        recommendation="rec",
        reference="ref",
    )


def test_scoring_duplicate_rules():
    # Duplicate TLS-005 across 3 sessions (CRITICAL = 30 points)
    f1 = make_dummy_finding("TLS-005", "CRITICAL", "S-01")
    f2 = make_dummy_finding("TLS-005", "CRITICAL", "S-02")
    f3 = make_dummy_finding("TLS-005", "CRITICAL", "S-03")

    res = calculate_risk_score([f1, f2, f3])
    assert res.score == 70
    assert res.total_penalty == 30
    assert len(res.ledger) == 1
    assert res.ledger[0].occurrences == 3
    assert res.ledger[0].penalty == 30


def test_scoring_floor_clamp():
    # Multiple critical/high findings exceeding 100 points penalty
    findings = [
        make_dummy_finding("TLS-005", "CRITICAL"),  # 30
        make_dummy_finding("TLS-007", "CRITICAL"),  # 30
        make_dummy_finding("AUTH-001", "CRITICAL"),  # 30
        make_dummy_finding("TLS-001", "HIGH"),  # 20
        make_dummy_finding("TLS-002", "HIGH"),  # 20
    ]
    # Total penalty = 30+30+30+20+20 = 130
    res = calculate_risk_score(findings)
    assert res.total_penalty == 130
    assert res.score == 0
    assert res.rating == "CRITICAL RISK"


def test_scoring_determinism():
    findings = [
        make_dummy_finding("TLS-005", "CRITICAL", "S-01"),
        make_dummy_finding("TLS-001", "HIGH", "S-02"),
        make_dummy_finding("CERT-004", "MEDIUM", "S-03"),
        make_dummy_finding("SEC-001", "INFO", "S-04"),
        make_dummy_finding("SEC-002", "INFO", "S-04"),
    ]

    base_res = calculate_risk_score(findings)

    # Shuffle findings list 100 times and assert identical score, rating, and ledger
    for _ in range(100):
        shuffled = list(findings)
        random.shuffle(shuffled)
        res = calculate_risk_score(shuffled)
        assert res.score == base_res.score
        assert res.rating == base_res.rating
        assert len(res.ledger) == len(base_res.ledger)
        for i in range(len(res.ledger)):
            assert res.ledger[i].rule_id == base_res.ledger[i].rule_id
            assert res.ledger[i].penalty == base_res.ledger[i].penalty
            assert res.ledger[i].occurrences == base_res.ledger[i].occurrences
