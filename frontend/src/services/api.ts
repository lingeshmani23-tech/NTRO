import type {
  HealthResponse,
  StatusResponse,
  AnalysisResult,
  NormalizedSession,
  Finding,
} from '../types/api';

const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  code: string;
  stage?: string;
  raw?: string;

  constructor(message: string, status: number = 0, code: string = 'UNKNOWN_ERROR', stage?: string, raw?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.stage = stage;
    this.raw = raw;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (isJson) {
    let data: any;
    try {
      data = await res.json();
    } catch (e) {
      console.error('Failed to parse JSON response:', e);
      throw new ApiError(
        'Analysis service returned an invalid JSON response. Check that the SecureMailScope backend is running.',
        res.status,
        'INVALID_JSON'
      );
    }

    if (!res.ok) {
      const msg =
        data.message ||
        data.detail ||
        (typeof data.error === 'string' ? data.error : null) ||
        (data.error && data.error.message) ||
        'API request failed';
      const code = data.error_code || (data.error && data.error.code) || data.code || `HTTP_${res.status}`;
      const stage = data.stage;
      throw new ApiError(msg, res.status, code, stage);
    }

    return data as T;
  }

  // Non-JSON response (e.g. HTML 404, 405, 500, or proxy error)
  const rawText = await res.text();
  console.error(`Non-JSON response received from ${res.url} (Status ${res.status}):`, rawText);

  if (res.status === 404) {
    throw new ApiError(
      'Analysis API endpoint not found (404). Check that the SecureMailScope backend is running and /analyze is available.',
      404,
      'ENDPOINT_NOT_FOUND',
      undefined,
      rawText
    );
  }
  if (res.status === 405) {
    throw new ApiError(
      'Incorrect HTTP method (405). The analysis endpoint does not support this method.',
      405,
      'METHOD_NOT_ALLOWED',
      undefined,
      rawText
    );
  }
  if (res.status >= 500) {
    throw new ApiError(
      `Analysis service returned an unexpected server error (Status ${res.status}). Check backend server logs.`,
      res.status,
      'SERVER_ERROR',
      undefined,
      rawText
    );
  }

  throw new ApiError(
    `Analysis service returned an unexpected response (Status ${res.status}). Check that the SecureMailScope backend is running and /analyze is available.`,
    res.status,
    'UNEXPECTED_RESPONSE',
    undefined,
    rawText
  );
}

async function safeFetch<T>(url: string, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(url, init);
    return await handleResponse<T>(res);
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    console.error('Fetch error:', err);
    throw new ApiError(
      'Analysis service is unreachable. Check that the SecureMailScope backend is running and /analyze is available.',
      0,
      'SERVICE_UNAVAILABLE'
    );
  }
}

export async function fetchHealth(): Promise<HealthResponse> {
  return safeFetch<HealthResponse>(`${API_BASE}/health`);
}

export async function triggerDemoAnalysis(): Promise<{ analysis_id: string }> {
  return safeFetch<{ analysis_id: string }>(`${API_BASE}/demo`, {
    method: 'POST',
  });
}

export async function uploadPcapFile(file: File): Promise<{ analysis_id: string }> {
  const formData = new FormData();
  formData.append('file', file);

  return safeFetch<{ analysis_id: string }>(`${API_BASE}/analyze`, {
    method: 'POST',
    body: formData,
  });
}

export async function fetchAnalysisStatus(id: string): Promise<StatusResponse> {
  return safeFetch<StatusResponse>(`${API_BASE}/analyze/${id}/status`);
}

export async function fetchAnalysisResult(id: string): Promise<AnalysisResult> {
  return safeFetch<AnalysisResult>(`${API_BASE}/analyze/${id}`);
}

export async function fetchAnalysisSessions(id: string): Promise<NormalizedSession[]> {
  return safeFetch<NormalizedSession[]>(`${API_BASE}/analyze/${id}/sessions`);
}

export async function fetchAnalysisFindings(id: string, severity?: string): Promise<Finding[]> {
  const url = severity
    ? `${API_BASE}/analyze/${id}/findings?severity=${encodeURIComponent(severity)}`
    : `${API_BASE}/analyze/${id}/findings`;
  return safeFetch<Finding[]>(url);
}

export function getReportDownloadUrl(id: string, format: 'pdf' | 'json'): string {
  return `${API_BASE}/analyze/${id}/report/${format}`;
}
