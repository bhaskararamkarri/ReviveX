"use client";

import React, { useState, useEffect } from 'react';
import { 
  Settings, Save, RotateCcw, AlertTriangle, ShieldCheck, 
  Link2, CheckCircle2, Lock, ShieldAlert, Sparkles, Sliders, Info, Clock
} from 'lucide-react';
import { API_BASE } from "@/lib/config";

interface SettingsData {
  max_retries: number;
  human_approval_threshold: number;
  max_discount: number;
  automatic_retry: boolean;
  automatic_nudge: boolean;
  max_batch_size?: number;
  max_exposure_cap?: number;
  circuit_breaker_threshold?: number;
}

const defaultSettings: SettingsData = {
  max_retries: 2,
  human_approval_threshold: 10000,
  max_discount: 10,
  automatic_retry: true,
  automatic_nudge: true,
  max_batch_size: 50,
  max_exposure_cap: 50000,
  circuit_breaker_threshold: 15,
};

const policyExplanations = [
  {
    name: 'TEMPORARY_FAILURE_POLICY',
    purpose: 'Governs bounded retries for transient gateway or network timeouts',
    currentRule: 'Max 2 retries per transaction',
    whyExists: 'Network glitches, UPI switch timeouts, and bank maintenance spikes resolve within minutes.',
    whenTriggered: 'Generates a time-delayed Razorpay Payment Link without charging duplicate transaction fees.',
    icon: <Clock size={16} className="text-purple-400" />
  },
  {
    name: 'HARD_DECLINE_POLICY',
    purpose: 'Halts recovery on irreversible card/account declines',
    currentRule: 'Zero retries on fraud or insufficient funds',
    whyExists: 'Attempting retries on stolen cards or hard bank rejections damages merchant reputation and incurs gateway fines.',
    whenTriggered: 'Deterministically overrides AI advice; sets status to STOP and notifies operator.',
    icon: <ShieldAlert size={16} className="text-red-400" />
  },
  {
    name: 'CIRCUIT_BREAKER_POLICY',
    purpose: 'Automatic emergency shutdown during systemic rail outages',
    currentRule: 'Trips if batch failure rate exceeds 15%',
    whyExists: 'If a major bank or UPI switch suffers a prolonged outage, continuing retries wastes money and irritates customers.',
    whenTriggered: 'Halts the recovery batch immediately and dispatches an alert to Risk Operations.',
    icon: <AlertTriangle size={16} className="text-amber-400" />
  },
  {
    name: 'EXPOSURE_CAP_POLICY',
    purpose: 'Upper ceiling on merchant recovery credit exposure',
    currentRule: '₹50,000 maximum active batch exposure',
    whyExists: 'Prevents unlimited financial liability before settlement reconciliation is confirmed by Razorpay.',
    whenTriggered: 'Batches exceeding the cap require manual agent authorization in the queue.',
    icon: <Lock size={16} className="text-blue-400" />
  },
  {
    name: 'IDEMPOTENCY_LOCK_POLICY',
    purpose: 'Cryptographic prevention of double-charging',
    currentRule: 'Strict SHA-256 UUID uniqueness per transaction recovery key',
    whyExists: 'Network retries can result in two payment links being paid by the same customer simultaneously.',
    whenTriggered: 'Rejects subsequent creation calls; returns the existing idempotent recovery action.',
    icon: <CheckCircle2 size={16} className="text-emerald-400" />
  },
  {
    name: 'WEBHOOK_INTEGRITY_POLICY',
    purpose: 'HMAC SHA-256 signature verification on Razorpay events',
    currentRule: 'Rejects untrusted payloads missing valid X-Razorpay-Signature',
    whyExists: 'Protects revenue reconciliation from spoofed payment_link.paid event attacks.',
    whenTriggered: 'Discards unauthenticated webhooks with HTTP 400 and logs an audit security event.',
    icon: <ShieldCheck size={16} className="text-teal-400" />
  }
];

