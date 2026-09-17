from typing import List, Dict, Any, Optional
from backend.models.schemas import StartTLSSummary


def analyze_starttls(packets: List[Dict[str, Any]]) -> Optional[StartTLSSummary]:
    offered_seen = False
    issued_seen = False
    tls_established = False
    downgrade_suspected = False

    for pkt in packets:
        req_cmd = (pkt.get("smtp.req.command") or "").upper()
        rsp_code = pkt.get("smtp.rsp.code") or ""
        rsp_param = (pkt.get("smtp.rsp.parameter") or "").upper()

        if "STARTTLS" in rsp_param or "STARTTLS" in rsp_code.upper():
            offered_seen = True

        # Check if STARTTLS offered in earlier packet, but omitted in subsequent EHLO response
        if offered_seen and (req_cmd == "EHLO" or req_cmd == "HELO") and rsp_param and "STARTTLS" not in rsp_param:
            downgrade_suspected = True

        if req_cmd == "STARTTLS":
            issued_seen = True
            offered_seen = True

        # Check if STARTTLS command issued, but server returned 5xx error
        if issued_seen and (rsp_code.startswith("5") or rsp_code.startswith("4")):
            downgrade_suspected = True

        if issued_seen and rsp_code.startswith("220"):
            tls_established = True
            offered_seen = True

    if not (offered_seen or issued_seen or tls_established or downgrade_suspected):
        return None

    return StartTLSSummary(
        offered=offered_seen,
        issued=issued_seen,
        tls_established=tls_established,
        downgrade_suspected=downgrade_suspected,
    )
