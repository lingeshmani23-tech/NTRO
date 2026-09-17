import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Filter, ChevronDown, ChevronUp, FileCode, ExternalLink } from 'lucide-react';
import type { Finding } from '../types/api';

interface FindingsPageProps {
  findings: Finding[];
  analysisId: string;
}

export const FindingsPage: React.FC<FindingsPageProps> = ({ findings, analysisId }) => {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const severities = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

  const filteredFindings = findings.filter((f) => {
    if (selectedSeverity === 'ALL') return true;
    return f.severity === selectedSeverity;
  });

  const toggleExpand = (idxKey: string) => {
    setExpandedIds((prev) => ({ ...prev, [idxKey]: !prev[idxKey] }));
  };

  const getSeverityBadgeClass = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-critical/20 text-critical border-critical/40';
      case 'HIGH':
        return 'bg-high/20 text-high border-high/40';
      case 'MEDIUM':
        return 'bg-warning/20 text-warning border-warning/40';
      case 'LOW':
        return 'bg-slate-700 text-slate-300 border-slate-600';
      case 'INFO':
      default:
        return 'bg-info/20 text-info border-info/40';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 font-mono flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-critical" />
            <span>Security Findings & Evidence ({findings.length})</span>
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Rule-based findings derived strictly from observed packet evidence. Unknown parameters do not fire findings.
          </p>
        </div>

        {/* Severity Filter Chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
          {severities.map((sev) => {
            const count =
              sev === 'ALL' ? findings.length : findings.filter((f) => f.severity === sev).length;
            const isActive = selectedSeverity === sev;

            return (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-line'
                }`}
              >
                <span>{sev}</span>
                <span className="px-1.5 py-0.2 bg-black/30 rounded text-[10px]">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-4">
        {filteredFindings.map((finding, index) => {
          const itemKey = `${finding.rule_id}-${finding.session_id}-${index}`;
          const isExpanded = expandedIds[itemKey] ?? true; // Default expanded for rich SOC look

          return (
            <div
              key={itemKey}
              className="bg-ink-soft border border-line rounded-xl overflow-hidden shadow-md transition-all hover:border-slate-700"
            >
              {/* Finding Card Top Bar */}
              <div
                onClick={() => toggleExpand(itemKey)}
                className="p-4 flex items-center justify-between cursor-pointer select-none bg-slate-900/60 hover:bg-slate-800/60"
              >
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold border ${getSeverityBadgeClass(
                      finding.severity
                    )}`}
                  >
                    {finding.severity}
                  </span>

                  <span className="px-2 py-0.5 bg-slate-800 text-primary border border-primary/30 rounded text-xs font-mono font-bold">
                    {finding.rule_id}
                  </span>

                  <h3 className="text-sm font-bold text-slate-100 font-mono">{finding.title}</h3>
                </div>

                <div className="flex items-center space-x-3 text-xs font-mono">
                  <span className="text-slate-400">
                    Session:{' '}
                    <Link
                      to={`/analysis/${analysisId}/sessions`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-primary hover:underline font-bold"
                    >
                      {finding.session_id}
                    </Link>
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Finding Card Expanded Content */}
              {isExpanded && (
                <div className="p-5 border-t border-line/60 space-y-4 font-mono text-xs">
                  <p className="text-slate-300 leading-relaxed">{finding.description}</p>

                  {/* Evidence Block (Mono, Tinted Panel) */}
                  <div className="bg-ink border border-line rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between text-slate-400 font-bold border-b border-line/60 pb-2">
                      <span className="flex items-center space-x-1.5 text-primary">
                        <FileCode className="w-4 h-4" />
                        <span>Observed Packet Evidence Payload</span>
                      </span>
                      <span>Frame #{finding.evidence.packet_number}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-300 pt-1">
                      <div>
                        <span className="text-slate-500">Target Session ID: </span>
                        <span className="text-primary font-bold">{finding.evidence.session_id}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Evidence Field Name: </span>
                        <span className="text-slate-200">{finding.evidence.field}</span>
                      </div>
                      <div className="md:col-span-2">
                        <span className="text-slate-500">Observed Packet Value: </span>
                        <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold">
                          {String(finding.evidence.observed_value)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Impact & Recommendation */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-red-950/20 border border-red-900/40 p-3 rounded-lg">
                      <h4 className="font-bold text-critical mb-1 uppercase tracking-wider text-[11px]">
                        Observed Impact
                      </h4>
                      <p className="text-slate-300">{finding.impact}</p>
                    </div>

                    <div className="bg-blue-950/20 border border-blue-900/40 p-3 rounded-lg">
                      <h4 className="font-bold text-primary mb-1 uppercase tracking-wider text-[11px]">
                        Remediation Recommendation
                      </h4>
                      <p className="text-slate-300">{finding.recommendation}</p>
                    </div>
                  </div>

                  {/* Reference Standard */}
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-line/40">
                    <span className="font-bold text-slate-300">Compliance Reference Standard: </span>
                    <span className="text-slate-400">{finding.reference}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
