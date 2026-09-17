import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Network,
  ListFilter,
  Bot,
  FileText,
  Upload,
  RefreshCw,
  Terminal,
  Activity,
  CheckCircle2,
  Menu,
  X,
  Lock,
  Search,
} from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  analysisId: string | null;
  onReset: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, analysisId, onReset }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNewCapture = () => {
    onReset();
    navigate('/');
  };

  const navItems = [
    { label: 'Overview', path: analysisId ? `/overview/${analysisId}` : '/', icon: LayoutDashboard, disabled: !analysisId },
    { label: 'Analysis', path: analysisId ? `/progress/${analysisId}` : '/', icon: Activity, disabled: !analysisId },
    { label: 'Sessions', path: analysisId ? `/sessions/${analysisId}` : '/', icon: Network, disabled: !analysisId },
    { label: 'Findings', path: analysisId ? `/findings/${analysisId}` : '/', icon: ListFilter, disabled: !analysisId },
    { label: 'AI Analyst', path: analysisId ? `/ai/${analysisId}` : '/', icon: Bot, disabled: !analysisId },
    { label: 'Reports', path: analysisId ? `/reports/${analysisId}` : '/', icon: FileText, disabled: !analysisId },
  ];

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 font-sans antialiased flex flex-col md:flex-row">
      {/* LEFT SIDEBAR (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0F172A] border-r border-[#1E293B] flex-shrink-0 min-h-screen sticky top-0 h-screen justify-between z-30">
        <div>
          {/* Brand Header */}
          <div
            onClick={() => navigate('/')}
            className="p-5 border-b border-[#1E293B] flex items-center space-x-3 cursor-pointer hover:bg-[#172033]/50 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm tracking-tight text-white">SECUREMAILSCOPE</span>
              </div>
              <span className="text-[10px] text-slate-400 block font-mono">SIH26159 • Passive Assessment</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <div className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Navigation Workspace
            </div>

            {/* Upload link if no analysis active */}
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive && !analysisId
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#172033]'
                }`
              }
            >
              <Upload className="w-4 h-4" />
              <span>Capture Upload</span>
            </NavLink>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              if (item.disabled) {
                return (
                  <div
                    key={item.label}
                    className="flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 cursor-not-allowed opacity-60"
                    title="Upload PCAP to view analysis"
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#172033]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* System Status Footer */}
        <div className="p-4 border-t border-[#1E293B] bg-[#0B1120]/40 space-y-2">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            System Operational Status
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>TShark Parser</span>
            </span>
            <span className="font-mono text-[10px] text-emerald-400 font-semibold">Ready</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Security Rule Engine</span>
            </span>
            <span className="font-mono text-[10px] text-slate-300">15 Rules</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>AI Analyst Engine</span>
            </span>
            <span className="font-mono text-[10px] text-blue-400">Online</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP HEADER */}
        <header className="h-14 bg-[#0F172A] border-b border-[#1E293B] px-4 md:px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center space-x-3">
            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-slate-400 hover:text-white p-1"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm text-slate-200">SecureMailScope</span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400 hidden sm:inline">Passive Email Security Assessment</span>
            </div>

            {analysisId && (
              <div className="hidden sm:flex items-center space-x-2 border-l border-[#1E293B] pl-3 ml-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-mono text-slate-300">ID: {analysisId.slice(0, 8)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <span className="hidden lg:inline-flex items-center space-x-1.5 px-2.5 py-1 bg-[#172033] border border-[#263449] rounded-md text-[11px] text-slate-300">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Passive Analysis Mode</span>
            </span>

            {analysisId ? (
              <button
                onClick={handleNewCapture}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#172033] hover:bg-[#1E293B] text-slate-200 border border-[#263449] rounded-lg text-xs font-medium transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>New Capture</span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/')}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload PCAP</span>
              </button>
            )}
          </div>
        </header>

        {/* MOBILE MENU DROPDOWN */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0F172A] border-b border-[#1E293B] p-4 space-y-2">
            <NavLink
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-[#172033]"
            >
              <Upload className="w-4 h-4 text-blue-400" />
              <span>Capture Upload</span>
            </NavLink>

            {navItems.map((item) => {
              const Icon = item.icon;
              if (item.disabled) return null;
              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-[#172033]"
                >
                  <Icon className="w-4 h-4 text-blue-400" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        )}

        {/* PAGE CONTENT CONTAINER */}
        <main className="flex-1 p-4 md:p-8 min-w-0">{children}</main>
      </div>
    </div>
  );
};
