import json
import os
from typing import List, Dict, Any, Optional
from backend.models.schemas import NormalizedSession, Finding, FindingEvidence
from backend.services.rules.rules import PREDICATE_MAP

RULES_JSON_CANDIDATES = [
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "rules", "security_rules.json"),
    os.path.join(os.path.dirname(__file__), "..", "..", "rules", "security_rules.json"),
    os.path.join(os.path.dirname(__file__), "..", "rules", "security_rules.json"),
]


def load_rules_def() -> List[Dict[str, Any]]:
    for path in RULES_JSON_CANDIDATES:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    raise FileNotFoundError(f"Rules definition missing in candidate paths: {RULES_JSON_CANDIDATES}")



class RuleEngine:
    def __init__(self, rules_def: Optional[List[Dict[str, Any]]] = None):
        self.rules_def = rules_def or load_rules_def()

    def evaluate_session(self, session: NormalizedSession) -> List[Finding]:
        findings: List[Finding] = []
        fired_rule_ids = set()

        # Pre-check if TLS-005 (unencrypted email session) will fire
        tls_005_predicate = PREDICATE_MAP.get("unencrypted_email_session")
        is_plaintext_email = (
            tls_005_predicate is not None and tls_005_predicate(session) is not None
        )

        for rule in self.rules_def:
            rule_id = rule["id"]
            cond_key = rule["condition_key"]
            predicate = PREDICATE_MAP.get(cond_key)
            if not predicate:
                continue

            # Apply Rule Precedence Suppression
            if is_plaintext_email and rule_id in ("TLS-001", "TLS-002", "TLS-003", "TLS-004", "TLS-006"):
                continue

            if rule_id == "TLS-003" and ("TLS-001" in fired_rule_ids or "TLS-002" in fired_rule_ids):
                continue

            # Evaluate predicate
            res = predicate(session)
            if res is not None:
                field, pkt_num, obs_val = res
                fired_rule_ids.add(rule_id)

                finding = Finding(
                    finding_id=f"{rule_id}-{session.session_id}",
                    rule_id=rule_id,
                    title=rule["title"],
                    severity=rule["severity"],
                    protocol=session.protocol,
                    session_id=session.session_id,
                    evidence=FindingEvidence(
                        session_id=session.session_id,
                        packet_number=pkt_num,
                        field=field,
                        observed_value=str(obs_val),
                    ),
                    impact=rule["impact"],
                    recommendation=rule["recommendation"],
                    reference=rule["reference"],
                )
                findings.append(finding)


        return findings

    def evaluate_all(self, sessions: List[NormalizedSession]) -> List[Finding]:
        all_findings: List[Finding] = []
        for session in sessions:
            all_findings.extend(self.evaluate_session(session))
        return all_findings
