"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Play, ShieldAlert, CheckCircle2, AlertTriangle, Code, Database, 
  Search, FileJson, Clock, Loader2, ArrowRight, RotateCcw, Zap, ZapOff, Check, X
} from 'lucide-react';
import { API_BASE } from '@/lib/config';

interface ActionDetails {
  payment_link_id?: string;
  short_url?: string;
  mode?: string;
  created_at?: string;
  error?: string;
}

interface OutputData {
  case_status?: string;
  recovered_amount?: number;
  action_details?: ActionDetails;
  [key: string]: unknown;
}

type StageTrace = {
  stage: string;
  status: string;
  service: string;
  method: string;
  duration_ms: number;
  input_data?: Record<string, unknown>;
  output_data?: OutputData;
  rules_applied?: string;
  reason?: string;
  db_operation?: string;
  next_stage?: string;
};

type SimulatorResult = {
  scenario: string;
  amount: number;
  final_action: string;
  traces: StageTrace[];
  audit_trail: Record<string, unknown>[];
};

interface CircuitBreakerStatus {
  status: 'OPEN' | 'CLOSED';
  is_tripped: boolean;
  failure_rate: number;
  threshold: number;
  active_stopped_batch_id?: string | null;
  message?: string;
}

function DeveloperConsoleContent() {
  const searchParams = useSearchParams();
  const initialScenario = searchParams.get('scenario') || 'temporary_failure';

  const [scenario, setScenario] = useState(initialScenario);
  const [amount, setAmount] = useState('2500');
  const [retryCount, setRetryCount] = useState('0');
  const [fraudFlag, setFraudFlag] = useState(false);

  useEffect(() => {
    const sc = searchParams.get('scenario');
    if (sc) {
      setScenario(sc);
      if (sc === 'high_value') setAmount('75000');
      if (sc === 'retry_limit') setRetryCount('4');
      if (sc === 'fraud') setFraudFlag(true);
    }
  }, [searchParams]);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulatorResult | null>(null);
  const [selectedTraceIndex, setSelectedTraceIndex] = useState<number | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'overview' | 'input' | 'output' | 'rules' | 'database'>('overview');
  const [error, setError] = useState('');

  // Circuit Breaker State
  const [cbStatus, setCbStatus] = useState<CircuitBreakerStatus | null>(null);
  const [cbLoading, setCbLoading] = useState(false);
  const [cbFeedback, setCbFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchCbStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/circuit-breaker/status`);
      if (res.ok) {
        setCbStatus(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch circuit breaker status:', err);
    }
  };

  useEffect(() => {
    fetchCbStatus();
  }, []);

  const handleTriggerCircuitBreaker = async () => {
    setCbLoading(true);
    setCbFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/circuit-breaker/trigger`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setCbFeedback({
          type: 'success',
          message: data.message || 'Circuit breaker triggered. Automated retries halted.'
        });
        await fetchCbStatus();
      } else {
        setCbFeedback({
          type: 'error',
          message: data.detail || 'Failed to trigger circuit breaker.'
        });
      }
    } catch (err: any) {
      setCbFeedback({
        type: 'error',
        message: err?.message || 'Network error triggering circuit breaker.'
      });
    } finally {
      setCbLoading(false);
    }
  };

  const handleResetCircuitBreaker = async () => {
    setCbLoading(true);
    setCbFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/circuit-breaker/reset`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setCbFeedback({
          type: 'success',
          message: data.message || 'Circuit breaker reset. Normal recovery operations resumed.'
        });
        await fetchCbStatus();
      } else {
        setCbFeedback({
          type: 'error',
          message: data.detail || 'Failed to reset circuit breaker.'
        });
      }
    } catch (err: any) {
      setCbFeedback({
        type: 'error',
        message: err?.message || 'Network error resetting circuit breaker.'
      });
    } finally {
      setCbLoading(false);
    }
  };

  const handleRunSimulation = async () => {
    setLoading(true);
    setResult(null);
    setSelectedTraceIndex(null);
    setError('');
    
    try {
      const res = await fetch(`${API_BASE}/simulator/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario,
          amount: parseFloat(amount),
          retry_count: parseInt(retryCount, 10),
          fraud_flag: fraudFlag
        })
      });
      
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8 animate-fade-in relative z-10 pt-8">
      {/* HEADER */}
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-1 rounded-full w-fit">
          <ShieldAlert size={14} />
          <span className="text-xs font-medium tracking-wider uppercase">Simulation Mode</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white mt-2">ReviveX Developer Console</h1>
        <p className="text-gray-400">Trace exactly how ReviveX processes a failed payment. No real payments or financial actions are executed.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: CONFIGURATION + CIRCUIT BREAKER */}
        <div className="lg:col-span-1 space-y-6">
          {/* SCENARIO CONFIGURATION PANEL */}
          <div className="glass-panel p-6 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Code size={120} />
            </div>
            
            <h2 className="text-lg font-semibold text-white">Scenario Configuration</h2>
            
            <div className="space-y-4 relative z-10">
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">Failure Scenario</label>
                <select 
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="temporary_failure">Temporary Payment Failure</option>
                  <option value="hard_decline">Hard Payment Decline</option>
                  <option value="unknown">Unknown Failure</option>
                  <option value="high_value">High-Value Transaction (SIMULATION)</option>
                  <option value="retry_limit">Retry Limit Exceeded (SIMULATION)</option>
                  <option value="abandoned">Checkout Abandonment (SIMULATION)</option>
                  <option value="fraud">Fraud Guardrail (SIMULATION)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">Transaction Amount (₹)</label>
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">Previous Retry Count</label>
                <input 
                  type="number" 
                  value={retryCount}
                  onChange={(e) => setRetryCount(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="fraud"
                  checked={fraudFlag}
                  onChange={(e) => setFraudFlag(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900/50 border-white/10 text-emerald-500 focus:ring-emerald-500/50"
                />
                <label htmlFor="fraud" className="text-sm text-gray-300">Trigger Fraud Signals</label>
              </div>

              <button 
                onClick={handleRunSimulation}
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-4 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
                RUN SIMULATION
              </button>
              
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* CIRCUIT BREAKER SIMULATION CONTROL */}
          <div className="glass-panel p-6 space-y-4 border border-amber-500/20 bg-amber-500/5 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <AlertTriangle size={16} />
                <span>Circuit Breaker Simulation</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                cbStatus?.is_tripped 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' 
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {cbStatus?.status || 'CLOSED'}
              </span>
            </div>

            <p className="text-xs text-gray-300">
              Simulate an emergency systemic outage. When open, all automated and manual recovery calls are deterministically blocked by policy.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                <span className="text-gray-400 text-[10px] block">Observed Failure Rate</span>
                <span className={`text-sm font-bold font-mono ${cbStatus?.is_tripped ? 'text-red-400' : 'text-gray-200'}`}>
                  {cbStatus ? `${cbStatus.failure_rate.toFixed(1)}%` : '0.0%'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                <span className="text-gray-400 text-[10px] block">Max Policy Limit</span>
                <span className="text-sm font-bold font-mono text-amber-300">
                  {cbStatus ? `${cbStatus.threshold.toFixed(1)}%` : '15.0%'}
                </span>
              </div>
            </div>

            {cbFeedback && (
              <div className={`p-2.5 rounded text-xs flex items-center justify-between ${
                cbFeedback.type === 'success' 
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' 
                  : 'bg-red-500/10 border border-red-500/20 text-red-300'
              }`}>
                <div className="flex items-center gap-1.5">
                  {cbFeedback.type === 'success' ? <Check size={13} /> : <X size={13} />}
                  <span>{cbFeedback.message}</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                disabled={cbLoading}
                onClick={handleTriggerCircuitBreaker}
                className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
              >
                {cbLoading ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                <span>Trigger Circuit Breaker</span>
              </button>

              <button
                disabled={cbLoading}
                onClick={handleResetCircuitBreaker}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-gray-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 border border-white/10"
              >
                <RotateCcw size={13} />
                <span>Reset Demo</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: EXECUTION TIMELINE & INSPECTOR */}
        <div className="lg:col-span-2 flex flex-col md:flex-row gap-6">
          
          {/* TIMELINE */}
          <div className="glass-panel p-6 flex-1 min-w-[280px]">
            <h2 className="text-lg font-semibold text-white mb-6">Execution Trace</h2>
            
            {!result && !loading && (
              <div className="flex flex-col items-center justify-center h-[300px] text-gray-500 gap-4">
                <Search size={32} className="opacity-20" />
                <p>Run a simulation to trace the pipeline.</p>
              </div>
            )}
            
            {loading && (
              <div className="flex flex-col items-center justify-center h-[300px] text-emerald-500/50 gap-4">
                <Loader2 className="animate-spin" size={32} />
                <p>Executing dry-run...</p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                {result.traces.map((trace, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedTraceIndex(idx)}
                    className={`
                      relative pl-8 py-3 pr-4 rounded-xl cursor-pointer transition-all border
                      ${selectedTraceIndex === idx 
                        ? 'bg-white/5 border-white/20 shadow-lg' 
                        : 'border-transparent hover:bg-white/5'}
                    `}
                  >
                    {/* Vertical Line connecting nodes */}
                    {idx < result.traces.length - 1 && (
                      <div className="absolute left-[15px] top-[30px] bottom-[-20px] w-px bg-white/10 z-0"></div>
                    )}
                    
                    {/* Node Dot */}
                    <div className="absolute left-[11px] top-4 z-10">
                      {trace.status === 'SUCCESS' ? (
                        <CheckCircle2 size={16} className="text-emerald-400 bg-black rounded-full" />
                      ) : trace.status === 'BLOCKED' ? (
                        <AlertTriangle size={16} className="text-yellow-400 bg-black rounded-full" />
                      ) : trace.status === 'FAILED' ? (
                        <ShieldAlert size={16} className="text-red-400 bg-black rounded-full" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-500 bg-black"></div>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs text-gray-500 font-mono mb-1">
                          {String(idx + 1).padStart(2, '0')}
                        </div>
                        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">{trace.stage}</h3>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">{trace.reason}</p>
                      </div>
                      
                      <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded-md border border-white/5">
                        <Clock size={10} className="text-gray-500" />
                        <span className="text-[10px] font-mono text-gray-400">{trace.duration_ms}ms</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* INSPECTOR */}
          <div className="glass-panel p-6 flex-1 min-w-[320px] border border-white/10 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-white">Stage Inspector</h2>
              {selectedTraceIndex !== null && result && (
                <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20 font-mono">
                  {result.traces[selectedTraceIndex].stage}
                </span>
              )}
            </div>

            {selectedTraceIndex === null || !result || !result.traces[selectedTraceIndex] ? (
              <div className="flex flex-col items-center justify-center flex-1 text-gray-500 gap-4 min-h-[300px]">
                <FileJson size={32} className="opacity-20" />
                <p className="text-center text-sm">Select any stage on the left to inspect its input, output, and guardrails.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                {/* Tabs */}
                <div className="flex border-b border-white/10 gap-4 mb-4 text-xs font-medium">
                  <button 
                    onClick={() => setInspectorTab('overview')}
                    className={`pb-2 transition-colors ${inspectorTab === 'overview' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-400 hover:text-white'}`}
                  >
                    Overview
                  </button>
                  <button 
                    onClick={() => setInspectorTab('input')}
                    className={`pb-2 transition-colors ${inspectorTab === 'input' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-400 hover:text-white'}`}
                  >
                    Input Context
                  </button>
                  <button 
                    onClick={() => setInspectorTab('output')}
                    className={`pb-2 transition-colors ${inspectorTab === 'output' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-400 hover:text-white'}`}
                  >
                    Output / Telemetry
                  </button>
                  {result.traces[selectedTraceIndex].db_operation && (
                    <button 
                      onClick={() => setInspectorTab('database')}
                      className={`pb-2 transition-colors ${inspectorTab === 'database' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-400 hover:text-white'}`}
                    >
                      Database Action
                    </button>
                  )}
                </div>

                {/* Tab Content */}
                <div className="flex-1 text-sm overflow-y-auto max-h-[400px]">
                  {inspectorTab === 'overview' && (
                    <div className="space-y-4">
                      <div>
                        <span className="text-gray-500 block mb-1">Execution Target</span>
                        <div className="font-mono text-emerald-400 bg-black/40 p-2 rounded border border-white/5 text-xs">
                          {result.traces[selectedTraceIndex].service}::{result.traces[selectedTraceIndex].method}()
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 block mb-1">Applied Guardrails</span>
                        <div className="font-mono text-purple-400 bg-black/40 p-2 rounded border border-white/5 text-xs">
                          {result.traces[selectedTraceIndex].rules_applied || "NONE"}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 block mb-1">Explanation / Safety Reason</span>
                        <p className="text-gray-300 text-xs bg-white/5 p-3 rounded-lg border border-white/5">
                          {result.traces[selectedTraceIndex].reason}
                        </p>
                      </div>
                      {result.traces[selectedTraceIndex].output_data?.action_details?.short_url && (
                        <div>
                          <span className="text-gray-500 block mb-1">Live Payment Link Generated</span>
                          <a 
                            href={result.traces[selectedTraceIndex].output_data?.action_details?.short_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline"
                          >
                            Open Razorpay Test Checkout ↗
                          </a>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500 block mb-1">Next Stage</span>
                        <div className="inline-flex items-center gap-1 text-gray-400 text-xs font-medium uppercase bg-white/5 px-2 py-1 rounded">
                          {result.traces[selectedTraceIndex].next_stage} <ArrowRight size={10} />
                        </div>
                      </div>
                    </div>
                  )}

                  {inspectorTab === 'input' && (
                    <div>
                      <pre className="text-[11px] font-mono text-gray-300 bg-black/50 p-4 rounded-xl border border-white/5 overflow-x-auto custom-scrollbar">
                        {JSON.stringify(result.traces[selectedTraceIndex].input_data, null, 2)}
                      </pre>
                    </div>
                  )}

                  {inspectorTab === 'output' && (
                    <div>
                      <pre className="text-[11px] font-mono text-emerald-400/80 bg-black/50 p-4 rounded-xl border border-white/5 overflow-x-auto custom-scrollbar">
                        {JSON.stringify(result.traces[selectedTraceIndex].output_data, null, 2)}
                      </pre>
                    </div>
                  )}

                  {inspectorTab === 'database' && result.traces[selectedTraceIndex].db_operation && (
                    <div className="space-y-3">
                      <div className="inline-flex items-center gap-2 text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-3 py-1 rounded-full w-fit">
                        <Database size={12} />
                        <span className="text-[10px] font-medium tracking-wider uppercase">DRY RUN - DB UNCHANGED</span>
                      </div>
                      <pre className="text-[11px] font-mono text-blue-300 bg-black/50 p-4 rounded-xl border border-white/5 overflow-x-auto custom-scrollbar">
                        {JSON.stringify(JSON.parse(result.traces[selectedTraceIndex].db_operation!), null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
          
        </div>
      </div>
    </div>
  );
}

export default function DeveloperConsolePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading developer console...</div>}>
      <DeveloperConsoleContent />
    </Suspense>
  );
}
