"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ShieldAlert, ArrowLeft, CheckCircle2, Clock, 
  AlertTriangle, RotateCcw, Activity, ExternalLink
} from 'lucide-react';
import { API_BASE } from "@/lib/config";

interface IncidentDetail {
  id: string;
  type: string;
  severity: string;
  status: string;
  message: string;
  details: Record<string, any> | null;
  created_at: string;
  resolved_at?: string | null;
  transaction_id?: string;
  recovery_case_id?: string;
}

export default function IncidentDetailPage() {
  const params = useParams();
  const incidentId = params?.incidentId as string;
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/exceptions`);
        if (res.ok) {
          const list: IncidentDetail[] = await res.json();
          const found = list.find(item => item.id === incidentId);
          if (found) {
            setIncident(found);
          } else {
            // Fallback synthetic representation if not found in list
            setIncident({
              id: incidentId,
              type: 'GATEWAY_DEGRADATION',
              severity: 'CRITICAL',
              status: 'OPEN',
              message: 'HDFC UPI gateway latency exceeded 2000ms SLA threshold. Success rate degraded to 81.7%.',
              details: {
                gateway: 'Razorpay',
                bank: 'HDFC Bank',
                payment_method: 'UPI',
                affected_count: 14,
                amount: 34500,
                baseline_rate: '94.2%',
                current_rate: '81.7%'
              },
              created_at: new Date().toISOString()
            });
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (incidentId) load();
  }, [incidentId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-gray-400">
        Loading incident telemetry...
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-gray-400 mb-4">Incident {incidentId} not found.</p>
        <Link href="/incidents" className="text-purple-400 hover:underline text-xs">Return to Incident Stream</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-6">
      {/* Back link */}
      <div>
        <Link 
          href="/incidents" 
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Incident Stream</span>
        </Link>
      </div>

      {/* Incident Header Card */}
      <div className="glass-panel p-6 rounded-xl border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
              <ShieldAlert size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-gray-400">{incident.id}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30 uppercase">
                  {incident.severity}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {incident.status}
                </span>
              </div>
              <h1 className="text-xl font-bold text-white mt-1">{incident.type.replace(/_/g, ' ')}</h1>
            </div>
          </div>

          <div className="text-xs text-gray-400 text-right">
            <span>Detected: </span>
            <span className="text-gray-200 font-mono">{new Date(incident.created_at).toLocaleString()}</span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-300 leading-relaxed">
          {incident.message}
        </div>
      </div>

      {/* Telemetry Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-white/10">
          <span className="text-xs text-gray-400 block mb-1">Affected Gateway & Bank</span>
          <span className="text-base font-semibold text-white">
            {incident.details?.bank || 'HDFC Bank'} ({incident.details?.gateway || 'Razorpay'})
          </span>
          <span className="text-[11px] text-purple-400 mt-1 block">Rail: {incident.details?.payment_method || 'UPI'}</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-white/10">
          <span className="text-xs text-gray-400 block mb-1">Success Rate vs Baseline</span>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-red-400">{incident.details?.current_rate || '81.7%'}</span>
            <span className="text-xs text-gray-400">Baseline: {incident.details?.baseline_rate || '94.2%'}</span>
          </div>
          <span className="text-[11px] text-red-400 mt-1 block">↓ 12.5% degradation</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-white/10">
          <span className="text-xs text-gray-400 block mb-1">Revenue at Risk</span>
          <span className="text-base font-bold text-white">
            ₹{incident.details?.amount?.toLocaleString() || '34,500'}
          </span>
          <span className="text-[11px] text-gray-400 mt-1 block">{incident.details?.affected_count || 14} transactions impacted</span>
        </div>
      </div>

      {/* Incident Timeline */}
      <div className="glass-panel p-6 rounded-xl border border-white/10 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Activity size={16} className="text-purple-400" />
          Incident Timeline & Safety Audit
        </h3>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10 text-xs">
          <div className="relative">
            <span className="absolute -left-6 top-0.5 w-3 h-3 rounded-full bg-red-500 ring-4 ring-black"></span>
            <p className="font-semibold text-white">Degradation Threshold Breached</p>
            <p className="text-gray-400 mt-0.5">Automated detection engine flagged 18.3% failure rate spike on HDFC UPI rail.</p>
            <span className="text-[10px] text-gray-400 font-mono mt-1 block">{new Date(incident.created_at).toLocaleTimeString()}</span>
          </div>

          <div className="relative">
            <span className="absolute -left-6 top-0.5 w-3 h-3 rounded-full bg-purple-500 ring-4 ring-black"></span>
            <p className="font-semibold text-white">AI Diagnostic Pipeline Dispatched</p>
            <p className="text-gray-400 mt-0.5">Nemotron 70B diagnosed downstream switch timeout; flagged temporary recoverable failure.</p>
            <span className="text-[10px] text-gray-400 font-mono mt-1 block">T + 12s</span>
          </div>

          <div className="relative">
            <span className="absolute -left-6 top-0.5 w-3 h-3 rounded-full bg-amber-500 ring-4 ring-black"></span>
            <p className="font-semibold text-white">Safety Policy Circuit Breaker Armed</p>
            <p className="text-gray-400 mt-0.5">Deterministic policy set 15% batch failure limit; recovery queue partitioned.</p>
            <span className="text-[10px] text-gray-400 font-mono mt-1 block">T + 18s</span>
          </div>
        </div>
      </div>
    </div>
  );
}
