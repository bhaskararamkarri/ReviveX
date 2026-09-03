"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  FileText, Search, Filter, RefreshCw, ArrowRight,
  ShieldCheck, AlertCircle, CheckCircle2, Clock, Landmark, CreditCard, Smartphone
} from 'lucide-react';
import { API_BASE } from "@/lib/config";

interface Transaction {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method?: string | null;
  bank?: string | null;
  gateway?: string | null;
  error_code?: string | null;
  error_description?: string | null;
  created_at: string;
  recovery_case_id?: string | null;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [search, setSearch] = useState('');

  const loadTransactions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (methodFilter) params.append('payment_method', methodFilter);
      params.append('limit', '50');

      const res = await fetch(`${API_BASE}/transactions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (Array.isArray(data.transactions) ? data.transactions : []);
        setTransactions(list);
      }
    } catch (err) {
      console.error(err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, methodFilter]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const listToFilter = Array.isArray(transactions) ? transactions : [];
  const filteredTxns = listToFilter.filter(t => {
    if (!t) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (t.id && t.id.toLowerCase().includes(q)) ||
      (t.order_id && t.order_id.toLowerCase().includes(q)) ||
      (t.bank && t.bank.toLowerCase().includes(q)) ||
      (t.error_code && t.error_code.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8 animate-fade-in relative z-10">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
              <FileText className="text-purple-400" size={28} />
              Transaction Explorer & Telemetry
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
              Live Ingestion
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            End-to-end payment attempts with error classification, bank switch routing, and recovery linkage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={loadTransactions}
            aria-label="Refresh transactions list"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link
            href="/developer-console"
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-200 rounded-lg text-xs font-semibold border border-white/10 transition-colors"
          >
            Simulate New Test Transaction
          </Link>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-xl border border-white/10 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input 
              type="text" 
              placeholder="Search by transaction ID, order ID, bank, error code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder:text-gray-400 focus:outline-none focus:border-purple-500/50"
            />
          </div>

          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter transactions by status"
            className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-purple-500/50"
          >
            <option value="">All Statuses</option>
            <option value="failed">Failed</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
          </select>

          <select 
            value={methodFilter} 
            onChange={(e) => setMethodFilter(e.target.value)}
            aria-label="Filter transactions by payment method"
            className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-purple-500/50"
          >
            <option value="">All Payment Rails</option>
            <option value="upi">UPI</option>
            <option value="card">Credit / Debit Card</option>
            <option value="netbanking">Net Banking</option>
            <option value="wallet">Wallet</option>
          </select>
        </div>

        {(statusFilter || methodFilter || search) && (
          <button 
            onClick={() => { setStatusFilter(''); setMethodFilter(''); setSearch(''); }}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Transactions Table */}
      <div className="glass-panel rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-400">
            <thead className="bg-black/30 text-[11px] uppercase font-semibold text-gray-300 border-b border-white/5">
              <tr>
                <th className="px-5 py-3.5">Transaction ID</th>
                <th className="px-5 py-3.5">Order ID</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Method & Bank</th>
                <th className="px-5 py-3.5">Gateway</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Failure Diagnostic</th>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5 text-right">Lifecycle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTxns.map((t) => (
                <tr key={t.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-5 py-3.5 font-mono text-gray-200">
                    <Link href={`/transactions/${t.id}`} className="hover:text-purple-300 transition-colors">
                      {(t.id || '').substring(0, 14)}...
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-gray-400">
                    {(t.order_id || t.id || '').substring(0, 12)}...
                  </td>
                  <td className="px-5 py-3.5 font-bold text-white">
                    ₹{(t.amount ?? 0).toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-gray-200 font-medium">{t.payment_method?.toUpperCase() || 'UPI'}</div>
                    <div className="text-[11px] text-gray-400">{t.bank || 'HDFC Bank'}</div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-300">
                    {t.gateway || 'Razorpay'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                      t.status === 'success' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                      t.status === 'failed' ? 'bg-red-500/15 text-red-400 border border-red-500/30' :
                      'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {t.error_code ? (
                      <div>
                        <code className="font-mono text-red-400 font-semibold">{t.error_code}</code>
                        <div className="text-[10px] text-gray-400 truncate max-w-[150px]">{t.error_description || 'Downstream error'}</div>
                      </div>
                    ) : (
                      <span className="text-emerald-400 text-[11px] font-medium">None (Nominal)</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-gray-400">
                    {t.created_at ? new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Recent'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/transactions/${t.id}`}
                      className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 font-semibold text-xs hover:underline"
                    >
                      <span>Lifecycle</span>
                      <ArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredTxns.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                    No transactions found matching the filter criteria.
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
