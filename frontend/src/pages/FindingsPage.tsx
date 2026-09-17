import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Shield,
  Search,
  X,
  Bot,
  ChevronRight,
} from 'lucide-react';
import { fetchAnalysisResult } from '../services/api';
import type { AnalysisResult, Finding } from '../types/api';

export const FindingsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [protocolFilter, setProtocolFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchAnalysisResult(id)
      .then((res) => {
        setAnalysisData(res);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center text-[#94A3B8] text-xs font-mono">Loading Verified Security Findings...</div>;
  }

  const findings = analysisData?.findings || [];
  const sessions = analysisData?.sessions || [];

  const filteredFindings = findings.filter((f) => {
    const matchesSev = severityFilter === 'ALL' || f.severity === severityFilter;
    const matchesProto = protocolFilter === 'ALL' || f.protocol === protocolFilter;
    const matchesSearch =
      f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.rule_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.session_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSev && matchesProto && matchesSearch;
  });

  const getSeverityBadge = (severity: string) => {
    if (severity === 'CRITICAL') return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF9137]/20 text-[#FF9137] border border-[#FF9137]/40 ring-1 ring-[#FF9137]/30">CRITICAL</span>;
    if (severity === 'HIGH') return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF9137]/15 text-[#FF9137] border border-[#FF9137]/30">HIGH</span>;
    if (severity === 'MEDIUM') return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FFCC4D]/15 text-[#FFCC4D] border border-[#FFCC4D]/30">MEDIUM</span>;
    if (severity === 'LOW') return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#70FFD2]/15 text-[#70FFD2] border border-[#70FFD2]/30">LOW</span>;
    return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#70FFD2]/15 text-[#70FFD2] border border-[#70FFD2]/30">INFO</span>;
  };

  // Locate associated normalized session
  const targetSession = selectedFinding
    ? sessions.find((s) => s.session_id === selectedFinding.session_id)
    : null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header & Filter Control Bar */}
      <div className="bg-[#0F172A] border border-[#263449] p-5 rounded-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#F8FAFC] tracking-tight flex items-center space-x-2">
            <Shield className="w-5 h-5 text-[#70FFD2]" />
            <span>Verified Cryptographic Security Findings ({filteredFindings.length})</span>
          </h1>
          <p className="text-xs text-[#94A3B8]">Strict evidence-driven security findings generated from deterministic rule engine</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Bar */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rule, title, session..."
              className="w-full bg-[#0B1120] border border-[#263449] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#70FFD2]"
            />
          </div>

          {/* Severity Filter */}
          <div className="flex items-center space-x-1 bg-[#0B1120] p-1 rounded-lg border border-[#263449] text-xs">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                  severityFilter === sev
                    ? 'bg-[#70FFD2] text-[#0B1120] font-bold'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          {/* Protocol Filter */}
          <select
            value={protocolFilter}
            onChange={(e) => setProtocolFilter(e.target.value)}
            className="bg-[#0B1120] border border-[#263449] rounded-lg px-2.5 py-1.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#70FFD2]"
          >
            <option value="ALL">All Protocols</option>
            <option value="SMTP">SMTP</option>
            <option value="IMAP">IMAP</option>
            <option value="POP3">POP3</option>
          </select>
        </div>
      </div>

      {/* Main Findings Workspace & Detail Split / Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Finding Cards List */}
        <div className="lg:col-span-2 space-y-3">
          {filteredFindings.length === 0 ? (
            <div className="p-8 text-center bg-[#0F172A] border border-[#263449] rounded-xl text-[#94A3B8] text-xs">
              No security rules were triggered by the available evidence matching these filters.
            </div>
          ) : (
            filteredFindings.map((f: Finding) => {
              const isSelected = selectedFinding?.finding_id === f.finding_id;

              return (
                <div
                  key={f.finding_id}
                  onClick={() => setSelectedFinding(f)}
                  className={`bg-[#0F172A] border rounded-xl p-4 transition-all cursor-pointer space-y-3 ${
                    isSelected
                      ? 'border-[#70FFD2] bg-[#172033] shadow-lg'
                      : 'border-[#263449] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      {getSeverityBadge(f.severity)}
                      <span className="font-mono text-xs font-bold text-[#70FFD2]">{f.rule_id}</span>
                    </div>

                    <div className="flex items-center space-x-2 text-[11px] text-[#94A3B8]">
                      <span className="font-mono bg-[#0B1120] px-2 py-0.5 rounded border border-[#263449]">
                        {f.protocol} • {f.session_id}
                      </span>
                      <ChevronRight className="w-4 h-4 text-[#64748B]" />
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-[#F8FAFC] text-sm mb-1">{f.title}</h3>
                    <p className="text-xs text-[#94A3B8] line-clamp-2">{f.impact}</p>
                  </div>

                  <div className="pt-2 border-t border-[#263449] flex items-center justify-between text-[11px]">
                    <span className="font-mono text-[#94A3B8]">
                      Pkt #{f.evidence.packet_number || 'N/A'}: <span className="text-[#FFFC8C] font-bold">{f.evidence.observed_value}</span>
                    </span>
                    <span className="text-[#70FFD2] font-semibold hover:underline flex items-center space-x-1">
                      <span>View details</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Finding Details Drawer / Panel */}
        <div className="lg:col-span-1">
          {selectedFinding ? (
            <div className="bg-[#0F172A] border border-[#263449] rounded-xl p-5 space-y-5 sticky top-20 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#263449] pb-3">
                <div className="flex items-center space-x-2">
                  {getSeverityBadge(selectedFinding.severity)}
                  <span className="font-mono text-xs font-bold text-[#70FFD2]">{selectedFinding.rule_id}</span>
                </div>
                <button
                  onClick={() => setSelectedFinding(null)}
                  className="text-[#94A3B8] hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h3 className="text-base font-bold text-[#F8FAFC] mb-1">{selectedFinding.title}</h3>
                <p className="text-xs text-[#94A3B8] font-mono">
                  Session ID: <span className="text-[#F8FAFC]">{selectedFinding.session_id}</span> • Protocol: {selectedFinding.protocol}
                </p>
              </div>

              {/* WHY THIS WAS FLAGGED (Evidence) */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">
                  Why This Was Flagged (Evidence)
                </span>
                <div className="bg-[#0B1120] p-3 rounded-lg border border-[#263449] font-mono text-[11px] space-y-1.5">
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>Packet / Frame:</span>
                    <span className="text-[#F8FAFC]">#{selectedFinding.evidence.packet_number || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>Field Evaluated:</span>
                    <span className="text-[#F8FAFC]">{selectedFinding.evidence.field}</span>
                  </div>
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>Observed Evidence:</span>
                    <span className="text-[#FFFC8C] font-bold">{selectedFinding.evidence.observed_value}</span>
                  </div>
                  {targetSession && (
                    <>
                      <div className="flex justify-between text-[#94A3B8] pt-1 border-t border-[#263449]">
                        <span>Source IP:Port:</span>
                        <span className="text-[#F8FAFC]">{targetSession.source}:{targetSession.port}</span>
                      </div>
                      <div className="flex justify-between text-[#94A3B8]">
                        <span>Destination IP:</span>
                        <span className="text-[#F8FAFC]">{targetSession.destination}</span>
                      </div>
                      <div className="flex justify-between text-[#94A3B8]">
                        <span>TLS Version:</span>
                        <span className="text-[#70FFD2] font-bold">{targetSession.tls_version || 'None'}</span>
                      </div>
                      <div className="flex justify-between text-[#94A3B8]">
                        <span>Cipher Suite:</span>
                        <span className="text-[#F8FAFC] truncate max-w-[150px]">{targetSession.cipher_suite || 'None'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* IMPACT */}
              <div className="space-y-1 text-xs">
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">
                  Cryptographic Risk Impact
                </span>
                <p className="text-[#F8FAFC] leading-relaxed bg-[#0B1120]/40 p-2.5 rounded-lg border border-[#263449]">
                  {selectedFinding.impact}
                </p>
              </div>

              {/* RECOMMENDED ACTION */}
              <div className="space-y-1 text-xs">
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">
                  Recommended Remediation Action
                </span>
                <p className="text-[#70FFD2] font-medium leading-relaxed bg-[#0B1120]/40 p-2.5 rounded-lg border border-[#263449]">
                  {selectedFinding.recommendation}
                </p>
              </div>

              {/* REFERENCE */}
              <div className="text-[11px] text-[#64748B] font-mono">
                Standard: <span className="text-[#94A3B8]">{selectedFinding.reference}</span>
              </div>

              {/* AI SECURITY ANALYST INTERPRETATION (#FFFC8C ACCENT) */}
              <div className="pt-3 border-t border-[#263449] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#FFFC8C] uppercase tracking-wider flex items-center space-x-1">
                    <Bot className="w-3.5 h-3.5 text-[#FFFC8C]" />
                    <span>AI Security Analyst</span>
                  </span>
                  <span className="text-[9px] font-mono text-[#FFFC8C] bg-[#FFFC8C]/10 px-2 py-0.5 rounded border border-[#FFFC8C]/30">
                    AI interpretation
                  </span>
                </div>
                <div className="bg-[#0B1120] p-3 rounded-lg border border-[#263449] text-xs space-y-1.5">
                  <p className="text-[#F8FAFC] leading-relaxed text-[11px]">
                    <strong className="text-[#FFFC8C]">Why this matters:</strong> This configuration triggers compliance failure under modern TLS guidelines. High priority item for SOC remediation.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#0F172A] border border-[#263449] rounded-xl p-8 text-center text-[#64748B] text-xs">
              <Shield className="w-8 h-8 mx-auto mb-2 text-[#64748B]" />
              <span>Select a security finding to inspect packet evidence, impact, and remediation steps.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
