import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lock, CheckCircle2, Loader2, AlertCircle, Shield } from 'lucide-react';
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
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-[#70FFD2]/10 border border-[#70FFD2]/30 rounded-full text-[#70FFD2] text-xs font-semibold">
          <Shield className="w-3.5 h-3.5 text-[#70FFD2]" />
          <span>Live Analysis Pipeline</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
          Processing Capture Stream
        </h1>
        <p className="text-xs text-[#94A3B8] font-mono">
          Analysis ID: {id}
        </p>
      </div>

      {/* Main Pipeline Card */}
      <div className="bg-[#0F172A] border border-[#263449] rounded-xl p-6 shadow-xl space-y-6">
        {error ? (
          <div className="p-4 bg-[#FF9137]/15 border border-[#FF9137]/30 rounded-lg text-[#FF9137] text-xs flex flex-col items-center space-y-3 text-center font-semibold">
            <AlertCircle className="w-8 h-8 text-[#FF9137]" />
            <div>
              <h4 className="font-bold text-sm text-[#F8FAFC] mb-1">Analysis Could Not Be Completed</h4>
              <p className="text-[#94A3B8] font-normal">{error}</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="mt-2 px-4 py-2 bg-[#172033] hover:bg-[#1E293B] text-[#F8FAFC] border border-[#263449] rounded-lg text-xs font-semibold"
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
                      ? 'bg-[#0B1120] border-[#70FFD2]/30 text-[#70FFD2]'
                      : isInProgress
                      ? 'bg-[#FFFC8C]/10 border-[#FFFC8C]/40 text-[#FFFC8C]'
                      : isFailed
                      ? 'bg-[#FF9137]/15 border-[#FF9137]/30 text-[#FF9137]'
                      : 'bg-[#0B1120]/40 border-[#263449] text-[#64748B]'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-[#70FFD2] flex-shrink-0" />
                    ) : isInProgress ? (
                      <Loader2 className="w-4 h-4 text-[#FFFC8C] animate-spin flex-shrink-0" />
                    ) : isFailed ? (
                      <AlertCircle className="w-4 h-4 text-[#FF9137] flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-[#64748B] flex-shrink-0" />
                    )}

                    <div>
                      <span className="font-mono font-semibold tracking-tight block text-[#F8FAFC]">
                        {label}
                      </span>
                      <span className="text-[11px] text-[#94A3B8] block mt-0.5">
                        {item.detail}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                      isDone
                        ? 'bg-[#70FFD2]/15 text-[#70FFD2] border border-[#70FFD2]/30'
                        : isInProgress
                        ? 'bg-[#FFFC8C]/15 text-[#FFFC8C] border border-[#FFFC8C]/30'
                        : isFailed
                        ? 'bg-[#FF9137]/15 text-[#FF9137] border border-[#FF9137]/30'
                        : 'bg-[#172033] text-[#64748B]'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-4 border-t border-[#263449] flex items-center justify-between text-[11px] text-[#64748B]">
          <span>Deterministic Verification Pipeline</span>
          <span className="font-mono">TShark Stream Active</span>
        </div>
      </div>
    </div>
  );
};
