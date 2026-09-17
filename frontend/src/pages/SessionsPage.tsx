import React, { useState } from 'react';
import {
  Layers,
  Lock,
  Unlock,
  X,
  ShieldAlert,
  ArrowUpDown,
  FileText,
  Clock,
  ExternalLink,
} from 'lucide-react';
import type { NormalizedSession, Finding } from '../types/api';

interface SessionsPageProps {
  sessions: NormalizedSession[];
  findings: Finding[];
}

export const SessionsPage: React.FC<SessionsPageProps> = ({ sessions, findings }) => {
  const [selectedSession, setSelectedSession] = useState<NormalizedSession | null>(null);
  const [sortField, setSortField] = useState<keyof NormalizedSession>('session_id');
  const [sortAsc, setSortAsc] = useState(true);

  const getSessionFindings = (sessionId: string) => {
    return findings.filter((f) => f.session_id === sessionId);
  };

  const sortedSessions = [...sessions].sort((a, b) => {
    let valA = a[sortField] ?? '';
    let valB = b[sortField] ?? '';

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortAsc ? valA - valB : valB - valA;
    }
    return 0;
  });

  const handleSort = (field: keyof NormalizedSession) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const renderNullValue = (val: any, fallbackText: string = 'Not observed') => {
    if (val === null || val === undefined) {
      return <span className="text-slate-500 italic font-mono">{fallbackText}</span>;
    }
    if (typeof val === 'boolean') {
      return <span className="font-mono text-slate-200">{val ? 'True' : 'False'}</span>;
    }
    return <span className="font-mono text-slate-200">{String(val)}</span>;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 font-mono flex items-center space-x-2">
            <Layers className="w-6 h-6 text-primary" />
            <span>Normalized Network Sessions ({sessions.length})</span>
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Grouped by TCP stream ID. Click any row to inspect full evidence payload in the detail drawer.
          </p>
        </div>
      </div>

      {/* Sortable Table */}
      <div className="bg-ink-soft border border-line rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/90 text-slate-400 font-bold border-b border-line uppercase tracking-wider">
              <tr>
                <th
                  onClick={() => handleSort('session_id')}
                  className="p-3.5 cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center space-x-1">
                    <span>Session ID</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('protocol')}
                  className="p-3.5 cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center space-x-1">
                    <span>Protocol</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-3.5">Source IP</th>
                <th className="p-3.5">Destination Host / IP</th>
                <th
                  onClick={() => handleSort('port')}
                  className="p-3.5 cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center space-x-1">
                    <span>Port</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-3.5">Encryption</th>
                <th className="p-3.5">TLS Version</th>
                <th className="p-3.5 text-center">Findings</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {sortedSessions.map((session) => {
                const sessFindings = getSessionFindings(session.session_id);
                const isSelected = selectedSession?.session_id === session.session_id;

                return (
                  <tr
                    key={session.session_id}
                    onClick={() => setSelectedSession(session)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/20 border-l-4 border-l-primary' : 'hover:bg-slate-800/60'
                    }`}
                  >
                    <td className="p-3.5 font-bold text-primary">{session.session_id}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-200 border border-slate-700 rounded text-[11px] font-bold">
                        {session.protocol}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-300">{session.source}</td>
                    <td className="p-3.5">
                      <div className="text-slate-200 font-semibold">
                        {session.destination_host || session.destination}
                      </div>
                      {session.destination_host && (
                        <div className="text-[10px] text-slate-500">{session.destination}</div>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-300">{session.port}</td>
                    <td className="p-3.5">
                      {session.encryption === true ? (
                        <span className="inline-flex items-center space-x-1 text-secure font-bold">
                          <Lock className="w-3 h-3" />
                          <span>TLS Encrypted</span>
                        </span>
                      ) : session.encryption === false ? (
                        <span className="inline-flex items-center space-x-1 text-critical font-bold">
                          <Unlock className="w-3 h-3" />
                          <span>Plaintext</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Not observed</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      {session.tls_version ? (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            session.tls_version === 'TLS 1.0' || session.tls_version === 'TLS 1.1'
                              ? 'bg-critical/20 text-critical border border-critical/30'
                              : 'bg-secure/20 text-secure border border-secure/30'
                          }`}
                        >
                          {session.tls_version}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">N/A</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      {sessFindings.length > 0 ? (
                        <span className="px-2 py-0.5 bg-critical/20 text-critical border border-critical/40 rounded-full font-bold">
                          {sessFindings.length}
                        </span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right text-primary font-semibold hover:underline">
                      Inspect &rarr;
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Detail Drawer */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-ink-soft border-l border-line h-full overflow-y-auto p-6 space-y-6 shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-bold text-slate-100 font-mono">
                    {selectedSession.session_id}
                  </h3>
                  <span className="px-2 py-0.5 bg-primary/20 text-primary border border-primary/40 rounded font-mono text-xs font-bold">
                    {selectedSession.protocol}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  TCP Stream #{selectedSession.tcp_stream} &bull; Packets {selectedSession.first_packet} to {selectedSession.last_packet}
                </p>
              </div>

              <button
                onClick={() => setSelectedSession(null)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-line"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Session Parameters Box */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider">
                Network & Transport Parameters
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-ink border border-line p-4 rounded-xl">
                <div>
                  <span className="text-slate-500 block">Source IP:</span>
                  <span className="text-slate-200">{selectedSession.source}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Destination IP:</span>
                  <span className="text-slate-200">{selectedSession.destination}:{selectedSession.port}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Destination Host / SNI:</span>
                  {renderNullValue(selectedSession.destination_host)}
                </div>
                <div>
                  <span className="text-slate-500 block">Total Packet Count:</span>
                  <span className="text-slate-200">{selectedSession.packet_count} packets</span>
                </div>
              </div>

              {/* Encryption & TLS Box */}
              <h4 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider pt-2">
                Transport Encryption & Cipher Details
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-ink border border-line p-4 rounded-xl">
                <div>
                  <span className="text-slate-500 block">Encryption Status:</span>
                  {renderNullValue(selectedSession.encryption)}
                </div>
                <div>
                  <span className="text-slate-500 block">Negotiated TLS Version:</span>
                  {renderNullValue(selectedSession.tls_version)}
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Cipher Suite Hex / IANA Name:</span>
                  {renderNullValue(selectedSession.cipher_suite || selectedSession.cipher_hex)}
                </div>
              </div>

              {/* STARTTLS Summary Box */}
              <h4 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider pt-2">
                STARTTLS ESMTP Negotiations
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-ink border border-line p-4 rounded-xl">
                <div>
                  <span className="text-slate-500 block">Capability Offered:</span>
                  {renderNullValue(selectedSession.starttls?.offered)}
                </div>
                <div>
                  <span className="text-slate-500 block">STARTTLS Issued:</span>
                  {renderNullValue(selectedSession.starttls?.issued)}
                </div>
                <div>
                  <span className="text-slate-500 block">TLS Upgrade Established:</span>
                  {renderNullValue(selectedSession.starttls?.tls_established)}
                </div>
                <div>
                  <span className="text-slate-500 block">Downgrade Suspected:</span>
                  {renderNullValue(selectedSession.starttls?.downgrade_suspected)}
                </div>
              </div>

              {/* X.509 Certificate Box */}
              <h4 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider pt-2">
                X.509 Server Certificate Details
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-ink border border-line p-4 rounded-xl">
                <div>
                  <span className="text-slate-500 block">Subject Common Name (CN):</span>
                  {renderNullValue(selectedSession.certificate?.subject_cn)}
                </div>
                <div>
                  <span className="text-slate-500 block">Issuer CN:</span>
                  {renderNullValue(selectedSession.certificate?.issuer_cn)}
                </div>
                <div>
                  <span className="text-slate-500 block">RSA Key Size:</span>
                  {selectedSession.certificate?.key_size
                    ? `${selectedSession.certificate.key_size} bits`
                    : renderNullValue(null)}
                </div>
                <div>
                  <span className="text-slate-500 block">Expired Status:</span>
                  {renderNullValue(selectedSession.certificate?.expired)}
                </div>
                <div>
                  <span className="text-slate-500 block">Hostname Valid:</span>
                  {renderNullValue(selectedSession.certificate?.hostname_valid)}
                </div>
                <div>
                  <span className="text-slate-500 block">Signature Digest:</span>
                  {renderNullValue(selectedSession.certificate?.signature_algorithm)}
                </div>
              </div>

              {/* Evidence Items Box */}
              <h4 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider pt-2">
                Observed Evidence Packets ({selectedSession.evidence.length})
              </h4>
              <div className="space-y-2">
                {selectedSession.evidence.map((ev, i) => (
                  <div key={i} className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-xs font-mono">
                    <div className="text-slate-400 font-bold flex justify-between">
                      <span>Field: {ev.field}</span>
                      <span className="text-primary">Frame #{ev.packet_number}</span>
                    </div>
                    <div className="text-slate-200 mt-1">Observed: {String(ev.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
