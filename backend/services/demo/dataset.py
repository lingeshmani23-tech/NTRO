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
)
from backend.services.rules.rule_engine import RuleEngine
from backend.services.scoring.risk_score import calculate_risk_score
from backend.services.ai.analyst import AIAnalyst


def build_demo_sessions() -> List[NormalizedSession]:
    sessions = [
        # Session 1: SMTP-001 (Port 587, STARTTLS, TLS 1.2, Strong AEAD cipher, Valid 2048 cert)
        NormalizedSession(
            session_id="SMTP-001",
            stream_id=1,
            protocol="SMTP",
            source_ip="10.0.0.15",
            destination_ip="203.0.113.25",
            source_port=54321,
            destination_port=587,
            encryption=True,
            starttls=StartTLSSummary(
                offered=True, command_observed=True, accepted=True, tls_established=True, downgrade_indicator=False
            ),
            tls_version="TLS 1.2",
            cipher_suite="TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
            certificate=CertificateInfo(
                present=True,
                subject_cn="mail.example.com",
                issuer_cn="DigiCert Global Root G2",
                not_before="2025-01-01T00:00:00Z",
                not_after="2027-01-01T00:00:00Z",
                expired=False,
                hostname_mismatch=False,
                key_size=2048,
                signature_algorithm="SHA256-RSA",
            ),
            auth_summary=AuthenticationSummary(auth_attempted=True, mechanism="AUTH PLAIN", unencrypted_exposure=False),
            evidence=[
                EvidenceItem(frame_number=112, timestamp="2026-02-11T09:14:02.331Z", field="tls.handshake.version", observed_value="TLS 1.2"),
                EvidenceItem(frame_number=112, timestamp="2026-02-11T09:14:02.331Z", field="tls.handshake.ciphersuite", observed_value="0xc030"),
            ],
        ),
        # Session 2: SMTP-002 (Port 25, Plaintext, No AUTH)
        NormalizedSession(
            session_id="SMTP-002",
            stream_id=2,
            protocol="SMTP",
            source_ip="10.0.0.16",
            destination_ip="203.0.113.25",
            source_port=54322,
            destination_port=25,
            encryption=False,
            starttls=StartTLSSummary(
                offered=False, command_observed=False, accepted=False, tls_established=False, downgrade_indicator=False
            ),
            tls_version=None,
            cipher_suite=None,
            certificate=None,
            auth_summary=None,
            evidence=[
                EvidenceItem(frame_number=205, timestamp="2026-02-11T09:15:00.120Z", field="session.encryption", observed_value="False"),
            ],
        ),
        # Session 3: SMTP-003 (Port 465, TLS 1.0, CBC cipher)
        NormalizedSession(
            session_id="SMTP-003",
            stream_id=3,
            protocol="SMTP",
            source_ip="10.0.0.17",
            destination_ip="203.0.113.25",
            source_port=54323,
            destination_port=465,
            encryption=True,
            starttls=None,
            tls_version="TLS 1.0",
            cipher_suite="TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA",
            certificate=CertificateInfo(
                present=True,
                subject_cn="mail.example.com",
                issuer_cn="Example CA R3",
                not_before="2025-06-01T00:00:00Z",
                not_after="2027-06-01T00:00:00Z",
                expired=False,
                hostname_mismatch=False,
                key_size=2048,
                signature_algorithm="SHA256-RSA",
            ),
            auth_summary=AuthenticationSummary(auth_attempted=True, mechanism="AUTH LOGIN", unencrypted_exposure=False),
            evidence=[
                EvidenceItem(frame_number=308, timestamp="2026-02-11T09:16:10.000Z", field="tls.handshake.version", observed_value="TLS 1.0"),
                EvidenceItem(frame_number=308, timestamp="2026-02-11T09:16:10.000Z", field="tls.handshake.ciphersuite", observed_value="0xc014"),
            ],
        ),
        # Session 4: IMAP-001 (Port 993, TLS 1.2, Strong AEAD cipher, Weak RSA 1024-bit cert)
        NormalizedSession(
            session_id="IMAP-001",
            stream_id=4,
            protocol="IMAP",
            source_ip="10.0.0.20",
            destination_ip="203.0.113.26",
            source_port=54324,
            destination_port=993,
            encryption=True,
            starttls=None,
            tls_version="TLS 1.2",
            cipher_suite="TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256",
            certificate=CertificateInfo(
                present=True,
                subject_cn="imap.example.com",
                issuer_cn="Legacy Intermediate CA",
                not_before="2025-01-01T00:00:00Z",
                not_after="2027-01-01T00:00:00Z",
                expired=False,
                hostname_mismatch=False,
                key_size=1024,
                signature_algorithm="SHA256-RSA",
            ),
            auth_summary=AuthenticationSummary(auth_attempted=False, mechanism=None, unencrypted_exposure=False),
            evidence=[
                EvidenceItem(frame_number=410, timestamp="2026-02-11T09:18:00.000Z", field="tls.handshake.version", observed_value="TLS 1.2"),
                EvidenceItem(frame_number=412, timestamp="2026-02-11T09:18:00.000Z", field="pkcs1.modulus", observed_value="1024 bits"),
            ],
        ),
        # Session 5: IMAP-002 (Port 143, Plaintext)
        NormalizedSession(
            session_id="IMAP-002",
            stream_id=5,
            protocol="IMAP",
            source_ip="10.0.0.21",
            destination_ip="203.0.113.26",
            source_port=54325,
            destination_port=143,
            encryption=False,
            starttls=StartTLSSummary(
                offered=False, command_observed=False, accepted=False, tls_established=False, downgrade_indicator=False
            ),
            tls_version=None,
            cipher_suite=None,
            certificate=None,
            auth_summary=None,
            evidence=[
                EvidenceItem(frame_number=504, timestamp="2026-02-11T09:19:00.000Z", field="session.encryption", observed_value="False"),
            ],
        ),
        # Session 6: POP3-001 (Port 995, TLS 1.3, AES-256-GCM)
        NormalizedSession(
            session_id="POP3-001",
            stream_id=6,
            protocol="POP3",
            source_ip="10.0.0.30",
            destination_ip="203.0.113.27",
            source_port=54326,
            destination_port=995,
            encryption=True,
            starttls=None,
            tls_version="TLS 1.3",
            cipher_suite="TLS_AES_256_GCM_SHA384",
            certificate=CertificateInfo(
                present=True,
                subject_cn="pop3.example.com",
                issuer_cn="DigiCert TLS RSA SHA256",
                not_before="2025-01-01T00:00:00Z",
                not_after="2027-01-01T00:00:00Z",
                expired=False,
                hostname_mismatch=False,
                key_size=2048,
                signature_algorithm="SHA256-RSA",
            ),
            auth_summary=None,
            evidence=[
                EvidenceItem(frame_number=606, timestamp="2026-02-11T09:20:00.000Z", field="tls.handshake.version", observed_value="TLS 1.3"),
            ],
        ),
        # Session 7: POP3-002 (Port 110, Plaintext)
        NormalizedSession(
            session_id="POP3-002",
            stream_id=7,
            protocol="POP3",
            source_ip="10.0.0.31",
            destination_ip="203.0.113.27",
            source_port=54327,
            destination_port=110,
            encryption=False,
            starttls=StartTLSSummary(
                offered=False, command_observed=False, accepted=False, tls_established=False, downgrade_indicator=False
            ),
            tls_version=None,
            cipher_suite=None,
            certificate=None,
            auth_summary=None,
            evidence=[
                EvidenceItem(frame_number=703, timestamp="2026-02-11T09:21:00.000Z", field="session.encryption", observed_value="False"),
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
    tls_stats = {"TLS 1.0": 1, "TLS 1.2": 2, "TLS 1.3": 1, "None": 3}
    cipher_stats = {
        "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384": 1,
        "TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA": 1,
        "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256": 1,
        "TLS_AES_256_GCM_SHA384": 1,
    }

    file_info = FileInfo(
        name="demo_synthetic_capture.pcapng",
        size_bytes=102400,
        content_type="application/vnd.tcpdump.pcap",
    )

    analysis_id = str(uuid.uuid4())

    return AnalysisResult(
        analysis_id=analysis_id,
        created_at="2026-02-11T09:25:00.000Z",
        data_source="synthetic",
        file=file_info,
        status="completed",
        protocol_stats=protocol_stats,
        tls_stats=tls_stats,
        cipher_stats=cipher_stats,
        sessions=sessions,
        findings=findings,
        score=score,
        ai=ai_assessment,
    )
