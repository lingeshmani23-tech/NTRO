import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAnalysisResult } from '../services/api';
import type { ComplianceResult } from '../types/api';

export const SessionsPage: React.FC = () => {
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
        No label extraction text.{' '}
        <button onClick={() => navigate('/')} className="text-blue-400 underline ml-2">
          Back to Upload
        </button>
      </div>
    );
  }

  const { extracted_data: ext } = data;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-xl font-bold text-white">OCR Extracted Label Raw Text & Confidence</h1>
        
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase">Field Confidence Scores</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(ext.confidence_scores || {}).map(([key, val]) => (
              <div key={key} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex justify-between">
                <span className="text-slate-300 font-medium capitalize">{key.replace('_', ' ')}</span>
                <span className="font-mono font-bold text-blue-400">{(val * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase">Raw OCR Extracted Text</h3>
          <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-200 font-mono whitespace-pre-wrap">
            {ext.raw_text || 'No raw text available.'}
          </pre>
        </div>
      </div>
    </div>
  );
};
