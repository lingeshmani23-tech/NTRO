import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, FileText, ArrowLeft, ShieldCheck } from 'lucide-react';
import { fetchAnalysisResult, getReportDownloadUrl } from '../services/api';
import type { ComplianceResult } from '../types/api';

export const ReportsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<ComplianceResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!id) return;
    fetchAnalysisResult(id)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-sm">Loading Report Preview...</div>;
  }

  if (!data || !id) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        Report not available.{' '}
        <button onClick={() => navigate('/')} className="text-blue-400 underline ml-2">
          Back to Scan
        </button>
      </div>
    );
  }

  const pdfUrl = getReportDownloadUrl(id, 'pdf');
  const jsonUrl = getReportDownloadUrl(id, 'json');

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(`/overview/${id}`)}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Compliance Inspection Report</h1>
              <p className="text-xs text-slate-400">Legal Metrology (Packaged Commodities) Audit Document</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <a
              href={jsonUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors flex items-center space-x-1.5"
            >
              <FileText className="w-4 h-4" />
              <span>Export JSON</span>
            </a>

            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-medium shadow-lg shadow-blue-600/20 transition-colors flex items-center space-x-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Download Official PDF</span>
            </a>
          </div>
        </div>

        {/* PDF Embedded Preview */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl h-[75vh]">
          <iframe
            src={pdfUrl}
            title="Legal Metrology Compliance PDF Report Preview"
            className="w-full h-full rounded-xl bg-white"
          />
        </div>

      </div>
    </div>
  );
};
