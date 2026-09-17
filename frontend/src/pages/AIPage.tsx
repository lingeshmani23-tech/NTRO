import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Bot, Info } from 'lucide-react';
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
    return <div className="min-h-[50vh] flex items-center justify-center text-[#94A3B8] text-xs font-mono">Loading AI Executive Report...</div>;
  }

  if (!data || !id) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-4 text-center">
        <h3 className="text-base font-bold text-[#F8FAFC] mb-1">Report Not Available</h3>
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-[#70FFD2] hover:bg-[#5CE6BD] text-[#0B1120] font-bold text-xs rounded-lg">
          Return to Upload
        </button>
      </div>
    );
  }

  const { ai } = data;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner with #FFFC8C AI Accent */}
      <div className="bg-[#0F172A] border border-[#263449] p-5 rounded-xl shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#FFFC8C]/15 border border-[#FFFC8C]/30 text-[#FFFC8C] flex items-center justify-center">
            <Bot className="w-5 h-5 text-[#FFFC8C]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-[#F8FAFC] tracking-tight">AI SECURITY ANALYST</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FFFC8C]/15 text-[#FFFC8C] border border-[#FFFC8C]/30">
                {ai.provider.toUpperCase()} ENGINE
              </span>
            </div>
            <p className="text-xs text-[#94A3B8]">Explanation based strictly on verified cryptographic security findings</p>
          </div>
        </div>
      </div>

      {/* AI Guardrail Disclaimer Banner */}
      <div className="p-3 bg-[#0B1120] border border-[#263449] rounded-lg text-xs text-[#94A3B8] flex items-center space-x-2.5">
        <Info className="w-4 h-4 text-[#FFFC8C] flex-shrink-0" />
        <span>
          <strong className="text-[#FFFC8C]">AI interpretation of verified evidence:</strong> The AI Security Analyst translates deterministic findings and evidence into human-readable executive summaries and prioritized remediation guidance. AI does not detect vulnerabilities independently or modify calculated security scores.
        </span>
      </div>

      {/* Executive Summary Card */}
      <div className="bg-[#0F172A] border border-[#263449] rounded-xl p-6 space-y-3 shadow-xl">
        <h3 className="text-xs font-bold text-[#FFFC8C] uppercase tracking-wider">Executive Summary</h3>
        <p className="text-sm text-[#F8FAFC] leading-relaxed font-sans">
          {ai.executive_summary}
        </p>
      </div>

      {/* Why This Matters */}
      <div className="bg-[#0F172A] border border-[#263449] rounded-xl p-6 space-y-3 shadow-xl">
        <h3 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">Why This Matters</h3>
        <p className="text-xs text-[#94A3B8] leading-relaxed font-sans">
          {ai.why_it_matters}
        </p>
      </div>

      {/* Actionable Remediation Roadmap */}
      <div className="bg-[#0F172A] border border-[#263449] rounded-xl p-6 space-y-4 shadow-xl">
        <h3 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">Actionable Remediation Action Plan</h3>

        <div className="space-y-3">
          {ai.top_priorities.map((pri, idx) => (
            <div key={idx} className="p-4 bg-[#0B1120] rounded-lg border border-[#263449] flex items-start space-x-3 text-xs">
              <span className="w-5 h-5 rounded-full bg-[#FFFC8C]/20 border border-[#FFFC8C]/40 text-[#FFFC8C] font-mono font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                {idx + 1}
              </span>
              <span className="text-[#F8FAFC] leading-relaxed font-sans">{pri}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
