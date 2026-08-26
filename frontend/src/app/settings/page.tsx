"use client";

import React, { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw, AlertTriangle, ShieldCheck, Link2, CheckCircle2 } from 'lucide-react';

interface SettingsData {
  max_retries: number;
  human_approval_threshold: number;
  max_discount: number;
  automatic_retry: boolean;
  automatic_nudge: boolean;
}

const defaultSettings: SettingsData = {
  max_retries: 2,
  human_approval_threshold: 10000,
  max_discount: 10,
  automatic_retry: true,
  automatic_nudge: true,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiStatus, setAiStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [aiMessage, setAiMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/settings');
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch settings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        alert('Settings saved successfully!');
        setSettings(await res.json());
      } else {
        alert('Failed to save settings.');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset to defaults?')) {
      setSettings(defaultSettings);
    }
  };

  const handleTestAi = async () => {
    setAiStatus('testing');
    try {
      const res = await fetch('http://127.0.0.1:8000/api/settings/test-ai', { method: 'POST' });
      const data = await res.json();
      if (data.status === 'success') {
        setAiStatus('success');
      } else {
        setAiStatus('error');
        setAiMessage(data.message);
      }
    } catch (err) {
      setAiStatus('error');
      setAiMessage('Failed to connect to backend.');
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-400">Loading settings...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-8 animate-fade-in relative z-10">
      <header>
        <h1 className="text-3xl font-bold text-white glow-text mb-2 flex items-center gap-3">
          <Settings className="text-blue-400" />
          Settings
        </h1>
        <p className="text-gray-400">Configure AI models, thresholds, and operational rules.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* AI Configuration */}
        <div className="glass-panel p-6 space-y-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <ShieldCheck className="text-purple-400" />
            AI Configuration
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">AI Provider</label>
              <div className="text-white font-medium bg-gray-800/50 p-3 rounded border border-gray-700/50">NVIDIA</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">AI Model</label>
              <div className="text-white font-medium bg-gray-800/50 p-3 rounded border border-gray-700/50">nvidia/nemotron-3-nano-30b-a3b</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">API Key</label>
              <div className="text-white font-medium bg-gray-800/50 p-3 rounded border border-gray-700/50 flex justify-between items-center">
                <span>••••••••••••••••</span>
                <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">Configured</span>
              </div>
            </div>
            <button 
              onClick={handleTestAi}
              disabled={aiStatus === 'testing'}
              className="mt-4 px-4 py-2 bg-purple-500/10 text-purple-400 rounded border border-purple-500/20 hover:bg-purple-500/20 transition-colors w-full flex justify-center items-center gap-2"
            >
              {aiStatus === 'testing' ? 'Testing...' : 'Test AI Connection'}
            </button>
            {aiStatus === 'success' && <div className="text-green-400 text-sm mt-2 flex items-center gap-1"><CheckCircle2 size={16} /> Connection Successful</div>}
            {aiStatus === 'error' && <div className="text-red-400 text-sm mt-2">{aiMessage}</div>}
          </div>
        </div>

        {/* Recovery Rules */}
        <div className="glass-panel p-6 space-y-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <Settings className="text-blue-400" />
            Recovery Rules
          </h2>
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Maximum automatic retries</label>
              <p className="text-xs text-gray-500 mb-2">Maximum number of payment retry attempts before the case is stopped.</p>
              <input 
                type="number" 
                value={settings?.max_retries ?? 2}
                onChange={e => setSettings(s => s ? {...s, max_retries: parseInt(e.target.value)} : null)}
                className="w-full bg-gray-900/50 border border-gray-700 rounded p-2 text-white outline-none focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Human approval threshold (₹)</label>
              <p className="text-xs text-gray-500 mb-2">Transactions above this amount require merchant approval.</p>
              <input 
                type="number" 
                value={settings?.human_approval_threshold ?? 10000}
                onChange={e => setSettings(s => s ? {...s, human_approval_threshold: parseFloat(e.target.value)} : null)}
                className="w-full bg-gray-900/50 border border-gray-700 rounded p-2 text-white outline-none focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Maximum discount (%)</label>
              <input 
                type="number" 
                value={settings?.max_discount ?? 10}
                onChange={e => setSettings(s => s ? {...s, max_discount: parseFloat(e.target.value)} : null)}
                className="w-full bg-gray-900/50 border border-gray-700 rounded p-2 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-300">Automatic Retry</label>
                <p className="text-xs text-gray-500">Allow system to execute retries automatically</p>
              </div>
              <input 
                type="checkbox" 
                checked={settings?.automatic_retry ?? true}
                onChange={e => setSettings(s => s ? {...s, automatic_retry: e.target.checked} : null)}
                className="w-5 h-5 accent-blue-500"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-300">Automatic Customer Nudge</label>
                <p className="text-xs text-gray-500">Allow system to send nudge emails automatically</p>
              </div>
              <input 
                type="checkbox" 
                checked={settings?.automatic_nudge ?? true}
                onChange={e => setSettings(s => s ? {...s, automatic_nudge: e.target.checked} : null)}
                className="w-5 h-5 accent-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Safety Rules */}
        <div className="glass-panel p-6 space-y-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <AlertTriangle className="text-yellow-400" />
            Protected Safety Rules
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-red-500/10 border border-red-500/20 rounded">
              <span className="text-gray-300">Fraud detected</span>
              <span className="text-red-400 font-bold tracking-wider text-sm">STOP</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-500/10 border border-red-500/20 rounded">
              <span className="text-gray-300">Retry limit reached</span>
              <span className="text-red-400 font-bold tracking-wider text-sm">STOP</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-yellow-500/10 border border-yellow-500/20 rounded">
              <span className="text-gray-300">High-value transaction</span>
              <span className="text-yellow-400 font-bold tracking-wider text-sm">HUMAN APPROVAL</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-yellow-500/10 border border-yellow-500/20 rounded">
              <span className="text-gray-300">Unknown diagnosis</span>
              <span className="text-yellow-400 font-bold tracking-wider text-sm">HUMAN REVIEW</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">These are deterministic system-level guardrails. The LLM cannot override them.</p>
          </div>
        </div>

        {/* Razorpay Integration */}
        <div className="glass-panel p-6 space-y-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <Link2 className="text-blue-400" />
            Razorpay Integration
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Status</span>
              <span className="text-green-400 text-sm bg-green-400/10 px-2 py-1 rounded">Connected</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Webhook</span>
              <span className="text-green-400 text-sm bg-green-400/10 px-2 py-1 rounded">Active</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Webhook Endpoint</span>
              <span className="text-gray-300 text-sm font-mono bg-gray-800 p-1 rounded">POST /api/webhooks/razorpay</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-800">
        <button 
          onClick={handleReset}
          className="px-6 py-2 rounded flex items-center gap-2 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <RotateCcw size={16} />
          Reset Defaults
        </button>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 rounded flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

    </div>
  );
}
