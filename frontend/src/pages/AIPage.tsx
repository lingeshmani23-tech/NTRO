import React from 'react';
import { Cpu, ShieldCheck, AlertTriangle, ListOrdered, Wrench, Info } from 'lucide-react';
import type { AIAssessment, RiskScore } from '../types/api';

interface AIPageProps {
  ai: AIAssessment;
  score: RiskScore;
}

export const AIPage: React.FC<AIPageProps> = ({ ai, score }) => {
  const isLLM = ai.provider === 'llm';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Provider Badge */}
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 font-mono flex items-center space-x-2">
            <Cpu className="w-6 h-6 text-primary" />
            <span>AI Security Analyst Assessment</span>
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Automated synthesis of executive summaries, risk prioritization, and technical remediation roadmaps.
          </p>
        </div>

        {/* Provider Badge */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono text-slate-400">Analyst Provider:</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
              isLLM
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-blue-500/20 text-primary border border-primary/40'
            }`}
          >
            {isLLM ? 'LLM (LLM_API_KEY Active)' : 'Deterministic Fallback Engine'}
          </span>
        </div>
      </div>

      {/* Guardrail Notice */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-start space-x-3 text-xs font-mono text-slate-300">
        <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-200">Strict AI Architecture Guardrail: </span>
          The AI analyst layer operates purely post-scoring. It consumes validated findings and cannot create new findings, invent packet numbers, or modify the deterministic risk score ({score.score}/100).
        </div>
      </div>

      {/* Executive Summary Card */}
      <div className="bg-ink-soft border border-line rounded-xl p-6 shadow-md space-y-4 font-mono">
        <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4" />
          <span>Executive Summary & Risk Rationale</span>
        </h3>
        <p className="text-sm text-slate-200 leading-relaxed bg-ink border border-line p-4 rounded-xl">
          {ai.executive_summary}
        </p>

        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider pt-2 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Why It Matters</span>
        </h4>
        <p className="text-xs text-slate-300 leading-relaxed bg-ink border border-line p-4 rounded-xl">
          {ai.why_it_matters}
        </p>
      </div>

      {/* Top Priorities List Card */}
      <div className="bg-ink-soft border border-line rounded-xl p-6 shadow-md space-y-4 font-mono">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
          <ListOrdered className="w-4 h-4 text-primary" />
          <span>Top Security Remediation Priorities ({ai.top_priorities.length})</span>
        </h3>

        <div className="space-y-3">
          {ai.top_priorities.map((priority, idx) => (
            <div
              key={idx}
              className="flex items-start space-x-3 bg-ink border border-line p-4 rounded-xl"
            >
              <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <p className="text-xs text-slate-200 leading-relaxed pt-0.5">{priority}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Remediation Table Card */}
      <div className="bg-ink-soft border border-line rounded-xl p-6 shadow-md space-y-4 font-mono">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
          <Wrench className="w-4 h-4 text-primary" />
          <span>Technical Remediation Roadmap</span>
        </h3>

        <div className="overflow-x-auto border border-line/60 rounded-xl">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/90 text-slate-400 font-bold border-b border-line uppercase tracking-wider">
              <tr>
                <th className="p-3">Priority</th>
                <th className="p-3">Action Required</th>
                <th className="p-3">Associated Rule IDs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {ai.remediation.map((rem, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="p-3 font-bold text-primary">P{rem.priority}</td>
                  <td className="p-3 text-slate-200">{rem.action}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {rem.rule_ids.map((rid) => (
                        <span
                          key={rid}
                          className="px-2 py-0.5 bg-slate-800 text-amber-400 border border-amber-500/30 rounded text-[11px] font-bold"
                        >
                          {rid}
                        </span>
                      ))}
                    </div>
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
