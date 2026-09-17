# SECUREMAILSCOPE

> Autonomous Passive Email Security Assessment for SMTP, IMAP, and POP3.

SECUREMAILSCOPE analyzes network packet captures (`.pcap`, `.pcapng`), inspects cryptographic security (TLS versions, cipher suites, STARTTLS negotiations, X.509 certificates, plaintext credential exposure), calculates a pure deterministic risk score (0–100), applies rule-based security findings with observed evidence, and generates AI executive summaries with deterministic fallbacks.

---

## 🚀 Quick Start

### Prerequisites
- Python >= 3.11
- Node.js >= 20
- (Optional) TShark / Wireshark for live PCAP parsing. If TShark is missing, **Demo Mode** is fully functional without any external dependencies or AI keys.

### 1. Install Backend & Run
```bash
# Install dependencies
py -m pip install -r backend/requirements.txt

# Start FastAPI backend server (port 8000)
cd backend && py -m uvicorn main:app --reload --port 8000
```

### 2. Install Frontend & Run
```bash
# Install dependencies
npm --prefix frontend ci

# Start Vite React frontend (port 5173)
cd frontend && npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 🛠 Features
- **Passive Traffic Analysis:** Deep parsing of SMTP, IMAP, and POP3 streams.
- **Deterministic Risk Scoring:** Score is calculated purely from distinct findings penalties (CRITICAL: 30, HIGH: 20, MEDIUM: 10, LOW: 5).
- **Strict Evidence Standard:** Findings only fire when exact packet evidence (`session_id`, `packet_number`, `field`, `observed_value`) is present. No guessing.
- **Demo Mode:** Out-of-the-box demo streaming 7 synthetic email sessions with a golden test score of 40 / HIGH RISK.
- **AI Analyst with Guardrails:** Generates executive summaries and remediation priorities. If AI hallucinates invalid rules or alters scores, it automatically falls back to deterministic analysis.
- **Downloadable Reports:** Professional PDF reports and JSON exports.
