import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileCode, Shield, Sparkles, AlertCircle, Play, CheckCircle2, Lock, FileSearch } from 'lucide-react';
import { uploadPcapFile, triggerDemoAnalysis } from '../services/api';

interface UploadPageProps {
  onAnalysisStarted: (id: string) => void;
}

export const UploadPage: React.FC<UploadPageProps> = ({ onAnalysisStarted }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    setError(null);
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.pcap' && ext !== '.pcapng') {
      setError('Unsupported file extension. Please upload a valid .pcap or .pcapng network capture file.');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('File size exceeds the 100MB threshold.');
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    try {
      const res = await uploadPcapFile(selectedFile);
      onAnalysisStarted(res.analysis_id);
      navigate(`/progress/${res.analysis_id}`);
    } catch (err: any) {
      setError(err?.message || 'The capture file could not be parsed. Ensure TShark is available and the PCAP is valid.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunDemo = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await triggerDemoAnalysis();
      onAnalysisStarted(res.analysis_id);
      navigate(`/progress/${res.analysis_id}`);
    } catch (err: any) {
      setError('Failed to load demo capture.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Hero Section */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-semibold">
          <Shield className="w-3.5 h-3.5" />
          <span>Passive Email Security Assessment</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          SECUREMAILSCOPE
        </h1>

        <p className="text-slate-400 max-w-2xl mx-auto text-sm leading-relaxed">
          Analyze email traffic captures and identify cryptographic security issues using evidence extracted directly from the PCAP.
        </p>
      </div>

      {/* Protocol Identifiers Bar */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-slate-400">
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-[#0F172A] rounded-lg border border-[#1E293B]">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span>SMTP (Ports 25, 465, 587)</span>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-[#0F172A] rounded-lg border border-[#1E293B]">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>IMAP (Ports 143, 993)</span>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-[#0F172A] rounded-lg border border-[#1E293B]">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>POP3 (Ports 110, 995)</span>
        </div>
      </div>

      {/* Main Upload Dropzone Card */}
      <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-6 md:p-8 shadow-xl">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs flex items-center space-x-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!selectedFile ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#263449] hover:border-blue-500 bg-[#0B1120]/60 hover:bg-[#0B1120] rounded-xl p-10 text-center cursor-pointer transition-all group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              accept=".pcap,.pcapng"
              className="hidden"
            />
            <div className="w-14 h-14 mx-auto bg-blue-600/10 text-blue-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform border border-blue-500/20">
              <Upload className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">
              Drop PCAP or PCAPNG capture file here
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Supported: <span className="font-mono text-slate-300">.pcap</span> • <span className="font-mono text-slate-300">.pcapng</span> (Maximum file size: 100MB)
            </p>
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm">
              <FileSearch className="w-4 h-4" />
              <span>Browse Files</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-[#0B1120] rounded-lg p-4 border border-[#1E293B] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-600/15 text-blue-400 rounded-lg border border-blue-500/30">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-white text-xs">{selectedFile.name}</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Ready for Analysis</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || 'PCAP Packet Stream'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-xs text-slate-400 hover:text-white underline"
              >
                Change File
              </button>
            </div>

            <button
              onClick={handleUploadSubmit}
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs transition-colors flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <span>Parsing & Running TShark Analysis Pipeline...</span>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Analyze Capture</span>
                </>
              )}
            </button>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-[#1E293B] flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center space-x-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Passive Analysis • Zero Packet Injection • 100% Deterministic Rule Engine</span>
          </span>
          <span className="font-mono">TShark Pipeline Active</span>
        </div>
      </div>

      {/* Preset Demo Mode Launcher */}
      <div className="bg-[#0F172A]/70 border border-[#1E293B] rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-400 font-semibold text-xs mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Instant Demo Capture (7 Sessions)</span>
          </div>
          <p className="text-xs text-slate-400">
            Run an instant security assessment over 7 pre-analyzed email streams featuring legacy TLS 1.0, weak ciphers, and expired certificates.
          </p>
        </div>

        <button
          onClick={handleRunDemo}
          disabled={loading}
          className="px-4 py-2 bg-[#172033] hover:bg-[#1E293B] text-slate-200 border border-[#263449] rounded-lg text-xs font-semibold transition-colors flex items-center space-x-2 whitespace-nowrap"
        >
          <Play className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
          <span>Load Demo Capture</span>
        </button>
      </div>
    </div>
  );
};
