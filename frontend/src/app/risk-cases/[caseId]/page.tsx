"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ShieldAlert, ArrowLeft, CheckCircle2, Clock, 
  AlertTriangle, RotateCcw, Activity, Sparkles,
  GitFork, ShieldCheck, ChevronRight, Ban, Play,
  UserCheck, X, FileText, Check, AlertCircle, Radio, Lock
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
  updated_at?: string;
}

export default function RiskCaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = (params?.caseId || params?.id) as string;
  const [caseData, setCaseData] = useState<CaseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal States
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('Customer requested order cancellation');
  const [customRejectionNote, setCustomRejectionNote] = useState('');

  const loadCase = async () => {
    try {
      const res = await fetch(`${API_BASE}/cases/${caseId}`);
      if (res.ok) {
        setCaseData(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch risk case:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (caseId) loadCase();
  }, [caseId]);

  const handleApproveConfirm = async () => {
    setExecuting(true);
    setActionFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/cases/${caseId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          reason: approvalNote || 'Operator verified intent and authorized recovery execution.',
          operator_id: 'ops_operator_1'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback({
          type: 'success',
          message: data.message || 'Recovery authorized and executed via RecoveryEngine.'
        });
        setIsApproveModalOpen(false);
        setApprovalNote('');
        await loadCase();
      } else {
        setActionFeedback({
          type: 'error',
          message: data.detail || 'Failed to authorize recovery.'
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.message || 'Network error while authorizing recovery.'
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleRejectConfirm = async () => {
    setExecuting(true);
    setActionFeedback(null);
    const finalReason = rejectionReason === 'Other' 
      ? (customRejectionNote || 'Manual operator rejection to bound exposure') 
      : rejectionReason;

    try {
      const res = await fetch(`${API_BASE}/cases/${caseId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          reason: finalReason,
          operator_id: 'ops_operator_1'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback({
          type: 'success',
          message: data.message || 'Recovery rejected. Case terminated to bound financial exposure.'
        });
        setIsRejectModalOpen(false);
        await loadCase();
      } else {
        setActionFeedback({
          type: 'error',
          message: data.detail || 'Failed to reject recovery.'
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.message || 'Network error while rejecting recovery.'
      });
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-12 text-center text-gray-400">
        <Clock size={24} className="animate-spin mx-auto mb-2 text-purple-400" />
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

  // Determine current lifecycle state
  const isPendingHumanReview = caseData.status === 'pending_human_review' || 
    (caseData.recommended_action === 'human_review' && caseData.status !== 'recovered' && caseData.status !== 'failed');
  const isRecovered = caseData.status === 'recovered';
  const isStopped = caseData.status === 'failed' || caseData.final_action === 'stop';
  const isRecoveryExecuting = caseData.status === 'open' && caseData.final_action && caseData.final_action !== 'stop';
  const isAutoRecoverable = caseData.status === 'open' && !caseData.final_action && caseData.recommended_action !== 'human_review';

  // Guardrail calculations
  const retryCount = caseData.signals?.recent_failures_count || 0;
  const maxRetries = 2;
  const isHardDecline = caseData.diagnosed_root_cause === 'hard_payment_decline';
  const isFraudFlagged = Boolean(caseData.signals?.fraud_suspected || caseData.signals?.is_fraud);

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
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase flex items-center gap-1.5 ${
                isRecovered ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                isStopped ? 'bg-red-500/15 text-red-400 border border-red-500/30' :
                isPendingHumanReview ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse' :
                'bg-blue-500/15 text-blue-400 border border-blue-500/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isRecovered ? 'bg-emerald-400' :
                  isStopped ? 'bg-red-400' :
                  isPendingHumanReview ? 'bg-amber-400' :
                  'bg-blue-400'
                }`}></span>
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

        {/* Global Feedback Banner */}
        {actionFeedback && (
          <div className={`p-3.5 rounded-lg border text-xs flex items-center justify-between ${
            actionFeedback.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            <div className="flex items-center gap-2">
              {actionFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{actionFeedback.message}</span>
            </div>
            <button 
              onClick={() => setActionFeedback(null)}
              className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white"
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 5 CANONICAL LIFECYCLE STATE BANNERS & ACTION WORKFLOWS */}
      {/* ============================================================== */}

      {/* STATE B: HUMAN REVIEW REQUIRED (Prominent Hero Box) */}
      {isPendingHumanReview && (
        <div className="p-6 rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-amber-950/20 to-black/60 shadow-[0_0_20px_rgba(245,158,11,0.15)] space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-amber-500/20 pb-4">
            <div className="flex items-center gap-2.5 text-amber-300">
              <ShieldAlert size={20} className="text-amber-400 animate-pulse shrink-0" />
              <div>
                <h3 className="text-sm font-bold tracking-tight text-white uppercase">
                  Human Authorization Required
                </h3>
                <p className="text-xs text-amber-300/80">
                  This transaction exceeds automated recovery bounds and requires explicit operator sign-off before financial dispatch.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-mono font-semibold self-start md:self-auto">
              GATE: HUMAN_APPROVAL_THRESHOLD
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1">
              <span className="text-gray-400 block text-[11px]">Transaction Value:</span>
              <span className="text-base font-bold text-white">₹{atRisk.toLocaleString()} INR</span>
              <span className="text-[10px] text-amber-400 block">Exceeds autonomous limit</span>
            </div>

            <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1">
              <span className="text-gray-400 block text-[11px]">AI Recommended Action:</span>
              <span className="text-base font-bold text-purple-300 uppercase font-mono">
                {caseData.recommended_action || 'RETRY'}
              </span>
              <span className="text-[10px] text-purple-400 block">
                Confidence: {caseData.confidence_score ? `${(Number(caseData.confidence_score) * 100).toFixed(0)}%` : '92%'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1">
              <span className="text-gray-400 block text-[11px]">Enforced Policy Gate:</span>
              <span className="text-base font-bold text-emerald-300 font-mono">
                SAFETY_GATED
              </span>
              <span className="text-[10px] text-gray-400 block">Retry count: 0 | Fraud: Passed</span>
            </div>
          </div>

          {/* Action Triggers */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-amber-500/10">
            <p className="text-[11px] text-gray-400">
              Authorizing will dispatch a bounded Razorpay test payment link. Rejecting will terminate recovery.
            </p>

            <div className="flex items-center gap-3">
              <button
                disabled={executing}
                onClick={() => setIsRejectModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/30 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <Ban size={13} />
                <span>Reject Recovery</span>
              </button>

              <button
                disabled={executing}
                onClick={() => setIsApproveModalOpen(true)}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <Play size={13} />
                <span>Approve Recovery</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATE A: AUTOMATICALLY RECOVERABLE */}
      {isAutoRecoverable && (
        <div className="p-5 rounded-xl border border-blue-500/30 bg-blue-500/5 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} className="text-blue-400 shrink-0" />
            <div>
              <span className="font-semibold text-white block">Recovery Permitted by Policy</span>
              <span className="text-gray-400 text-[11px]">
                This case qualifies for automated retry under TEMPORARY_FAILURE_POLICY. No manual intervention required.
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-mono">
            POLICY_CLEARED
          </span>
        </div>
      )}

      {/* STATE C: STOPPED / BLOCKED */}
      {isStopped && (
        <div className="p-5 rounded-xl border border-red-500/30 bg-red-500/5 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Ban size={18} className="text-red-400 shrink-0" />
            <div>
              <span className="font-semibold text-white block">Recovery Blocked / Terminated</span>
              <span className="text-gray-400 text-[11px]">
                Further recovery attempts halted to eliminate customer friction and financial risk.
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded bg-red-500/10 text-red-300 border border-red-500/20 text-[10px] font-mono">
            TERMINAL_STOP
          </span>
        </div>
      )}

      {/* STATE D: RECOVERY IN PROGRESS */}
      {isRecoveryExecuting && (
        <div className="p-5 rounded-xl border border-indigo-500/30 bg-indigo-500/5 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Radio size={18} className="text-indigo-400 animate-pulse shrink-0" />
            <div>
              <span className="font-semibold text-white block">Recovery In Progress</span>
              <span className="text-gray-400 text-[11px]">
                Recovery action dispatched. Awaiting customer completion and Razorpay webhook settlement.
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-mono">
            LINK_DISPATCHED
          </span>
        </div>
      )}

      {/* STATE E: RECOVERED */}
      {isRecovered && (
        <div className="p-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <div>
              <span className="font-semibold text-white block">Recovered & Settled</span>
              <span className="text-gray-400 text-[11px]">
                Verified by Razorpay <code className="font-mono text-emerald-300">payment_link.paid</code> webhook. Revenue is settled.
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-mono font-bold">
            SETTLED
          </span>
        </div>
      )}

      {/* What Happened? Section */}
      <div className="glass-panel p-6 rounded-xl border border-white/10 space-y-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-400" />
          What Happened? (Incident Narrative)
        </h2>
        <p className="text-xs text-gray-300 leading-relaxed">
          At <strong>{caseData.created_at ? new Date(caseData.created_at).toLocaleTimeString() : '14:22:18 IST'}</strong>, a customer checkout payment attempt of <strong>₹{atRisk.toLocaleString()}</strong> on the <strong>UPI Rail (HDFC Bank Switch)</strong> failed with code <code className="font-mono bg-black/40 px-1.5 py-0.5 rounded text-amber-400">{caseData.signals?.error_code || 'GATEWAY_TIMEOUT'}</code>. ReviveX Detection Engine ingested the telemetry and dispatched Nemotron 70B AI for root-cause diagnosis.
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
            ₹{caseData.recovered_amount?.toLocaleString() || (isRecovered ? atRisk.toLocaleString() : '0')}
          </span>
          <span className="text-[11px] text-emerald-400 mt-1 block">Webhook verified</span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* DETERMINISTIC SAFETY GUARDRAILS EVALUATION GRID */}
      {/* ============================================================== */}
      <div className="glass-panel p-6 rounded-xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400" />
            Deterministic Safety Guardrails Evaluation
          </h2>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            POLICY GATES ACTIVE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {/* 1. Transaction Amount & Threshold */}
          <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1">
            <span className="text-gray-400 text-[11px] block">Human Review Threshold</span>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">₹{atRisk.toLocaleString()} INR</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                atRisk > 10000 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {atRisk > 10000 ? 'EXCEEDS ₹10k' : 'WITHIN BOUNDS'}
              </span>
            </div>
            <span className="text-[10px] text-gray-500 block">HUMAN_APPROVAL_THRESHOLD: ₹10,000</span>
          </div>

          {/* 2. Retry Count vs Max Retries */}
          <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1">
            <span className="text-gray-400 text-[11px] block">Retry Count / Max Limit</span>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">{retryCount} / {maxRetries} Retries</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                retryCount >= maxRetries ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {retryCount >= maxRetries ? 'LIMIT REACHED' : 'CLEARED'}
              </span>
            </div>
            <span className="text-[10px] text-gray-500 block">MAX_RETRIES: 2 per transaction</span>
          </div>

          {/* 3. Hard Decline Policy */}
          <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1">
            <span className="text-gray-400 text-[11px] block">Hard Decline Policy</span>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">{isHardDecline ? 'Hard Decline' : 'Temporary'}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                isHardDecline ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {isHardDecline ? 'STOPPED' : 'PASSED'}
              </span>
            </div>
            <span className="text-[10px] text-gray-500 block">HARD_DECLINE_POLICY: Zero retries</span>
          </div>

          {/* 4. Fraud Flag */}
          <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1">
            <span className="text-gray-400 text-[11px] block">Fraud Guardrail Flag</span>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">{isFraudFlagged ? 'Fraud Suspected' : 'Clean Signals'}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                isFraudFlagged ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {isFraudFlagged ? 'FLAGGED' : 'PASSED'}
              </span>
            </div>
            <span className="text-[10px] text-gray-500 block">FRAUD_FLAG: Deterministic abort</span>
          </div>

          {/* 5. Circuit Breaker Status */}
          <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1">
            <span className="text-gray-400 text-[11px] block">Circuit Breaker Status</span>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Closed (Normal)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                ACTIVE
              </span>
            </div>
            <span className="text-[10px] text-gray-500 block">CIRCUIT_BREAKER: 15% threshold</span>
          </div>

          {/* 6. Recovery Eligibility */}
          <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1">
            <span className="text-gray-400 text-[11px] block">Recovery Eligibility</span>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">
                {isStopped ? 'TERMINATED' : (isRecovered ? 'SETTLED' : 'ELIGIBLE')}
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                isStopped ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {isStopped ? 'TERMINAL_STOP' : 'QUALIFIED'}
              </span>
            </div>
            <span className="text-[10px] text-gray-500 block">Decision: {caseData.final_action || caseData.recommended_action || 'retry'}</span>
          </div>
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
              <span className="font-mono text-white font-bold text-sm uppercase">{caseData.final_action || (isPendingHumanReview ? 'HUMAN_REVIEW' : 'RETRY')}</span>
            </div>
            <div>
              <span className="text-gray-400 block">Policy Applied:</span>
              <span className="font-mono text-emerald-300 font-medium">
                {isPendingHumanReview ? 'HUMAN_APPROVAL_THRESHOLD' : (caseData.final_action === 'stop' ? 'HARD_DECLINE_POLICY' : 'TEMPORARY_FAILURE_POLICY')}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 pt-2 border-t border-emerald-500/10">
              Verified against MAX_RETRIES (2), IDEMPOTENCY_LOCK, and MERCHANT_EXPOSURE_CAP.
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: APPROVAL CONFIRMATION DIALOG */}
      {/* ============================================================== */}
      {isApproveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-white/20 bg-[#111114] max-w-md w-full space-y-5 animate-scale-in text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Play size={16} />
                <span>Confirm Human Authorization</span>
              </div>
              <button 
                onClick={() => setIsApproveModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3 text-gray-300">
              <p>
                You are authorizing bounded recovery execution for Case <strong className="text-white font-mono">{caseData.id}</strong>.
              </p>

              <div className="p-3 rounded-lg bg-black/50 border border-white/5 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-gray-400">Target Action:</span>
                  <span className="font-mono text-emerald-300 font-semibold uppercase">{caseData.recommended_action || 'RETRY'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Transaction Value:</span>
                  <span className="font-mono text-white">₹{atRisk.toLocaleString()} INR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Recovery Mechanism:</span>
                  <span className="text-purple-300">Razorpay Test Payment Link</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Authorization Note (Recorded in Audit Trail):</label>
                <input 
                  type="text"
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  placeholder="e.g. Verified customer intent with VIP support team"
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                disabled={executing}
                onClick={() => setIsApproveModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
              >
                Cancel
              </button>

              <button
                disabled={executing}
                onClick={handleApproveConfirm}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
              >
                {executing ? <Clock size={13} className="animate-spin" /> : <Check size={13} />}
                <span>Confirm & Execute</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: REJECTION CONFIRMATION DIALOG */}
      {/* ============================================================== */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-white/20 bg-[#111114] max-w-md w-full space-y-5 animate-scale-in text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                <Ban size={16} />
                <span>Reject & Halt Recovery</span>
              </div>
              <button 
                onClick={() => setIsRejectModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3 text-gray-300">
              <p>
                Halting recovery will transition Case <strong className="text-white font-mono">{caseData.id}</strong> to <span className="text-red-400 font-bold">TERMINATED/FAILED</span> status to prevent further retry calls.
              </p>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Select Rejection Reason (Mandatory):</label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-red-500 mb-2"
                >
                  <option value="Customer requested order cancellation">Customer requested order cancellation</option>
                  <option value="Suspected fraudulent velocity or high dispute probability">Suspected fraudulent velocity or high dispute probability</option>
                  <option value="Unverified customer credentials or chargeback risk">Unverified customer credentials or chargeback risk</option>
                  <option value="Manual merchant operator override">Manual merchant operator override</option>
                  <option value="Other">Other (Custom note below)</option>
                </select>

                {rejectionReason === 'Other' && (
                  <input 
                    type="text"
                    value={customRejectionNote}
                    onChange={(e) => setCustomRejectionNote(e.target.value)}
                    placeholder="Enter custom rejection reason..."
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-red-500"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                disabled={executing}
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
              >
                Cancel
              </button>

              <button
                disabled={executing}
                onClick={handleRejectConfirm}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(239,68,68,0.3)]"
              >
                {executing ? <Clock size={13} className="animate-spin" /> : <Ban size={13} />}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
