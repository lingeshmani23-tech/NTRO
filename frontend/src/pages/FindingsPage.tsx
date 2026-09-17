import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { fetchAnalysisFindings } from '../services/api';
import type { Finding } from '../types/api';

export const FindingsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchAnalysisFindings(id)
      .then((res) => {
        setFindings(res);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const toggleExpand = (findingId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(findingId)) next.delete(findingId);
      else next.add(findingId);
      return next;
    });
  };

  const filteredFindings = findings.filter((f) => {
    const matchesSev = severityFilter === 'ALL' || f.severity === severityFilter;
    const matchesSearch =
      f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.rule_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.session_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSev && matchesSearch;
  });

  const getSeverityBadge = (severity: string) => {
    if (severity === 'CRITICAL') return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">CRITICAL</span>;
    if (severity === 'HIGH') return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">HIGH</span>;
    if (severity === 'MEDIUM') return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">MEDIUM</span>;
    if (severity === 'LOW') return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">LOW</span>;
    return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">INFO</span>;
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-sm">Loading Verified Security Findings...</div>;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Top Header & Search/Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center space-x-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              <span>Verified Security Findings ({filteredFindings.length})</span>
            </h1>
            <p className="text-xs text-slate-400">Strict Evidence-Driven Cryptographic Observations</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rule, title, session..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Severity Filter Buttons */}
            <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    severityFilter === sev
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Findings List */}
        <div className="space-y-4">
          {filteredFindings.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
              No findings matched the selected filters.
            </div>
          ) : (
            filteredFindings.map((f: Finding) => {
              const isExpanded = expandedIds.has(f.finding_id);

              return (
                <div
                  key={f.finding_id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(f.finding_id)}>
                    <div className="flex items-center space-x-3">
                      {getSeverityBadge(f.severity)}
                      <span className="font-mono text-xs font-bold text-cyan-400">{f.rule_id}</span>
                      <h3 className="font-bold text-white text-sm">{f.title}</h3>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-slate-400">
                      <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                        {f.protocol} • {f.session_id}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Evidence & Details Box */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    
                    {/* Evidence Box */}
                    <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2 font-mono">
                      <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                        Frame / Packet Evidence
                      </div>
                      <div className="text-slate-300">
                        <strong>Session:</strong> {f.evidence.session_id}
                      </div>
                      <div className="text-slate-300">
                        <strong>Packet Frame:</strong> #{f.evidence.packet_number || 'N/A'}
                      </div>
                      <div className="text-slate-300">
                        <strong>Field:</strong> {f.evidence.field}
                      </div>
                      <div className="text-slate-300">
                        <strong>Observed Value:</strong> <span className="text-amber-300">{f.evidence.observed_value}</span>
                      </div>
                    </div>

                    {/* Impact & Recommendation */}
                    <div className="space-y-3">
                      <div>
                        <strong className="text-slate-300 block mb-1">Impact Analysis:</strong>
                        <p className="text-slate-400 text-xs leading-relaxed">{f.impact}</p>
                      </div>

                      <div>
                        <strong className="text-slate-300 block mb-1">Remediation Action:</strong>
                        <p className="text-emerald-400 text-xs leading-relaxed">{f.recommendation}</p>
                      </div>

                      <div className="text-[11px] text-slate-500 pt-1">
                        <strong>Reference Standard:</strong> {f.reference}
                      </div>
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};
