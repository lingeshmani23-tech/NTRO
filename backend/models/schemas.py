from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class EvidenceItem(BaseModel):
    packet_number: int
    field: str
    value: Any


class StartTLSSummary(BaseModel):
    offered: Optional[bool] = None
    issued: Optional[bool] = None
    tls_established: Optional[bool] = None
    downgrade_suspected: Optional[bool] = None


class CertificateInfo(BaseModel):
    present: bool = False
    subject_cn: Optional[str] = None
    issuer_cn: Optional[str] = None
    not_before: Optional[str] = None
    not_after: Optional[str] = None
    expired: Optional[bool] = None
    hostname_valid: Optional[bool] = None
    key_size: Optional[int] = None
    signature_algorithm: Optional[str] = None


class AuthenticationSummary(BaseModel):
    mechanism: Optional[str] = None
    plaintext_exposed: bool = False
    evidence_packet: Optional[int] = None


class NormalizedSession(BaseModel):
    session_id: str
    protocol: str  # SMTP | IMAP | POP3
    transport: str = "TCP"
    source: str
    destination: str
    destination_host: Optional[str] = None
    port: int
    tcp_stream: int
    packet_count: int
    first_packet: int
    last_packet: int
    start_time: Optional[str] = None
    end_time: Optional[str] = None

    encryption: Optional[bool] = None
    starttls: Optional[StartTLSSummary] = None

    tls_version: Optional[str] = None  # "TLS 1.0" | "TLS 1.1" | "TLS 1.2" | "TLS 1.3" | None
    cipher_suite: Optional[str] = None
    cipher_hex: Optional[str] = None

    certificate: Optional[CertificateInfo] = None
    authentication: Optional[AuthenticationSummary] = None
    evidence: List[EvidenceItem] = Field(default_factory=list)


class FindingEvidence(BaseModel):
    session_id: str
    packet_number: int
    field: str
    observed_value: Any


class Finding(BaseModel):
    rule_id: str
    title: str
    severity: str  # CRITICAL | HIGH | MEDIUM | LOW | INFO
    protocol: str
    session_id: str
    description: str
    evidence: FindingEvidence
    impact: str
    recommendation: str
    reference: str


class ScoreLedgerItem(BaseModel):
    rule_id: str
    severity: str
    penalty: int
    occurrences: int


class RiskScore(BaseModel):
    score: int
    rating: str
    ledger: List[ScoreLedgerItem]
    total_penalty: int


class RemediationAction(BaseModel):
    priority: int
    action: str
    rule_ids: List[str]


class AIAssessment(BaseModel):
    provider: str  # fallback | llm
    executive_summary: str
    why_it_matters: str
    top_priorities: List[str]
    remediation: List[RemediationAction]


class FileInfo(BaseModel):
    name: str
    size_bytes: int
    packet_count: int
    sha256: str


class TotalsSummary(BaseModel):
    packets: int
    sessions: int
    email_sessions: int
    encrypted_sessions: int
    plaintext_sessions: int
    findings: int


class AnalysisResult(BaseModel):
    analysis_id: str
    created_at: str
    data_source: str  # pcap | synthetic
    file: FileInfo
    status: str
    protocol_stats: Dict[str, int]
    totals: TotalsSummary
    sessions: List[NormalizedSession]
    findings: List[Finding]
    score: RiskScore
    ai: AIAssessment
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


class StageProgress(BaseModel):
    id: str
    label: str
    state: str  # done | active | pending | failed
    ms: int
    error: Optional[str] = None


class StatusResponse(BaseModel):
    analysis_id: str
    status: str  # queued | running | completed | failed
    current_stage: str
    percent: int
    elapsed_ms: int
    stages: List[StageProgress]
    error: Optional[Dict[str, Any]] = None


class HealthResponse(BaseModel):
    status: str = "ok"
    tshark_available: bool
    tshark_version: Optional[str] = None
    tshark_path: Optional[str] = None
    tshark_error: Optional[str] = None
    ai_provider: str

