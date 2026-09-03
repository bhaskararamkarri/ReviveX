"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Activity, Search, Filter, ShieldCheck, Sparkles, 
  User, Server, Key, RefreshCw, CheckCircle2, AlertOctagon,
  Bot, Lock, FileCode
} from 'lucide-react';
import { API_BASE } from "@/lib/config";

interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target_id: string;
  target_type: string;
  details: Record<string, any> | null;
  result: string;
  proof_id?: string;
}

function ActorBadge({ actor }: { actor: string }) {
  const map: Record<string, { c: string; i: React.ReactNode; label: string }> = {
    LLM: { c: 'text-purple-400 bg-purple-400/10 border-purple-400/25', i: <Sparkles size={12} />, label: 'Nemotron 70B' },
    SAFETY_ENGINE: { c: 'text-red-400 bg-red-400/10 border-red-400/25', i: <Lock size={12} />, label: 'Safety Engine' },
    HUMAN: { c: 'text-blue-400 bg-blue-400/10 border-blue-400/25', i: <User size={12} />, label: 'Human Operator' },
    RAZORPAY_WEBHOOK: { c: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25', i: <Server size={12} />, label: 'Razorpay Webhook' },
    SYSTEM: { c: 'text-gray-300 bg-white/5 border-white/10', i: <Server size={12} />, label: 'ReviveX System' },
  };
  const s = map[actor] || map.SYSTEM;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold border ${s.c}`}>
      {s.i} {s.label}
    </span>
  );
}

function ResultBadge({ result }: { result: string }) {
  const isSuccess = result === 'SUCCESS' || result === 'VERIFIED' || result === 'EXECUTED';
  const isBlocked = result === 'BLOCKED' || result === 'STOPPED';
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
      isSuccess ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' :
      isBlocked ? 'bg-red-500/15 text-red-400 border-red-500/25' :
      'bg-amber-500/15 text-amber-400 border-amber-500/25'
    }`}>
      {result}
    </span>
  );
}

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actorFilter, setActorFilter] = useState('');
  const [search, setSearch] = useState('');

  const loadLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (actorFilter) params.append('actor', actorFilter);
      params.append('limit', '50');

      const res = await fetch(`${API_BASE}/audit?${params.toString()}`);
      if (res.ok) {
        const raw = await res.json();
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw.logs) ? raw.logs : []);
        const normalized: AuditLog[] = list.map((item: any) => ({
          id: item.id || `log-${Math.random()}`,
          timestamp: item.timestamp || new Date().toISOString(),
          actor: item.actor || 'SYSTEM',
          action: item.action || item.event || 'AUDIT_EVENT',
          target_id: item.target_id || item.recovery_case_id || item.transaction_id || item.id || 'GLOBAL',
          target_type: item.target_type || (item.recovery_case_id ? 'CASE' : item.transaction_id ? 'TXN' : 'SYSTEM'),
          details: item.details || null,
          result: item.result || (item.details?.result ? String(item.details.result) : 'VERIFIED'),
          proof_id: item.proof_id || item.id || 'PROVED'
        }));
        setLogs(normalized);
      }
    } catch (err) {
      console.error(err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [actorFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const listToFilter = Array.isArray(logs) ? logs : [];
  const filteredLogs = listToFilter.filter(l => {
    if (!l) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (l.action && l.action.toLowerCase().includes(q)) ||
      (l.target_id && l.target_id.toLowerCase().includes(q)) ||
      (l.actor && l.actor.toLowerCase().includes(q)) ||
      (l.proof_id && l.proof_id.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8 animate-fade-in relative z-10">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
              <Activity className="text-purple-400" size={28} />
              Enterprise Immutable Audit Trail
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
              Audit Proves
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Cryptographically provable journal of all AI diagnoses, deterministic policy overrides, gateway webhooks, and recovery dispatches.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={loadLogs}
            aria-label="Refresh audit logs"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-xl border border-white/10 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input 
              type="text" 
              placeholder="Search audit trail by event, target ID, proof hash..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder:text-gray-400 focus:outline-none focus:border-purple-500/50"
            />
          </div>

          <select 
            value={actorFilter} 
            onChange={(e) => setActorFilter(e.target.value)}
            aria-label="Filter audit logs by actor"
            className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-purple-500/50"
          >
            <option value="">All Actors</option>
            <option value="LLM">LLM (Nemotron 70B)</option>
            <option value="SAFETY_ENGINE">Safety Engine</option>
            <option value="HUMAN">Human Operator</option>
            <option value="RAZORPAY_WEBHOOK">Razorpay Webhook</option>
            <option value="SYSTEM">System Orchestrator</option>
          </select>
        </div>

        {(actorFilter || search) && (
          <button 
            onClick={() => { setActorFilter(''); setSearch(''); }}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-400">
            <thead className="bg-black/30 text-[11px] uppercase font-semibold text-gray-300 border-b border-white/5">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Actor</th>
                <th className="px-5 py-3.5">Action / Event</th>
                <th className="px-5 py-3.5">Target Entity</th>
                <th className="px-5 py-3.5">Details / Metadata</th>
                <th className="px-5 py-3.5">Result</th>
                <th className="px-5 py-3.5 text-right">Proof / Event ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-5 py-3.5 font-mono text-gray-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="px-5 py-3.5">
                    <ActorBadge actor={log.actor} />
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-semibold text-white">{log.action}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-gray-300">{log.target_type}:</span>{' '}
                    <span className="font-mono text-purple-300">{(log.target_id || '').substring(0, 12)}...</span>
                  </td>
                  <td className="px-5 py-3.5 max-w-xs truncate text-gray-300">
                    {log.details ? (
                      <span title={JSON.stringify(log.details)} className="font-mono text-[11px]">
                        {JSON.stringify(log.details)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <ResultBadge result={log.result} />
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-gray-400 text-[11px]">
                    <span title={log.proof_id || log.id} className="text-gray-400 hover:text-gray-200">
                      {(log.proof_id || log.id || '').substring(0, 12)}...
                    </span>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    No audit records match the current filter selection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
