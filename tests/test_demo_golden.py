from backend.services.demo.dataset import generate_demo_analysis_result


def test_demo_golden_score():
    result = generate_demo_analysis_result()

    # Data source assertion
    assert result.data_source == "synthetic"

    # Distinct penalized rules assertion
    distinct_penalized = {
        item.rule_id: item.penalty for item in result.score.ledger if item.penalty > 0
    }
    assert distinct_penalized == {"TLS-005": 30, "TLS-001": 20, "CERT-004": 10}

    # Score & Rating assertions
    assert result.score.total_penalty == 60
    assert result.score.score == 40
    assert result.score.rating == "HIGH RISK"

    # Findings count assertion (5 penalized occurrences + 6 INFO)
    assert len(result.findings) == 11

    # Verify findings breakdown
    crit_count = sum(1 for f in result.findings if f.severity == "CRITICAL")
    high_count = sum(1 for f in result.findings if f.severity == "HIGH")
    med_count = sum(1 for f in result.findings if f.severity == "MEDIUM")
    info_count = sum(1 for f in result.findings if f.severity == "INFO")

    assert crit_count == 3  # TLS-005 in SMTP-002, IMAP-002, POP3-002
    assert high_count == 1  # TLS-001 in SMTP-003
    assert med_count == 1  # CERT-004 in IMAP-001
    assert info_count == 6  # SEC-001 and SEC-002 in SMTP-001, IMAP-001, POP3-001
