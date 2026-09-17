import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Lock, Upload, LayoutDashboard, ListFilter, Bot, FileText, RefreshCw, Network } from 'lucide-react';

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
          <div className="bg-gradient-to-tr from-cyan-600 to-blue-600 p-2 rounded-xl text-white shadow-lg shadow-cyan-500/20">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">SECUREMAILSCOPE</span>
              <span className="text-xs bg-cyan-500/20 text-cyan-400 font-semibold px-2 py-0.5 rounded-full border border-cyan-500/30">
                SIH26159
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Passive Email Cryptographic PCAP Assessment</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        {analysisId && (
          <nav className="hidden md:flex items-center space-x-1">
            <NavLink
              to={`/overview/${analysisId}`}
              className={({ isActive }) =>
                `flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to={`/sessions/${analysisId}`}
              className={({ isActive }) =>
                `flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              <Network className="w-4 h-4" />
              <span>Sessions</span>
            </NavLink>

            <NavLink
              to={`/findings/${analysisId}`}
              className={({ isActive }) =>
                `flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              <ListFilter className="w-4 h-4" />
              <span>Findings</span>
            </NavLink>

            <NavLink
              to={`/ai/${analysisId}`}
              className={({ isActive }) =>
                `flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              <Bot className="w-4 h-4" />
              <span>AI Analyst</span>
            </NavLink>

            <NavLink
              to={`/reports/${analysisId}`}
              className={({ isActive }) =>
                `flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              <FileText className="w-4 h-4" />
              <span>Report</span>
            </NavLink>
          </nav>
        )}

        {/* Action Button */}
        <div className="flex items-center space-x-2">
          {analysisId ? (
            <button
              onClick={handleNewScan}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
              title="Upload new PCAP capture"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>New Capture</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
            >
              <Upload className="w-4 h-4" />
              <span>Upload PCAP</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
