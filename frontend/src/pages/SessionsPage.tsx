import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Network, Lock, Unlock, ChevronRight, X } from 'lucide-react';
import { fetchAnalysisSessions } from '../services/api';
import type { NormalizedSession } from '../types/api';

export const SessionsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState<NormalizedSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSession, setSelectedSession] = useState<NormalizedSession | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchAnalysisSessions(id)
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center text-[#94A3B8] text-xs font-mono">Loading Reconstructed Sessions...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0F172A] border border-[#263449] p-5 rounded-xl shadow-xl flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#F8FAFC] tracking-tight flex items-center space-x-2">
            <Network className="w-5 h-5 text-[#70FFD2]" />
            <span>Reconstructed Email TCP Sessions ({sessions.length})</span>
          </h1>
          <p className="text-xs text-[#94A3B8]">Stream-level email cryptographic transport inspection and flow reconstruction</p>
        </div>
      </div>

      {/* Main Table & Detail Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Session Table */}
        <div className="lg:col-span-2 bg-[#0F172A] border border-[#263449] rounded-xl p-5 shadow-xl space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#263449] text-[#94A3B8] font-semibold uppercase bg-[#0B1120]">
                  <th className="py-2.5 px-3">Session ID</th>
                  <th className="py-2.5 px-3">Protocol</th>
                  <th className="py-2.5 px-3">Source → Destination</th>
                  <th className="py-2.5 px-3">Transport Security</th>
                  <th className="py-2.5 px-3">Cert Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#263449]">
                {sessions.map((s: NormalizedSession) => {
                  const isSelected = selectedSession?.session_id === s.session_id;

                  return (
                    <tr
                      key={s.session_id}
                      onClick={() => setSelectedSession(s)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#172033] text-[#F8FAFC]' : 'hover:bg-[#172033]/50 text-[#F8FAFC]'
                      }`}
                    >
                      <td className="py-3 px-3 font-mono font-bold text-[#70FFD2]">{s.session_id}</td>
                      <td className="py-3 px-3 font-semibold">{s.protocol}</td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[#94A3B8]">
                        {s.source_ip}:{s.source_port} → {s.destination_ip}:{s.destination_port}
                      </td>
                      <td className="py-3 px-3">
                        {s.encryption ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#70FFD2]/15 text-[#70FFD2] border border-[#70FFD2]/30 inline-flex items-center space-x-1">
                            <Lock className="w-3 h-3" />
                            <span>{s.tls_version || 'Encrypted'}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#FF9137]/15 text-[#FF9137] border border-[#FF9137]/30 inline-flex items-center space-x-1">
                            <Unlock className="w-3 h-3" />
                            <span>Plaintext</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-[#94A3B8] font-mono text-[11px]">
                        {s.certificate?.present ? (
                          <span className={s.certificate.expired ? 'text-[#FF9137] font-semibold' : 'text-[#70FFD2] font-semibold'}>
                            {s.certificate.expired ? 'Expired' : 'Presented'}
                          </span>
                        ) : (
                          <span className="text-[#64748B]">N/A</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button className="text-[#70FFD2] hover:underline font-semibold text-[11px] inline-flex items-center space-x-1">
                          <span>Inspect</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Session Detail Drawer / Panel */}
        <div className="lg:col-span-1">
          {selectedSession ? (
            <div className="bg-[#0F172A] border border-[#263449] rounded-xl p-5 space-y-5 sticky top-20 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#263449] pb-3">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm font-bold text-[#70FFD2]">{selectedSession.session_id}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#0B1120] text-[#94A3B8] border border-[#263449]">
                    {selectedSession.protocol}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="text-[#94A3B8] hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Endpoint Specs */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">
                  Flow Endpoints & Connection
                </span>
                <div className="bg-[#0B1120] p-3 rounded-lg border border-[#263449] font-mono text-[11px] space-y-1">
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>Source IP:</span>
                    <span className="text-[#F8FAFC]">{selectedSession.source_ip}:{selectedSession.source_port}</span>
                  </div>
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>Destination Host/IP:</span>
                    <span className="text-[#F8FAFC]">{selectedSession.destination_ip}:{selectedSession.destination_port}</span>
                  </div>
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>Target Port:</span>
                    <span className="text-[#70FFD2] font-bold">{selectedSession.destination_port}</span>
                  </div>
                </div>
              </div>

              {/* Cryptographic Parameters */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">
                  Cryptographic Session Parameters
                </span>
                <div className="bg-[#0B1120] p-3 rounded-lg border border-[#263449] font-mono text-[11px] space-y-1.5">
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>Encryption State:</span>
                    <span className={selectedSession.encryption ? 'text-[#70FFD2] font-bold' : 'text-[#FF9137] font-bold'}>
                      {selectedSession.encryption ? 'Encrypted Stream' : 'Plaintext Stream'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>TLS Version:</span>
                    <span className="text-[#70FFD2] font-bold">{selectedSession.tls_version || 'None'}</span>
                  </div>
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>Cipher Suite:</span>
                    <span className="text-[#F8FAFC] truncate max-w-[150px]">{selectedSession.cipher_suite || 'None'}</span>
                  </div>
                  {selectedSession.starttls && (
                    <div className="flex justify-between text-[#94A3B8] pt-1 border-t border-[#263449]">
                      <span>STARTTLS Command:</span>
                      <span className="text-[#F8FAFC]">
                        {selectedSession.starttls.offered ? 'Offered' : 'Not Offered'} • {selectedSession.starttls.accepted ? 'Accepted' : 'N/A'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* X.509 Certificate Evidence */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">
                  X.509 Server Certificate Evidence
                </span>
                <div className="bg-[#0B1120] p-3 rounded-lg border border-[#263449] font-mono text-[11px] space-y-1">
                  {selectedSession.certificate?.present ? (
                    <>
                      <div className="flex justify-between text-[#94A3B8]">
                        <span>Subject CN:</span>
                        <span className="text-[#F8FAFC]">{selectedSession.certificate.subject_cn || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between text-[#94A3B8]">
                        <span>RSA Key Size:</span>
                        <span className="text-[#F8FAFC]">{selectedSession.certificate.key_size ? `${selectedSession.certificate.key_size} bits` : 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between text-[#94A3B8]">
                        <span>Signature Algorithm:</span>
                        <span className="text-[#F8FAFC]">{selectedSession.certificate.signature_algorithm || 'Unknown'}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-[#64748B] italic">No X.509 certificate observable in capture</div>
                  )}
                </div>
              </div>

              {/* Evidence Items */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">
                  Recorded Frame Evidence ({selectedSession.evidence.length})
                </span>
                <div className="bg-[#0B1120] p-3 rounded-lg border border-[#263449] font-mono text-[11px] space-y-1 max-h-40 overflow-y-auto">
                  {selectedSession.evidence.map((ev, idx) => (
                    <div key={idx} className="text-[#F8FAFC] border-b border-[#263449]/60 pb-1 last:border-b-0">
                      <span className="text-[#70FFD2]">Pkt #{ev.packet_number || ev.frame_number || 'N/A'}</span>: {ev.field} = <span className="text-[#FFFC8C]">{ev.observed_value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#0F172A] border border-[#263449] rounded-xl p-8 text-center text-[#64748B] text-xs">
              <Network className="w-8 h-8 mx-auto mb-2 text-[#64748B]" />
              <span>Select a reconstructed session row from the table to view flow parameters and evidence packets.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
