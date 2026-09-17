export interface EvidenceItem {
  frame_number?: number | null;
  packet_number?: number | null;
  timestamp?: string | null;
  field: string;
  observed_value: string;
}

export interface CertificateInfo {
  present: boolean;
  not_before?: string | null;
  not_after?: string | null;
  subject_cn?: string | null;
  issuer_cn?: string | null;
  key_size?: number | null;
  signature_algorithm?: string | null;
  san_domains?: string[];
  expired?: boolean;
  validity_issue?: boolean;
  hostname_mismatch?: boolean;
}

export interface StartTLSSummary {
  offered?: boolean;
  command_observed?: boolean;
  accepted?: boolean;
  tls_established?: boolean;
  downgrade_indicator?: boolean;
}

export interface AuthenticationSummary {
  auth_attempted?: boolean;
  mechanism?: string | null;
  unencrypted_exposure?: boolean;
}

export interface NormalizedSession {
  session_id: string;
  stream_id: number;
  protocol: 'SMTP' | 'IMAP' | 'POP3';
  source_ip: string;
  destination_ip: string;
  source_port: number;
  destination_port: number;
  encryption: boolean;
  tls_version?: string | null;
  cipher_suite?: string | null;
  certificate?: CertificateInfo | null;
  starttls?: StartTLSSummary | null;
  auth_summary?: AuthenticationSummary | null;
  evidence: EvidenceItem[];
  first_packet?: number;
  last_packet?: number;
}

export interface FindingEvidence {
  session_id: string;
  packet_number?: number | null;
  field: string;
  observed_value: string;
}

export interface Finding {
  finding_id: string;
  rule_id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  protocol: string;
  session_id: string;
  evidence: FindingEvidence;
  impact: string;
  recommendation: string;
  reference: string;
}

export interface ScoreLedgerItem {
  rule_id: string;
  severity: string;
  penalty?: number;
  deduction?: number;
  occurrences?: number;
  reason?: string;
}

export interface RiskScore {
  score: number;
  rating: string;
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
  ledger: ScoreLedgerItem[];
}

export interface RemediationAction {
  priority: number;
  action: string;
  rule_ids: string[];
}

export interface AIAssessment {
  provider: string;
  executive_summary: string;
  why_it_matters: string;
  top_priorities: string[];
  remediation: RemediationAction[];
}

export interface FileInfo {
  name: string;
  size_bytes: number;
  content_type: string;
}

export interface StageProgress {
  stage: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  detail: string;
  updated_at: string;
}

export interface StatusResponse {
  analysis_id: string;
  status: 'processing' | 'completed' | 'failed';
  progress: StageProgress[];
}

export interface AnalysisResult {
  analysis_id: string;
  created_at: string;
  data_source: string;
  file: FileInfo;
  sessions: NormalizedSession[];
  findings: Finding[];
  score: RiskScore;
  ai: AIAssessment;
  protocol_stats: Record<string, number>;
  tls_stats?: Record<string, number>;
  cipher_stats?: Record<string, number>;
  status: string;
}

export interface HealthResponse {
  status: string;
  tshark_available: boolean;
  llm_available: boolean;
  version: string;
}
