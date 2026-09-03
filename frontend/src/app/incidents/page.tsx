"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  AlertOctagon, CheckCircle2, Search, 
  X, RotateCcw, AlertTriangle, Info, ShieldAlert,
  ChevronRight, ArrowRight, Clock, Landmark, Smartphone, Zap, ExternalLink
} from 'lucide-react';
import { API_BASE } from "@/lib/config";

interface Incident {
  id: string;
  type: string;
  severity: string;
  status: string;
  message: string;
  details: Record<string, any> | null;
  created_at: string;
  transaction_id?: string;
  recovery_case_id?: string;
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, { c: string; i: React.ReactNode }> = {
    CRITICAL: { c: 'text-red-400 bg-red-400/10 border-red-400/25', i: <ShieldAlert size={13} /> },
    ERROR: { c: 'text-orange-400 bg-orange-400/10 border-orange-400/25', i: <AlertOctagon size={13} /> },
    WARNING: { c: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/25', i: <AlertTriangle size={13} /> },
    INFO: { c: 'text-blue-400 bg-blue-400/10 border-blue-400/25', i: <Info size={13} /> },
  };
  const s = map[severity] || map.INFO;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${s.c}`}>
      {s.i} {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN: 'text-amber-400 bg-amber-400/10 border-amber-400/25',
    IN_PROGRESS: 'text-blue-400 bg-blue-400/10 border-blue-400/25',
    RESOLVED: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
    IGNORED: 'text-gray-400 bg-gray-400/10 border-gray-400/25',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${map[status] || map.OPEN}`}>
      {status}
    </span>
  );
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const fetchIncidents = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (severityFilter) params.append('severity', severityFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);

      const res = await fetch(`${API_BASE}/exceptions?${params.toString()}`);
      if (res.ok) {
        setIncidents(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch incidents', err);
    } finally {
      setLoading(false);
    }
  }, [severityFilter, statusFilter, search]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleAction = async (action: 'retry' | 'resolve' | 'ignore') => {
    if (!selectedIncident) return;
    try {
      const res = await fetch(`${API_BASE}/exceptions/${selectedIncident.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        setSelectedIncident(null);
        fetchIncidents();
      } else {
        const error = await res.json();
        alert(`Failed: ${error.detail}`);
      }
    } catch {
      alert('Error executing action');
    }
  };

  const kpis = {
    total: incidents.length,
    critical: incidents.filter(e => e.severity === 'CRITICAL').length,
    open: incidents.filter(e => e.status === 'OPEN').length,
    resolved: incidents.filter(e => e.status === 'RESOLVED').length,
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8 animate-fade-in relative z-10">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldAlert className="text-red-400" size={28} />
              Payment Incident Stream
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
              Live Monitoring
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Real-time gateway timeouts, bank switch degradations, webhook delays, and circuit breaker trip events.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/investigations"
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg text-xs font-medium border border-purple-500/30 transition-colors"
          >
            <span>Run Anomaly Investigation</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-xl border border-white/10">
          <p className="text-xs font-medium text-gray-400 mb-1">Total Tracked Incidents</p>
          <p className="text-3xl font-extrabold text-white">{kpis.total}</p>
          <span className="text-[11px] text-gray-400 mt-1 block">All operational events</span>
        </div>
        <div className="glass-panel p-5 rounded-xl border border-red-500/30 bg-red-500/5">
          <p className="text-xs font-medium text-red-400 mb-1">Critical Rail Outages</p>
          <p className="text-3xl font-extrabold text-red-400">{kpis.critical}</p>
          <span className="text-[11px] text-red-400/80 mt-1 block">Requires immediate intervention</span>
        </div>
        <div className="glass-panel p-5 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <p className="text-xs font-medium text-amber-400 mb-1">Open Incidents</p>
          <p className="text-3xl font-extrabold text-amber-300">{kpis.open}</p>
          <span className="text-[11px] text-amber-400/80 mt-1 block">Under active mitigation</span>
        </div>
        <div className="glass-panel p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <p className="text-xs font-medium text-emerald-400 mb-1">Mitigated & Resolved</p>
          <p className="text-3xl font-extrabold text-emerald-400">{kpis.resolved}</p>
          <span className="text-[11px] text-emerald-400/80 mt-1 block">Recovery executed or bypassed</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-xl border border-white/10 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input 
              type="text" 
              placeholder="Search by incident ID, message, or gateway..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder:text-gray-400 focus:outline-none focus:border-purple-500/50"
            />
          </div>

          <select 
            value={severityFilter} 
            onChange={(e) => setSeverityFilter(e.target.value)}
            aria-label="Filter incidents by severity"
            className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-purple-500/50"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="ERROR">Error</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>

          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter incidents by status"
            className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-purple-500/50"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="RESOLVED">Resolved</option>
            <option value="IGNORED">Ignored</option>
          </select>
        </div>

        {(severityFilter || statusFilter || search) && (
          <button 
            onClick={() => { setSeverityFilter(''); setStatusFilter(''); setSearch(''); }}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Incident Stream Table */}
      <div className="glass-panel rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-400">
            <thead className="bg-black/30 text-[11px] uppercase font-semibold text-gray-300 border-b border-white/5">
              <tr>
                <th className="px-5 py-3.5">Severity</th>
                <th className="px-5 py-3.5">Incident ID / Type</th>
                <th className="px-5 py-3.5">Impact Details</th>
                <th className="px-5 py-3.5">Rail / Gateway</th>
                <th className="px-5 py-3.5">Detected</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {incidents.map((inc) => {
                const affectedGateway = inc.details?.gateway || 'Razorpay';
                const affectedMethod = inc.details?.payment_method || 'UPI';
                const affectedBank = inc.details?.bank || 'HDFC Bank';
                const affectedTxns = inc.details?.affected_count || 1;
                const revenueAtRisk = inc.details?.amount || 2500;

                return (
                  <tr key={inc.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-3.5">
                      <SeverityBadge severity={inc.severity} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-mono text-gray-200">{inc.id.substring(0, 12)}...</div>
                      <div className="text-[11px] text-gray-400 truncate max-w-[200px]">{inc.type}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-gray-200 font-medium max-w-sm truncate">{inc.message}</div>
                      <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                        <span>Risk: <strong className="text-red-400">₹{revenueAtRisk.toLocaleString()}</strong></span>
                        <span>•</span>
                        <span>{affectedTxns} txn affected</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-gray-300 font-medium">{affectedMethod} • {affectedBank}</div>
                      <div className="text-[11px] text-gray-400">{affectedGateway} Test Gateway</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-gray-400">
                      {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={inc.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/incidents/${inc.id}`}
                          className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 text-[11px] font-medium transition-colors"
                        >
                          Details
                        </Link>
                        <button
                          onClick={() => setSelectedIncident(inc)}
                          className="px-2.5 py-1 rounded bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-[11px] font-medium border border-purple-500/30 transition-colors"
                        >
                          Resolve
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {incidents.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    No matching incidents found. System telemetry is nominal.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action / Mitigation Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-white/20 max-w-lg w-full space-y-5 bg-[#0f0f13] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <SeverityBadge severity={selectedIncident.severity} />
                <span className="font-semibold text-white text-sm">Mitigate Incident</span>
              </div>
              <button 
                onClick={() => setSelectedIncident(null)}
                aria-label="Close mitigation modal"
                className="text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-gray-400 block mb-0.5">Incident ID</span>
                <span className="font-mono text-gray-200">{selectedIncident.id}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Message</span>
                <p className="text-gray-200 bg-white/5 p-3 rounded-lg border border-white/5">{selectedIncident.message}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => handleAction('ignore')}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium transition-colors"
              >
                Mark Ignored
              </button>
              <button
                onClick={() => handleAction('resolve')}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-colors"
              >
                Resolve Incident
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
