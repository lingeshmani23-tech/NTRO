import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileImage, ShieldCheck, Sparkles, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { uploadPackageImage, triggerDemoAnalysis } from '../services/api';

interface UploadPageProps {
  onAnalysisStarted: (id: string) => void;
}

export const UploadPage: React.FC<UploadPageProps> = ({ onAnalysisStarted }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid package label image (PNG, JPG, JPEG, WEBP).');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Image file size exceeds 20MB limit.');
      return;
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleClearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    try {
      const res = await uploadPackageImage(selectedFile);
      onAnalysisStarted(res.analysis_id);
      navigate(`/progress/${res.analysis_id}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to upload and process package image.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunDemo = async (sampleType: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await triggerDemoAnalysis(sampleType);
      onAnalysisStarted(res.analysis_id);
      navigate(`/progress/${res.analysis_id}`);
    } catch (err: any) {
      setError('Failed to trigger demo package scan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered Legal Metrology Compliance Inspection</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Packaged Commodity Label Verifier
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base">
            Upload an image of a packaged commodity to extract and audit mandatory declarations under Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011.
          </p>
        </div>

        {/* Upload Dropzone */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!selectedFile ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-950/50 hover:bg-slate-900/80 rounded-xl p-10 text-center cursor-pointer transition-all duration-200 group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                accept="image/*"
                className="hidden"
              />
              <div className="w-16 h-16 mx-auto bg-blue-600/10 text-blue-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">
                Drop your package label image here
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Supports PNG, JPG, JPEG, WEBP up to 20MB
              </p>
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20"
              >
                Browse Image File
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="relative bg-slate-950 rounded-xl p-4 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Selected Package Label"
                      className="w-16 h-16 object-cover rounded-lg border border-slate-700"
                    />
                  )}
                  <div>
                    <h4 className="font-semibold text-white text-sm">{selectedFile.name}</h4>
                    <p className="text-xs text-slate-400">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClearFile}
                  className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={handleUploadSubmit}
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/25 disabled:opacity-50"
              >
                {loading ? (
                  <span>Extracting & Verifying...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    <span>Run Legal Metrology Verification</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Demo Quick Presets */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>Or Select a Quick Demo Packaged Commodity</span>
            </h3>
            <span className="text-xs text-slate-400">Instant Verification</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleRunDemo('compliant')}
              disabled={loading}
              className="p-4 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 rounded-xl text-left transition-all group"
            >
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-white text-sm">Compliant Atta Pack</span>
              </div>
              <p className="text-xs text-slate-400">
                100% Fully Compliant label with all 6 mandatory declarations properly printed.
              </p>
            </button>

            <button
              onClick={() => handleRunDemo('non_compliant')}
              disabled={loading}
              className="p-4 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 rounded-xl text-left transition-all group"
            >
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-white text-sm">Defective Tea Box</span>
              </div>
              <p className="text-xs text-slate-400">
                Missing Consumer Care helpline & Country of Origin declaration.
              </p>
            </button>

            <button
              onClick={() => handleRunDemo('critical')}
              disabled={loading}
              className="p-4 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-red-500/40 rounded-xl text-left transition-all group"
            >
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="font-semibold text-white text-sm">Critical Unbranded Soap</span>
              </div>
              <p className="text-xs text-slate-400">
                Multiple critical missing declarations (MRP, Net Quantity, Mfg Date).
              </p>
            </button>
          </div>
        </div>

        {/* Mandatory Declarations Checklist Guide */}
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-5 text-xs text-slate-400 space-y-2">
          <h4 className="font-semibold text-slate-300">Mandatory Rule 6 Declarations Checked:</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div>• Maximum Retail Price (MRP)</div>
            <div>• Net Quantity & Metric Units</div>
            <div>• Manufacturer / Packer Address</div>
            <div>• Date of Mfg / Packing</div>
            <div>• Consumer Care Contact</div>
            <div>• Country of Origin</div>
          </div>
        </div>

      </div>
    </div>
  );
};
