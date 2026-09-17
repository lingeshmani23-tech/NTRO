import React from 'react';
import { FileDown, FileText, Code, CheckCircle2, Download } from 'lucide-react';
import { getReportDownloadUrl } from '../services/api';
import type { AnalysisResult } from '../types/api';

interface ReportsPageProps {
  analysis: AnalysisResult;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ analysis }) => {
  const pdfUrl = getReportDownloadUrl(analysis.analysis_id, 'pdf');
  const jsonUrl = getReportDownloadUrl(analysis.analysis_id, 'json');

  const reportSections = [
    { title: '1. Executive Summary', desc: 'Overview of assessment verdict, risk impact, and posture.' },
    { title: '2. Security Score & Ledger', desc: 'Deduction breakdown matrix and score calculation rationale.' },
    { title: '3. Protocol Analysis', desc: 'SMTP, IMAP, and POP3 session distribution and encrypted share.' },
    { title: '4. TLS Cryptographic Analysis', desc: 'TLS protocol versions and cipher suite security grading.' },
    { title: '5. Certificate Analysis', desc: 'X.509 server certificate validity, expiration, and key sizes.' },
    { title: '6. Security Findings', desc: 'Detailed vulnerability cards categorized by severity.' },
    { title: '7. Observed Evidence Ledger', desc: 'Exact frame numbers, field names, and captured values.' },
    { title: '8. Risk Prioritization', desc: 'Matrix of top remediation priorities.' },
    { title: '9. Technical Remediation', desc: 'Action plan roadmap linked to rule IDs.' },
    { title: '10. Standards & References', desc: 'RFC 8314, NIST SP 800-52r2, RFC 8996 compliance standards.' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-mono">
      {/* Header */}
      <div className="border-b border-line pb-4">
        <h2 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
          <FileDown className="w-6 h-6 text-primary" />
          <span>Security Audit Reports & Data Export</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Export formal PDF audit documents or raw JSON data for SIEM integration and compliance reporting.
        </p>
      </div>

      {/* Download Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PDF Card */}
        <div className="bg-ink-soft border border-line rounded-xl p-6 shadow-md space-y-4 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 text-critical flex items-center justify-center mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">Formal PDF Audit Report</h3>
            <p className="text-xs text-slate-400 leading-relaxed mt-2">
              Publication-ready A4 PDF document containing executive summaries, score deduction ledgers, protocol distribution charts, findings tables, and evidence listings.
            </p>
          </div>

          <a
            href={pdfUrl}
            download
            className="w-full py-3 bg-primary hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF Report</span>
          </a>
        </div>

        {/* JSON Card */}
        <div className="bg-ink-soft border border-line rounded-xl p-6 shadow-md space-y-4 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 text-primary flex items-center justify-center mb-3">
              <Code className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">Structured JSON Data Export</h3>
            <p className="text-xs text-slate-400 leading-relaxed mt-2">
              Full machine-readable JSON data export matching strict Pydantic schemas. Includes all normalized session objects, findings, evidence fields, and AI assessment objects.
            </p>
          </div>

          <a
            href={jsonUrl}
            download
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-xl text-xs border border-line flex items-center justify-center space-x-2 transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON Data</span>
          </a>
        </div>
      </div>

      {/* Sections Breakdown */}
      <div className="bg-ink-soft border border-line rounded-xl p-6 shadow-md space-y-4">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Included Report Sections Overview
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {reportSections.map((sec, idx) => (
            <div key={idx} className="bg-ink border border-line p-3 rounded-lg flex items-start space-x-3">
              <CheckCircle2 className="w-4 h-4 text-secure flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-slate-200">{sec.title}</div>
                <div className="text-[11px] text-slate-400">{sec.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
