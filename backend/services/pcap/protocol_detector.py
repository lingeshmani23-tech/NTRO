from typing import Dict, Any, Tuple, Optional

SMTP_PORTS = {25, 465, 587}
IMAP_PORTS = {143, 993}
POP3_PORTS = {110, 995}


def detect_packet_protocol(packet: Dict[str, Any]) -> Tuple[Optional[str], str]:
    """
    Detects email protocol for a packet.
    Returns: (protocol_name, detection_method)
    protocol_name: "SMTP" | "IMAP" | "POP3" | None
    detection_method: "authoritative" | "port" | "none"
    """
    col_proto = (packet.get("_ws.col.Protocol") or "").upper()
    if "SMTP" in col_proto:
        return ("SMTP", "authoritative")
    if "IMAP" in col_proto:
        return ("IMAP", "authoritative")
    if "POP" in col_proto:
        return ("POP3", "authoritative")

    # Field presence check
    if packet.get("smtp.req.command") or packet.get("smtp.rsp.code"):
        return ("SMTP", "authoritative")
    if packet.get("imap.request") or packet.get("imap.response"):
        return ("IMAP", "authoritative")
    if packet.get("pop.request") or packet.get("pop.response"):
        return ("POP3", "authoritative")

    # Port heuristic fallback
    src_port = int(packet["tcp.srcport"]) if packet.get("tcp.srcport") else 0
    dst_port = int(packet["tcp.dstport"]) if packet.get("tcp.dstport") else 0

    if src_port in SMTP_PORTS or dst_port in SMTP_PORTS:
        return ("SMTP", "port")
    if src_port in IMAP_PORTS or dst_port in IMAP_PORTS:
        return ("IMAP", "port")
    if src_port in POP3_PORTS or dst_port in POP3_PORTS:
        return ("POP3", "port")

    return (None, "none")
