"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Repeat, Radio, ShieldCheck, ShieldAlert, AlertTriangle, 
  CheckCircle2, XCircle, Play, Pause, RefreshCw, ArrowRight,
  Zap, Clock, Search, ExternalLink, Filter, ChevronDown, Check,
  Activity, Sparkles, Building2, Lock
} from 'lucide-react';
import { API_BASE } from "@/lib/config";

interface StreamEvent {
  id: string;
  timestamp: string;
  status: 'recovered' | 'failed' | 'milestone';
  txId?: string;
  customerName?: string;
  amount?: number;
  reason?: string;
  latencyMs: number;
  customMessage?: string;
}

const INITIAL_EVENTS: StreamEvent[] = [
  {
    id: 'evt-milestone-1',
    timestamp: '11:05:04 AM',
    status: 'milestone',
    customMessage: 'Batch fast-forwarded to completion. ₹2,86,000 recovered across 167 transactions. Final recovery rate: 42.7%.',
    latencyMs: 142
  },
  {
    id: 'evt-1103',
    timestamp: '11:05:04 AM',
    status: 'recovered',
    txId: 'TX-1103',
    customerName: 'Kavita Reddy',
    amount: 4800,
    latencyMs: 139
  },
  {
    id: 'evt-1102',
    timestamp: '11:05:03 AM',
    status: 'recovered',
    txId: 'TX-1102',
    customerName: 'Divya Rao',
    amount: 3800,
    latencyMs: 302
  },
  {
    id: 'evt-1101',
    timestamp: '11:05:03 AM',
    status: 'failed',
    txId: 'TX-1101',
    customerName: 'Ishaan Joshi',
    reason: 'Bank timeout',
    latencyMs: 515
  },
  {
    id: 'evt-1100',
    timestamp: '11:05:02 AM',
    status: 'recovered',
    txId: 'TX-1100',
    customerName: 'Vikram Nair',
    amount: 1250,
    latencyMs: 231
  },
  {
    id: 'evt-1099',
    timestamp: '11:05:02 AM',
    status: 'recovered',
    txId: 'TX-1099',
    customerName: 'Sneha Patel',
    amount: 4100,
    latencyMs: 165
  },
  {
    id: 'evt-1098',
    timestamp: '11:05:01 AM',
    status: 'failed',
    txId: 'TX-1098',
    customerName: 'Rohan Gupta',
    reason: 'Bank timeout',
    latencyMs: 209
  },
  {
    id: 'evt-1097',
    timestamp: '11:05:01 AM',
    status: 'recovered',
    txId: 'TX-1097',
    customerName: 'Ananya Singh',
    amount: 1890,
    latencyMs: 287
  },
  {
    id: 'evt-1096',
    timestamp: '11:05:01 AM',
    status: 'recovered',
    txId: 'TX-1096',
    customerName: 'Rahul Verma',
    amount: 12500,
    latencyMs: 301
  }
];

const SIMULATED_CUSTOMER_NAMES = [
  'Priya Sharma', 'Amit Kumar', 'Meera Iyer', 'Aditya Sen', 'Pooja Deshmukh',
  'Rajesh Nair', 'Deepa Menon', 'Kunal Shah', 'Neha Agarwal', 'Siddharth Roy'
];

const SIMULATED_FAILURE_REASONS = [
  'Bank timeout', 'UPI gateway latency', 'Card 3DS timeout', 'Network unreachable', 'Issuer node busy'
];

function RecoveryContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'active' ? 'active' : 'active'; // Default to active monitor matching user intent
  const [activeTab, setActiveTab] = useState<'operations' | 'active'>(initialTab);

  // Real-time Telemetry State
  const [batchId] = useState('RB-024');
  const [totalTxns] = useState(438);
  const [processedTxns, setProcessedTxns] = useState(391);
  const [successfulRecoveries, setSuccessfulRecoveries] = useState(167);
  const [failedRecoveries, setFailedRecoveries] = useState(224);
  const [recoveredAmount, setRecoveredAmount] = useState(286000);
  const [isStreaming, setIsStreaming] = useState(true);
  const [circuitBreakerTripped, setCircuitBreakerTripped] = useState(false);
  const [streamFilter, setStreamFilter] = useState<'all' | 'recovered' | 'failed'>('all');

  // Stream Log
  const [events, setEvents] = useState<StreamEvent[]>(INITIAL_EVENTS);
  const nextTxIdRef = useRef(1104);

  // Fast-Forward Handler
  const handleFastForward = () => {
    if (processedTxns >= totalTxns) return;

    const remaining = totalTxns - processedTxns;
    const additionalSuccessful = Math.floor(remaining * 0.45);
    const additionalFailed = remaining - additionalSuccessful;
    const additionalAmount = additionalSuccessful * 2400;

    const newProcessed = totalTxns;
    const newSuccessful = successfulRecoveries + additionalSuccessful;
    const newFailed = failedRecoveries + additionalFailed;
    const newAmount = recoveredAmount + additionalAmount;

    setProcessedTxns(newProcessed);
    setSuccessfulRecoveries(newSuccessful);
    setFailedRecoveries(newFailed);
    setRecoveredAmount(newAmount);

    const completionRate = ((newSuccessful / newProcessed) * 100).toFixed(1);
    const formattedAmount = `₹${newAmount.toLocaleString('en-IN')}`;

    const milestoneEvent: StreamEvent = {
      id: `milestone-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      status: 'milestone',
      customMessage: `Batch fast-forwarded to completion. ${formattedAmount} recovered across ${newSuccessful} transactions. Final recovery rate: ${completionRate}%.`,
      latencyMs: 120
    };

    setEvents(prev => [milestoneEvent, ...prev]);
    setIsStreaming(false);
  };

  // Circuit Breaker Demo Handler
  const handleTriggerCircuitBreaker = () => {
    setCircuitBreakerTripped(true);
    setIsStreaming(false);

    const shutdownEvent: StreamEvent = {
      id: `breaker-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      status: 'milestone',
      customMessage: `[CIRCUIT_BREAKER_TRIGGERED] Observed failure rate 57.3% exceeded max policy limit. Deterministically halted all recovery retries.`,
      latencyMs: 85
    };

    setEvents(prev => [shutdownEvent, ...prev]);
  };

  // Live streaming interval simulator
  useEffect(() => {
    if (!isStreaming || circuitBreakerTripped || processedTxns >= totalTxns) return;

    const interval = setInterval(() => {
      const currentTxNum = nextTxIdRef.current++;
      const isSuccess = Math.random() > 0.48;
      const customer = SIMULATED_CUSTOMER_NAMES[Math.floor(Math.random() * SIMULATED_CUSTOMER_NAMES.length)];
      const latency = Math.floor(Math.random() * 380) + 120;
      const amount = Math.floor(Math.random() * 60) * 100 + 800;

      const newEvent: StreamEvent = {
        id: `tx-${currentTxNum}-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        status: isSuccess ? 'recovered' : 'failed',
        txId: `TX-${currentTxNum}`,
        customerName: customer,
        amount: isSuccess ? amount : undefined,
        reason: !isSuccess ? SIMULATED_FAILURE_REASONS[Math.floor(Math.random() * SIMULATED_FAILURE_REASONS.length)] : undefined,
        latencyMs: latency
      };

      setEvents(prev => [newEvent, ...prev.slice(0, 49)]); // Keep latest 50
      setProcessedTxns(prev => Math.min(totalTxns, prev + 1));

      if (isSuccess) {
        setSuccessfulRecoveries(prev => prev + 1);
        setRecoveredAmount(prev => prev + amount);
      } else {
        setFailedRecoveries(prev => prev + 1);
      }
    }, 2800);

    return () => clearInterval(interval);
  }, [isStreaming, circuitBreakerTripped, processedTxns, totalTxns]);

  // Derived calculations
  const remainingTxns = Math.max(0, totalTxns - processedTxns);
  const completionPercentage = Math.min(100, Math.round((processedTxns / totalTxns) * 100));
  const failureRatePercent = processedTxns > 0 ? ((failedRecoveries / processedTxns) * 100).toFixed(1) : '0.0';
  const recoveredInLakhs = (recoveredAmount / 100000).toFixed(2);

  // Filter events
  const filteredEvents = events.filter(e => {
    if (streamFilter === 'all') return true;
    return e.status === streamFilter || e.status === 'milestone';
  });

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-6 animate-fade-in relative z-10 select-none">
      {/* Top Warning Banner matching reference */}
      <div className="flex items-center gap-2.5 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
        <Lock size={14} className="text-amber-400 shrink-0" />
        <p className="leading-tight">
          <strong className="text-amber-300 font-semibold">Razorpay Test Mode Active:</strong> You are operating in a sandboxed financial environment. Simulated recovery transactions do not trigger real settlement debits.
        </p>
      </div>



      {/* Circuit Breaker Alert Banner if Triggered */}
      {circuitBreakerTripped && (
        <div className="p-4 rounded-xl bg-red-500/15 border-2 border-red-500/40 text-red-200 flex items-start gap-3 shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-pulse">
          <ShieldAlert size={22} className="text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-bold text-sm text-white block">DETERMINISTIC CIRCUIT BREAKER SHUTDOWN ACTIVE</span>
            <p className="font-mono text-red-200">
              Execution auto-stopped: Downstream gateway failure rate reached {failureRatePercent}%, exceeding the 30% safety threshold.
            </p>
            <p className="text-gray-300 pt-1">
              All further automated retries for Batch {batchId} have been suspended to prevent customer spam and protect merchant reputation.
            </p>
          </div>
        </div>
      )}

      {/* CARD 1: REAL-TIME EXECUTION TELEMETRY */}
      <div className="glass-panel p-6 rounded-xl border border-white/10 space-y-5 bg-[#0f0f12]/90 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
              Real-Time Execution Telemetry
            </span>
            <div className="flex items-center gap-2 mt-1">
              <Activity size={18} className="text-purple-400 animate-pulse" />
              <h2 className="text-lg font-bold text-white tracking-tight">
                {batchId} — {processedTxns} / {totalTxns} Transactions Processed
              </h2>
            </div>
          </div>

          <div className="text-right">
            <span className="text-base font-bold text-white tracking-tight">
              {completionPercentage}% Complete
            </span>
          </div>
        </div>

        {/* Progress Bar matching reference image with emerald glow */}
        <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
          <div 
            className="bg-emerald-500 h-full rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(16,185,129,0.6)]"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        {/* 5 KPI Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
          {/* 1. SUCCESSFUL */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Successful
            </span>
            <p className="text-2xl font-bold text-white">
              {successfulRecoveries}
            </p>
            <span className="text-[11px] text-gray-400 block">
              Recovered to merchant
            </span>
          </div>

          {/* 2. FAILED */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Failed
            </span>
            <p className="text-2xl font-bold text-red-500">
              {failedRecoveries}
            </p>
            <span className="text-[11px] text-gray-400 block">
              Gateway / bank timeout
            </span>
          </div>

          {/* 3. REMAINING */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Remaining
            </span>
            <p className="text-2xl font-bold text-white">
              {remainingTxns}
            </p>
            <span className="text-[11px] text-gray-400 block">
              Pending in queue
            </span>
          </div>

          {/* 4. FAILURE RATE */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Failure Rate
            </span>
            <p className={`text-2xl font-bold ${Number(failureRatePercent) > 30 ? 'text-red-500' : 'text-emerald-400'}`}>
              {failureRatePercent}%
            </p>
            <span className="text-[11px] text-gray-400 block">
              Max limit 30%
            </span>
          </div>

          {/* 5. RECOVERED ₹ (Special Highlighted Card with emerald border) */}
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1 col-span-2 sm:col-span-1 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
              Recovered ₹
            </span>
            <p className="text-2xl font-bold text-emerald-400">
              ₹{recoveredInLakhs}L
            </p>
            <span className="text-[11px] text-emerald-300 block">
              Net recovered funds
            </span>
          </div>
        </div>
      </div>

      {/* CARD 2: LIVE ACTIVITY STREAM */}
      <div className="glass-panel rounded-xl border border-white/10 overflow-hidden bg-[#0c0c0e]/90 shadow-xl">
        {/* Stream Header */}
        <div className="p-5 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="text-purple-400 font-mono text-base font-bold">&gt;_</span>
              <span>Live Activity Stream</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Individual transaction retry dispatch events, latency benchmarks, and idempotency status.
            </p>
          </div>

          {/* Stream Interactive Controls */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Live Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-300">
              <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-emerald-400 animate-ping' : 'bg-gray-500'}`}></span>
              <span className="text-[11px] font-medium">{isStreaming ? 'Streaming Active' : 'Paused'}</span>
            </div>

            {/* Filter Buttons */}
            <div className="inline-flex rounded-lg bg-black/40 border border-white/10 p-0.5 text-[11px]">
              <button
                onClick={() => setStreamFilter('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  streamFilter === 'all' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                All Events
              </button>
              <button
                onClick={() => setStreamFilter('recovered')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  streamFilter === 'recovered' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Recovered
              </button>
              <button
                onClick={() => setStreamFilter('failed')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  streamFilter === 'failed' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Failed
              </button>
            </div>

            {/* Action Buttons */}
            <button
              onClick={() => setIsStreaming(!isStreaming)}
              disabled={circuitBreakerTripped}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-medium text-xs transition-colors flex items-center gap-1 disabled:opacity-40"
            >
              {isStreaming ? <Pause size={12} /> : <Play size={12} />}
              <span>{isStreaming ? 'Pause' : 'Resume'}</span>
            </button>

            <button
              onClick={handleFastForward}
              disabled={processedTxns >= totalTxns || circuitBreakerTripped}
              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition-colors flex items-center gap-1 shadow-[0_0_10px_rgba(168,85,247,0.3)] disabled:opacity-40"
            >
              <Zap size={12} />
              <span>Fast-forward Batch</span>
            </button>

            <button
              onClick={handleTriggerCircuitBreaker}
              disabled={circuitBreakerTripped}
              className="px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 font-medium text-xs transition-colors flex items-center gap-1 disabled:opacity-40"
            >
              <ShieldAlert size={12} />
              <span>Trigger Auto-Stop</span>
            </button>
          </div>
        </div>

        {/* Stream Items List matching exact format of screenshot */}
        <div className="divide-y divide-white/[0.04] max-h-[520px] overflow-y-auto font-mono text-xs scrollbar-thin scrollbar-thumb-white/10">
          {filteredEvents.map((evt) => {
            if (evt.status === 'milestone') {
              return (
                <div 
                  key={evt.id}
                  className="px-5 py-3 flex items-center justify-between bg-purple-500/[0.08] hover:bg-purple-500/[0.12] transition-colors border-l-2 border-purple-500"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-[11px] whitespace-nowrap">{evt.timestamp}</span>
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <span className="text-purple-200 text-xs font-semibold">
                      {evt.customMessage}
                    </span>
                  </div>
                  <span className="text-gray-400 text-[11px] font-mono shrink-0 ml-4">
                    {evt.latencyMs}ms
                  </span>
                </div>
              );
            }

            if (evt.status === 'recovered') {
              return (
                <div 
                  key={evt.id}
                  className="px-5 py-2.5 flex items-center justify-between bg-emerald-500/[0.03] hover:bg-emerald-500/[0.07] transition-colors"
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className="text-gray-400 text-[11px] whitespace-nowrap">{evt.timestamp}</span>
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <span className="text-emerald-300 text-xs truncate">
                      Transaction <strong className="font-semibold text-white">{evt.txId}</strong> ({evt.customerName}) recovered: <span className="font-bold text-emerald-400">₹{evt.amount?.toLocaleString('en-IN')}</span>
                    </span>
                  </div>
                  <span className="text-gray-400 text-[11px] font-mono shrink-0 ml-4">
                    {evt.latencyMs}ms
                  </span>
                </div>
              );
            }

            // Failed Event
            return (
              <div 
                key={evt.id}
                className="px-5 py-2.5 flex items-center justify-between bg-red-500/[0.03] hover:bg-red-500/[0.07] transition-colors"
              >
                <div className="flex items-center gap-3 truncate">
                  <span className="text-gray-400 text-[11px] whitespace-nowrap">{evt.timestamp}</span>
                  <XCircle size={14} className="text-red-400 shrink-0" />
                  <span className="text-red-300 text-xs truncate">
                    Transaction <strong className="font-semibold text-white">{evt.txId}</strong> ({evt.customerName}) failed: <span className="text-red-400">{evt.reason || 'Bank timeout'}</span>
                  </span>
                </div>
                <span className="text-gray-400 text-[11px] font-mono shrink-0 ml-4">
                  {evt.latencyMs}ms
                </span>
              </div>
            );
          })}
        </div>

        {/* Bottom Stream Footer */}
        <div className="p-3 border-t border-white/10 bg-black/40 flex items-center justify-between text-[11px] text-gray-400 px-5">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Connected to Razorpay Test Gateway Telemetry Socket</span>
          </div>
          <span>Showing {filteredEvents.length} transactions</span>
        </div>
      </div>
    </div>
  );
}

export default function RecoveryPage() {
  return (
    <Suspense fallback={<div className="text-gray-400 p-8">Loading recovery execution monitor...</div>}>
      <RecoveryContent />
    </Suspense>
  );
}
