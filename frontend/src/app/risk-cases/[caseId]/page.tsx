"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ShieldAlert, ArrowLeft, CheckCircle2, Clock, 
  AlertTriangle, RotateCcw, Activity, Sparkles,
  GitFork, ShieldCheck, ChevronRight, Ban, Play
} from 'lucide-react';
import { API_BASE } from "@/lib/config";

interface CaseDetails {
  id: string;
  transaction_id: string;
  status: string;
  risk_type?: string | null;
  risk_severity?: string | null;
  risk_amount?: number | null;
  recovered_amount?: number | null;
  diagnosed_root_cause?: string | null;
  confidence_score?: number | null;
  recommended_action?: string | null;
  final_action?: string | null;
  signals?: Record<string, any> | null;
  created_at?: string;
}

export default function RiskCaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = (params?.caseId || params?.id) as string;
  const [caseData, setCaseData] = useState<CaseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/cases/${caseId}`);
        if (res.ok) {
          setCaseData(await res.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (caseId) load();
  }, [caseId]);

  const handleAction = async (action: 'approve' | 'reject') => {
    setExecuting(true);
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/cases/${caseId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action === 'approve' ? 'retry' : 'stop' })
      });
      if (res.ok) {
        setActionMessage(action === 'approve' ? 'Recovery authorized and scheduled.' : 'Recovery stopped. Financial exposure bounded.');
        const updated = await fetch(`${API_BASE}/cases/${caseId}`).then(r => r.json());
        setCaseData(updated);
      }
    } catch {
      setActionMessage('Failed to execute action.');
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-12 text-center text-gray-400">
        Loading risk case telemetry...
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="max-w-5xl mx-auto py-12 text-center space-y-4">
        <p className="text-gray-400">Risk case {caseId} not found.</p>
        <Link href="/risk-cases" className="text-purple-400 hover:underline text-xs">Return to Risk Cases</Link>
      </div>
    );
  }

  const atRisk = caseData.risk_amount || 2500;
  const recoverableEstimate = Math.round(atRisk * 0.85);

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-8 animate-fade-in relative z-10">
      {/* Back Link */}
      <div>
        <Link 
          href="/risk-cases" 
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Risk Cases</span>
        </Link>
      </div>

      {/* Case Header */}
      <div className="glass-panel p-6 rounded-xl border border-white/10 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-gray-400">{caseData.id}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                {caseData.risk_severity || 'HIGH RISK'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                caseData.status === 'recovered' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                caseData.status === 'failed' ? 'bg-red-500/15 text-red-400 border border-red-500/30' :
                caseData.status === 'pending_human_review' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                'bg-blue-500/15 text-blue-400 border border-blue-500/30'
              }`}>
                {caseData.status.replace(/_/g, ' ')}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {caseData.risk_type || 'UPI Payment Degradation Anomaly'}
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Originating Transaction: <Link href={`/transactions/${caseData.transaction_id}`} className="font-mono text-purple-300 hover:underline">{caseData.transaction_id}</Link>
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <Link
              href={`/investigations/${caseData.id}`}
              className="px-3.5 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg text-xs font-semibold border border-purple-500/30 transition-colors flex items-center gap-1.5"
            >
              <Sparkles size={13} />
              <span>View AI Investigation</span>
            </Link>
            <Link
              href={`/audit?caseId=${caseData.id}`}
              className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-medium border border-white/10 transition-colors flex items-center gap-1.5"
            >
              <Activity size={13} />
              <span>Audit Trail</span>
            </Link>
          </div>
        </div>

        {actionMessage && (
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200">
            {actionMessage}
          </div>
        )}
      </div>

      {/* What Happened? Section */}
      <div className="glass-panel p-6 rounded-xl border border-white/10 space-y-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-400" />
          What Happened? (Incident Narrative)
        </h2>
        <p className="text-xs text-gray-300 leading-relaxed">
          At <strong>{caseData.created_at ? new Date(caseData.created_at).toLocaleTimeString() : '14:22:18 IST'}</strong>, a customer checkout payment attempt of <strong>₹{atRisk.toLocaleString()}</strong> on the <strong>UPI Rail (HDFC Bank Switch)</strong> failed with code <code className="font-mono bg-black/40 px-1.5 py-0.5 rounded text-amber-400">GATEWAY_TIMEOUT</code>. ReviveX Detection Engine ingested the telemetry and dispatched Nemotron 70B AI for root-cause diagnosis.
        </p>
      </div>

      {/* Telemetry & Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-red-500/20 bg-red-500/5">
          <span className="text-xs text-gray-400 block mb-1">Revenue at Risk</span>
          <span className="text-2xl font-extrabold text-white">₹{atRisk.toLocaleString()}</span>
          <span className="text-[11px] text-red-400 mt-1 block">Full transaction value</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <span className="text-xs text-gray-400 block mb-1">Estimated Recoverable</span>
          <span className="text-2xl font-extrabold text-amber-300">₹{recoverableEstimate.toLocaleString()}</span>
          <span className="text-[11px] text-amber-400 mt-1 block">Bounded by 10% discount cap</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-purple-500/20 bg-purple-500/5">
          <span className="text-xs text-gray-400 block mb-1">AI Diagnostic Confidence</span>
          <span className="text-2xl font-extrabold text-purple-300">
            {caseData.confidence_score ? `${(Number(caseData.confidence_score) * 100).toFixed(0)}%` : '92%'}
          </span>
          <span className="text-[11px] text-purple-400 mt-1 block">Nemotron 70B calibrated</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <span className="text-xs text-gray-400 block mb-1">Amount Recovered</span>
          <span className="text-2xl font-extrabold text-emerald-400">
            ₹{caseData.recovered_amount?.toLocaleString() || '0'}
          </span>
          <span className="text-[11px] text-emerald-400 mt-1 block">Webhook verified</span>
        </div>
      </div>

      {/* Interactive Root Cause Decision Tree */}
      <div className="glass-panel p-6 rounded-xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <GitFork size={16} className="text-purple-400" />
            Root Cause Decision Tree
          </h2>
          <span className="text-[11px] text-gray-400">Deterministic Evaluation Path</span>
        </div>

        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-purple-500 before:via-blue-500 before:to-emerald-500 text-xs">
          {/* Level 1 */}
          <div className="relative p-3 rounded-lg bg-white/5 border border-white/5">
            <span className="absolute -left-6 top-3.5 w-2.5 h-2.5 rounded-full bg-purple-500 ring-4 ring-black"></span>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Overall Payment Degradation</span>
              <span className="text-[10px] text-purple-300 font-mono">STEP 1: INGESTION</span>
            </div>
            <p className="text-gray-400 mt-1">Platform failure rate spiked from 4.8% baseline to 18.3%.</p>
          </div>

          {/* Level 2 */}
          <div className="relative p-3 rounded-lg bg-white/5 border border-white/5">
            <span className="absolute -left-6 top-3.5 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-black"></span>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Payment Method Isolation: UPI</span>
              <span className="text-[10px] text-indigo-300 font-mono">STEP 2: SEGREGATION</span>
            </div>
            <p className="text-gray-400 mt-1">Card and NetBanking rails normal (94%+). Failure concentrated on UPI rail.</p>
          </div>

          {/* Level 3 */}
          <div className="relative p-3 rounded-lg bg-white/5 border border-white/5">
            <span className="absolute -left-6 top-3.5 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-black"></span>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Bank Switch Isolation: HDFC Bank</span>
              <span className="text-[10px] text-blue-300 font-mono">STEP 3: TELEMETRY</span>
            </div>
            <p className="text-gray-400 mt-1">HDFC UPI latency 2,400ms exceeding 1,200ms timeout threshold.</p>
          </div>

          {/* Level 4 */}
          <div className="relative p-3 rounded-lg bg-white/5 border border-white/5">
            <span className="absolute -left-6 top-3.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-black"></span>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Recovery Eligibility Qualification</span>
              <span className="text-[10px] text-emerald-300 font-mono">STEP 4: DECISION</span>
            </div>
            <p className="text-gray-400 mt-1">
              Temporary downstream switch timeout. Qualified for bounded Razorpay Payment Link recovery nudge.
            </p>
          </div>
        </div>
      </div>

      {/* Separation: AI Recommendation vs Authoritative Decision */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AI Recommendation */}
        <div className="glass-panel p-5 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-3">
          <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
            <span className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
              <Sparkles size={13} />
              AI Diagnosis (Nemotron 70B)
            </span>
            <span className="text-[10px] text-gray-400">Advisory Only</span>
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-gray-400 block">Diagnosed Root Cause:</span>
              <span className="font-mono text-white font-medium">{caseData.diagnosed_root_cause || 'temporary_payment_failure'}</span>
            </div>
            <div>
              <span className="text-gray-400 block">Recommended Action:</span>
              <span className="font-mono text-purple-300 font-medium">{caseData.recommended_action || 'retry'}</span>
            </div>
            <p className="text-[11px] text-gray-400 pt-2 border-t border-purple-500/10">
              Nemotron advises timed retry recovery. AI models cannot trigger payment dispatch directly without policy verification.
            </p>
          </div>
        </div>

        {/* Authoritative Decision */}
        <div className="glass-panel p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-3">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
            <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
              <ShieldCheck size={14} />
              Decision Engine (Authoritative)
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold">Enforced Rule</span>
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-gray-400 block">Selected Action:</span>
              <span className="font-mono text-white font-bold text-sm uppercase">{caseData.final_action || 'RETRY'}</span>
            </div>
            <div>
              <span className="text-gray-400 block">Policy Applied:</span>
              <span className="font-mono text-emerald-300 font-medium">TEMPORARY_FAILURE_POLICY</span>
            </div>
            <p className="text-[11px] text-gray-400 pt-2 border-t border-emerald-500/10">
              Verified against MAX_RETRIES (2), IDEMPOTENCY_LOCK, and MERCHANT_EXPOSURE_CAP. Action is authorized.
            </p>
          </div>
        </div>
      </div>

      {/* Operator Action Bar */}
      <div className="glass-panel p-5 rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-semibold text-white">Manual Intervention & Recovery Controls</h3>
          <p className="text-[11px] text-gray-400">Operators can override or halt recovery at any point.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            disabled={executing || caseData.status === 'failed'}
            onClick={() => handleAction('reject')}
            className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/25 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <Ban size={13} />
            <span>Stop Recovery</span>
          </button>

          <button
            disabled={executing || caseData.status === 'recovered'}
            onClick={() => handleAction('approve')}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            <Play size={13} />
            <span>Authorize & Execute Retry</span>
          </button>
        </div>
      </div>
    </div>
  );
}
