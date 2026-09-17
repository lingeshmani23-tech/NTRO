import uuid
from typing import List, Dict
from backend.models.schemas import (
    NormalizedSession,
    StartTLSSummary,
    CertificateInfo,
    AuthenticationSummary,
    EvidenceItem,
    AnalysisResult,
    FileInfo,
    TotalsSummary,
)
from backend.services.rules.rule_engine import RuleEngine
from backend.services.scoring.risk_score import calculate_risk_score
from backend.services.ai.analyst import AIAnalyst


def build_demo_sessions() -> List[NormalizedSession]:
    sessions = [
        # Session 1: SMTP-001 (Port 587, STARTTLS, TLS 1.2, Strong AEAD cipher, Valid 2048 cert)
        NormalizedSession(
            session_id="SMTP-001",
            protocol="SMTP",
            transport="TCP",
            source="10.0.0.15",
            destination="203.0.113.25",
            destination_host="mail.example.com",
            port=587,
            tcp_stream=1,
            packet_count=46,
            first_packet=101,
            last_packet=146,
            start_time="2026-02-11T09:14:02.331Z",
            end_time="2026-02-11T09:14:07.902Z",
            encryption=True,
            starttls=StartTLSSummary(
                offered=True, issued=True, tls_established=True, downgrade_suspected=False
            ),
            tls_version="TLS 1.2",
            cipher_suite="TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
            cipher_hex="0xc030",
            certificate=CertificateInfo(
                present=True,
                subject_cn="mail.example.com",
                issuer_cn="DigiCert Global Root G2",
                not_before="2025-01-01T00:00:00Z",
                not_after="2027-01-01T00:00:00Z",
                expired=False,
                hostname_valid=True,
                key_size=2048,
                signature_algorithm="SHA256-RSA",
            ),
            authentication=AuthenticationSummary(mechanism="AUTH PLAIN", plaintext_exposed=False),
            evidence=[
                EvidenceItem(packet_number=112, field="tls.handshake.version", value="0x0303"),
                EvidenceItem(
                    packet_number=112, field="tls.handshake.ciphersuite", value="0xc030"
                ),
            ],
        ),
        # Session 2: SMTP-002 (Port 25, Plaintext, No AUTH)
        NormalizedSession(
            session_id="SMTP-002",
            protocol="SMTP",
            transport="TCP",
            source="10.0.0.16",
            destination="203.0.113.25",
            destination_host="mail.example.com",
            port=25,
            tcp_stream=2,
            packet_count=18,
            first_packet=201,
            last_packet=218,
            start_time="2026-02-11T09:15:00.120Z",
            end_time="2026-02-11T09:15:02.450Z",
            encryption=False,
            starttls=StartTLSSummary(
                offered=False, issued=False, tls_established=False, downgrade_suspected=False
            ),
            tls_version=None,
            cipher_suite=None,
            cipher_hex=None,
            certificate=None,
            authentication=None,
            evidence=[
                EvidenceItem(packet_number=205, field="session.encryption", value="False"),
            ],
        ),
        # Session 3: SMTP-003 (Port 465, TLS 1.0, CBC cipher)
        NormalizedSession(
            session_id="SMTP-003",
            protocol="SMTP",
            transport="TCP",
            source="10.0.0.17",
            destination="203.0.113.25",
            destination_host="mail.example.com",
            port=465,
            tcp_stream=3,
            packet_count=32,
            first_packet=301,
            last_packet=332,
            start_time="2026-02-11T09:16:10.000Z",
            end_time="2026-02-11T09:16:14.200Z",
            encryption=True,
            starttls=None,
            tls_version="TLS 1.0",
            cipher_suite="TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA",
            cipher_hex="0xc014",
            certificate=CertificateInfo(
                present=True,
                subject_cn="mail.example.com",
                issuer_cn="Example CA R3",
                not_before="2025-06-01T00:00:00Z",
                not_after="2027-06-01T00:00:00Z",
                expired=False,
                hostname_valid=True,
                key_size=2048,
                signature_algorithm="SHA256-RSA",
            ),
            authentication=AuthenticationSummary(mechanism="AUTH LOGIN", plaintext_exposed=False),
            evidence=[
                EvidenceItem(packet_number=308, field="tls.handshake.version", value="0x0301"),
                EvidenceItem(
                    packet_number=308, field="tls.handshake.ciphersuite", value="0xc014"
                ),
            ],
        ),
        # Session 4: IMAP-001 (Port 993, TLS 1.2, Strong AEAD cipher, Weak RSA 1024-bit cert)
        NormalizedSession(
            session_id="IMAP-001",
            protocol="IMAP",
            transport="TCP",
            source="10.0.0.20",
            destination="203.0.113.26",
            destination_host="imap.example.com",
            port=993,
            tcp_stream=4,
            packet_count=54,
            first_packet=401,
            last_packet=454,
            start_time="2026-02-11T09:18:00.000Z",
            end_time="2026-02-11T09:18:10.500Z",
            encryption=True,
            starttls=None,
            tls_version="TLS 1.2",
            cipher_suite="TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256",
            cipher_hex="0xc02b",
            certificate=CertificateInfo(
                present=True,
                subject_cn="imap.example.com",
                issuer_cn="Legacy Intermediate CA",
                not_before="2025-01-01T00:00:00Z",
                not_after="2027-01-01T00:00:00Z",
                expired=False,
                hostname_valid=True,
                key_size=1024,
                signature_algorithm="SHA256-RSA",
            ),
            authentication=AuthenticationSummary(mechanism="LOGINDISABLED", plaintext_exposed=False),
            evidence=[
                EvidenceItem(packet_number=410, field="tls.handshake.version", value="0x0303"),
                EvidenceItem(packet_number=412, field="pkcs1.modulus", value="1024 bits"),
            ],
        ),
        # Session 5: IMAP-002 (Port 143, Plaintext)
        NormalizedSession(
            session_id="IMAP-002",
            protocol="IMAP",
            transport="TCP",
            source="10.0.0.21",
            destination="203.0.113.26",
            destination_host="imap.example.com",
            port=143,
            tcp_stream=5,
            packet_count=14,
            first_packet=501,
            last_packet=514,
            start_time="2026-02-11T09:19:00.000Z",
            end_time="2026-02-11T09:19:03.100Z",
            encryption=False,
            starttls=StartTLSSummary(
                offered=False, issued=False, tls_established=False, downgrade_suspected=False
            ),
            tls_version=None,
            cipher_suite=None,
            cipher_hex=None,
            certificate=None,
            authentication=None,
            evidence=[
                EvidenceItem(packet_number=504, field="session.encryption", value="False"),
            ],
        ),
        # Session 6: POP3-001 (Port 995, TLS 1.3, AES-256-GCM)
        NormalizedSession(
            session_id="POP3-001",
            protocol="POP3",
            transport="TCP",
            source="10.0.0.30",
            destination="203.0.113.27",
            destination_host="pop3.example.com",
            port=995,
            tcp_stream=6,
            packet_count=28,
            first_packet=601,
            last_packet=628,
            start_time="2026-02-11T09:20:00.000Z",
            end_time="2026-02-11T09:20:04.800Z",
            encryption=True,
            starttls=None,
            tls_version="TLS 1.3",
            cipher_suite="TLS_AES_256_GCM_SHA384",
            cipher_hex="0x1302",
            certificate=CertificateInfo(
                present=True,
                subject_cn="pop3.example.com",
                issuer_cn="DigiCert TLS RSA SHA256",
                not_before="2025-01-01T00:00:00Z",
                not_after="2027-01-01T00:00:00Z",
                expired=False,
                hostname_valid=True,
                key_size=2048,
                signature_algorithm="SHA256-RSA",
            ),
            authentication=None,
            evidence=[
                EvidenceItem(packet_number=606, field="tls.handshake.version", value="0x0304"),
            ],
        ),
        # Session 7: POP3-002 (Port 110, Plaintext)
        NormalizedSession(
            session_id="POP3-002",
            protocol="POP3",
            transport="TCP",
            source="10.0.0.31",
            destination="203.0.113.27",
            destination_host="pop3.example.com",
            port=110,
            tcp_stream=7,
            packet_count=12,
            first_packet=701,
            last_packet=712,
            start_time="2026-02-11T09:21:00.000Z",
            end_time="2026-02-11T09:21:02.000Z",
            encryption=False,
            starttls=StartTLSSummary(
                offered=False, issued=False, tls_established=False, downgrade_suspected=False
            ),
            tls_version=None,
            cipher_suite=None,
            cipher_hex=None,
            certificate=None,
            authentication=None,
            evidence=[
                EvidenceItem(packet_number=703, field="session.encryption", value="False"),
            ],
        ),
    ]
    return sessions


