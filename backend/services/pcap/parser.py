import subprocess
from typing import List, Dict, Any, Optional
from backend.services.pcap.validator import resolve_tshark_path, TSharkUnavailableError


class TSharkParseError(Exception):
    pass


TSHARK_FIELDS = [
    "frame.number",
    "frame.time_epoch",
    "ip.src",
    "ip.dst",
    "ipv6.src",
    "ipv6.dst",
    "tcp.srcport",
    "tcp.dstport",
    "tcp.stream",
    "_ws.col.Protocol",
    "tls.record.version",
    "tls.handshake.version",
    "tls.handshake.type",
    "tls.handshake.ciphersuite",
    "tls.handshake.extensions_server_name",
    "x509af.notBefore",
    "x509af.notAfter",
    "x509sat.printableString",
    "x509sat.uTF8String",
    "x509af.algorithm.id",
    "x509ce.dNSName",
    "pkcs1.modulus",
    "smtp.req.command",
    "smtp.req.parameter",
    "smtp.rsp.code",
    "smtp.rsp.parameter",
    "smtp.auth.username",
    "imap.request",
    "imap.response",
    "pop.request",
    "pop.response",
]


def parse_tsv_lines(lines: List[str]) -> List[Dict[str, Any]]:
    packets: List[Dict[str, Any]] = []
    for line in lines:
        if not line.strip():
            continue
        parts = line.split("\t")
        packet_data: Dict[str, Any] = {}
        for idx, field in enumerate(TSHARK_FIELDS):
            val = parts[idx].strip() if idx < len(parts) else ""
            packet_data[field] = val if val != "" else None
        packets.append(packet_data)
    return packets


def parse_pcap_with_tshark(filepath: str) -> List[Dict[str, Any]]:
    tshark_path = resolve_tshark_path()
    if not tshark_path:
        raise TSharkUnavailableError("TShark binary is missing.")

    cmd = [
        tshark_path,
        "-r",
        filepath,
        "-T",
        "fields",
        "-E",
        "separator=\t",
        "-E",
        "occurrence=a",
        "-n",
    ]
    for field in TSHARK_FIELDS:
        cmd.extend(["-e", field])

    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
        if proc.returncode != 0:
            stderr_head = proc.stderr.splitlines()[0] if proc.stderr else "Unknown error"
            raise TSharkParseError(f"TShark parsing failed with code {proc.returncode}: {stderr_head}")

        lines = proc.stdout.splitlines()
        return parse_tsv_lines(lines)

    except subprocess.TimeoutExpired:
        raise TSharkParseError("TShark extraction process timed out (120s limit)")
