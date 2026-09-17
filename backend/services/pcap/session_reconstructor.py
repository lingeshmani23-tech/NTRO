from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple, Optional
from backend.models.schemas import (
    NormalizedSession,
    StartTLSSummary,
    CertificateInfo,
    AuthenticationSummary,
    EvidenceItem,
)
from backend.services.pcap.protocol_detector import detect_packet_protocol


def reconstruct_sessions(packets: List[Dict[str, Any]]) -> Tuple[List[NormalizedSession], Dict[str, int]]:
    """
    Groups raw parsed TShark packets into NormalizedSession objects.
    Returns: (email_sessions, protocol_stats)
    """
    streams: Dict[int, List[Dict[str, Any]]] = {}
    protocol_stats: Dict[str, int] = {"SMTP": 0, "IMAP": 0, "POP3": 0, "TLS": 0, "TCP": 0}

    for packet in packets:
        stream_id = int(packet["tcp.stream"]) if packet.get("tcp.stream") is not None else 0
        streams.setdefault(stream_id, []).append(packet)

        # Track protocol stats
        col_proto = (packet.get("_ws.col.Protocol") or "").upper()
        if "SMTP" in col_proto:
            protocol_stats["SMTP"] += 1
        elif "IMAP" in col_proto:
            protocol_stats["IMAP"] += 1
        elif "POP" in col_proto:
            protocol_stats["POP3"] += 1

        if "TLS" in col_proto or packet.get("tls.handshake.version"):
            protocol_stats["TLS"] += 1

        protocol_stats["TCP"] += 1

    email_sessions: List[NormalizedSession] = []
    protocol_counters: Dict[str, int] = {"SMTP": 0, "IMAP": 0, "POP3": 0}

    # Sort stream IDs by first packet frame number
    sorted_streams = sorted(
        streams.items(),
        key=lambda item: int(item[1][0].get("frame.number") or 0),
    )

    for stream_id, stream_packets in sorted_streams:
        # Determine stream protocol from packet majority / authoritative detection
        detected_proto = None
        for pkt in stream_packets:
            proto, _ = detect_packet_protocol(pkt)
            if proto:
                detected_proto = proto
                break

        if not detected_proto:
            continue  # Non-email stream

        protocol_counters[detected_proto] += 1
        seq_num = protocol_counters[detected_proto]
        session_id = f"{detected_proto}-{seq_num:03d}"

        first_pkt = stream_packets[0]
        last_pkt = stream_packets[-1]

        first_frame = int(first_pkt.get("frame.number") or 1)
        last_frame = int(last_pkt.get("frame.number") or len(stream_packets))

        # Format ISO timestamps
        def fmt_epoch(ep_str: Optional[str]) -> Optional[str]:
            if not ep_str:
                return None
            try:
                dt = datetime.fromtimestamp(float(ep_str), tz=timezone.utc)
                return dt.isoformat().replace("+00:00", "Z")
            except Exception:
                return None

        start_time = fmt_epoch(first_pkt.get("frame.time_epoch"))
        end_time = fmt_epoch(last_pkt.get("frame.time_epoch"))

        src_ip = first_pkt.get("ip.src") or first_pkt.get("ipv6.src") or "0.0.0.0"
        dst_ip = first_pkt.get("ip.dst") or first_pkt.get("ipv6.dst") or "0.0.0.0"
        dst_port = int(first_pkt.get("tcp.dstport") or 0)

        # Extract encryption & TLS parameters
        has_tls = False
        tls_ver = None
        cipher_suite = None
        cipher_hex = None
        sni = None
        evidence_list: List[EvidenceItem] = []

        starttls_offered = False
        starttls_issued = False
        starttls_established = False
        downgrade_suspected = False

        cert_present = False
        subject_cn = None
        issuer_cn = None
        not_before = None
        not_after = None
        key_size = None
        sig_alg = None

        auth_mech = None
        auth_exposed = False
        auth_packet = None

        for pkt in stream_packets:
            pkt_num = int(pkt.get("frame.number") or 0)

            # SNI
            if pkt.get("tls.handshake.extensions_server_name"):
                sni = pkt.get("tls.handshake.extensions_server_name")

            # TLS Version & Cipher
            if pkt.get("tls.handshake.version"):
                has_tls = True
                ver_raw = pkt.get("tls.handshake.version")
                evidence_list.append(
                    EvidenceItem(packet_number=pkt_num, field="tls.handshake.version", value=ver_raw)
                )
                if ver_raw in ("0x0301", "TLS 1.0"):
                    tls_ver = "TLS 1.0"
                elif ver_raw in ("0x0302", "TLS 1.1"):
                    tls_ver = "TLS 1.1"
                elif ver_raw in ("0x0303", "TLS 1.2"):
                    tls_ver = "TLS 1.2"
                elif ver_raw in ("0x0304", "TLS 1.3"):
                    tls_ver = "TLS 1.3"

            if pkt.get("tls.handshake.ciphersuite"):
                has_tls = True
                cipher_hex = pkt.get("tls.handshake.ciphersuite")
                evidence_list.append(
                    EvidenceItem(
                        packet_number=pkt_num, field="tls.handshake.ciphersuite", value=cipher_hex
                    )
                )

            # STARTTLS
            req_cmd = (pkt.get("smtp.req.command") or "").upper()
            rsp_code = pkt.get("smtp.rsp.code") or ""
            rsp_param = (pkt.get("smtp.rsp.parameter") or "").upper()

            if "STARTTLS" in rsp_param or "STARTTLS" in rsp_code.upper():
                starttls_offered = True
            if req_cmd == "STARTTLS":
                starttls_issued = True
                starttls_offered = True
            if starttls_issued and rsp_code.startswith("220"):
                starttls_established = True
                starttls_offered = True

            # Certificate fields
            if pkt.get("x509sat.printableString") or pkt.get("x509sat.uTF8String"):
                cert_present = True
                subject_cn = pkt.get("x509sat.printableString") or pkt.get("x509sat.uTF8String")
            if pkt.get("x509af.notBefore"):
                not_before = pkt.get("x509af.notBefore")
                evidence_list.append(
                    EvidenceItem(packet_number=pkt_num, field="x509af.notBefore", value=not_before)
                )
            if pkt.get("x509af.notAfter"):
                not_after = pkt.get("x509af.notAfter")
                evidence_list.append(
                    EvidenceItem(packet_number=pkt_num, field="x509af.notAfter", value=not_after)
                )
            if pkt.get("x509af.algorithm.id"):
                sig_alg = pkt.get("x509af.algorithm.id")

            # Authentication fields
            if pkt.get("smtp.auth.username") and not has_tls:
                auth_exposed = True
                auth_mech = "AUTH LOGIN/PLAIN"
                auth_packet = pkt_num

        encryption_val = True if has_tls else False

        starttls_summary = None
        if starttls_offered or starttls_issued or starttls_established:
            starttls_summary = StartTLSSummary(
                offered=starttls_offered,
                issued=starttls_issued,
                tls_established=starttls_established,
                downgrade_suspected=downgrade_suspected,
            )

        cert_info = None
        if cert_present or subject_cn or not_after:
            cert_info = CertificateInfo(
                present=True,
                subject_cn=subject_cn,
                issuer_cn=issuer_cn,
                not_before=not_before,
                not_after=not_after,
                expired=None,
                hostname_valid=None,
                key_size=key_size,
                signature_algorithm=sig_alg,
            )

        auth_info = None
        if auth_exposed or auth_mech:
            auth_info = AuthenticationSummary(
                mechanism=auth_mech,
                plaintext_exposed=auth_exposed,
                evidence_packet=auth_packet,
            )

        session = NormalizedSession(
            session_id=session_id,
            protocol=detected_proto,
            transport="TCP",
            source=src_ip,
            destination=dst_ip,
            destination_host=sni or subject_cn,
            port=dst_port,
            tcp_stream=stream_id,
            packet_count=len(stream_packets),
            first_packet=first_frame,
            last_packet=last_frame,
            start_time=start_time,
            end_time=end_time,
            encryption=encryption_val,
            starttls=starttls_summary,
            tls_version=tls_ver,
            cipher_suite=cipher_suite,
            cipher_hex=cipher_hex,
            certificate=cert_info,
            authentication=auth_info,
            evidence=evidence_list,
        )
        email_sessions.append(session)

    return email_sessions, protocol_stats
