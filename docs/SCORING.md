# SECUREMAILSCOPE — Risk Scoring Rationale & Architecture

## Overview
SECUREMAILSCOPE computes a pure, deterministic security risk score (0 to 100) based on observed network packet evidence.

## Scoring Formula
```
Score = max(0, 100 - Total Penalty)
```

Where `Total Penalty` is the sum of severity penalty weights for **distinct rule IDs** triggered across all analyzed sessions.

### Severity Penalty Weights
| Severity | Weight (Points Deducted) | Description |
|---|---|---|
| **CRITICAL** | 30 | High-exploitability vulnerabilities (e.g., Plaintext Email, Exposed Credentials, STARTTLS Stripping) |
| **HIGH** | 20 | Severe cryptographic degradation (e.g., TLS 1.0/1.1, Expired Certs, Hostname Mismatch) |
| **MEDIUM** | 10 | Cryptographic weakness (e.g., Weak RSA Key < 2048-bit, SHA-1 Cert Signature) |
| **LOW** | 5 | Minor posture deficiencies |
| **INFO** | 0 | Informational security baseline observations (e.g., Modern TLS 1.3, AEAD Ciphers) |

### Key Properties
1. **Distinct Deductions:** If rule `TLS-005` (Unencrypted Email) fires across 3 distinct email sessions, the penalty for `TLS-005` (30 points) is applied **once**. The occurrence count (3) is tracked in the ledger, but does not multiply the penalty.
2. **Floor Clamp:** The minimum possible score is strictly 0.
3. **Pure Function:** Given identical finding sets (regardless of array element ordering), the scoring algorithm produces the exact same score, rating, and ledger.

## Rating Bands
| Score Range | Risk Rating | Status / Color |
|---|---|---|
| **90 – 100** | `SECURE` | Green (`#16A34A`) |
| **75 – 89** | `LOW RISK` | Slate/Blue (`#64748B`) |
| **50 – 74** | `MEDIUM RISK` | Amber (`#F59E0B`) |
| **25 – 49** | `HIGH RISK` | Orange (`#EA580C`) |
| **0 – 24** | `CRITICAL RISK` | Red (`#DC2626`) |

## Deduction Ledger
The API output includes a complete breakdown of all deductions in the `score.ledger` array:
```json
{
  "score": 40,
  "rating": "HIGH RISK",
  "total_penalty": 60,
  "ledger": [
    { "rule_id": "TLS-005", "severity": "CRITICAL", "penalty": 30, "occurrences": 3 },
    { "rule_id": "TLS-001", "severity": "HIGH", "penalty": 20, "occurrences": 1 },
    { "rule_id": "CERT-004", "severity": "MEDIUM", "penalty": 10, "occurrences": 1 }
  ]
}
```
Formula displayed in UI: `100 − 30 (TLS-005) − 20 (TLS-001) − 10 (CERT-004) = 40`
