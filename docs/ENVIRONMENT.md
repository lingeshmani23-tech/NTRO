# Environment Preflight Report

**Timestamp:** 2026-09-15
**OS:** Windows 10 / NT 10.0.26200.0

## Component Versions
- **Python:** Python 3.13.1 (`C:\Users\linge\AppData\Local\Programs\Python\Python313\python.exe` / `py`) -> `>= 3.11` satisfied.
- **Node.js:** v24.18.0 -> `>= 20` satisfied.
- **NPM:** 11.16.0
- **TShark:** TSHARK_MISSING (not found in system PATH or standard locations).
- **Capinfos:** CAPINFOS_MISSING

## TShark Verdict
**Verdict:** `tshark_available: false`
- The live PCAP path will be fully implemented and unit-tested against recorded TShark output fixtures in `test_pcaps/fixtures/`.
- `/api/health` will return `tshark_available: false`.
- The UI upload button will be disabled when TShark is absent, showing an inline installation hint, while keeping Demo Mode fully functional.
