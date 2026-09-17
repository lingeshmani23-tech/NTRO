import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileCode,
  Play,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Info,
  ChevronDown,
  ChevronUp,
  Terminal,
  Cpu,
} from 'lucide-react';
import { fetchHealth, triggerDemoAnalysis, uploadPcapFile } from '../services/api';
import type { HealthResponse } from '../types/api';

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showSetupInstructions, setShowSetupInstructions] = useState(false);
  const [tsharkUnavailableNotice, setTsharkUnavailableNotice] = useState(false);

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch((err) => {
        console.error('Health check failed:', err);
        setHealth({
          status: 'error',
          tshark_available: false,
          tshark_version: null,
          tshark_path: null,
          tshark_error: 'Backend connection failed or TShark check error.',
          ai_provider: 'fallback',
        });
      });
  }, []);

  const handleFileSelection = (file: File) => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.pcap' && ext !== '.pcapng') {
      setErrorMsg('Only .pcap and .pcapng network capture files are supported.');
      setSelectedFile(null);
      return;
    }
    setErrorMsg(null);
    setErrorHint(null);
    setTsharkUnavailableNotice(false);
    setSelectedFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyzeTraffic = async () => {
    if (!selectedFile) return;

    if (health && !health.tshark_available) {
      setTsharkUnavailableNotice(true);
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setErrorHint(null);
    setTsharkUnavailableNotice(false);

    try {
      const res = await uploadPcapFile(selectedFile);
      navigate(`/analysis/${res.analysis_id}/progress`);
    } catch (err: any) {
      setIsUploading(false);
      setErrorMsg(err.message || 'Upload failed');
      setErrorHint(err.hint || null);
    }
  };

  const handleDemo = async () => {
    setIsUploading(true);
    setErrorMsg(null);
    setErrorHint(null);
    try {
      const res = await triggerDemoAnalysis();
      navigate(`/analysis/${res.analysis_id}/progress`);
    } catch (err: any) {
      setIsUploading(false);
      setErrorMsg('Failed to launch demo analysis');
    }
  };

  const isTsharkAvailable = health?.tshark_available ?? false;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header Banner */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono font-bold uppercase tracking-widest mb-3">
          <Shield className="w-3.5 h-3.5" />
          <span>SECUREMAILSCOPE</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
          Analyze Email Traffic Security
        </h1>
        <p className="text-slate-400 max-w-xl mx-auto text-sm mt-2 leading-relaxed">
          Upload passive packet capture files (<code className="text-primary font-mono font-semibold">.pcap</code>,{' '}
          <code className="text-primary font-mono font-semibold">.pcapng</code>) for automated TLS & credential auditing.
        </p>
      </div>

      {/* Main Upload Card */}
      <div className="bg-ink-soft border border-line rounded-xl p-8 mb-6 shadow-xl relative overflow-hidden">
        {/* Large Drag & Drop Upload Zone (Always active) */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 transition-all text-center ${
            isDragOver
              ? 'border-primary bg-primary/10'
              : selectedFile
              ? 'border-secure/50 bg-secure/5'
              : 'border-line hover:border-primary/60 bg-slate-900/60'
          }`}
        >
          <input
            type="file"
            id="pcapFile"
            accept=".pcap,.pcapng"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />

          {!selectedFile ? (
            <div className="space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-primary shadow-inner">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-200">
                  Drop PCAP / PCAPNG file here or{' '}
                  <label
                    htmlFor="pcapFile"
                    className="text-primary underline cursor-pointer hover:text-blue-400 font-bold"
                  >
                    Browse files
                  </label>
                </p>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Supported extensions: .pcap, .pcapng &bull; Max limit: 100 MB
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-ink border border-line p-5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary flex-shrink-0">
                  <FileCode className="w-6 h-6" />
                </div>
                <div className="text-left font-mono">
                  <div className="text-sm font-bold text-slate-100">{selectedFile.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5 flex items-center space-x-3">
                    <span>Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                    <span>&bull;</span>
                    <span>Type: {selectedFile.name.split('.').pop()?.toUpperCase()} capture</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setTsharkUnavailableNotice(false);
                  setErrorMsg(null);
                }}
                className="text-xs font-mono font-semibold text-slate-400 hover:text-white px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex-shrink-0"
              >
                Change File
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4 mt-6">
          <button
            type="button"
            onClick={handleAnalyzeTraffic}
            disabled={!selectedFile || isUploading}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition-all shadow-md ${
              selectedFile && !isUploading
                ? 'bg-primary hover:bg-blue-600 text-white shadow-primary/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-line'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>{isUploading ? 'Uploading & Processing...' : 'Analyze Traffic'}</span>
          </button>

          <button
            type="button"
            onClick={handleDemo}
            disabled={isUploading}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 flex items-center justify-center space-x-2 transition-all shadow-sm"
          >
            <Play className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>Try Demo Analysis</span>
          </button>
        </div>

        {/* TShark Unavailable Warning Box when user attempts to analyze live PCAP */}
        {tsharkUnavailableNotice && (
          <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-left">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-warning font-mono uppercase tracking-wider">
                  TShark is not available for live PCAP parsing.
                </h4>
                <p className="text-xs text-slate-300 mt-1">
                  Live packet parsing requires Wireshark/TShark installed on the host system. You can run Demo Analysis to inspect synthetic SMTP/IMAP/POP3 captures right now.
                </p>
                <div className="mt-3 flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={handleDemo}
                    className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-amber-400 transition-colors flex items-center space-x-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-slate-950" />
                    <span>Run Demo Analysis</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Envelope Display */}
        {errorMsg && (
          <div className="mt-6 p-4 bg-red-900/30 border border-red-500/40 rounded-xl text-left font-mono text-xs text-red-200">
            <div className="flex items-center space-x-2 font-bold text-red-400 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span>Error: {errorMsg}</span>
            </div>
            {errorHint && <div className="text-slate-300 mt-1 pl-6">Hint: {errorHint}</div>}
          </div>
        )}
      </div>

      {/* ANALYSIS ENGINE System Status Card (Compact & Secondary) */}
      <div className="bg-ink-soft/80 border border-line rounded-xl p-5 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                ANALYSIS ENGINE
              </div>
              <div className="flex items-center space-x-2 mt-0.5">
                {isTsharkAvailable ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">TShark Ready</span>
                    {health?.tshark_version && (
                      <span className="text-xs text-slate-400 font-mono font-medium">
                        ({health.tshark_version.split('(')[0].strip?.() || health.tshark_version})
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="text-sm font-bold text-amber-400 font-mono">TShark Not Detected</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {!isTsharkAvailable && (
              <button
                type="button"
                onClick={() => setShowSetupInstructions(!showSetupInstructions)}
                className="text-xs font-mono text-slate-400 hover:text-white flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg transition-colors"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Setup Instructions</span>
                {showSetupInstructions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}

            <div className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
              ● Demo Mode Available
            </div>
          </div>
        </div>

        {/* TShark Info Detail */}
        {isTsharkAvailable && health?.tshark_path && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs font-mono text-slate-400 flex items-center space-x-2">
            <span className="text-slate-500">Path:</span>
            <code className="text-slate-300 bg-slate-900 px-2 py-0.5 rounded">{health.tshark_path}</code>
          </div>
        )}

        {!isTsharkAvailable && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
            <p>Real PCAP analysis requires Wireshark/TShark installed on the host operating system.</p>
          </div>
        )}

        {/* Expandable Setup Instructions Accordion */}
        {!isTsharkAvailable && showSetupInstructions && (
          <div className="mt-4 pt-4 border-t border-slate-800 font-mono text-xs text-slate-300 bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="font-bold text-slate-100 flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-primary" />
              <span>Installing TShark / Wireshark</span>
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-primary font-bold">Windows:</span> Download Wireshark installer from{' '}
                <a
                  href="https://www.wireshark.org/download.html"
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-blue-400"
                >
                  wireshark.org
                </a>{' '}
                or set <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">TSHARK_PATH</code> to your tshark.exe binary.
              </div>
              <div>
                <span className="text-primary font-bold">Ubuntu / Debian:</span>{' '}
                <code className="bg-slate-900 px-2 py-1 rounded text-slate-200">sudo apt update && sudo apt install -y tshark</code>
              </div>
              <div>
                <span className="text-primary font-bold">macOS:</span>{' '}
                <code className="bg-slate-900 px-2 py-1 rounded text-slate-200">brew install tshark</code>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-ink-soft border border-line p-5 rounded-xl">
          <div className="text-primary font-bold text-sm font-mono mb-1 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Pure Deterministic Scoring</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Risk scores (0–100) are computed purely from distinct observed packet evidence penalties. Same capture always produces identical results.
          </p>
        </div>

        <div className="bg-ink-soft border border-line p-5 rounded-xl">
          <div className="text-primary font-bold text-sm font-mono mb-1 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Strict Evidence Standard</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every finding links to exact frame numbers and field values. Unknown parameters return null and never create false findings.
          </p>
        </div>

        <div className="bg-ink-soft border border-line p-5 rounded-xl">
          <div className="text-primary font-bold text-sm font-mono mb-1 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>AI Analyst Guardrails</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            AI executive summaries run post-scoring and are strictly validated. Hallucinated rules or scores trigger automatic fallback.
          </p>
        </div>
      </div>
    </div>
  );
};

