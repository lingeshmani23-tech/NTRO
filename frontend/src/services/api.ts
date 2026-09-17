import type {
  HealthResponse,
  StatusResponse,
  ComplianceResult,
  ExtractedPackageData,
  ComplianceCheck,
} from '../types/api';

const API_BASE = '/api';

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function triggerDemoAnalysis(sampleType: string = 'compliant'): Promise<{ analysis_id: string }> {
  const res = await fetch(`${API_BASE}/demo?sample_type=${encodeURIComponent(sampleType)}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to start demo analysis');
  return res.json();
}

export async function uploadPackageImage(file: File): Promise<{ analysis_id: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw data.error || { code: 'UPLOAD_FAILED', message: 'Failed to upload package image' };
  }
  return data;
}

export async function fetchAnalysisStatus(id: string): Promise<StatusResponse> {
  const res = await fetch(`${API_BASE}/analyze/${id}/status`);
  if (!res.ok) throw new Error('Failed to fetch status');
  return res.json();
}

export async function fetchAnalysisResult(id: string): Promise<ComplianceResult> {
  const res = await fetch(`${API_BASE}/analyze/${id}`);
  if (!res.ok) throw new Error('Failed to fetch compliance result');
  return res.json();
}

export async function fetchAnalysisDeclarations(id: string): Promise<ExtractedPackageData> {
  const res = await fetch(`${API_BASE}/analyze/${id}/declarations`);
  if (!res.ok) throw new Error('Failed to fetch declarations');
  return res.json();
}

export async function fetchAnalysisChecks(id: string): Promise<ComplianceCheck[]> {
  const res = await fetch(`${API_BASE}/analyze/${id}/checks`);
  if (!res.ok) throw new Error('Failed to fetch compliance checks');
  return res.json();
}

export function getReportDownloadUrl(id: string, format: 'pdf' | 'json'): string {
  return `${API_BASE}/analyze/${id}/report/${format}`;
}
