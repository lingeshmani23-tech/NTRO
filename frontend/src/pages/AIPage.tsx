import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Bot, ShieldCheck, CheckCircle2, ArrowLeft } from 'lucide-react';
import { fetchAnalysisResult } from '../services/api';
import type { AnalysisResult } from '../types/api';

export const AIPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchAnalysisResult(id)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-sm">Loading AI Executive Report...</div>;
  }

  if (!data || !id) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        Report not available.{' '}
        <button onClick={() => navigate('/')} className="text-cyan-400 underline ml-2">
          Back to Upload
        </button>
      </div>
    );
  }

  const { ai, score } = data;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Top Header */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-cyan-600/10 text-cyan-400 rounded-xl">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-white">AI Security Analyst Executive Report</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  Provider: {ai.provider.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-400">Guardrailed AI Assessment for Score {score.score}/100 ({score.rating})</p>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 shadow-xl">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Executive Summary</h3>
          <p className="text-sm text-slate-200 leading-relaxed">
            {ai.executive_summary}
          </p>
        </div>

        {/* Why It Matters */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 shadow-xl">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Why It Matters</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {ai.why_it_matters}
          </p>
        </div>

        {/* Priority Action Plan */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Actionable Remediation Plan</h3>
          
          <div className="space-y-3">
            {ai.top_priorities.map((pri, idx) => (
              <div key={idx} className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-start space-x-3 text-xs">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                  {idx + 1}
                </span>
                <span className="text-slate-200 leading-relaxed">{pri}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
