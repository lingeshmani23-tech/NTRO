from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, AliasChoices


class EvidenceItem(BaseModel):
    frame_number: Optional[int] = None
    packet_number: Optional[int] = None
    timestamp: Optional[str] = None
    field: str
    observed_value: str

    def model_post_init(self, __context):
        if self.packet_number is None and self.frame_number is not None:
            self.packet_number = self.frame_number
        elif self.frame_number is None and self.packet_number is not None:
            self.frame_number = self.packet_number



class CertificateInfo(BaseModel):
    present: bool = False
    not_before: Optional[str] = None
    not_after: Optional[str] = None
    subject_cn: Optional[str] = None
    issuer_cn: Optional[str] = None
    key_size: Optional[int] = None
    signature_algorithm: Optional[str] = None
    san_domains: List[str] = Field(default_factory=list)
    expired: Optional[bool] = False
    validity_issue: Optional[bool] = False
    hostname_mismatch: Optional[bool] = False


class StartTLSSummary(BaseModel):
    offered: bool = False
    command_observed: bool = False
    accepted: bool = False
    tls_established: bool = False
    downgrade_indicator: bool = False


class AuthenticationSummary(BaseModel):
    auth_attempted: bool = False
    mechanism: Optional[str] = None
    unencrypted_exposure: bool = False


class NormalizedSession(BaseModel):
    session_id: str
    stream_id: int = Field(default=0, validation_alias=AliasChoices('stream_id', 'tcp_stream'))
    protocol: str = Field(default="SMTP", description="SMTP, IMAP, or POP3")
    source_ip: str = Field(default="0.0.0.0", validation_alias=AliasChoices('source_ip', 'source'))
    destination_ip: str = Field(default="0.0.0.0", validation_alias=AliasChoices('destination_ip', 'destination'))
    source_port: int = Field(default=0, validation_alias=AliasChoices('source_port', 'src_port'))
    destination_port: int = Field(default=0, validation_alias=AliasChoices('destination_port', 'port'))
    encryption: bool = False
    tls_version: Optional[str] = None
    cipher_suite: Optional[str] = None
    cipher_hex: Optional[str] = None
    certificate: Optional[CertificateInfo] = None
    starttls: Optional[StartTLSSummary] = None
    auth_summary: Optional[AuthenticationSummary] = Field(default=None, validation_alias=AliasChoices('auth_summary', 'authentication'))
    evidence: List[EvidenceItem] = Field(default_factory=list)
    first_packet: int = 1
    last_packet: int = 1
    packet_count: int = 0
    destination_host: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None


class FindingEvidence(BaseModel):
    session_id: str
    packet_number: Optional[int] = None
    field: str
    observed_value: str


class Finding(BaseModel):
    finding_id: str
    rule_id: str
    title: str
    severity: str = Field(description="CRITICAL, HIGH, MEDIUM, LOW, or INFO")
    protocol: str
    session_id: str
    evidence: FindingEvidence
    impact: str
    recommendation: str
    reference: str


class ScoreLedgerItem(BaseModel):
    rule_id: str
    severity: str
    penalty: int = 0
    deduction: int = 0
    occurrences: int = 1
    reason: str = ""



class RiskScore(BaseModel):
    score: int = Field(ge=0, le=100, description="Risk Score from 0 to 100")
    rating: str = Field(description="LOW RISK, MEDIUM RISK, HIGH RISK, or CRITICAL RISK")
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    ledger: List[ScoreLedgerItem] = Field(default_factory=list)


class RemediationAction(BaseModel):
    priority: int
    action: str
    rule_ids: List[str]


class AIAssessment(BaseModel):
    provider: str
    executive_summary: str
    why_it_matters: str
    top_priorities: List[str]
    remediation: List[RemediationAction]


class FileInfo(BaseModel):
    name: str
    size_bytes: int
    content_type: str = "application/vnd.tcpdump.pcap"


class StageProgress(BaseModel):
    stage: str
    status: str  # pending | in_progress | completed | failed
    detail: str
    updated_at: str


class StatusResponse(BaseModel):
    analysis_id: str
    status: str  # processing | completed | failed
    progress: List[StageProgress]


class AnalysisResult(BaseModel):
    analysis_id: str
    created_at: str
    data_source: str
    file: FileInfo
    sessions: List[NormalizedSession]
    findings: List[Finding]
    score: RiskScore
    ai: AIAssessment
    protocol_stats: Dict[str, int] = Field(default_factory=dict)
    tls_stats: Dict[str, int] = Field(default_factory=dict)
    cipher_stats: Dict[str, int] = Field(default_factory=dict)
    status: str = "completed"


class HealthResponse(BaseModel):
    status: str = "ok"
    tshark_available: bool = True
    llm_available: bool = False
    version: str = "1.0.0"
