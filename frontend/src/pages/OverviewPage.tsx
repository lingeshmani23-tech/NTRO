import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  FileText,
  Lock,
  Unlock,
  AlertOctagon,
  TrendingDown,
  Layers,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import type { AnalysisResult } from '../types/api';

interface OverviewPageProps {
  analysis: AnalysisResult;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ analysis }) => {
  const { score, totals, protocol_stats, sessions, findings } = analysis;

  // Rating color helper
  const getRatingColor = (rating: str) => {
    switch (rating) {
      case 'SECURE':
        return 'text-secure border-secure/40 bg-secure/10';
      case 'LOW RISK':
        return 'text-slate-300 border-slate-500/40 bg-slate-500/10';
      case 'MEDIUM RISK':
        return 'text-warning border-warning/40 bg-warning/10';
      case 'HIGH RISK':
        return 'text-high border-high/40 bg-high/10';
      case 'CRITICAL RISK':
      default:
        return 'text-critical border-critical/40 bg-critical/10';
    }
  };

  // Severity counts
  const critCount = findings.filter((f) => f.severity === 'CRITICAL').length;
  const highCount = findings.filter((f) => f.severity === 'HIGH').length;
  const medCount = findings.filter((f) => f.severity === 'MEDIUM').length;
  const lowCount = findings.filter((f) => f.severity === 'LOW').length;
  const infoCount = findings.filter((f) => f.severity === 'INFO').length;

  // 1. Protocol Chart Data
  const protoData = [
    { name: 'SMTP', count: protocol_stats['SMTP'] || 0 },
    { name: 'IMAP', count: protocol_stats['IMAP'] || 0 },
    { name: 'POP3', count: protocol_stats['POP3'] || 0 },
  ];

  // 2. TLS Version Chart Data
  const tlsCounts: Record<string, number> = {};
  sessions.forEach((s) => {
    const ver = s.tls_version || 'Plaintext';
    tlsCounts[ver] = (tlsCounts[ver] || 0) + 1;
  });
  const tlsData = Object.entries(tlsCounts).map(([name, count]) => ({ name, count }));

  // 3. Cipher Suite Chart Data
  const cipherCounts: Record<string, number> = {};
  sessions.forEach((s) => {
    if (s.encryption) {
      const suite = s.cipher_suite || s.cipher_hex || 'Unknown Cipher';
      // Truncate long cipher names for bar display
      const shortName = suite.length > 22 ? suite.substring(0, 20) + '...' : suite;
      cipherCounts[shortName] = (cipherCounts[shortName] || 0) + 1;
    }
  });
  const cipherData = Object.entries(cipherCounts).map(([name, count]) => ({ name, count }));

  // 4. Certificate Status Donut Data
  let certValid = 0;
  let certExpired = 0;
  let certWeakKey = 0;
  let certUnknown = 0;

  sessions.forEach((s) => {
    if (s.certificate && s.certificate.present) {
      if (s.certificate.expired) certExpired++;
      else if (s.certificate.key_size && s.certificate.key_size < 2048) certWeakKey++;
      else certValid++;
    } else if (s.encryption) {
      certUnknown++;
    }
  });

  const certData = [
    { name: 'Valid Cert', value: certValid, color: '#16A34A' },
    { name: 'Expired Cert', value: certExpired, color: '#DC2626' },
    { name: 'Weak RSA Key', value: certWeakKey, color: '#F59E0B' },
    { name: 'Unknown Cert', value: certUnknown, color: '#64748B' },
  ].filter((d) => d.value > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner: Score & Rating + Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Dominant Score Card */}
        <div className="lg:col-span-5 bg-ink-soft border border-line rounded-xl p-6 shadow-md flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="text-xs font-bold text-slate-400 font-mono uppercase tracking-widest mb-4">
            Security Risk Assessment Score
          </div>

          {/* Large Radial Score Display */}
          <div className="relative w-44 h-44 flex items-center justify-center mb-4">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" stroke="#1F2A3D" strokeWidth="8" fill="transparent" />
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke={score.score >= 75 ? '#16A34A' : score.score >= 50 ? '#F59E0B' : '#EA580C'}
                strokeWidth="8"
                fill="transparent"
                strokeDasharray="263.89"
                strokeDashoffset={263.89 * (1 - score.score / 100)}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-5xl font-black text-slate-100 font-mono tracking-tight">
                {score.score}
              </span>
              <span className="text-xs font-mono text-slate-400 font-semibold">OUT OF 100</span>
            </div>
          </div>

          {/* Rating Badge */}
          <div
            className={`px-4 py-1.5 rounded-full border text-sm font-bold font-mono tracking-wider mb-2 ${getRatingColor(
              score.rating
            )}`}
          >
            {score.rating}
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Total Penalty Deductions: -{score.total_penalty} points
          </p>
        </div>

        {/* Rationale & Deductions Ledger Card */}
        <div className="lg:col-span-7 bg-ink-soft border border-line rounded-xl p-6 shadow-md flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider mb-2 flex items-center space-x-2">
              <TrendingDown className="w-4 h-4 text-primary" />
              <span>Visible Penalty Rationale & Ledger</span>
            </h3>

            <div className="bg-ink border border-line p-3 rounded-lg mb-4 text-xs font-mono text-slate-300">
              <span className="text-slate-400">Calculated Rationale: </span>
              <span className="font-bold text-primary">
                100{' '}
                {score.ledger.map((item) => `- ${item.penalty} (${item.rule_id})`).join(' ')} ={' '}
                {score.score}
              </span>
            </div>

            <div className="overflow-y-auto max-h-48 border border-line/60 rounded-lg">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/90 text-slate-400 font-bold border-b border-line">
                  <tr>
                    <th className="p-2.5">Rule ID</th>
                    <th className="p-2.5">Severity</th>
                    <th className="p-2.5 text-right">Deduction</th>
                    <th className="p-2.5 text-right">Occurrences</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/40">
                  {score.ledger.map((item) => (
                    <tr key={item.rule_id} className="hover:bg-slate-800/40">
                      <td className="p-2.5 font-bold text-primary">{item.rule_id}</td>
                      <td className="p-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.severity === 'CRITICAL'
                              ? 'bg-critical/20 text-critical'
                              : item.severity === 'HIGH'
                              ? 'bg-high/20 text-high'
                              : item.severity === 'MEDIUM'
                              ? 'bg-warning/20 text-warning'
                              : 'bg-info/20 text-info'
                          }`}
                        >
                          {item.severity}
                        </span>
                      </td>
                      <td className="p-2.5 text-right text-critical font-bold">
                        {item.penalty > 0 ? `-${item.penalty} pts` : '0 pts'}
                      </td>
                      <td className="p-2.5 text-right text-slate-300">{item.occurrences}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Severity Counters Bar */}
          <div className="grid grid-cols-5 gap-2 mt-4 pt-4 border-t border-line/60 text-center font-mono">
            <div className="bg-critical/10 border border-critical/30 p-2 rounded-lg">
              <div className="text-[10px] text-critical font-bold">CRITICAL</div>
              <div className="text-lg font-black text-slate-100">{critCount}</div>
            </div>
            <div className="bg-high/10 border border-high/30 p-2 rounded-lg">
              <div className="text-[10px] text-high font-bold">HIGH</div>
              <div className="text-lg font-black text-slate-100">{highCount}</div>
            </div>
            <div className="bg-warning/10 border border-warning/30 p-2 rounded-lg">
              <div className="text-[10px] text-warning font-bold">MEDIUM</div>
              <div className="text-lg font-black text-slate-100">{medCount}</div>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 p-2 rounded-lg">
              <div className="text-[10px] text-slate-400 font-bold">LOW</div>
              <div className="text-lg font-black text-slate-100">{lowCount}</div>
            </div>
            <div className="bg-info/10 border border-info/30 p-2 rounded-lg">
              <div className="text-[10px] text-info font-bold">INFO</div>
              <div className="text-lg font-black text-slate-100">{infoCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Six Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 font-mono">
        <div className="bg-ink-soft border border-line p-4 rounded-xl">
          <div className="text-[11px] text-slate-400 mb-1 flex items-center justify-between">
            <span>Total Packets</span>
            <FileText className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="text-xl font-bold text-slate-100">{totals.packets.toLocaleString()}</div>
        </div>

        <div className="bg-ink-soft border border-line p-4 rounded-xl">
          <div className="text-[11px] text-slate-400 mb-1 flex items-center justify-between">
            <span>Total Sessions</span>
            <Layers className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="text-xl font-bold text-slate-100">{totals.sessions}</div>
        </div>

        <div className="bg-ink-soft border border-line p-4 rounded-xl">
          <div className="text-[11px] text-slate-400 mb-1 flex items-center justify-between">
            <span>Email Sessions</span>
            <Activity className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="text-xl font-bold text-slate-100">{totals.email_sessions}</div>
        </div>

        <div className="bg-ink-soft border border-line p-4 rounded-xl">
          <div className="text-[11px] text-slate-400 mb-1 flex items-center justify-between">
            <span>Encrypted TLS</span>
            <Lock className="w-3.5 h-3.5 text-secure" />
          </div>
          <div className="text-xl font-bold text-secure">{totals.encrypted_sessions}</div>
        </div>

        <div className="bg-ink-soft border border-line p-4 rounded-xl">
          <div className="text-[11px] text-slate-400 mb-1 flex items-center justify-between">
            <span>Plaintext Email</span>
            <Unlock className="w-3.5 h-3.5 text-critical" />
          </div>
          <div className="text-xl font-bold text-critical">{totals.plaintext_sessions}</div>
        </div>

        <div className="bg-ink-soft border border-line p-4 rounded-xl">
          <div className="text-[11px] text-slate-400 mb-1 flex items-center justify-between">
            <span>Total Findings</span>
            <ShieldAlert className="w-3.5 h-3.5 text-high" />
          </div>
          <div className="text-xl font-bold text-slate-100">{totals.findings}</div>
        </div>
      </div>

      {/* Four Recharts Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel 1: Protocol Distribution */}
        <div className="bg-ink-soft border border-line rounded-xl p-5 shadow-md">
          <h4 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider mb-4">
            Protocol Distribution (Bar)
          </h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={protoData}>
                <XAxis dataKey="name" stroke="#64748B" tick={{ fontSize: 12, fill: '#94A3B8' }} />
                <YAxis stroke="#64748B" tick={{ fontSize: 12, fill: '#94A3B8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B1220', borderColor: '#1F2A3D', color: '#F8FAFC' }}
                />
                <Bar dataKey="count" fill="#2563EB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Panel 2: TLS Version Distribution */}
        <div className="bg-ink-soft border border-line rounded-xl p-5 shadow-md">
          <h4 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider mb-4">
            TLS Protocol Version Distribution
          </h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tlsData}>
                <XAxis dataKey="name" stroke="#64748B" tick={{ fontSize: 12, fill: '#94A3B8' }} />
                <YAxis stroke="#64748B" tick={{ fontSize: 12, fill: '#94A3B8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B1220', borderColor: '#1F2A3D', color: '#F8FAFC' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {tlsData.map((entry, index) => {
                    const isLegacy = entry.name.includes('1.0') || entry.name.includes('1.1') || entry.name.includes('Plaintext');
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={isLegacy ? '#DC2626' : '#16A34A'}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Panel 3: Cipher Suite Distribution */}
        <div className="bg-ink-soft border border-line rounded-xl p-5 shadow-md">
          <h4 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider mb-4">
            Negotiated Cipher Suites
          </h4>
          <div className="h-56">
            {cipherData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cipherData} layout="vertical">
                  <XAxis type="number" stroke="#64748B" tick={{ fontSize: 12, fill: '#94A3B8' }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="#64748B"
                    tick={{ fontSize: 10, fill: '#94A3B8' }}
                    width={140}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B1220', borderColor: '#1F2A3D', color: '#F8FAFC' }}
                  />
                  <Bar dataKey="count" fill="#0EA5E9" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-mono text-slate-500">
                No TLS cipher handshakes observed
              </div>
            )}
          </div>
        </div>

        {/* Panel 4: Certificate Status Donut */}
        <div className="bg-ink-soft border border-line rounded-xl p-5 shadow-md">
          <h4 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider mb-4">
            Certificate Posture Status
          </h4>
          <div className="h-56 flex items-center justify-center">
            {certData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={certData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {certData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B1220', borderColor: '#1F2A3D', color: '#F8FAFC' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-mono text-slate-500">
                No certificate data present
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
