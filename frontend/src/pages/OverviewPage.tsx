import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, AlertTriangle, AlertCircle, FileText, Download, ArrowRight, RefreshCw } from 'lucide-react';
import { fetchAnalysisResult, getReportDownloadUrl } from '../services/api';
import type { ComplianceResult, ComplianceCheck } from '../types/api';

export const OverviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<ComplianceResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchAnalysisResult(id)
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => {
        setError('Failed to load compliance audit results.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Loading Legal Metrology Dashboard...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
        <h3 className="text-lg font-bold text-white mb-1">Result Not Found</h3>
        <p className="text-xs text-slate-400 mb-4">{error || 'No inspection data found.'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-500"
        >
          Back to Upload
        </button>
      </div>
    );
  }

  const { extracted_data: ext, checks, score, ai_assessment, file } = data;

  const filteredChecks = filterSeverity === 'ALL'
    ? checks
    : checks.filter((c) => c.severity === filterSeverity || c.status === filterSeverity);

  const getScoreColor = (val: number) => {
    if (val >= 90) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (val >= 60) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-red-400 border-red-500/40 bg-red-500/10';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'PASS') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>PASS</span>
        </span>
      );
    }
    if (status === 'WARNING') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center space-x-1">
          <AlertTriangle className="w-3 h-3" />
          <span>WARNING</span>
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center space-x-1">
        <AlertCircle className="w-3 h-3" />
        <span>FAIL</span>
      </span>
    );
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-4 md:p-8 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Top Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <h1 className="text-2xl font-bold text-white">Compliance Audit Dashboard</h1>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getScoreColor(score.score)}`}>
                {score.rating}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Package Image: <span className="text-slate-200">{file.name}</span> • ID: <span className="text-slate-200">{data.analysis_id.slice(0, 8)}</span> • Date: {data.created_at}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <a
              href={getReportDownloadUrl(data.analysis_id, 'pdf')}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download Official PDF Report</span>
            </a>
          </div>
        </div>

        {/* Score & Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Compliance Score Gauge Card */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between items-center text-center shadow-xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Compliance Score</h3>
            
            <div className="my-6 relative flex items-center justify-center">
              <div className={`w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center ${getScoreColor(score.score)}`}>
                <span className="text-4xl font-extrabold">{score.score}</span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">out of 100</span>
              </div>
            </div>

            <div className="w-full text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              Rule 6 Mandatory Declarations Score
            </div>
          </div>

          {/* Executive Summary Card */}
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between shadow-xl space-y-4">
            <div>
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Executive AI Assessment Summary</h3>
              <p className="text-sm text-slate-200 leading-relaxed mb-4">
                {ai_assessment.executive_summary}
              </p>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400">
                <strong className="text-slate-300">Why It Matters:</strong> {ai_assessment.why_it_matters}
              </div>
            </div>

            {ai_assessment.top_priorities.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-2">Top Priorities for Compliance:</h4>
                <ul className="text-xs text-slate-300 space-y-1">
                  {ai_assessment.top_priorities.map((pri, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-blue-400 font-bold">•</span>
                      <span>{pri}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

        </div>

        {/* 6 Mandatory Declarations Cards Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <span>Extracted 6 Mandatory Declarations (Rule 6)</span>
            </h2>
            <span className="text-xs text-slate-400">Legal Metrology (Packaged Commodities) Rules, 2011</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* 1. MRP */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">1. Maximum Retail Price (MRP)</span>
                {getStatusBadge(ext.mrp && "tax" in ext.mrp.lower() ? "PASS" : (ext.mrp ? "WARNING" : "FAIL"))}
              </div>
              <p className="text-sm font-semibold text-white font-mono break-words">
                {ext.mrp || <span className="text-red-400 italic">NOT DECLARED</span>}
              </p>
              <p className="text-[11px] text-slate-500">Must include inclusive of all taxes declaration.</p>
            </div>

            {/* 2. Net Quantity */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">2. Net Quantity</span>
                {getStatusBadge(ext.net_quantity ? "PASS" : "FAIL")}
              </div>
              <p className="text-sm font-semibold text-white font-mono break-words">
                {ext.net_quantity || <span className="text-red-400 italic">NOT DECLARED</span>}
              </p>
              <p className="text-[11px] text-slate-500">Must use standard metric units (g, kg, ml, L, N).</p>
            </div>

            {/* 3. Manufacturer Details */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">3. Manufacturer / Packer Details</span>
                {getStatusBadge(ext.manufacturer_details && ext.manufacturer_details.length > 25 ? "PASS" : (ext.manufacturer_details ? "WARNING" : "FAIL"))}
              </div>
              <p className="text-xs font-semibold text-white break-words line-clamp-3">
                {ext.manufacturer_details || <span className="text-red-400 italic">NOT DECLARED</span>}
              </p>
              <p className="text-[11px] text-slate-500">Must include complete address with city, state, PIN.</p>
            </div>

            {/* 4. Date of Mfg */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">4. Date of Mfg / Packing</span>
                {getStatusBadge(ext.packing_date ? "PASS" : "FAIL")}
              </div>
              <p className="text-sm font-semibold text-white font-mono break-words">
                {ext.packing_date || <span className="text-red-400 italic">NOT DECLARED</span>}
              </p>
              <p className="text-[11px] text-slate-500">Month & Year of manufacture/packing (MM/YYYY).</p>
            </div>

            {/* 5. Consumer Care Details */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">5. Consumer Care Details</span>
                {getStatusBadge(ext.consumer_care_details ? "PASS" : "FAIL")}
              </div>
              <p className="text-xs font-semibold text-white break-words line-clamp-3">
                {ext.consumer_care_details || <span className="text-red-400 italic">NOT DECLARED</span>}
              </p>
              <p className="text-[11px] text-slate-500">Must include helpline number, email, and contact address.</p>
            </div>

            {/* 6. Country of Origin */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">6. Country of Origin</span>
                {getStatusBadge(ext.country_of_origin ? "PASS" : "FAIL")}
              </div>
              <p className="text-sm font-semibold text-white font-mono break-words">
                {ext.country_of_origin || <span className="text-red-400 italic">NOT DECLARED</span>}
              </p>
              <p className="text-[11px] text-slate-500">Mandatory origin statement for all packages.</p>
            </div>

          </div>
        </div>

        {/* Detailed Compliance Rule Inspection Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Rule Inspection Verification Log</h3>
              <p className="text-xs text-slate-400">Detailed Legal Metrology Rule 6 Evaluation Results</p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">Filter:</span>
              {['ALL', 'CRITICAL', 'HIGH', 'WARNING', 'FAIL'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    filterSeverity === sev
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase bg-slate-950/40">
                  <th className="py-3 px-4">Rule ID</th>
                  <th className="py-3 px-4">Field</th>
                  <th className="py-3 px-4">Title & Description</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredChecks.map((check: ComplianceCheck) => (
                  <tr key={check.rule_id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-400">{check.rule_id}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-300">{check.field}</td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-semibold text-white mb-0.5">{check.title}</div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">{check.message}</p>
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(check.status)}</td>
                    <td className="py-3.5 px-4 max-w-xs text-slate-300">
                      {check.recommendation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
