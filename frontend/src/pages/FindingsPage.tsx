import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAnalysisResult } from '../services/api';
import type { ComplianceResult, ComplianceCheck } from '../types/api';

export const FindingsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<ComplianceResult | null>(null);

  useEffect(() => {
    if (id) {
      fetchAnalysisResult(id).then(setData).catch(() => {});
    }
  }, [id]);

  if (!id || !data) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        No verification data.{' '}
        <button onClick={() => navigate('/')} className="text-blue-400 underline ml-2">
          Back to Upload
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-xl font-bold text-white">Rule Verification Findings</h1>
        <div className="space-y-4">
          {data.checks.map((check: ComplianceCheck) => (
            <div key={check.rule_id} className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-blue-400 text-xs">{check.rule_id}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  check.status === 'PASS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {check.status}
                </span>
              </div>
              <h3 className="font-bold text-white text-sm">{check.title}</h3>
              <p className="text-xs text-slate-300">{check.message}</p>
              <p className="text-xs text-slate-400"><strong>Recommendation:</strong> {check.recommendation}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
