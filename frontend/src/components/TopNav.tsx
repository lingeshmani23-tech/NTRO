import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Shield, ShieldAlert, FileText, Database, Activity, Cpu, FileDown, Layers } from 'lucide-react';
import type { AnalysisResult } from '../types/api';

interface TopNavProps {
  analysis?: AnalysisResult | null;
}

export const TopNav: React.FC<TopNavProps> = ({ analysis }) => {
  const location = useLocation();
  const { id } = useParams<{ id: string }>();

  const isDemo = analysis?.data_source === 'synthetic';

  const navItems = id
    ? [
        { label: 'Overview', path: `/analysis/${id}/overview`, icon: Activity },
        { label: 'Sessions', path: `/analysis/${id}/sessions`, icon: Layers },
        { label: 'Findings', path: `/analysis/${id}/findings`, icon: ShieldAlert },
        { label: 'AI Analyst', path: `/analysis/${id}/ai`, icon: Cpu },
        { label: 'Reports', path: `/analysis/${id}/reports`, icon: FileDown },
      ]
    : [];

  return (
    <header className="bg-ink-soft border-b border-line sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Subtitle */}
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-lg tracking-wider text-slate-100 font-mono">
                    SECUREMAILSCOPE
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-800 text-primary border border-primary/30 rounded-md font-mono">
                    SMTP • IMAP • POP3
                  </span>
                </div>
                <span className="text-xs text-slate-400 block -mt-0.5">
                  Passive Email Security Assessment
                </span>
              </div>
            </Link>
          </div>

          {/* Analysis File Status & Badge */}
          {analysis && (
            <div className="hidden md:flex items-center space-x-3 bg-ink/60 border border-line px-3 py-1.5 rounded-lg text-xs font-mono">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-200 font-medium truncate max-w-[180px]">
                {analysis.file.name}
              </span>
              <span className="text-slate-500">•</span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  analysis.status === 'completed'
                    ? 'bg-secure/20 text-secure border border-secure/30'
                    : 'bg-warning/20 text-warning border border-warning/30'
                }`}
              >
                {analysis.status.toUpperCase()}
              </span>

              {isDemo && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded text-[10px] font-bold tracking-wider animate-pulse">
                  DEMO DATA
                </span>
              )}
            </div>
          )}

          {/* New Analysis Button */}
          <div className="flex items-center space-x-3">
            <Link
              to="/"
              className="px-3 py-1.5 text-xs font-semibold bg-primary hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm"
            >
              <Database className="w-3.5 h-3.5" />
              <span>New Analysis</span>
            </Link>
          </div>
        </div>

        {/* Sub-navigation tabs when analysis loaded */}
        {navItems.length > 0 && (
          <div className="flex items-center space-x-1 border-t border-line/60 pt-1 pb-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-medium flex items-center space-x-2 transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-primary/20 text-primary border border-primary/40 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
