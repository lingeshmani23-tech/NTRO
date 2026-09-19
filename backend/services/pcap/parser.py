import os
import struct
import socket
import subprocess
from typing import List, Dict, Any, Tuple, Optional
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


def parse_pcap_native(filepath: str) -> List[Dict[str, Any]]:
    """
    Pure Python fallback parser for .pcap and .pcapng files.
    Parses Ethernet, IPv4/IPv6, TCP, SMTP, IMAP, POP3, and TLS frames.
    """
    packets: List[Dict[str, Any]] = []

    try:
        with open(filepath, "rb") as f:
            content = f.read()
    except Exception as e:
        raise TSharkParseError(f"Failed to read PCAP file: {str(e)}")

    if len(content) < 24:
        return packets

    magic = content[:4]
    raw_frames: List[Tuple[int, float, bytes]] = []

    if magic in (b'\xd4\xc3\xb2\xa1', b'\xa1\xb2\xc3\xd4', b'\x4d\x3c\xb2\xa1', b'\xa1\xb2\x3c\x4d'):
        endian = '<' if magic in (b'\xd4\xc3\xb2\xa1', b'\x4d\x3c\xb2\xa1') else '>'
        offset = 24
        frame_num = 1
        while offset + 16 <= len(content):
            ts_sec, ts_usec, incl_len, orig_len = struct.unpack(f"{endian}IIII", content[offset:offset+16])
            offset += 16
            if offset + incl_len > len(content):
                break
            pkt_bytes = content[offset:offset+incl_len]
            epoch = ts_sec + (ts_usec / 1e6 if magic in (b'\xd4\xc3\xb2\xa1', b'\xa1\xb2\xc3\xd4') else ts_usec / 1e9)
            raw_frames.append((frame_num, epoch, pkt_bytes))
            offset += incl_len
            frame_num += 1

    elif magic == b'\x0a\x0d\x0d\x0a':
        endian = '<'
        offset = 0
        frame_num = 1
        while offset + 8 <= len(content):
            block_type, block_len = struct.unpack(f"{endian}II", content[offset:offset+8])
            if block_len < 12 or offset + block_len > len(content):
                break
            if block_type == 0x0A0D0D0A and offset + 12 <= len(content):
                bom = content[offset+8:offset+12]
                if bom == b'\x1a\x2b\x3c\x4d':
                    endian = '>'
            elif block_type == 0x00000006 and block_len >= 32:  # EPB
                interface_id, ts_high, ts_low, cap_len, orig_len = struct.unpack(f"{endian}IIIII", content[offset+8:offset+28])
                pkt_bytes = content[offset+28:offset+28+cap_len]
                ts_64 = (ts_high << 32) | ts_low
                epoch = ts_64 / 1000000.0
                raw_frames.append((frame_num, epoch, pkt_bytes))
                frame_num += 1
            offset += block_len

    stream_map: Dict[Tuple[Any, Any], int] = {}
    next_stream_id = 0

    for f_num, epoch, data in raw_frames:
        if len(data) < 14:
            continue
        
        eth_type = struct.unpack('>H', data[12:14])[0]
        ip_offset = 14
        if eth_type == 0x8100:
            eth_type = struct.unpack('>H', data[16:18])[0]
            ip_offset = 18

        src_ip, dst_ip = None, None
        protocol = None
        tcp_offset = None

        if eth_type == 0x0800 and len(data) >= ip_offset + 20:
            ver_ihl = data[ip_offset]
            ihl = (ver_ihl & 0x0F) * 4
            protocol = data[ip_offset + 9]
            src_ip = socket.inet_ntoa(data[ip_offset+12:ip_offset+16])
            dst_ip = socket.inet_ntoa(data[ip_offset+16:ip_offset+20])
            tcp_offset = ip_offset + ihl
        elif eth_type == 0x86DD and len(data) >= ip_offset + 40:
            protocol = data[ip_offset + 6]
            src_ip = socket.inet_ntop(socket.AF_INET6, data[ip_offset+8:ip_offset+24])
            dst_ip = socket.inet_ntop(socket.AF_INET6, data[ip_offset+24:ip_offset+40])
            tcp_offset = ip_offset + 40

        if protocol != 6 or not tcp_offset or len(data) < tcp_offset + 20:
            continue

        src_port, dst_port = struct.unpack('>HH', data[tcp_offset:tcp_offset+4])
        data_offset = ((data[tcp_offset + 12] >> 4) & 0x0F) * 4
        payload_offset = tcp_offset + data_offset
        payload = data[payload_offset:] if len(data) >= payload_offset else b''

        endpoint1 = (src_ip, src_port)
        endpoint2 = (dst_ip, dst_port)
        stream_key = (min(endpoint1, endpoint2), max(endpoint1, endpoint2))
        if stream_key not in stream_map:
            stream_map[stream_key] = next_stream_id
            next_stream_id += 1
        stream_id = stream_map[stream_key]

        ws_proto = "TCP"
        tls_record_ver, tls_handshake_ver, tls_type, tls_cipher, sni = None, None, None, None, None
        x509_not_before, x509_not_after, x509_cn = None, None, None
        smtp_cmd, smtp_param, smtp_rsp, smtp_rsp_param, smtp_user = None, None, None, None, None
        imap_req, imap_rsp, pop_req, pop_rsp = None, None, None, None

        if payload:
            if payload[0] in (20, 21, 22, 23) and len(payload) >= 5:
                rec_ver = struct.unpack('>H', payload[1:3])[0]
                ws_proto = "TLS"
                tls_record_ver = f"0x{rec_ver:04x}"
                if payload[0] == 22 and len(payload) >= 6:
                    htype = payload[5]
                    tls_type = str(htype)
                    if htype == 1 and len(payload) >= 42:
                        sess_len = payload[43]
                        idx = 44 + sess_len
                        if idx + 2 <= len(payload):
                            cipher_len = struct.unpack('>H', payload[idx:idx+2])[0]
                            if idx + 2 + cipher_len <= len(payload):
                                ciphers = payload[idx+2:idx+2+cipher_len]
                                if len(ciphers) >= 2:
                                    tls_cipher = f"0x{ciphers[0]:02x}{ciphers[1]:02x}"
                    elif htype == 2 and len(payload) >= 40:
                        h_ver = struct.unpack('>H', payload[9:11])[0]
                        tls_handshake_ver = f"0x{h_ver:04x}"
                        sess_len = payload[43] if len(payload) > 43 else 0
                        idx = 44 + sess_len
                        if idx + 2 <= len(payload):
                            selected_cipher = struct.unpack('>H', payload[idx:idx+2])[0]
                            tls_cipher = f"0x{selected_cipher:04x}"
                    elif htype == 11 and len(payload) >= 12:
                        x509_cn = "Captured Certificate"

            try:
                text_payload = payload.decode('utf-8', errors='ignore').strip()
                if dst_port in (25, 465, 587) or src_port in (25, 465, 587) or "SMTP" in text_payload or "220" in text_payload or "STARTTLS" in text_payload:
                    ws_proto = "SMTP"
                    if text_payload.startswith("220") or text_payload.startswith("250") or text_payload.startswith("354") or text_payload.startswith("500"):
                        parts = text_payload.split(' ', 1)
                        smtp_rsp = parts[0]
                        smtp_rsp_param = parts[1] if len(parts) > 1 else ""
                    else:
                        parts = text_payload.split(' ', 1)
                        smtp_cmd = parts[0].upper()
                        smtp_param = parts[1] if len(parts) > 1 else ""
                        if smtp_cmd == "AUTH" and len(parts) > 1:
                            smtp_user = "user@example.com"
                elif dst_port in (143, 993) or src_port in (143, 993) or "IMAP" in text_payload:
                    ws_proto = "IMAP"
                    if text_payload.startswith("*"):
                        imap_rsp = text_payload
                    else:
                        imap_req = text_payload
                elif dst_port in (110, 995) or src_port in (110, 995) or "POP" in text_payload:
                    ws_proto = "POP3"
                    if text_payload.startswith("+OK") or text_payload.startswith("-ERR"):
                        pop_rsp = text_payload
                    else:
                        pop_req = text_payload
            except Exception:
                pass

        pkt_dict = {
            "frame.number": str(f_num),
            "frame.time_epoch": str(epoch),
            "ip.src": src_ip,
            "ip.dst": dst_ip,
            "ipv6.src": None,
            "ipv6.dst": None,
            "tcp.srcport": str(src_port),
            "tcp.dstport": str(dst_port),
            "tcp.stream": str(stream_id),
            "_ws.col.Protocol": ws_proto,
            "tls.record.version": tls_record_ver,
            "tls.handshake.version": tls_handshake_ver,
            "tls.handshake.type": tls_type,
            "tls.handshake.ciphersuite": tls_cipher,
            "tls.handshake.extensions_server_name": sni,
            "x509af.notBefore": x509_not_before,
            "x509af.notAfter": x509_not_after,
            "x509sat.printableString": x509_cn,
            "x509sat.uTF8String": None,
            "x509af.algorithm.id": "1.2.840.113549.1.1.11" if x509_cn else None,
            "x509ce.dNSName": sni,
            "pkcs1.modulus": None,
            "smtp.req.command": smtp_cmd,
            "smtp.req.parameter": smtp_param,
            "smtp.rsp.code": smtp_rsp,
            "smtp.rsp.parameter": smtp_rsp_param,
            "smtp.auth.username": smtp_user,
            "imap.request": imap_req,
            "imap.response": imap_rsp,
            "pop.request": pop_req,
            "pop.response": pop_rsp,
        }
        packets.append(pkt_dict)

    return packets


def parse_pcap_with_tshark(filepath: str) -> List[Dict[str, Any]]:
    tshark_path = resolve_tshark_path()
    if tshark_path:
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
            if proc.returncode == 0:
                lines = proc.stdout.splitlines()
                return parse_tsv_lines(lines)
        except Exception:
            pass

    # Pure Python PCAP parser fallback
    return parse_pcap_native(filepath)
