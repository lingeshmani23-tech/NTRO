import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { fetchAnalysisStatus } from '../services/api';
import type { StatusResponse, StageProgress } from '../types/api';

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
          setError('Compliance verification pipeline failed. Please try again.');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError('Unable to fetch verification progress.');
      }
    }, 600);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [id, navigate]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl text-center">
        
        <div className="w-16 h-16 mx-auto bg-blue-600/10 text-blue-400 rounded-2xl flex items-center justify-center animate-pulse">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-white">Auditing Package Label</h2>
          <p className="text-xs text-slate-400 mt-1">Executing Rule 6 Legal Metrology Verification</p>
        </div>

        {error ? (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="space-y-3 text-left">
            {statusData?.progress.map((item: StageProgress) => {
              const isDone = item.status === 'completed';
              const isInProgress = item.status === 'in_progress';

              return (
                <div
                  key={item.stage}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between text-xs ${
                    isDone
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : isInProgress
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                      : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isInProgress ? (
                      <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-700" />
                    )}
                    <span className="font-medium">{item.detail}</span>
                  </div>
                  <span className="text-[10px] uppercase font-semibold">
                    {item.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
