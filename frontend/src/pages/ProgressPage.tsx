import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lock, CheckCircle2, Loader2, AlertCircle, Shield, ArrowRight } from 'lucide-react';
import { fetchAnalysisStatus } from '../services/api';
import type { StatusResponse, StageProgress } from '../types/api';

const STAGE_LABELS: Record<string, string> = {
  validate: '01 PCAP Capture Validated',
  tshark_parse: '02 TShark Packet Extraction',
  protocol_detect: '03 Email Protocol Identification',
  session_reconstruct: '04 TCP Stream Session Reconstruction',
  crypto_analysis: '05 Cryptographic Evidence Extraction',
  rules: '06 Security Rule Engine Execution',
  scoring: '07 Risk Score Calculation',
  ai_assessment: '08 AI Executive Assessment Generation',
};

export const ProgressPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [statusData, setStatusData] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetchAnalysisStatus(id);
        if (!isMounted) return;

        setStatusData(res);

        if (res.status === 'completed') {
          clearInterval(pollInterval);
          setTimeout(() => {
            navigate(`/overview/${id}`);
          }, 800);
        } else if (res.status === 'failed') {
          clearInterval(pollInterval);
          setError('Analysis pipeline failed. Check that the file is a valid PCAP/PCAPNG and try again.');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError('Unable to fetch live analysis status from backend server.');
      }
    }, 500);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [id, navigate]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-semibold">
          <Shield className="w-3.5 h-3.5" />
          <span>Live Analysis Pipeline</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          Processing Capture Stream
        </h1>
        <p className="text-xs text-slate-400 font-mono">
          Analysis ID: {id}
        </p>
      </div>

      {/* Main Pipeline Card */}
      <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-6 shadow-xl space-y-6">
        {error ? (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs flex flex-col items-center space-y-3 text-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <div>
              <h4 className="font-bold text-sm text-white mb-1">Analysis Could Not Be Completed</h4>
              <p className="text-slate-400">{error}</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="mt-2 px-4 py-2 bg-[#172033] hover:bg-[#1E293B] text-slate-200 border border-[#263449] rounded-lg text-xs font-semibold"
            >
              Return to Upload
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {statusData?.progress.map((item: StageProgress, idx: number) => {
              const isDone = item.status === 'completed';
              const isInProgress = item.status === 'in_progress';
              const isFailed = item.status === 'failed';
              const label = STAGE_LABELS[item.stage] || `${String(idx + 1).padStart(2, '0')} ${item.stage}`;

              return (
                <div
                  key={item.stage}
                  className={`p-3.5 rounded-lg border transition-all flex items-center justify-between text-xs ${
                    isDone
                      ? 'bg-[#0B1120] border-emerald-500/30 text-emerald-300'
                      : isInProgress
                      ? 'bg-blue-600/10 border-blue-500/40 text-blue-300'
                      : isFailed
                      ? 'bg-red-500/10 border-red-500/30 text-red-400'
                      : 'bg-[#0B1120]/40 border-[#1E293B] text-slate-500'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : isInProgress ? (
                      <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
                    ) : isFailed ? (
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-700 flex-shrink-0" />
                    )}

                    <div>
                      <span className="font-mono font-semibold tracking-tight block text-slate-200">
                        {label}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {item.detail}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                      isDone
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : isInProgress
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : isFailed
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-4 border-t border-[#1E293B] flex items-center justify-between text-[11px] text-slate-500">
          <span>Deterministic Verification Pipeline</span>
          <span className="font-mono">TShark Stream Active</span>
        </div>
      </div>
    </div>
  );
};
