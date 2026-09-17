export interface EvidenceItem {
  packet_number: number;
  field: string;
  value: any;
}

export interface StartTLSSummary {
  offered?: boolean | null;
  issued?: boolean | null;
  tls_established?: boolean | null;
  downgrade_suspected?: boolean | null;
}

export interface CertificateInfo {
  present: boolean;
  subject_cn?: string | null;
  issuer_cn?: string | null;
  not_before?: string | null;
  not_after?: string | null;
  expired?: boolean | null;
  hostname_valid?: boolean | null;
  key_size?: number | null;
  signature_algorithm?: string | null;
}

export interface AuthenticationSummary {
  mechanism?: string | null;
  plaintext_exposed: boolean;
  evidence_packet?: number | null;
}

export interface NormalizedSession {
  session_id: string;
  protocol: 'SMTP' | 'IMAP' | 'POP3' | string;
  transport: string;
  source: string;
  destination: string;
  destination_host?: string | null;
  port: number;
  tcp_stream: number;
  packet_count: number;
  first_packet: number;
  last_packet: number;
  start_time?: string | null;
  end_time?: string | null;

  encryption?: boolean | null;
  starttls?: StartTLSSummary | null;

  tls_version?: 'TLS 1.0' | 'TLS 1.1' | 'TLS 1.2' | 'TLS 1.3' | string | null;
  cipher_suite?: string | null;
  cipher_hex?: string | null;

  certificate?: CertificateInfo | null;
  authentication?: AuthenticationSummary | null;
  evidence: EvidenceItem[];
}

export interface FindingEvidence {
  session_id: string;
  packet_number: number;
  field: string;
  observed_value: any;
}

export interface Finding {
  rule_id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  protocol: string;
  session_id: string;
  description: string;
  evidence: FindingEvidence;
  impact: string;
  recommendation: string;
  reference: string;
}

export interface ScoreLedgerItem {
  rule_id: string;
  severity: string;
  penalty: number;
  occurrences: number;
}

export interface RiskScore {
  score: number;
  rating: string;
  ledger: ScoreLedgerItem[];
  total_penalty: number;
}

export interface RemediationAction {
  priority: number;
  action: string;
  rule_ids: string[];
}

export interface AIAssessment {
  provider: 'fallback' | 'llm' | string;
  executive_summary: string;
  why_it_matters: string;
  top_priorities: string[];
  remediation: RemediationAction[];
}

export interface FileInfo {
  name: string;
  size_bytes: number;
  packet_count: number;
  sha256: string;
}

export interface TotalsSummary {
  packets: number;
  sessions: number;
  email_sessions: number;
  encrypted_sessions: number;
  plaintext_sessions: number;
  findings: number;
}

export interface AnalysisResult {
  analysis_id: string;
  created_at: string;
  data_source: 'pcap' | 'synthetic' | string;
  file: FileInfo;
  status: string;
  protocol_stats: Record<string, number>;
  totals: TotalsSummary;
  sessions: NormalizedSession[];
  findings: Finding[];
  score: RiskScore;
  ai: AIAssessment;
  errors: string[];
  warnings: string[];
}

export interface StageProgress {
  id: string;
  label: string;
  state: 'done' | 'active' | 'pending' | 'failed';
  ms: number;
  error?: string | null;
}

export interface StatusResponse {
  analysis_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  current_stage: string;
  percent: number;
  elapsed_ms: number;
  stages: StageProgress[];
  error?: Record<string, any> | null;
}

export interface HealthResponse {
  status: string;
  tshark_available: boolean;
  tshark_version?: string | null;
  tshark_path?: string | null;
  tshark_error?: string | null;
  ai_provider: string;
}


export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    hint?: string;
  };
}
