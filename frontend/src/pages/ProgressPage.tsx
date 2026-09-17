import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, AlertCircle, Clock, ArrowRight, RotateCcw } from 'lucide-react';
import { fetchAnalysisStatus } from '../services/api';
import type { StatusResponse } from '../types/api';

export const ProgressPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [statusData, setStatusData] = useState<StatusResponse | null>(null);

  useEffect(() => {
    if (!id) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetchAnalysisStatus(id);
        setStatusData(res);

        if (res.status === 'completed') {
          clearInterval(interval);
          setTimeout(() => {
            navigate(`/analysis/${id}/overview`);
          }, 800);
        } else if (res.status === 'failed') {
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Failed to poll status:', err);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [id, navigate]);

  if (!statusData) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
        <p className="text-sm font-mono text-slate-400">Initializing assessment engine...</p>
      </div>
    );
  }

  const isFailed = statusData.status === 'failed';
  const isCompleted = statusData.status === 'completed';

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Header Info */}
      <div className="bg-ink-soft border border-line rounded-xl p-6 mb-8 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100 font-mono">Analysis Progress</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">Analysis ID: {id}</p>
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>Elapsed: {statusData.elapsed_ms} ms</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono font-semibold">
            <span className="text-slate-300">Overall Completion</span>
            <span className="text-primary">{statusData.percent}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-line">
            <div
              className={`h-full transition-all duration-300 ${
                isFailed ? 'bg-critical' : isCompleted ? 'bg-secure' : 'bg-primary'
              }`}
              style={{ width: `${statusData.percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Error Envelope on Failure */}
      {isFailed && statusData.error && (
        <div className="bg-red-900/30 border border-red-500/40 rounded-xl p-6 mb-8 text-left font-mono">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-critical flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-critical uppercase tracking-wider">
                Stage Execution Failed: [{statusData.error.code || 'ERROR'}]
              </h3>
              <p className="text-xs text-slate-200">{statusData.error.message}</p>
              {statusData.error.hint && (
                <p className="text-xs text-slate-400 bg-slate-950 p-2 rounded border border-slate-800">
                  Hint: {statusData.error.hint}
                </p>
              )}
              <button
                onClick={() => navigate('/')}
                className="mt-3 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center space-x-2 border border-line transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Return to Upload & Retry</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline of 9 Canonical Stages */}
      <div className="bg-ink-soft border border-line rounded-xl p-6 shadow-md">
        <h3 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider mb-6">
          Assessment Timeline Stages
        </h3>

        <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-line">
          {statusData.stages.map((stage, idx) => {
            const isDone = stage.state === 'done';
            const isActive = stage.state === 'active';
            const isStageFailed = stage.state === 'failed';

            return (
              <div key={stage.id} className="relative flex items-center justify-between group">
                {/* Stage Status Icon */}
                <div
                  className={`absolute -left-6 w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                    isDone
                      ? 'bg-secure/20 border-secure text-secure'
                      : isActive
                      ? 'bg-primary/20 border-primary text-primary'
                      : isStageFailed
                      ? 'bg-critical/20 border-critical text-critical'
                      : 'bg-slate-900 border-line text-slate-600'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : isActive ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isStageFailed ? (
                    <AlertCircle className="w-3.5 h-3.5" />
                  ) : (
                    <span className="text-[10px] font-mono font-bold">{idx + 1}</span>
                  )}
                </div>

                {/* Stage Info */}
                <div className="pl-4">
                  <div className="text-sm font-semibold text-slate-200 font-mono flex items-center space-x-2">
                    <span>{stage.label}</span>
                    <span className="text-[10px] font-mono text-slate-500">({stage.id})</span>
                  </div>
                  {stage.error && (
                    <div className="text-xs text-critical font-mono mt-0.5">{stage.error}</div>
                  )}
                </div>

                {/* Stage Duration / State Pill */}
                <div className="text-xs font-mono">
                  {isDone && <span className="text-slate-400 font-medium">{stage.ms} ms</span>}
                  {isActive && (
                    <span className="text-primary font-bold animate-pulse px-2 py-0.5 bg-primary/10 rounded">
                      Processing...
                    </span>
                  )}
                  {stage.state === 'pending' && <span className="text-slate-600">Pending</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* View Dashboard Button when Completed */}
      {isCompleted && (
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate(`/analysis/${id}/overview`)}
            className="px-8 py-3 bg-secure hover:bg-green-700 text-white font-bold rounded-xl text-sm flex items-center justify-center space-x-2 mx-auto shadow-lg transition-all"
          >
            <span>View Security Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
