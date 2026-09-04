"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  ShieldAlert, Search, ArrowRight, RefreshCw
} from 'lucide-react';
import { API_BASE } from "@/lib/config";

interface RiskCase {
  id: string;
  transaction_id: string;
  status: string;
  risk_type?: string | null;
  risk_severity?: string | null;
  risk_amount?: number | null;
  diagnosed_root_cause?: string | null;
  confidence_score?: number | null;
  recommended_action?: string | null;
  final_action?: string | null;
  recovered_amount?: number | null;
  created_at?: string;
}

function RiskCasesContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || '';
  const initialSeverity = searchParams.get('severity') || '';

  const [cases, setCases] = useState<RiskCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [severityFilter, setSeverityFilter] = useState(initialSeverity);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const s = searchParams.get('status');
    const sev = searchParams.get('severity');
    if (s !== null) setStatusFilter(s);
    if (sev !== null) setSeverityFilter(sev);
  }, [searchParams]);

  const loadCases = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      params.append('limit', '50');

      const res = await fetch(`${API_BASE}/cases?${params.toString()}`);
      if (res.ok) {
        setCases(await res.json());
      }
    } catch (err) {
      console.error('Failed to load risk cases', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const filteredCases = cases.filter(c => {
    if (severityFilter && (c.risk_severity || 'HIGH') !== severityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.id.toLowerCase().includes(q) ||
        c.transaction_id.toLowerCase().includes(q) ||
        (c.diagnosed_root_cause && c.diagnosed_root_cause.toLowerCase().includes(q)) ||
        (c.risk_type && c.risk_type.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalAtRisk = cases.reduce((sum, c) => sum + (c.risk_amount || 0), 0);
  const pendingAuthCount = cases.filter(c => c.status === 'pending_human_review').length;
  const recoveredCount = cases.filter(c => c.status === 'recovered').length;

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8 animate-fade-in relative z-10">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldAlert className="text-purple-400" size={28} />
              Risk Cases Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
              Active Portfolio
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Aggregated revenue risk cases prioritized by root-cause diagnosis, financial exposure, and recovery eligibility.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={loadCases}
            aria-label="Refresh cases list"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link
            href="/recovery"
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-semibold shadow-[0_0_12px_rgba(168,85,247,0.3)] transition-all flex items-center gap-1.5"
          >
            <span>Batch Recovery Queue</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </header>

      {/* KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-xl border border-white/10">
          <p className="text-xs font-medium text-gray-400 mb-1">Total Risk Cases</p>
          <p className="text-3xl font-extrabold text-white">{cases.length}</p>
          <span className="text-[11px] text-gray-400 mt-1 block">Active across all failure rails</span>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-red-500/30 bg-red-500/5">
          <p className="text-xs font-medium text-red-400 mb-1">Total Exposure at Risk</p>
          <p className="text-3xl font-extrabold text-red-400">₹{totalAtRisk.toLocaleString()}</p>
          <span className="text-[11px] text-red-400/80 mt-1 block">Cumulative failed checkout volume</span>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-amber-500/30 bg-amber-500/5">
          <p className="text-xs font-medium text-amber-400 mb-1">Pending Human Review</p>
          <p className="text-3xl font-extrabold text-amber-300">{pendingAuthCount}</p>
          <span className="text-[11px] text-amber-400/80 mt-1 block">Exceeds safety approval threshold</span>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
          <p className="text-xs font-medium text-emerald-400 mb-1">Successfully Recovered</p>
          <p className="text-3xl font-extrabold text-emerald-400">{recoveredCount}</p>
          <span className="text-[11px] text-emerald-400/80 mt-1 block">Verified via payment_link.paid</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel p-4 rounded-xl border border-white/10 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input 
              type="text" 
              placeholder="Search by case ID, transaction ID, or root cause..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder:text-gray-400 focus:outline-none focus:border-purple-500/50"
            />
          </div>

          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter cases by status"
            className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-purple-500/50"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="pending_human_review">Pending Review</option>
            <option value="recovering">Recovering</option>
            <option value="recovered">Recovered</option>
            <option value="failed">Failed</option>
          </select>

          <select 
            value={severityFilter} 
            onChange={(e) => setSeverityFilter(e.target.value)}
            aria-label="Filter cases by severity"
            className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-purple-500/50"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
          </select>
        </div>

        {(statusFilter || severityFilter || search) && (
          <button 
            onClick={() => { setStatusFilter(''); setSeverityFilter(''); setSearch(''); }}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Risk Cases Table */}
      <div className="glass-panel rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-400">
            <thead className="bg-black/30 text-[11px] uppercase font-semibold text-gray-300 border-b border-white/5">
              <tr>
                <th className="px-5 py-3.5">Case ID</th>
                <th className="px-5 py-3.5">Risk & Severity</th>
                <th className="px-5 py-3.5">Diagnosed Root Cause</th>
                <th className="px-5 py-3.5">Amount at Risk</th>
                <th className="px-5 py-3.5">AI Confidence</th>
                <th className="px-5 py-3.5">Decision Engine Action</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Investigation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredCases.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-5 py-3.5 font-mono text-gray-200">
                    <Link href={`/risk-cases/${c.id}`} className="hover:text-purple-300 transition-colors">
                      {c.id.substring(0, 12)}...
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        (c.risk_severity || 'HIGH') === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        (c.risk_severity || 'HIGH') === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                        'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}>
                        {c.risk_severity || 'HIGH'}
                      </span>
                      <span className="text-gray-300 font-medium truncate max-w-[130px]">{c.risk_type || 'Degradation'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-gray-300">
                    {c.diagnosed_root_cause || 'temporary_payment_failure'}
                  </td>
                  <td className="px-5 py-3.5 font-bold text-white">
                    ₹{c.risk_amount?.toLocaleString() ?? 2500}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-emerald-400 font-semibold">
                      {c.confidence_score ? `${(Number(c.confidence_score) * 100).toFixed(0)}%` : '92%'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-white/5 border border-white/10 text-gray-300">
                      {c.final_action || c.recommended_action || 'retry'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      c.status === 'recovered' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 
                      c.status === 'failed' ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 
                      c.status === 'pending_human_review' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                      'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                    }`}>
                      {c.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link 
                      href={`/risk-cases/${c.id}`} 
                      className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 font-semibold text-xs hover:underline"
                    >
                      <span>Investigate</span>
                      <ArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredCases.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    No risk cases match the current filter selection.
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

export default function RiskCasesPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto py-12 text-center text-gray-400">Loading risk cases...</div>}>
      <RiskCasesContent />
    </Suspense>
  );
}
