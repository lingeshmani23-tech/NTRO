export interface ExtractedPackageData {
  mrp?: string | null;
  net_quantity?: string | null;
  manufacturer_details?: string | null;
  packing_date?: string | null;
  consumer_care_details?: string | null;
  country_of_origin?: string | null;
  raw_text?: string | null;
  confidence_scores?: Record<string, number>;
}

export interface ComplianceCheck {
  rule_id: string;
  field: string;
  title: string;
  status: 'PASS' | 'WARNING' | 'FAIL';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  observed_value?: string | null;
  recommendation: string;
  reference: string;
}

export interface ScoreLedgerItem {
  rule_id: string;
  severity: string;
  deduction: number;
  reason: string;
}

export interface ComplianceScore {
  score: number;
  rating: 'COMPLIANT' | 'NEEDS_REVISION' | 'NON_COMPLIANT';
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

export interface ComplianceResult {
  analysis_id: string;
  created_at: string;
  data_source: string;
  file: FileInfo;
  extracted_data: ExtractedPackageData;
  checks: ComplianceCheck[];
  score: ComplianceScore;
  ai_assessment: AIAssessment;
  status: string;
}

export interface HealthResponse {
  status: string;
  ocr_engine_available: boolean;
  llm_available: boolean;
  version: string;
}
