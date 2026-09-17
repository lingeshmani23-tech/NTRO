import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ShieldCheck, Upload, LayoutDashboard, FileText, RefreshCw, CheckCircle2 } from 'lucide-react';

interface TopNavProps {
  analysisId: string | null;
  onReset: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ analysisId, onReset }) => {
  const navigate = useNavigate();

  const handleNewScan = () => {
    onReset();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-2 rounded-xl text-white shadow-lg shadow-blue-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">LEGAL METROLOGY</span>
              <span className="text-xs bg-blue-500/20 text-blue-400 font-semibold px-2 py-0.5 rounded-full border border-blue-500/30">
                SIH26034
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Packaged Commodities Compliance Audit</p>
          </div>
        </div>

        {/* Workflow Steps */}
        <div className="hidden md:flex items-center space-x-4 bg-slate-800/60 px-4 py-1.5 rounded-full border border-slate-700/50 text-xs">
          <div className={`flex items-center space-x-1.5 ${!analysisId ? 'text-blue-400 font-medium' : 'text-slate-400'}`}>
            <span className="w-4 h-4 rounded-full bg-blue-500/20 border border-blue-400 flex items-center justify-center text-[10px]">1</span>
            <span>SCAN</span>
          </div>
          <span className="text-slate-600">→</span>
          <div className={`flex items-center space-x-1.5 ${analysisId ? 'text-blue-400 font-medium' : 'text-slate-400'}`}>
            <span className="w-4 h-4 rounded-full bg-blue-500/20 border border-blue-400 flex items-center justify-center text-[10px]">2</span>
            <span>EXTRACT</span>
          </div>
          <span className="text-slate-600">→</span>
          <div className={`flex items-center space-x-1.5 ${analysisId ? 'text-blue-400 font-medium' : 'text-slate-400'}`}>
            <span className="w-4 h-4 rounded-full bg-blue-500/20 border border-blue-400 flex items-center justify-center text-[10px]">3</span>
            <span>VERIFY</span>
          </div>
          <span className="text-slate-600">→</span>
          <div className={`flex items-center space-x-1.5 ${analysisId ? 'text-blue-400 font-medium' : 'text-slate-400'}`}>
            <span className="w-4 h-4 rounded-full bg-blue-500/20 border border-blue-400 flex items-center justify-center text-[10px]">4</span>
            <span>REPORT</span>
          </div>
        </div>

        {/* Navigation Links & Reset Action */}
        <div className="flex items-center space-x-2">
          {analysisId ? (
            <>
              <NavLink
                to={`/overview/${analysisId}`}
                className={({ isActive }) =>
                  `flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`
                }
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </NavLink>

              <NavLink
                to={`/reports/${analysisId}`}
                className={({ isActive }) =>
                  `flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`
                }
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Report</span>
              </NavLink>

              <button
                onClick={handleNewScan}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
                title="Reset and perform another scan"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>New Scan</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Label</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
