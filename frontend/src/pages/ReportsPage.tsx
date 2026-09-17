import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, FileText, ArrowLeft, Shield, FileCheck, ExternalLink } from 'lucide-react';
import { fetchAnalysisResult, getReportDownloadUrl } from '../services/api';
import type { AnalysisResult } from '../types/api';

export const ReportsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!id) return;
    fetchAnalysisResult(id)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center text-slate-400 text-xs font-mono">Loading Report Center...</div>;
  }

  if (!data || !id) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-4 text-center">
        <h3 className="text-base font-bold text-white mb-1">Report Not Available</h3>
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg">
          Return to Upload
        </button>
      </div>
    );
  }

  const pdfUrl = getReportDownloadUrl(id, 'pdf');
  const jsonUrl = getReportDownloadUrl(id, 'json');

  const reportSections = [
    '1. Executive Summary',
    '2. Security Posture Score',
    '3. Protocol Analysis',
    '4. TLS Transport Analysis',
    '5. X.509 Certificate Audit',
    '6. Verified Security Findings',
    '7. Packet Frame Evidence',
    '8. Risk Prioritization',
    '9. Remediation Action Plan',
    '10. Applicable Standards & References',
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="bg-[#0F172A] border border-[#1E293B] p-5 rounded-xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <span>Cryptographic Security Assessment Report</span>
          </h1>
          <p className="text-xs text-slate-400">
            Capture: <span className="font-mono text-slate-200">{data.file.name}</span> • Analysis ID: <span className="font-mono text-slate-200">{id.slice(0, 8)}</span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href={jsonUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 bg-[#172033] hover:bg-[#1E293B] text-slate-200 border border-[#263449] rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5"
          >
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Export JSON</span>
          </a>

          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Download Official PDF</span>
          </a>
        </div>
      </div>

      {/* Report Summary & PDF Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Report Metadata & TOC */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-5 space-y-4 shadow-xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Report Metadata</h3>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between p-2 bg-[#0B1120] rounded border border-[#1E293B]">
                <span className="text-slate-400">Score Rating:</span>
                <span className="text-white font-bold">{data.score.score}/100 ({data.score.rating})</span>
              </div>
              <div className="flex justify-between p-2 bg-[#0B1120] rounded border border-[#1E293B]">
                <span className="text-slate-400">Total Findings:</span>
                <span className="text-blue-400 font-bold">{data.findings.length} Verified</span>
              </div>
              <div className="flex justify-between p-2 bg-[#0B1120] rounded border border-[#1E293B]">
                <span className="text-slate-400">TCP Sessions:</span>
                <span className="text-slate-200">{data.sessions.length} Reconstructed</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-5 space-y-3 shadow-xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Report Structure</h3>
            <div className="space-y-1.5 text-xs text-slate-300">
              {reportSections.map((sec, idx) => (
                <div key={idx} className="p-2 bg-[#0B1120] rounded border border-[#1E293B] flex items-center space-x-2">
                  <FileCheck className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <span className="font-sans text-[11px]">{sec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: PDF Embedded Viewer */}
        <div className="lg:col-span-2 bg-[#0F172A] border border-[#1E293B] rounded-xl p-3 shadow-xl h-[75vh]">
          <iframe
            src={pdfUrl}
            title="SecureMailScope PDF Report Preview"
            className="w-full h-full rounded-lg bg-white"
          />
        </div>
      </div>
    </div>
  );
};
