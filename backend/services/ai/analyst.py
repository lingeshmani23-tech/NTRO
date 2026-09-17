import os
import json
import httpx
from typing import List, Dict, Any, Optional
from backend.models.schemas import ComplianceScore, ComplianceCheck, AIAssessment, RemediationAction


class AIAnalyst:
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key or os.getenv("LLM_API_KEY", "").strip()
        self.model = model or os.getenv("LLM_MODEL", "gemini-2.5-flash").strip()
        self.base_url = base_url or os.getenv("LLM_BASE_URL", "").strip()

    def generate_assessment(self, score: ComplianceScore, checks: List[ComplianceCheck]) -> AIAssessment:
        input_payload = {
            "score": score.score,
            "rating": score.rating,
            "ledger": [item.model_dump() for item in score.ledger],
            "checks": [
                {
                    "rule_id": c.rule_id,
                    "field": c.field,
                    "status": c.status,
                    "severity": c.severity,
                    "title": c.title,
                    "message": c.message,
                    "recommendation": c.recommendation,
                }
                for c in checks
            ],
        }

        if self.api_key:
            try:
                assessment = self._call_llm(input_payload, score, checks)
                if self._validate_assessment(assessment, checks):
                    return assessment
            except Exception:
                pass

        return self._generate_fallback(score, checks)

    def _generate_fallback(self, score: ComplianceScore, checks: List[ComplianceCheck]) -> AIAssessment:
        failed_checks = [c for c in checks if c.status != "PASS"]
        critical_count = sum(1 for c in failed_checks if c.severity == "CRITICAL")
        high_count = sum(1 for c in failed_checks if c.severity == "HIGH")

        exec_summary = (
            f"Legal Metrology compliance inspection evaluated all 6 mandatory label declarations. "
            f"The package compliance rating is {score.rating} with a score of {score.score}/100. "
            f"Identified {len(failed_checks)} non-compliance notice(s) ({critical_count} Critical, {high_count} High)."
        )

        why_matters = (
            f"Non-compliance with Legal Metrology (Packaged Commodities) Rules, 2011 exposes manufacturers, "
            f"packers, and importers to statutory seizure, product recalls, and compounding fines under Section 36 "
            f"of the Legal Metrology Act, 2009."
        )

        top_priorities: List[str] = []
        remediation_actions: List[RemediationAction] = []
        priority_counter = 1

        for check in failed_checks:
            top_priorities.append(f"Remediate {check.status} issue on '{check.title}' ({check.rule_id}): {check.recommendation}")
            remediation_actions.append(
                RemediationAction(
                    priority=priority_counter,
                    action=check.recommendation,
                    rule_ids=[check.rule_id],
                )
            )
            priority_counter += 1

        if not top_priorities:
            top_priorities.append("Package label fully complies with Legal Metrology (Packaged Commodities) Rules, 2011.")

        return AIAssessment(
            provider="fallback",
            executive_summary=exec_summary,
            why_it_matters=why_matters,
            top_priorities=top_priorities,
            remediation=remediation_actions,
        )

    def _call_llm(self, payload: Dict[str, Any], score: ComplianceScore, checks: List[ComplianceCheck]) -> AIAssessment:
        prompt = (
            "You are a Legal Metrology Compliance Officer. Generate a structured JSON audit report based ONLY on the supplied checks.\n"
            "STRICT CONSTRAINTS:\n"
            "1. Use ONLY the supplied checks. Do NOT invent new rule IDs or sections.\n"
            "2. Output MUST be valid JSON matching this schema:\n"
            "{\n"
            '  "executive_summary": "...",\n'
            '  "why_it_matters": "...",\n'
            '  "top_priorities": ["..."],\n'
            '  "remediation": [ {"priority": 1, "action": "...", "rule_ids": ["LM-001"]} ]\n'
            "}\n"
            f"Input:\n{json.dumps(payload, indent=2)}"
        )

        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        endpoint = self.base_url or "https://api.openai.com/v1/chat/completions"
        body = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "Return JSON only."},
                {"role": "user", "content": prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
        }

        with httpx.Client(timeout=15.0) as client:
            resp = client.post(endpoint, json=body, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            parsed = json.loads(content)

            remediations = [
                RemediationAction(
                    priority=r["priority"],
                    action=r["action"],
                    rule_ids=r["rule_ids"],
                )
                for r in parsed.get("remediation", [])
            ]

            return AIAssessment(
                provider="llm",
                executive_summary=parsed.get("executive_summary", ""),
                why_it_matters=parsed.get("why_it_matters", ""),
                top_priorities=parsed.get("top_priorities", []),
                remediation=remediations,
            )

    def _validate_assessment(self, assessment: AIAssessment, checks: List[ComplianceCheck]) -> bool:
        valid_rule_ids = {c.rule_id for c in checks}
        for rem in assessment.remediation:
            for rid in rem.rule_ids:
                if rid not in valid_rule_ids:
                    return False
        return True
