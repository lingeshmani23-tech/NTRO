import type {
  HealthResponse,
  StatusResponse,
  AnalysisResult,
  NormalizedSession,
  Finding,
} from '../types/api';

const API_BASE = '/api';

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function triggerDemoAnalysis(): Promise<{ analysis_id: string }> {
  const res = await fetch(`${API_BASE}/demo`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to start demo analysis');
  return res.json();
}

export async function uploadPcapFile(file: File): Promise<{ analysis_id: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw data.error || { code: 'UPLOAD_FAILED', message: data.detail || 'Failed to upload PCAP file' };
  }
  return data;
}

export async function fetchAnalysisStatus(id: string): Promise<StatusResponse> {
  const res = await fetch(`${API_BASE}/analyze/${id}/status`);
  if (!res.ok) throw new Error('Failed to fetch status');
  return res.json();
}

export async function fetchAnalysisResult(id: string): Promise<AnalysisResult> {
  const res = await fetch(`${API_BASE}/analyze/${id}`);
  if (!res.ok) throw new Error('Failed to fetch analysis result');
  return res.json();
}

export async function fetchAnalysisSessions(id: string): Promise<NormalizedSession[]> {
  const res = await fetch(`${API_BASE}/analyze/${id}/sessions`);
  if (!res.ok) throw new Error('Failed to fetch sessions');
  return res.json();
}

export async function fetchAnalysisFindings(id: string, severity?: string): Promise<Finding[]> {
  const url = severity
    ? `${API_BASE}/analyze/${id}/findings?severity=${encodeURIComponent(severity)}`
    : `${API_BASE}/analyze/${id}/findings`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch findings');
  return res.json();
}

export function getReportDownloadUrl(id: string, format: 'pdf' | 'json'): string {
  return `${API_BASE}/analyze/${id}/report/${format}`;
}
