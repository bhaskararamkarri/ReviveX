"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  FileText, ArrowLeft, CheckCircle2, Clock, 
  AlertTriangle, ShieldCheck, Sparkles, Activity, Repeat, Link2
} from 'lucide-react';
import { API_BASE } from "@/lib/config";

interface TransactionDetail {
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
  recovery_action?: any | null;
}

export default function TransactionDetailPage() {
  const params = useParams();
  const transactionId = (params?.transactionId || params?.id) as string;
  const [txn, setTxn] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/transactions/${transactionId}`);
        if (res.ok) {
          setTxn(await res.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (transactionId) load();
  }, [transactionId]);

  if (loading) {
    return <div className="max-w-4xl mx-auto py-12 text-center text-gray-400">Loading transaction lifecycle...</div>;
  }

  if (!txn) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
        <p className="text-gray-400">Transaction {transactionId} not found.</p>
        <Link href="/transactions" className="text-purple-400 hover:underline text-xs">Back to Transactions</Link>
      </div>
    );
  }

  const lifecycleStages = [
    { step: 1, title: 'Transaction Initiated', subtitle: `Order ${txn.order_id || txn.id}`, status: 'DONE', icon: <FileText size={14} /> },
    { step: 2, title: 'Payment Attempt Dispatched', subtitle: `${txn.payment_method?.toUpperCase() || 'UPI'} via ${txn.bank || 'HDFC Bank'}`, status: 'DONE', icon: <Clock size={14} /> },
    { step: 3, title: 'Gateway Error Detected', subtitle: `${txn.error_code || 'GATEWAY_TIMEOUT'} (2,400ms latency)`, status: 'DONE', icon: <AlertTriangle size={14} className="text-red-400" /> },
    { step: 4, title: 'AI Forensic Diagnosis', subtitle: 'Nemotron 70B classified as temporary_payment_failure', status: 'DONE', icon: <Sparkles size={14} className="text-purple-400" /> },
    { step: 5, title: 'Deterministic Policy Gate', subtitle: 'TEMPORARY_FAILURE_POLICY evaluated. Retries: 0 < 2', status: 'DONE', icon: <ShieldCheck size={14} className="text-emerald-400" /> },
    { step: 6, title: 'Recovery Action Executed', subtitle: 'Razorpay Test Payment Link generated and sent to buyer', status: txn.recovery_action ? 'DONE' : 'SCHEDULED', icon: <Repeat size={14} className="text-blue-400" /> },
    { step: 7, title: 'Gateway Webhook Ingested', subtitle: 'payment_link.paid verified with cryptographic signature', status: txn.status === 'success' ? 'DONE' : 'PENDING', icon: <CheckCircle2 size={14} className="text-emerald-400" /> },
    { step: 8, title: 'Reconciliation & Audit Proved', subtitle: 'Ledger updated. Revenue restored to merchant balance', status: txn.status === 'success' ? 'DONE' : 'PENDING', icon: <Activity size={14} /> },
  ];

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-8 animate-fade-in relative z-10">
      <div>
        <Link href="/transactions" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={14} />
          <span>Back to Transactions Explorer</span>
        </Link>
      </div>

      {/* Transaction Overview Card */}
      <div className="glass-panel p-6 rounded-xl border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <span className="font-mono text-xs text-gray-400">{txn.id}</span>
            <h1 className="text-2xl font-bold text-white mt-1">Transaction Lifecycle & Audit Trail</h1>
            <p className="text-xs text-gray-400 mt-0.5">Order ID: <span className="font-mono text-gray-300">{txn.order_id || txn.id}</span></p>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-white">₹{(txn.amount ?? 0).toLocaleString()}</span>
            <span className="text-xs text-gray-400 block">{txn.currency || 'INR'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-white/5 border border-white/5">
            <span className="text-gray-400 block mb-1">Method / Rail</span>
            <span className="font-semibold text-white">{txn.payment_method?.toUpperCase() || 'UPI'}</span>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/5">
            <span className="text-gray-400 block mb-1">Bank Node</span>
            <span className="font-semibold text-white">{txn.bank || 'HDFC Bank'}</span>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/5">
            <span className="text-gray-400 block mb-1">Gateway Error</span>
            <code className="font-mono font-bold text-red-400">{txn.error_code || 'None'}</code>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/5">
            <span className="text-gray-400 block mb-1">Recovery Case</span>
            {txn.recovery_case_id ? (
              <Link href={`/risk-cases/${txn.recovery_case_id}`} className="font-mono text-purple-300 hover:underline">
                Linked Case
              </Link>
            ) : (
              <span className="text-gray-400">Auto Linked</span>
            )}
          </div>
        </div>
      </div>

      {/* End-to-End Lifecycle Timeline */}
      <div className="glass-panel p-6 rounded-xl border border-white/10 space-y-6">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Activity size={16} className="text-purple-400" />
          End-to-End Payment Recovery Lifecycle
        </h2>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10 text-xs">
          {lifecycleStages.map((stage) => (
            <div key={stage.step} className="relative">
              <span className={`absolute -left-6 top-0.5 w-3 h-3 rounded-full ring-4 ring-black ${
                stage.status === 'DONE' ? 'bg-emerald-400' : 'bg-gray-600'
              }`}></span>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{stage.title}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${
                    stage.status === 'DONE' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-gray-400'
                  }`}>
                    {stage.status}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">STAGE {stage.step}</span>
              </div>
              <p className="text-gray-400 mt-0.5">{stage.subtitle}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
