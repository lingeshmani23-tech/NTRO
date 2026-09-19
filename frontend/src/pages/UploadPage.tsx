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
      setError(err?.message || 'Failed to load demo capture.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Hero Section */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-[#70FFD2]/10 border border-[#70FFD2]/30 rounded-full text-[#70FFD2] text-xs font-semibold">
          <Shield className="w-3.5 h-3.5 text-[#70FFD2]" />
          <span>Passive Email Security Assessment</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-[#F8FAFC] tracking-tight">
          SECUREMAILSCOPE
        </h1>

        <p className="text-[#94A3B8] max-w-2xl mx-auto text-sm leading-relaxed">
          Analyze email traffic captures and identify cryptographic security issues using evidence extracted directly from the PCAP.
        </p>
      </div>

      {/* Protocol Identifiers Bar */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-[#94A3B8]">
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-[#0F172A] rounded-lg border border-[#263449]">
          <span className="w-2 h-2 rounded-full bg-[#70FFD2]" />
          <span>SMTP (Ports 25, 465, 587)</span>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-[#0F172A] rounded-lg border border-[#263449]">
          <span className="w-2 h-2 rounded-full bg-[#FFFC8C]" />
          <span>IMAP (Ports 143, 993)</span>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-[#0F172A] rounded-lg border border-[#263449]">
          <span className="w-2 h-2 rounded-full bg-[#FFCC4D]" />
          <span>POP3 (Ports 110, 995)</span>
        </div>
      </div>

      {/* Main Upload Dropzone Card */}
      <div className="bg-[#0F172A] border border-[#263449] rounded-xl p-6 md:p-8 shadow-xl">
        {error && (
          <div className="mb-6 p-4 bg-[#FF9137]/15 border border-[#FF9137]/30 rounded-lg text-[#FF9137] text-xs flex items-center space-x-3 font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!selectedFile ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#263449] hover:border-[#70FFD2] bg-[#0B1120]/70 hover:bg-[#0B1120] rounded-xl p-10 text-center cursor-pointer transition-all group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              accept=".pcap,.pcapng"
              className="hidden"
            />
            <div className="w-14 h-14 mx-auto bg-[#70FFD2]/10 text-[#70FFD2] rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform border border-[#70FFD2]/20">
              <Upload className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-[#F8FAFC] mb-1">
              Drop PCAP or PCAPNG capture file here
            </h3>
            <p className="text-xs text-[#94A3B8] mb-4">
              Supported: <span className="font-mono text-[#F8FAFC]">.pcap</span> • <span className="font-mono text-[#F8FAFC]">.pcapng</span> (Maximum file size: 100MB)
            </p>
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-[#70FFD2] hover:bg-[#5CE6BD] text-[#0B1120] rounded-lg text-xs font-bold transition-colors shadow-sm">
              <FileSearch className="w-4 h-4" />
              <span>Browse Files</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-[#0B1120] rounded-lg p-4 border border-[#263449] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-[#70FFD2]/15 text-[#70FFD2] rounded-lg border border-[#70FFD2]/30">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-[#F8FAFC] text-xs">{selectedFile.name}</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#70FFD2]/15 text-[#70FFD2] border border-[#70FFD2]/30 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Ready for Analysis</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-[#94A3B8] font-mono mt-0.5">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || 'PCAP Packet Stream'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] underline"
              >
                Change File
              </button>
            </div>

            <button
              onClick={handleUploadSubmit}
              disabled={loading}
              className="w-full py-3 bg-[#70FFD2] hover:bg-[#5CE6BD] text-[#0B1120] font-bold rounded-lg text-xs transition-colors flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
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

        <div className="mt-6 pt-4 border-t border-[#263449] flex items-center justify-between text-[11px] text-[#64748B]">
          <span className="flex items-center space-x-1.5">
            <Lock className="w-3.5 h-3.5 text-[#70FFD2]" />
            <span>Passive Analysis • Zero Packet Injection • 100% Deterministic Rule Engine</span>
          </span>
          <span className="font-mono">TShark Pipeline Active</span>
        </div>
      </div>

      {/* Preset Demo Mode Launcher */}
      <div className="bg-[#0F172A]/80 border border-[#263449] rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#FFFC8C] font-semibold text-xs mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Instant Demo Capture (7 Sessions)</span>
          </div>
          <p className="text-xs text-[#94A3B8]">
            Run an instant security assessment over 7 pre-analyzed email streams featuring legacy TLS 1.0, weak ciphers, and expired certificates.
          </p>
        </div>

        <button
          onClick={handleRunDemo}
          disabled={loading}
          className="px-4 py-2 bg-[#172033] hover:bg-[#1E293B] text-[#F8FAFC] border border-[#263449] rounded-lg text-xs font-semibold transition-colors flex items-center space-x-2 whitespace-nowrap"
        >
          <Play className="w-3.5 h-3.5 text-[#70FFD2] fill-[#70FFD2]" />
          <span>Load Demo Capture</span>
        </button>
      </div>
    </div>
  );
};
