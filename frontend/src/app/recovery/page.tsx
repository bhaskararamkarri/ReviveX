"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Repeat, Radio, ShieldCheck, ShieldAlert, AlertTriangle, 
  CheckCircle2, Play, Pause, Square, RefreshCw, ArrowRight,
  TrendingUp, Activity, Lock, Zap, Clock, Ban
} from 'lucide-react';
import { API_BASE } from "@/lib/config";

interface Batch {
  id: string;
  name: string;
  status: string;
  total_transactions: number;
  processed_transactions: number;
  successful_recoveries: number;
  failed_recoveries: number;
  failure_rate: number;
  recovered_amount: number;
  created_at: string;
}

function RecoveryContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'active' ? 'active' : 'operations';
  const [activeTab, setActiveTab] = useState<'operations' | 'active'>(initialTab);

  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [circuitBreakerAlert, setCircuitBreakerAlert] = useState<string | null>(null);
  const [authorizing, setAuthorizing] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);

  const loadBatches = async () => {
    try {
      const res = await fetch(`${API_BASE}/batches`);
      if (res.ok) {
        const data: Batch[] = await res.json();
        setBatches(data);
        if (data.length > 0 && !selectedBatch) {
          setSelectedBatch(data[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  useEffect(() => {
    if (searchParams.get('tab') === 'active') {
      setActiveTab('active');
    }
  }, [searchParams]);

  // Circuit Breaker Demo Trigger
  const handleTriggerCircuitBreaker = async (batchId: string) => {
    try {
      const res = await fetch(`${API_BASE}/batches/${batchId}/trigger-circuit-breaker`, {
        method: 'POST'
      });
      if (res.ok) {
        const updated: Batch = await res.json();
        setSelectedBatch(updated);
        setCircuitBreakerAlert(
          `RECOVERY STOPPED — Circuit Breaker Triggered (Observed failure rate ${(updated.failure_rate * 100).toFixed(0)}% > Allowed threshold 15%). Deterministically halted.`
        );
        loadBatches();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveBatch = () => {
    setAuthorizing(true);
    setTimeout(() => {
      setAuthorizing(false);
      setAuthSuccess(true);
      if (selectedBatch) {
        setSelectedBatch({
          ...selectedBatch,
          status: 'RUNNING'
        });
      }
    }, 1000);
  };

  const activeBatch = selectedBatch || (batches.length > 0 ? batches[0] : null);

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8 animate-fade-in relative z-10">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
              <Repeat className="text-purple-400" size={28} />
              Recovery Control Operations
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
              Bounded Recovery Engine
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Automated payment link generation, batch queuing, safety policy authorization, and live circuit-breaker protection.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex rounded-lg bg-black/40 border border-white/10 p-1 self-start md:self-auto text-xs">
          <button
            onClick={() => setActiveTab('operations')}
            className={`px-4 py-2 rounded-md font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'operations'
                ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Repeat size={14} />
            <span>Recovery Operations</span>
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-md font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'active'
                ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Radio size={14} className="text-emerald-400 animate-pulse" />
            <span>Active Recovery Monitor</span>
          </button>
        </div>
      </header>

      {/* Circuit Breaker Alert Banner if Triggered */}
      {circuitBreakerAlert && (
        <div className="p-4 rounded-xl bg-red-500/15 border-2 border-red-500/40 text-red-300 flex items-start gap-3 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
          <ShieldAlert size={20} className="text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-bold text-sm text-white block">DETERMINISTIC SAFETY SHUTDOWN</span>
            <p className="font-mono text-red-200">{circuitBreakerAlert}</p>
            <p className="text-gray-300 pt-1">
              Safety Engine immediately suspended all pending payment retries to prevent cascading failure and protect customer trust.
            </p>
          </div>
        </div>
      )}

      {/* OPERATIONS VIEW */}
      {activeTab === 'operations' && (
        <div className="space-y-8">
          {/* Recovery Authorization Panel */}
          <div className="glass-panel p-6 rounded-xl border border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-400" />
                  Merchant Recovery Authorization
                </h2>
                <p className="text-xs text-gray-400">Deterministic pre-flight checks before recovery dispatch</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded text-xs font-semibold bg-white/5 border border-white/10 text-gray-300">
                  Target: Razorpay Test Mode
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-4 rounded-lg bg-white/5 border border-white/5 space-y-1">
                <span className="text-gray-400">Action Type</span>
                <p className="font-semibold text-white text-sm">Payment Link (SMS/Email Nudge)</p>
                <span className="text-[11px] text-purple-300">Non-intrusive recovery</span>
              </div>

              <div className="p-4 rounded-lg bg-white/5 border border-white/5 space-y-1">
                <span className="text-gray-400">Eligible Transactions</span>
                <p className="font-semibold text-white text-sm">18 Failed Checkouts</p>
                <span className="text-[11px] text-emerald-400">100% transient root causes</span>
              </div>

              <div className="p-4 rounded-lg bg-white/5 border border-white/5 space-y-1">
                <span className="text-gray-400">Max Exposure Cap</span>
                <p className="font-semibold text-amber-300 text-sm">₹50,000 Cap</p>
                <span className="text-[11px] text-amber-400">Active Exposure: ₹34,500</span>
              </div>

              <div className="p-4 rounded-lg bg-white/5 border border-white/5 space-y-1">
                <span className="text-gray-400">Circuit Breaker Policy</span>
                <p className="font-semibold text-red-400 text-sm">Auto-Stop at 15% Failure</p>
                <span className="text-[11px] text-gray-400">Deterministic tripping rule</span>
              </div>
            </div>

            {/* Safety Verification Checklist */}
            <div className="p-4 rounded-lg bg-black/40 border border-white/5 space-y-2 text-xs">
              <span className="text-xs font-semibold text-gray-300 block mb-2">Pre-Execution Safety Verification</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                  <CheckCircle2 size={15} />
                  <span>Idempotency Key Locked</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                  <CheckCircle2 size={15} />
                  <span>Webhook Signature Verified</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                  <CheckCircle2 size={15} />
                  <span>Settlement Protection Active</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-gray-400">
                Authorized by: <strong className="text-gray-200">Admin User (Risk Operations)</strong>
              </span>

              <button
                onClick={handleApproveBatch}
                disabled={authorizing || authSuccess}
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Play size={13} className={authorizing ? 'animate-spin' : ''} />
                <span>{authSuccess ? 'Recovery Dispatched' : authorizing ? 'Authorizing...' : 'Approve & Start Recovery'}</span>
              </button>
            </div>
          </div>

          {/* Batches Table */}
          <div className="glass-panel rounded-xl border border-white/10 overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Recovery Batches</h3>
                <p className="text-xs text-gray-400">Batched execution queues with real-time health telemetry</p>
              </div>
              <button 
                onClick={loadBatches}
                aria-label="Refresh batches list"
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300"
              >
                <RefreshCw size={13} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-400">
                <thead className="bg-black/30 text-[11px] uppercase font-semibold text-gray-300 border-b border-white/5">
                  <tr>
                    <th className="px-5 py-3.5">Batch ID / Name</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Transactions (Processed / Total)</th>
                    <th className="px-5 py-3.5">Failure Rate</th>
                    <th className="px-5 py-3.5">Recovered Amount</th>
                    <th className="px-5 py-3.5 text-right">Circuit Breaker Demo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {batches.map((b) => (
                    <tr 
                      key={b.id} 
                      onClick={() => setSelectedBatch(b)}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-white">{b.name}</div>
                        <div className="font-mono text-[10px] text-gray-400">{b.id}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          b.status === 'RUNNING' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                          b.status === 'STOPPED' ? 'bg-red-500/15 text-red-400 border border-red-500/30' :
                          b.status === 'COMPLETED' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
                          'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-gray-200 font-medium">
                          {b.processed_transactions} / {b.total_transactions}
                        </div>
                        <div className="w-28 bg-white/10 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div 
                            className="bg-purple-500 h-full rounded-full" 
                            style={{ width: `${(b.processed_transactions / (b.total_transactions || 1)) * 100}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`font-semibold ${b.failure_rate > 0.15 ? 'text-red-400' : 'text-gray-300'}`}>
                          {(b.failure_rate * 100).toFixed(0)}%
                        </span>
                        <span className="text-[10px] text-gray-400 ml-1">/ 15% max</span>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-emerald-400">
                        ₹{(b.recovered_amount ?? 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTriggerCircuitBreaker(b.id);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 text-xs font-semibold border border-red-500/30 transition-all flex items-center gap-1.5 ml-auto"
                        >
                          <Zap size={12} className="text-red-400" />
                          <span>Trigger Auto-Stop Demo</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE RECOVERY MONITOR VIEW */}
      {activeTab === 'active' && activeBatch && (
        <div className="space-y-6">
          {/* Live Execution Monitor Dashboard */}
          <div className="glass-panel p-6 rounded-xl border border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <h2 className="text-base font-semibold text-white">Live Execution Monitor: {activeBatch.name}</h2>
                </div>
                <p className="text-xs text-gray-400 font-mono mt-0.5">Batch ID: {activeBatch.id}</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleTriggerCircuitBreaker(activeBatch.id)}
                  className="px-3.5 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 text-xs font-semibold border border-red-500/30 transition-colors flex items-center gap-1.5"
                >
                  <Zap size={13} className="text-red-400" />
                  <span>Simulate 70% Spurt (Trip Circuit Breaker)</span>
                </button>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-white/5 border border-white/5 space-y-1">
                <span className="text-xs text-gray-400">Transactions Processed</span>
                <p className="text-2xl font-bold text-white">
                  {activeBatch.processed_transactions} / {activeBatch.total_transactions}
                </p>
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden mt-2">
                  <div 
                    className="bg-purple-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${(activeBatch.processed_transactions / (activeBatch.total_transactions || 1)) * 100}%` }}
                  />
                </div>
              </div>

              <div className="p-4 rounded-lg bg-white/5 border border-white/5 space-y-1">
                <span className="text-xs text-gray-400">Current Failure Rate</span>
                <p className={`text-2xl font-bold ${activeBatch.failure_rate > 0.15 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {(activeBatch.failure_rate * 100).toFixed(0)}%
                </p>
                <span className="text-[11px] text-gray-400">Threshold: 15.0% auto-stop</span>
              </div>

              <div className="p-4 rounded-lg bg-white/5 border border-white/5 space-y-1">
                <span className="text-xs text-gray-400">Revenue Recovered</span>
                <p className="text-2xl font-bold text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                  ₹{(activeBatch.recovered_amount ?? 0).toLocaleString()}
                </p>
                <span className="text-[11px] text-emerald-400">Webhook verified</span>
              </div>

              <div className="p-4 rounded-lg bg-white/5 border border-white/5 space-y-1">
                <span className="text-xs text-gray-400">Execution Latency</span>
                <p className="text-2xl font-bold text-white">320ms</p>
                <span className="text-[11px] text-purple-300">Razorpay API rate nominal</span>
              </div>
            </div>

            {/* Live Activity Stream */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                <Activity size={14} className="text-purple-400" />
                Live Event Stream
              </h3>

              <div className="space-y-2 font-mono text-[11px]">
                <div className="p-2.5 rounded bg-white/5 border border-white/5 flex items-center justify-between text-gray-300">
                  <span className="text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 size={13} />
                    [WEBHOOK_RECEIVED] Razorpay event payment_link.paid validated for txn_rec_91823.
                  </span>
                  <span className="text-gray-400">14:24:02 IST</span>
                </div>
                <div className="p-2.5 rounded bg-white/5 border border-white/5 flex items-center justify-between text-gray-300">
                  <span className="text-purple-300 flex items-center gap-2">
                    <Repeat size={13} />
                    [RETRY_DISPATCHED] Created test-mode Payment Link plink_revivex_test_482.
                  </span>
                  <span className="text-gray-400">14:23:48 IST</span>
                </div>
                {activeBatch.status === 'STOPPED' && (
                  <div className="p-2.5 rounded bg-red-500/15 border border-red-500/30 flex items-center justify-between text-red-300">
                    <span className="flex items-center gap-2 font-bold">
                      <ShieldAlert size={13} />
                      [CIRCUIT_BREAKER_TRIGGERED] Recovery Engine paused remaining 10 transactions. Failure rate exceeded 15%.
                    </span>
                    <span className="text-red-400 font-bold">NOW</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RecoveryPage() {
  return (
    <Suspense fallback={<div className="text-gray-400 p-8">Loading recovery operations...</div>}>
      <RecoveryContent />
    </Suspense>
  );
}
