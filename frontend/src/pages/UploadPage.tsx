import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileCode, Shield, Sparkles, AlertCircle, Play, CheckCircle2 } from 'lucide-react';
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
      setError('Unsupported file extension. Please upload a .pcap or .pcapng network capture file.');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('File size exceeds the 100MB limit.');
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
      setError(err?.message || 'Failed to upload and parse PCAP capture.');
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
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" />
            <span>Passive Network Traffic Cryptographic Audit</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Passive Email PCAP Security Assessor
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base">
            Upload a network packet capture file (<span className="text-slate-200 font-mono">.pcap</span> / <span className="text-slate-200 font-mono">.pcapng</span>) to automatically analyze SMTP, IMAP, and POP3 transport security, TLS versions, cipher suites, X.509 certificates, and authentication exposure.
          </p>
        </div>

        {/* Protocol Badges */}
        <div className="flex items-center justify-center space-x-4 text-xs font-semibold text-slate-400">
          <div className="flex items-center space-x-1.5 px-3 py-1 bg-slate-900 rounded-lg border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>SMTP (Ports 25, 465, 587)</span>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1 bg-slate-900 rounded-lg border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>IMAP (Ports 143, 993)</span>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1 bg-slate-900 rounded-lg border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span>POP3 (Ports 110, 995)</span>
          </div>
        </div>

        {/* Upload Dropzone Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!selectedFile ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-cyan-500 bg-slate-950/50 hover:bg-slate-900/80 rounded-xl p-10 text-center cursor-pointer transition-all duration-200 group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                accept=".pcap,.pcapng"
                className="hidden"
              />
              <div className="w-16 h-16 mx-auto bg-cyan-600/10 text-cyan-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">
                Drop your .pcap or .pcapng file here
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Maximum capture file size: 100MB
              </p>
              <button
                type="button"
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-cyan-500/20"
              >
                Browse Capture File
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-cyan-600/10 text-cyan-400 rounded-lg">
                    <FileCode className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm">{selectedFile.name}</h4>
                    <p className="text-xs text-slate-400">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || 'PCAP Stream'}
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
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-cyan-600/25 disabled:opacity-50"
              >
                {loading ? (
                  <span>Extracting & Analyzing...</span>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    <span>Analyze Capture</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Instant Demo Mode Section */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-sm mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Demo Mode (No PCAP Required)</span>
            </div>
            <p className="text-xs text-slate-400">
              Run an instant assessment over 7 synthetic email streams with legacy TLS 1.0, CBC ciphers, and unencrypted authentication findings.
            </p>
          </div>

          <button
            onClick={handleRunDemo}
            disabled={loading}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-2 shadow-sm whitespace-nowrap"
          >
            <Play className="w-4 h-4 text-cyan-400 fill-cyan-400" />
            <span>Load Golden Demo Dataset</span>
          </button>
        </div>

      </div>
    </div>
  );
};