def generate_demo_analysis_result() -> AnalysisResult:
    sessions = build_demo_sessions()
    rule_engine = RuleEngine()
    findings = rule_engine.evaluate_all(sessions)
    score = calculate_risk_score(findings)
    ai_analyst = AIAnalyst()
    ai_assessment = ai_analyst.generate_assessment(score=score, findings=findings)

    protocol_stats = {"SMTP": 3, "IMAP": 2, "POP3": 2, "TLS": 4, "TCP": 7}
    total_packets = sum(s.packet_count for s in sessions)
    encrypted_count = sum(1 for s in sessions if s.encryption is True)
    plaintext_count = sum(1 for s in sessions if s.encryption is False)

    totals = TotalsSummary(
        packets=total_packets,
        sessions=7,
        email_sessions=7,
        encrypted_sessions=encrypted_count,
        plaintext_sessions=plaintext_count,
        findings=len(findings),
    )

    file_info = FileInfo(
        name="demo_synthetic_capture.pcapng",
        size_bytes=102400,
        packet_count=total_packets,
        sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    )

    analysis_id = str(uuid.uuid4())

    return AnalysisResult(
        analysis_id=analysis_id,
        created_at="2026-02-11T09:25:00.000Z",
        data_source="synthetic",
        file=file_info,
        status="completed",
        protocol_stats=protocol_stats,
        totals=totals,
        sessions=sessions,
        findings=findings,
        score=score,
        ai=ai_assessment,
        errors=[],
        warnings=[],
    )