export default function SafetyPoliciesPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [aiStatus, setAiStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [aiMessage, setAiMessage] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/settings`);
        if (res.ok) {
          const data = await res.json();
          setSettings({
            ...defaultSettings,
            ...data
          });
        } else {
          setSettings(defaultSettings);
        }
      } catch (err) {
        console.error('Failed to fetch settings', err);
        setSettings(defaultSettings);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSavedMessage(false);
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_retries: settings.max_retries,
          human_approval_threshold: settings.human_approval_threshold,
          max_discount: settings.max_discount,
          automatic_retry: settings.automatic_retry,
          automatic_nudge: settings.automatic_nudge
        })
      });
      if (res.ok) {
        setSavedMessage(true);
        setTimeout(() => setSavedMessage(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleTestAi = async () => {
    setAiStatus('testing');
    try {
      const res = await fetch(`${API_BASE}/settings/test-ai`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'success') {
        setAiStatus('success');
      } else {
        setAiStatus('error');
        setAiMessage(data.message || 'Error communicating with AI engine');
      }
    } catch {
      setAiStatus('error');
      setAiMessage('Failed to connect to AI engine endpoint.');
    }
  };

  if (loading || !settings) {
    return <div className="p-12 text-center text-gray-400">Loading safety policies...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8 animate-fade-in relative z-10">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="text-emerald-400" size={28} />
              Safety Policy Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Deterministic Guardrails
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Immutable safety constraints that override probabilistic AI models to prevent cascading failures and financial exposure.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedMessage && (
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 size={14} /> Policies Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={14} />
            <span>{saving ? 'Enforcing Policies...' : 'Save & Enforce Policies'}</span>
          </button>
        </div>
      </header>

      {/* Configurable Policy Controls */}
      <div className="glass-panel p-6 rounded-xl border border-white/10 space-y-6">
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <Sliders size={18} className="text-purple-400" />
          <h2 className="text-base font-semibold text-white">Active Policy Parameter Bounds</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
          {/* Max Retries */}
          <div className="space-y-2 p-4 rounded-lg bg-white/5 border border-white/5">
            <div className="flex justify-between items-center">
              <label className="font-semibold text-white">Maximum Retries Per Transaction</label>
              <span className="font-mono text-purple-300 font-bold">{settings.max_retries} attempts</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="5" 
              value={settings.max_retries}
              onChange={(e) => setSettings({ ...settings, max_retries: parseInt(e.target.value) })}
              className="w-full accent-purple-500"
            />
            <p className="text-[11px] text-gray-400">Exceeding this counter permanently stops automatic retries.</p>
          </div>

          {/* Human Approval Threshold */}
          <div className="space-y-2 p-4 rounded-lg bg-white/5 border border-white/5">
            <div className="flex justify-between items-center">
              <label className="font-semibold text-white">Human Approval Threshold</label>
              <span className="font-mono text-amber-300 font-bold">₹{settings.human_approval_threshold.toLocaleString()}</span>
            </div>
            <input 
              type="range" 
              min="1000" 
              max="50000" 
              step="1000"
              value={settings.human_approval_threshold}
              onChange={(e) => setSettings({ ...settings, human_approval_threshold: parseInt(e.target.value) })}
              className="w-full accent-amber-500"
            />
            <p className="text-[11px] text-gray-400">Transactions above this value require agent sign-off.</p>
          </div>

          {/* Max Recovery Discount */}
          <div className="space-y-2 p-4 rounded-lg bg-white/5 border border-white/5">
            <div className="flex justify-between items-center">
              <label className="font-semibold text-white">Max Recovery Incentive / Discount</label>
              <span className="font-mono text-emerald-300 font-bold">{settings.max_discount}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="25" 
              value={settings.max_discount}
              onChange={(e) => setSettings({ ...settings, max_discount: parseInt(e.target.value) })}
              className="w-full accent-emerald-500"
            />
            <p className="text-[11px] text-gray-400">Maximum discount allowed on regenerated payment links.</p>
          </div>

          {/* Circuit Breaker Threshold */}
          <div className="space-y-2 p-4 rounded-lg bg-white/5 border border-white/5">
            <div className="flex justify-between items-center">
              <label className="font-semibold text-white">Circuit Breaker Auto-Stop Rate</label>
              <span className="font-mono text-red-400 font-bold">15% failure rate</span>
            </div>
            <p className="text-[11px] text-gray-400">
              Recovery queue trips immediately if consecutive failure rate exceeds 15%.
            </p>
          </div>

          {/* Exposure Cap */}
          <div className="space-y-2 p-4 rounded-lg bg-white/5 border border-white/5">
            <div className="flex justify-between items-center">
              <label className="font-semibold text-white">Batch Exposure Cap</label>
              <span className="font-mono text-blue-300 font-bold">₹50,000</span>
            </div>
            <p className="text-[11px] text-gray-400">
              Limits total concurrent unrecovered amount per batch.
            </p>
          </div>

          {/* Automatic Nudge Toggle */}
          <div className="space-y-2 p-4 rounded-lg bg-white/5 border border-white/5">
            <div className="flex justify-between items-center">
              <label className="font-semibold text-white">Automatic Payment Link Dispatch</label>
              <input 
                type="checkbox" 
                checked={settings.automatic_nudge}
                onChange={(e) => setSettings({ ...settings, automatic_nudge: e.target.checked })}
                className="w-4 h-4 accent-purple-500 rounded"
              />
            </div>
            <p className="text-[11px] text-gray-400">
              Automatically creates and sends Razorpay test payment links when safety rules pass.
            </p>
          </div>
        </div>
      </div>

      {/* Policy Explanations Directory */}
      <div className="glass-panel p-6 rounded-xl border border-white/10 space-y-4">
        <div className="border-b border-white/10 pb-3">
          <h2 className="text-base font-semibold text-white">Policy Explanations & Operating Rules</h2>
          <p className="text-xs text-gray-400">Clear documentation of why each deterministic policy exists and how it acts</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {policyExplanations.map((policy) => (
            <div key={policy.name} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                {policy.icon}
                <span className="font-mono font-bold text-white text-xs">{policy.name}</span>
              </div>
              <p className="text-purple-300 text-[11px] font-medium">{policy.purpose}</p>

              <div className="space-y-1.5 pt-2 border-t border-white/5">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">Rule Constraint:</span>
                  <span className="font-mono text-gray-200">{policy.currentRule}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">Why it exists:</span>
                  <p className="text-gray-300 text-[11px] leading-relaxed">{policy.whyExists}</p>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">When triggered:</span>
                  <p className="text-gray-300 text-[11px] leading-relaxed">{policy.whenTriggered}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Engine Telemetry Test Card */}
      <div className="glass-panel p-5 rounded-xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Sparkles size={14} className="text-purple-400" />
            AI Diagnostic Reasoning Node (Nemotron 70B)
          </h3>
          <p className="text-[11px] text-gray-400">Test live connectivity to the AI diagnosis inference service.</p>
        </div>

        <div className="flex items-center gap-3">
          {aiStatus === 'success' && (
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 size={13} /> Nemotron 70B Online
            </span>
          )}
          {aiStatus === 'error' && (
            <span className="text-xs text-red-400 font-medium">
              {aiMessage || 'Error connecting to model'}
            </span>
          )}
          <button
            onClick={handleTestAi}
            disabled={aiStatus === 'testing'}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-medium border border-white/10 transition-colors"
          >
            {aiStatus === 'testing' ? 'Testing...' : 'Test AI Connection'}
          </button>
        </div>
      </div>
    </div>
  );
}
