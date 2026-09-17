import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Shield, ShieldAlert, CheckCircle2, AlertTriangle, AlertCircle, FileText, Download, ArrowRight, Network } from 'lucide-react';
import { fetchAnalysisResult, getReportDownloadUrl } from '../services/api';
import type { AnalysisResult, Finding } from '../types/api';

export const OverviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchAnalysisResult(id)
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => {
        setError('Failed to load PCAP security analysis result.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Loading Security Posture Dashboard...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
        <h3 className="text-lg font-bold text-white mb-1">Analysis Not Found</h3>
        <p className="text-xs text-slate-400 mb-4">{error || 'No analysis data found.'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-cyan-600 text-white text-xs font-semibold rounded-lg hover:bg-cyan-500"
        >
          Back to Upload
        </button>
      </div>
    );
  }

  const { score, findings, sessions, ai, file, protocol_stats, tls_stats, cipher_stats } = data;

  const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;
  const highCount = findings.filter((f) => f.severity === 'HIGH').length;
  const mediumCount = findings.filter((f) => f.severity === 'MEDIUM').length;
  const lowCount = findings.filter((f) => f.severity === 'LOW').length;

  const getScoreColor = (val: number) => {
    if (val >= 90) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (val >= 70) return 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10';
    if (val >= 50) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-red-400 border-red-500/40 bg-red-500/10';
  };

  const getSeverityBadge = (severity: string) => {
    if (severity === 'CRITICAL') return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">CRITICAL</span>;
    if (severity === 'HIGH') return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">HIGH</span>;
    if (severity === 'MEDIUM') return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">MEDIUM</span>;
    if (severity === 'LOW') return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">LOW</span>;
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">INFO</span>;
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-4 md:p-8 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Top Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <h1 className="text-2xl font-bold text-white">Security Posture Dashboard</h1>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getScoreColor(score.score)}`}>
                {score.rating}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Capture File: <span className="text-slate-200">{file.name}</span> • ID: <span className="text-slate-200">{data.analysis_id.slice(0, 8)}</span> • Source: {data.data_source}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <a
              href={getReportDownloadUrl(data.analysis_id, 'pdf')}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-cyan-600/20 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF Report</span>
            </a>
          </div>
        </div>

        {/* Score & Counter Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

          {/* Security Score Gauge Card */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between items-center text-center shadow-xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Security Score</h3>
            
            <div className="my-4 relative flex items-center justify-center">
              <div className={`w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center ${getScoreColor(score.score)}`}>
                <span className="text-3xl font-extrabold">{score.score}</span>
                <span className="text-[9px] font-semibold text-slate-400 uppercase">out of 100</span>
              </div>
            </div>

            <div className="w-full text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              Deterministic Penalty Score
            </div>
          </div>

          {/* Finding Counters */}
          <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between text-xs font-bold text-red-400">
                <span>CRITICAL</span>
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-white">{criticalCount}</span>
                <p className="text-[11px] text-slate-400 mt-1">Severe exposure</p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between text-xs font-bold text-orange-400">
                <span>HIGH</span>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-white">{highCount}</span>
                <p className="text-[11px] text-slate-400 mt-1">Deprecated TLS / ciphers</p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                <span>MEDIUM</span>
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-white">{mediumCount}</span>
                <p className="text-[11px] text-slate-400 mt-1">Weak key sizes</p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between text-xs font-bold text-blue-400">
                <span>LOW / INFO</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-white">{lowCount}</span>
                <p className="text-[11px] text-slate-400 mt-1">Minor observations</p>
              </div>
            </div>
          </div>

        </div>

        {/* Protocol & TLS Stats Breakdown Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Protocols Card */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3 shadow-xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-2">
              <Network className="w-4 h-4 text-cyan-400" />
              <span>Protocol Breakdown</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-300 font-medium">SMTP Sessions</span>
                <span className="font-mono font-bold text-blue-400">{protocol_stats.SMTP || 0}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-300 font-medium">IMAP Sessions</span>
                <span className="font-mono font-bold text-cyan-400">{protocol_stats.IMAP || 0}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-300 font-medium">POP3 Sessions</span>
                <span className="font-mono font-bold text-indigo-400">{protocol_stats.POP3 || 0}</span>
              </div>
            </div>
          </div>

          {/* TLS Versions Card */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3 shadow-xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>TLS Versions Observed</span>
            </h3>
            <div className="space-y-2 text-xs">
              {Object.entries(tls_stats || {}).map(([ver, count]) => (
                <div key={ver} className="flex justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-300 font-medium">{ver}</span>
                  <span className="font-mono font-bold text-cyan-400">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Summary Card */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">AI Executive Summary</h3>
              <p className="text-xs text-slate-300 leading-relaxed line-clamp-4">
                {ai.executive_summary}
              </p>
            </div>
            <Link
              to={`/ai/${data.analysis_id}`}
              className="text-xs text-cyan-400 font-semibold flex items-center space-x-1 hover:underline pt-2"
            >
              <span>View Full AI Analyst Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>

        {/* Verified Findings Preview Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Verified Cryptographic Findings</h3>
              <p className="text-xs text-slate-400">Strict Evidence-Driven Security Observations</p>
            </div>
            <Link
              to={`/findings/${data.analysis_id}`}
              className="text-xs text-cyan-400 font-semibold flex items-center space-x-1 hover:underline"
            >
              <span>View All {findings.length} Findings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase bg-slate-950/40">
                  <th className="py-3 px-4">Rule ID</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Protocol & Session</th>
                  <th className="py-3 px-4">Title & Evidence</th>
                  <th className="py-3 px-4">Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {findings.slice(0, 5).map((f: Finding) => (
                  <tr key={f.finding_id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">{f.rule_id}</td>
                    <td className="py-3.5 px-4">{getSeverityBadge(f.severity)}</td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <span className="font-semibold text-white">{f.protocol}</span> ({f.session_id})
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-semibold text-white mb-0.5">{f.title}</div>
                      <p className="text-slate-400 text-[11px] font-mono">
                        Pkt #{f.evidence.packet_number || 'N/A'}: {f.evidence.observed_value}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs text-slate-300">
                      {f.recommendation}
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
