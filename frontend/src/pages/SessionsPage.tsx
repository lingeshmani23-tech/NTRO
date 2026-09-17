import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Network, Lock, Unlock, CheckCircle2, AlertTriangle, Shield } from 'lucide-react';
import { fetchAnalysisSessions } from '../services/api';
import type { NormalizedSession } from '../types/api';

export const SessionsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState<NormalizedSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchAnalysisSessions(id)
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-sm">Loading Reconstructed Sessions...</div>;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Top Header */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center space-x-2">
              <Network className="w-5 h-5 text-cyan-400" />
              <span>Reconstructed TCP Email Sessions ({sessions.length})</span>
            </h1>
            <p className="text-xs text-slate-400">Stream-Level Email Cryptographic Transport Inspection</p>
          </div>
        </div>

        {/* Sessions Grid */}
        <div className="space-y-4">
          {sessions.map((session: NormalizedSession) => (
            <div
              key={session.session_id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="font-mono font-bold text-cyan-400 text-sm">{session.session_id}</span>
                  <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700">
                    {session.protocol} (Port {session.destination_port})
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {session.source_ip}:{session.source_port} → {session.destination_ip}:{session.destination_port}
                  </span>
                </div>

                <div>
                  {session.encryption ? (
                    <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Encrypted ({session.tls_version || 'TLS'})</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center space-x-1">
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Plaintext Unencrypted</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Session Meta Specs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                
                {/* Cryptographic Parameters */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    TLS & Cipher Details
                  </span>
                  <div className="text-slate-300">
                    <strong>TLS Version:</strong> {session.tls_version || 'None'}
                  </div>
                  <div className="text-slate-300 truncate">
                    <strong>Cipher Suite:</strong> {session.cipher_suite || 'None'}
                  </div>
                  {session.starttls && (
                    <div className="text-slate-300">
                      <strong>STARTTLS:</strong> {session.starttls.offered ? 'Offered' : 'Not Offered'} • {session.starttls.accepted ? 'Accepted' : 'Not Issued'}
                    </div>
                  )}
                </div>

                {/* X.509 Certificate Details */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    X.509 Server Certificate
                  </span>
                  {session.certificate?.present ? (
                    <>
                      <div className="text-slate-300">
                        <strong>Subject CN:</strong> {session.certificate.subject_cn || 'Unknown'}
                      </div>
                      <div className="text-slate-300">
                        <strong>RSA Key Size:</strong> {session.certificate.key_size ? `${session.certificate.key_size} bits` : 'Unknown'}
                      </div>
                      <div className="text-slate-300">
                        <strong>Signature:</strong> {session.certificate.signature_algorithm || 'Unknown'}
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-500 italic">No certificate presented</div>
                  )}
                </div>

                {/* Evidence Packet Items */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Observed Packet Evidence ({session.evidence.length})
                  </span>
                  {session.evidence.length > 0 ? (
                    <div className="space-y-1 font-mono text-[11px]">
                      {session.evidence.map((ev, idx) => (
                        <div key={idx} className="text-slate-300 truncate">
                          Pkt #{ev.packet_number || ev.frame_number || 'N/A'}: <span className="text-cyan-400">{ev.field}</span> = {ev.observed_value}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-500 italic">No packet evidence recorded</div>
                  )}
                </div>

              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
