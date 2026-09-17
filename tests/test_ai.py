from backend.models.schemas import RiskScore, Finding, FindingEvidence, ScoreLedgerItem
from backend.services.ai.analyst import AIAnalyst


def make_dummy_finding(rule_id: str, severity: str) -> Finding:
    return Finding(
        rule_id=rule_id,
        title=f"Title for {rule_id}",
        severity=severity,
        protocol="SMTP",
        session_id="S-001",
        description="desc",
        evidence=FindingEvidence(
            session_id="S-001",
            packet_number=10,
            field="test.field",
            observed_value="val",
        ),
        impact="imp",
        recommendation="rec",
        reference="ref",
    )


def test_ai_fallback_provider():
    score = RiskScore(
        score=40,
        rating="HIGH RISK",
        ledger=[
            ScoreLedgerItem(rule_id="TLS-005", severity="CRITICAL", penalty=30, occurrences=3),
            ScoreLedgerItem(rule_id="TLS-001", severity="HIGH", penalty=20, occurrences=1),
            ScoreLedgerItem(rule_id="CERT-004", severity="MEDIUM", penalty=10, occurrences=1),
        ],
        total_penalty=60,
    )
    findings = [
        make_dummy_finding("TLS-005", "CRITICAL"),
        make_dummy_finding("TLS-001", "HIGH"),
        make_dummy_finding("CERT-004", "MEDIUM"),
    ]

    analyst = AIAnalyst(api_key="")  # empty key forces fallback
    assessment = analyst.generate_assessment(score, findings)

    assert assessment.provider == "fallback"
    assert len(assessment.executive_summary) > 0
    assert "HIGH RISK" in assessment.executive_summary
    assert len(assessment.top_priorities) >= 1
    assert len(assessment.remediation) >= 1


def test_ai_guardrail_rejection(monkeypatch):
    score = RiskScore(
        score=40,
        rating="HIGH RISK",
        ledger=[ScoreLedgerItem(rule_id="TLS-005", severity="CRITICAL", penalty=30, occurrences=1)],
        total_penalty=30,
    )
    findings = [make_dummy_finding("TLS-005", "CRITICAL")]

    analyst = AIAnalyst(api_key="fake_key")

    # Mock _call_llm to return a hallucinated rule_id "TLS-999"
    def mock_call_llm(payload, score, findings):
        from backend.models.schemas import AIAssessment, RemediationAction

        return AIAssessment(
            provider="llm",
            executive_summary="Executive summary with 40/100 score.",
            why_it_matters="Matters.",
            top_priorities=["Priority 1"],
            remediation=[
                RemediationAction(priority=1, action="Action", rule_ids=["TLS-999"])  # Invalid!
            ],
        )

    monkeypatch.setattr(analyst, "_call_llm", mock_call_llm)

    assessment = analyst.generate_assessment(score, findings)

    # Rejection guardrail should reject "TLS-999" and fall back to fallback provider
    assert assessment.provider == "fallback"
