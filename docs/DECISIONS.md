# SECUREMAILSCOPE — Architectural & Implementation Decisions

This document records technical and design decisions made during development in accordance with the project specification's **Blocked Policy**.

---

## 1. TShark Absence & Demo Mode Priority
- **Decision:** TShark is absent on the host environment (`tshark_available: false`).
- **Action:** 
  1. Full live PCAP parsing pipeline is implemented with list-form `subprocess.run` calls (`shell=False`).
  2. For unit and integration testing without a local TShark binary, recorded TShark `-T fields` fixtures are provided in `test_pcaps/fixtures/`.
  3. Backend `/api/health` returns `tshark_available: false`.
  4. Frontend UI upload button is disabled with an inline installation guidance banner when `tshark_available: false`.
  5. Demo Mode (`POST /api/demo`) remains 100% operational without TShark or an AI API key.

## 2. AI Layer Guardrails & Fallback
- **Decision:** Default to deterministic AI summary template fallback when `LLM_API_KEY` is empty.
- **Action:** If an LLM API key is supplied, outputs are validated strictly. If the LLM hallucinates new rule IDs, alters the risk score, or misses critical priorities, it is rejected and falls back to deterministic analysis, logging a warning in `errors`/`warnings`.

## 3. Strict Evidence & Null Handling
- **Decision:** Any security-relevant metric that is not observed in the packet capture is set to `null` (not guessed or defaulted to secure/insecure).
- **Action:** Predicates return `False` when evaluating `null` values, ensuring no false findings are created without observed evidence.

## 4. Portability & OS Compatibility
- **Decision:** Support both PowerShell (`.ps1`) and Bash (`.sh`) for test scripts (`smoke_api` and `e2e`).
- **Action:** Python-native test execution scripts (`scripts/smoke_api.py` and `scripts/e2e.py`) are provided alongside shell scripts to ensure seamless cross-platform execution on Windows and Linux.
