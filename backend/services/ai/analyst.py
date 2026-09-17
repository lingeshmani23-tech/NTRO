import os
import json
import httpx
from typing import List, Dict, Any, Optional
from backend.models.schemas import RiskScore, Finding, AIAssessment, RemediationAction


class AIAnalyst:
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key or os.getenv("LLM_API_KEY", "").strip()
        self.model = model or os.getenv("LLM_MODEL", "gemini-2.5-flash").strip()
        self.base_url = base_url or os.getenv("LLM_BASE_URL", "").strip()

    def generate_assessment(self, score: RiskScore, findings: List[Finding]) -> AIAssessment:
        input_payload = {
            "score": score.score,
            "rating": score.rating,
            "ledger": [item.model_dump() for item in score.ledger],
            "findings": [
                {
                    "rule_id": f.rule_id,
                    "severity": f.severity,
                    "title": f.title,
                    "evidence": f.evidence.model_dump(),
                    "recommendation": f.recommendation,
                }
                for f in findings
            ],
        }

        if self.api_key:
            try:
                assessment = self._call_llm(input_payload, score, findings)
                if self._validate_assessment(assessment, input_payload, score, findings):
                    return assessment
            except Exception as e:
                # Log rejection / failure and fall back
                pass

        return self._generate_fallback(score, findings)

    def _generate_fallback(self, score: RiskScore, findings: List[Finding]) -> AIAssessment:
        critical_count = sum(1 for f in findings if f.severity == "CRITICAL")
        high_count = sum(1 for f in findings if f.severity == "HIGH")
        medium_count = sum(1 for f in findings if f.severity == "MEDIUM")

        exec_summary = (
            f"Passive security assessment evaluated email transport security across all active streams. "
            f"The overall posture is rated {score.rating} with a score of {score.score}/100 based on {len(findings)} findings "
            f"({critical_count} Critical, {high_count} High, {medium_count} Medium)."
        )

        why_matters = (
            f"Unencrypted email streams expose cleartext authentication credentials and email content to passive "
            f"network eavesdroppers. Legacy TLS configurations and weak public keys compromise transport privacy "
            f"and permit adversary decryption."
        )

        # Top priorities from distinct penalized rules
        top_priorities: List[str] = []
        remediation_actions: List[RemediationAction] = []
        priority_counter = 1

        # Group findings by rule_id preserving severity precedence
        grouped_rules: Dict[str, List[Finding]] = {}
        for f in findings:
            if f.severity in ("CRITICAL", "HIGH", "MEDIUM"):
                grouped_rules.setdefault(f.rule_id, []).append(f)

        for rid, rule_findings in grouped_rules.items():
            f_sample = rule_findings[0]
            top_priorities.append(
                f"Remediate {f_sample.severity} risk '{f_sample.title}' ({rid}): {f_sample.recommendation}"
            )
            remediation_actions.append(
                RemediationAction(
                    priority=priority_counter,
                    action=f_sample.recommendation,
                    rule_ids=[rid],
                )
            )
            priority_counter += 1

        if not top_priorities:
            top_priorities.append("Maintain minimum TLS 1.2 requirement across all email endpoints.")

        return AIAssessment(
            provider="fallback",
            executive_summary=exec_summary,
            why_it_matters=why_matters,
            top_priorities=top_priorities,
            remediation=remediation_actions,
        )

    def _call_llm(self, payload: Dict[str, Any], score: RiskScore, findings: List[Finding]) -> AIAssessment:
        prompt = (
            "You are an expert security analyst. Generate a structured JSON security assessment based ONLY on the supplied findings.\n"
            "STRICT CONSTRAINTS:\n"
            "1. Use ONLY the supplied findings. Do NOT introduce new issues, packet numbers, CVEs, or standards.\n"
            "2. Do NOT state a score other than the supplied score.\n"
            "3. Output MUST be valid JSON matching this schema:\n"
            "{\n"
            '  "executive_summary": "...",\n'
            '  "why_it_matters": "...",\n'
            '  "top_priorities": ["..."],\n'
            '  "remediation": [ {"priority": 1, "action": "...", "rule_ids": ["TLS-005"]} ]\n'
            "}\n"
            f"Input:\n{json.dumps(payload, indent=2)}"
        )

        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

        # OpenAI / Gemini OpenAI compatible endpoint call
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

        with httpx.Client(timeout=20.0) as client:
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

    def _validate_assessment(
        self, assessment: AIAssessment, payload: Dict[str, Any], score: RiskScore, findings: List[Finding]
    ) -> bool:
        valid_rule_ids = {f.rule_id for f in findings}

        # Guardrail 1: Check rule_ids in remediation
        for rem in assessment.remediation:
            for rid in rem.rule_ids:
                if rid not in valid_rule_ids:
                    return False

        # Guardrail 2: Ensure executive summary doesn't contain hallucinated scores like "XX/100" other than true score
        import re

        scores_found = re.findall(r"\b(\d{1,3})/100\b", assessment.executive_summary)
        for sf in scores_found:
            if int(sf) != score.score:
                return False

        # Guardrail 3: Minimum 1 top priority per CRITICAL finding
        critical_count = sum(1 for f in findings if f.severity == "CRITICAL")
        if critical_count > 0 and len(assessment.top_priorities) < critical_count:
            return False

        return True
