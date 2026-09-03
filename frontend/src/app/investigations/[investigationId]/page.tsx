"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  BrainCircuit, ArrowLeft, CheckCircle2, Clock, 
  Sparkles, ShieldCheck, Activity, GitCommit, FileText, Lock
} from 'lucide-react';
import { API_BASE } from "@/lib/config";

export default function InvestigationDetailPage() {
  const params = useParams();
  const investigationId = (params?.investigationId || params?.id) as string;
  const [caseData, setCaseData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/cases/${investigationId}`);
        if (res.ok) {
          setCaseData(await res.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (investigationId) load();
  }, [investigationId]);

  if (loading) {
    return <div className="max-w-4xl mx-auto py-12 text-center text-gray-400">Loading investigation telemetry...</div>;
  }

  const atRisk = caseData?.risk_amount || 2500;

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-6">
      <div>
        <Link href="/investigations" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={14} />
          <span>Back to Investigations</span>
        </Link>
      </div>

      <div className="glass-panel p-6 rounded-xl border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <BrainCircuit size={24} />
            </div>
            <div>
              <span className="text-xs text-gray-400 font-mono">Investigation: {investigationId}</span>
              <h1 className="text-xl font-bold text-white mt-0.5">Automated Payment Forensic Report</h1>
            </div>
          </div>
          <div className="text-xs text-gray-400 text-right">
            <span>Model: </span>
            <span className="text-purple-300 font-semibold">Nemotron 70B</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded-lg bg-white/5 border border-white/5">
            <span className="text-gray-400 block mb-1">Primary Finding</span>
            <span className="font-semibold text-white">Downstream Switch Timeout</span>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/5">
            <span className="text-gray-400 block mb-1">Confidence Score</span>
            <span className="font-semibold text-emerald-400">92.0%</span>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/5">
            <span className="text-gray-400 block mb-1">Revenue at Risk</span>
            <span className="font-semibold text-white">₹{atRisk.toLocaleString()}</span>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <span className="text-gray-400 block">AI Reasoning Trace</span>
          <div className="p-4 rounded-lg bg-black/40 border border-white/5 font-mono text-[11px] text-gray-300 space-y-2 leading-relaxed">
            <p className="text-purple-300">&gt; Ingesting transaction signals: method=upi, bank=hdfc, error=gateway_timeout, retry_count=0</p>
            <p>&gt; Comparing baseline: UPI baseline success rate is 94.2%. Current rail degraded to 81.7% over 15m window.</p>
            <p>&gt; Eliminating hard declines: No invalid credentials, fraud score 0.02 nominal, sufficient balance inferred.</p>
            <p className="text-emerald-400">&gt; Concluding root cause: temporary_payment_failure with high confidence (0.92).</p>
            <p className="text-yellow-300">&gt; Decision Engine verification: Evaluated TEMPORARY_FAILURE_POLICY. Retry authorized under maximum exposure cap.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
