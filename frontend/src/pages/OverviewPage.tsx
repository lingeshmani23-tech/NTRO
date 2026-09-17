import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Download,
  ArrowRight,
  Network,
  Lock,
  Bot,
  FileCode,
  Info,
  HelpCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { fetchAnalysisResult, getReportDownloadUrl } from '../services/api';
import type { AnalysisResult, Finding } from '../types/api';

export const OverviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showScoreHelp, setShowScoreHelp] = useState<boolean>(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchAnalysisResult(id)
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch(() => {
        setError('Failed to load PCAP security analysis result.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-slate-400 text-xs font-mono">
        Loading Security Posture Dashboard...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <h3 className="text-base font-bold text-white mb-1">Analysis Not Found</h3>
        <p className="text-xs text-slate-400 mb-4">{error || 'No analysis data found for this session.'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg"
        >
          Return to Upload
        </button>
      </div>
    );
  }

  const { score, findings, sessions, ai, file, protocol_stats, tls_stats, cipher_stats } = data;

  const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;
  const highCount = findings.filter((f) => f.severity === 'HIGH').length;
  const mediumCount = findings.filter((f) => f.severity === 'MEDIUM').length;
  const lowCount = findings.filter((f) => f.severity === 'LOW').length;

  const getRatingBadge = (rating: string) => {
    if (rating === 'CRITICAL RISK' || rating === 'CRITICAL') {
      return 'bg-red-500/10 text-red-400 border-red-500/30';
    }
    if (rating === 'HIGH RISK' || rating === 'HIGH') {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }
    if (rating === 'LOW RISK' || rating === 'MEDIUM RISK') {
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  };

  const getSeverityBadge = (severity: string) => {
    if (severity === 'CRITICAL') return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/15 text-red-400 border border-red-500/30">CRITICAL</span>;
    if (severity === 'HIGH') return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">HIGH</span>;
    if (severity === 'MEDIUM') return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">MEDIUM</span>;
    if (severity === 'LOW') return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">LOW</span>;
    return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-500/15 text-slate-400 border border-slate-500/30">INFO</span>;
  };

  // Prepare chart datasets
  const protocolChartData = Object.entries(protocol_stats || {}).map(([name, value]) => ({ name, value }));
  const tlsChartData = Object.entries(tls_stats || {}).map(([name, value]) => ({ name, value }));

  const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header Banner */}
      <div className="bg-[#0F172A] border border-[#1E293B] p-5 rounded-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <h1 className="text-xl font-bold text-white tracking-tight">Security Posture Dashboard</h1>
            <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${getRatingBadge(score.rating)}`}>
              {score.rating}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Capture File: <span className="text-slate-200 font-mono">{file.name}</span> • ID: <span className="text-slate-200 font-mono">{data.analysis_id.slice(0, 8)}</span> • Source: {data.data_source}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href={getReportDownloadUrl(data.analysis_id, 'pdf')}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF Report</span>
          </a>
        </div>
      </div>

      {/* Top Section - Score Gauge & Severity Counters */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Security Score Circular Gauge Card */}
        <div className="bg-[#0F172A] border border-[#1E293B] p-5 rounded-xl flex flex-col justify-between items-center text-center shadow-xl">
          <div className="w-full flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Security Posture Score</span>
            <button
              onClick={() => setShowScoreHelp(!showScoreHelp)}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              title="View deterministic score formula"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="my-3 relative flex items-center justify-center">
            {/* SVG Circular Ring Gauge */}
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="52"
                stroke="#1E293B"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="64"
                cy="64"
                r="52"
                stroke={score.score >= 90 ? '#10B981' : score.score >= 70 ? '#3B82F6' : score.score >= 50 ? '#F59E0B' : '#EF4444'}
                strokeWidth="10"
                strokeDasharray="326.72"
                strokeDashoffset={326.72 - (326.72 * score.score) / 100}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-white font-mono">{score.score}</span>
              <span className="text-[9px] font-semibold text-slate-400 uppercase">out of 100</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            Based on verified findings from this capture
          </p>

          {/* Deterministic Penalty Score Ledger Drawer */}
          {showScoreHelp && (
            <div className="w-full mt-3 p-3 bg-[#0B1120] border border-[#1E293B] rounded-lg text-left text-[11px] space-y-1">
              <div className="font-semibold text-slate-300">Deterministic Score Formula:</div>
              <div className="text-slate-400 font-mono">Base score = 100</div>
              {score.deductions?.map((d, i) => (
                <div key={i} className="flex justify-between text-slate-400 font-mono">
                  <span>- {d.rule_id} ({d.severity})</span>
                  <span className="text-red-400">-{d.points}</span>
                </div>
              ))}
              <div className="pt-1 border-t border-[#1E293B] flex justify-between font-bold text-white font-mono">
                <span>Final Score</span>
                <span>{score.score} / 100</span>
              </div>
            </div>
          )}
        </div>

        {/* Severity Counters Grid */}
        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#0F172A] border border-[#1E293B] p-5 rounded-xl flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between text-xs font-bold text-red-400">
              <span>CRITICAL</span>
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-white font-mono">{criticalCount}</span>
              <p className="text-[11px] text-slate-400 mt-1">Severe cryptographic exposure</p>
            </div>
          </div>

          <div className="bg-[#0F172A] border border-[#1E293B] p-5 rounded-xl flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between text-xs font-bold text-amber-400">
              <span>HIGH</span>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-white font-mono">{highCount}</span>
              <p className="text-[11px] text-slate-400 mt-1">Legacy TLS / weak ciphers</p>
            </div>
          </div>

          <div className="bg-[#0F172A] border border-[#1E293B] p-5 rounded-xl flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between text-xs font-bold text-yellow-400">
              <span>MEDIUM</span>
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-white font-mono">{mediumCount}</span>
              <p className="text-[11px] text-slate-400 mt-1">Cert validity / key sizes</p>
            </div>
          </div>

          <div className="bg-[#0F172A] border border-[#1E293B] p-5 rounded-xl flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between text-xs font-bold text-blue-400">
              <span>LOW / INFO</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-white font-mono">{lowCount}</span>
              <p className="text-[11px] text-slate-400 mt-1">Informational observations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section - Protocol & TLS Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Protocol Breakdown Card */}
        <div className="bg-[#0F172A] border border-[#1E293B] p-5 rounded-xl space-y-3 shadow-xl">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-2">
            <Network className="w-4 h-4 text-blue-400" />
            <span>Protocol Distribution</span>
          </h3>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={protocolChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B1120', borderColor: '#1E293B', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TLS Versions Card */}
        <div className="bg-[#0F172A] border border-[#1E293B] p-5 rounded-xl space-y-3 shadow-xl">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-2">
            <Shield className="w-4 h-4 text-blue-400" />
            <span>TLS Versions Observed</span>
          </h3>
          <div className="space-y-2 text-xs pt-1">
            {Object.entries(tls_stats || {}).map(([ver, count]) => (
              <div key={ver} className="flex justify-between p-2.5 bg-[#0B1120] rounded-lg border border-[#1E293B]">
                <span className="text-slate-300 font-mono font-medium">{ver}</span>
                <span className="font-mono font-bold text-blue-400">{count} {count === 1 ? 'session' : 'sessions'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Executive Summary Card */}
        <div className="bg-[#0F172A] border border-[#1E293B] p-5 rounded-xl space-y-3 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Bot className="w-4 h-4" />
                <span>AI Security Assessment</span>
              </h3>
              <span className="text-[9px] font-mono text-slate-400 bg-[#0B1120] px-2 py-0.5 rounded border border-[#1E293B]">
                AI interpretation
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed line-clamp-4">
              {ai.executive_summary}
            </p>
          </div>
          <Link
            to={`/ai/${data.analysis_id}`}
            className="text-xs text-blue-400 font-semibold flex items-center space-x-1 hover:underline pt-2"
          >
            <span>Read Complete AI Executive Assessment</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Verified Cryptographic Findings Table */}
      <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Verified Cryptographic Findings</h3>
            <p className="text-xs text-slate-400">Strict evidence-driven security findings from deterministic rule engine</p>
          </div>
          <Link
            to={`/findings/${data.analysis_id}`}
            className="text-xs text-blue-400 font-semibold flex items-center space-x-1 hover:underline"
          >
            <span>View All ({findings.length}) Findings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1E293B] text-slate-400 font-semibold uppercase bg-[#0B1120]">
                <th className="py-2.5 px-3">Rule ID</th>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Protocol / Session</th>
                <th className="py-2.5 px-3">Title & Captured Evidence</th>
                <th className="py-2.5 px-3">Recommended Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]">
              {findings.slice(0, 5).map((f: Finding) => (
                <tr key={f.finding_id} className="hover:bg-[#172033]/60 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-blue-400">{f.rule_id}</td>
                  <td className="py-3 px-3">{getSeverityBadge(f.severity)}</td>
                  <td className="py-3 px-3 text-slate-300">
                    <span className="font-semibold text-white">{f.protocol}</span> <span className="text-slate-400 font-mono">({f.session_id})</span>
                  </td>
                  <td className="py-3 px-3 max-w-xs">
                    <div className="font-semibold text-slate-100 mb-0.5">{f.title}</div>
                    <p className="text-slate-400 text-[11px] font-mono">
                      Pkt #{f.evidence.packet_number || 'N/A'}: {f.evidence.observed_value}
                    </p>
                  </td>
                  <td className="py-3 px-3 max-w-xs text-slate-300">
                    {f.recommendation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
