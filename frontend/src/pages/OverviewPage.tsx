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
  Bot,
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
      <div className="min-h-[50vh] flex items-center justify-center text-[#94A3B8] text-xs font-mono">
        Loading Security Posture Dashboard...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-10 h-10 text-[#FF9137] mb-3" />
        <h3 className="text-base font-bold text-[#F8FAFC] mb-1">Analysis Not Found</h3>
        <p className="text-xs text-[#94A3B8] mb-4">{error || 'No analysis data found for this session.'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-[#70FFD2] hover:bg-[#5CE6BD] text-[#0B1120] font-bold text-xs rounded-lg"
        >
          Return to Upload
        </button>
      </div>
    );
  }

  const { score, findings, ai, file, protocol_stats, tls_stats } = data;

  const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;
  const highCount = findings.filter((f) => f.severity === 'HIGH').length;
  const mediumCount = findings.filter((f) => f.severity === 'MEDIUM').length;
  const lowCount = findings.filter((f) => f.severity === 'LOW').length;

  const getRatingBadge = (rating: string) => {
    if (rating === 'CRITICAL RISK' || rating === 'CRITICAL' || rating === 'HIGH RISK' || rating === 'HIGH') {
      return 'bg-[#FF9137]/15 text-[#FF9137] border-[#FF9137]/40';
    }
    if (rating === 'MEDIUM RISK' || rating === 'WARNING') {
      return 'bg-[#FFCC4D]/15 text-[#FFCC4D] border-[#FFCC4D]/40';
    }
    return 'bg-[#70FFD2]/15 text-[#70FFD2] border-[#70FFD2]/40';
  };

  const getSeverityBadge = (severity: string) => {
    if (severity === 'CRITICAL') return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF9137]/20 text-[#FF9137] border border-[#FF9137]/40 ring-1 ring-[#FF9137]/30">CRITICAL</span>;
    if (severity === 'HIGH') return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF9137]/15 text-[#FF9137] border border-[#FF9137]/30">HIGH</span>;
    if (severity === 'MEDIUM') return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FFCC4D]/15 text-[#FFCC4D] border border-[#FFCC4D]/30">MEDIUM</span>;
    if (severity === 'LOW') return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#70FFD2]/15 text-[#70FFD2] border border-[#70FFD2]/30">LOW</span>;
    return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#70FFD2]/15 text-[#70FFD2] border border-[#70FFD2]/30">INFO</span>;
  };

  // Prepare chart datasets using official brand palette sequence
  const CHART_PALETTE = ['#70FFD2', '#FFFC8C', '#FFCC4D', '#FF9137'];
  const protocolChartData = Object.entries(protocol_stats || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header Banner */}
      <div className="bg-[#0F172A] border border-[#263449] p-5 rounded-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <h1 className="text-xl font-bold text-[#F8FAFC] tracking-tight">Security Posture Dashboard</h1>
            <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${getRatingBadge(score.rating)}`}>
              {score.rating}
            </span>
          </div>
          <p className="text-xs text-[#94A3B8]">
            Capture File: <span className="text-[#F8FAFC] font-mono">{file.name}</span> • ID: <span className="text-[#F8FAFC] font-mono">{data.analysis_id.slice(0, 8)}</span> • Source: {data.data_source}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href={getReportDownloadUrl(data.analysis_id, 'pdf')}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#70FFD2] hover:bg-[#5CE6BD] text-[#0B1120] font-bold text-xs rounded-lg transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-[#0B1120]" />
            <span>Download PDF Report</span>
          </a>
        </div>
      </div>

      {/* Top Section - Score Gauge & Severity Counters */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Security Score Circular Gauge Card */}
        <div className="bg-[#0F172A] border border-[#263449] p-5 rounded-xl flex flex-col justify-between items-center text-center shadow-xl">
          <div className="w-full flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">Security Posture Score</span>
            <button
              onClick={() => setShowScoreHelp(!showScoreHelp)}
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
              title="View deterministic score formula"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="my-3 relative flex items-center justify-center">
            {/* SVG Circular Ring Gauge with Brand Accent */}
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="52"
                stroke="#263449"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="64"
                cy="64"
                r="52"
                stroke={score.score >= 70 ? '#70FFD2' : score.score >= 50 ? '#FFCC4D' : '#FF9137'}
                strokeWidth="10"
                strokeDasharray="326.72"
                strokeDashoffset={326.72 - (326.72 * score.score) / 100}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-[#F8FAFC] font-mono">{score.score}</span>
              <span className="text-[9px] font-semibold text-[#94A3B8] uppercase">out of 100</span>
            </div>
          </div>

          <p className="text-[11px] text-[#94A3B8]">
            Based on verified findings from this capture
          </p>

          {/* Deterministic Penalty Score Ledger Drawer */}
          {showScoreHelp && (
            <div className="w-full mt-3 p-3 bg-[#0B1120] border border-[#263449] rounded-lg text-left text-[11px] space-y-1">
              <div className="font-semibold text-[#F8FAFC]">Deterministic Score Formula:</div>
              <div className="text-[#94A3B8] font-mono">Base score = 100</div>
              {(score.ledger || []).map((item, i) => (
                <div key={i} className="flex justify-between text-[#94A3B8] font-mono">
                  <span>- {item.rule_id} ({item.severity})</span>
                  <span className="text-[#FF9137]">-{item.penalty || item.deduction || 0}</span>
                </div>
              ))}
              <div className="pt-1 border-t border-[#263449] flex justify-between font-bold text-[#F8FAFC] font-mono">
                <span>Final Score</span>
                <span>{score.score} / 100</span>
              </div>
            </div>
          )}
        </div>

        {/* Severity Counters Grid */}
        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#0F172A] border border-[#263449] p-5 rounded-xl flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between text-xs font-bold text-[#FF9137]">
              <span>CRITICAL</span>
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-[#F8FAFC] font-mono">{criticalCount}</span>
              <p className="text-[11px] text-[#94A3B8] mt-1">Severe cryptographic exposure</p>
            </div>
          </div>

          <div className="bg-[#0F172A] border border-[#263449] p-5 rounded-xl flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between text-xs font-bold text-[#FF9137]">
              <span>HIGH</span>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-[#F8FAFC] font-mono">{highCount}</span>
              <p className="text-[11px] text-[#94A3B8] mt-1">Legacy TLS / weak ciphers</p>
            </div>
          </div>

          <div className="bg-[#0F172A] border border-[#263449] p-5 rounded-xl flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between text-xs font-bold text-[#FFCC4D]">
              <span>MEDIUM</span>
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-[#F8FAFC] font-mono">{mediumCount}</span>
              <p className="text-[11px] text-[#94A3B8] mt-1">Cert validity / key sizes</p>
            </div>
          </div>

          <div className="bg-[#0F172A] border border-[#263449] p-5 rounded-xl flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between text-xs font-bold text-[#70FFD2]">
              <span>LOW / INFO</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-[#F8FAFC] font-mono">{lowCount}</span>
              <p className="text-[11px] text-[#94A3B8] mt-1">Informational observations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section - Protocol & TLS Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Protocol Breakdown Card */}
        <div className="bg-[#0F172A] border border-[#263449] p-5 rounded-xl space-y-3 shadow-xl">
          <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider flex items-center space-x-2">
            <Network className="w-4 h-4 text-[#70FFD2]" />
            <span>Protocol Distribution</span>
          </h3>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={protocolChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B1120', borderColor: '#263449', borderRadius: '8px', fontSize: '11px', color: '#F8FAFC' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {protocolChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TLS Versions Card */}
        <div className="bg-[#0F172A] border border-[#263449] p-5 rounded-xl space-y-3 shadow-xl">
          <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider flex items-center space-x-2">
            <Shield className="w-4 h-4 text-[#70FFD2]" />
            <span>TLS Versions Observed</span>
          </h3>
          <div className="space-y-2 text-xs pt-1">
            {Object.entries(tls_stats || {}).map(([ver, count]) => (
              <div key={ver} className="flex justify-between p-2.5 bg-[#0B1120] rounded-lg border border-[#263449]">
                <span className="text-[#F8FAFC] font-mono font-medium">{ver}</span>
                <span className="font-mono font-bold text-[#70FFD2]">{count} {count === 1 ? 'session' : 'sessions'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Executive Summary Card (Light Yellow Brand Accent) */}
        <div className="bg-[#0F172A] border border-[#263449] p-5 rounded-xl space-y-3 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-[#FFFC8C] uppercase tracking-wider flex items-center space-x-1.5">
                <Bot className="w-4 h-4 text-[#FFFC8C]" />
                <span>AI Security Assessment</span>
              </h3>
              <span className="text-[9px] font-mono text-[#FFFC8C] bg-[#FFFC8C]/10 px-2 py-0.5 rounded border border-[#FFFC8C]/30">
                AI interpretation
              </span>
            </div>
            <p className="text-xs text-[#F8FAFC] leading-relaxed line-clamp-4">
              {ai.executive_summary}
            </p>
          </div>
          <Link
            to={`/ai/${data.analysis_id}`}
            className="text-xs text-[#FFFC8C] font-semibold flex items-center space-x-1 hover:underline pt-2"
          >
            <span>Read Complete AI Executive Assessment</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Verified Cryptographic Findings Table */}
      <div className="bg-[#0F172A] border border-[#263449] rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#F8FAFC] tracking-tight">Verified Cryptographic Findings</h3>
            <p className="text-xs text-[#94A3B8]">Strict evidence-driven security findings from deterministic rule engine</p>
          </div>
          <Link
            to={`/findings/${data.analysis_id}`}
            className="text-xs text-[#70FFD2] font-semibold flex items-center space-x-1 hover:underline"
          >
            <span>View All ({findings.length}) Findings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#263449] text-[#94A3B8] font-semibold uppercase bg-[#0B1120]">
                <th className="py-2.5 px-3">Rule ID</th>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Protocol / Session</th>
                <th className="py-2.5 px-3">Title & Captured Evidence</th>
                <th className="py-2.5 px-3">Recommended Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#263449]">
              {findings.slice(0, 5).map((f: Finding) => (
                <tr key={f.finding_id} className="hover:bg-[#172033]/60 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-[#70FFD2]">{f.rule_id}</td>
                  <td className="py-3 px-3">{getSeverityBadge(f.severity)}</td>
                  <td className="py-3 px-3 text-[#F8FAFC]">
                    <span className="font-semibold text-[#F8FAFC]">{f.protocol}</span> <span className="text-[#94A3B8] font-mono">({f.session_id})</span>
                  </td>
                  <td className="py-3 px-3 max-w-xs">
                    <div className="font-semibold text-[#F8FAFC] mb-0.5">{f.title}</div>
                    <p className="text-[#94A3B8] text-[11px] font-mono">
                      Pkt #{f.evidence.packet_number || 'N/A'}: <span className="text-[#FFFC8C] font-bold">{f.evidence.observed_value}</span>
                    </p>
                  </td>
                  <td className="py-3 px-3 max-w-xs text-[#F8FAFC]">
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
