"use client";

import * as React from 'react';
import { Activity, CheckCircle2, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export function ActiveIncidentDropdown() {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/25 text-red-300 text-xs hover:bg-red-500/20 transition-all font-medium"
      >
        <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
        <span className="hidden sm:inline">Active Incident:</span>
        <span>UPI Degradation</span>
        <span className="font-mono text-[10px] bg-red-500/20 px-1 rounded text-red-200">RC-001</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[400px] bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col">
          
          <div className="p-4 flex flex-col gap-3">
            {/* Header Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 uppercase tracking-wider">
                <Activity size={12} /> Live Active Incident
              </div>
              <span className="text-[10px] bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300 px-1.5 py-0.5 rounded font-mono">
                PostgreSQL Telemetry
              </span>
            </div>

            {/* Red Alert Card */}
            <Link 
              href="/incidents/RC-001" 
              onClick={() => setIsOpen(false)}
              className="block bg-red-50 dark:bg-red-500/5 hover:bg-red-100 dark:hover:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-3 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-red-600 dark:text-red-400" />
                  <span className="text-sm font-semibold text-red-900 dark:text-red-200 group-hover:underline">HDFC UPI Degradation - RC-001</span>
                </div>
                <CheckCircle2 size={14} className="text-red-500" />
              </div>
              <p className="text-xs text-red-800/80 dark:text-red-200/70 leading-relaxed">
                1,251 transactions - 81.9% conversion - ₹12.20L revenue at risk. Backed by PostgreSQL transaction span and investigation INV-00000000.
              </p>
            </Link>
            
            {/* Simulation Scenarios Section */}
            <div className="mt-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2">
                <MicroscopeIcon size={12} /> Simulation Scenarios (Synthetic Engine)
              </div>
              
              <div className="flex flex-col gap-1">
                <Link 
                  href="/developer-console?scenario=retry_limit" 
                  onClick={() => setIsOpen(false)}
                  className="px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer group transition-colors block"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-200 group-hover:text-purple-300 transition-colors">Recovery Failure / Auto Stop</span>
                    <span className="text-[10px] text-gray-400 font-mono">Circuit Breaker</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Live recovery execution hits failure threshold &gt;30% and halts automatically to protect merchant.</p>
                </Link>

                <Link 
                  href="/developer-console?scenario=abandoned" 
                  onClick={() => setIsOpen(false)}
                  className="px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer group transition-colors block"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-200 group-hover:text-purple-300 transition-colors">Mobile Checkout Drop-off</span>
                    <span className="text-[10px] text-gray-400 font-mono">Conversion Anomaly</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Elevated abandonment on Safari Mobile webview during 2FA OTP submission.</p>
                </Link>

                <Link 
                  href="/developer-console?scenario=temporary_failure" 
                  onClick={() => setIsOpen(false)}
                  className="px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer group transition-colors block"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-200 group-hover:text-purple-300 transition-colors">Subscription Renewal Failures</span>
                    <span className="text-[10px] text-gray-400 font-mono">Recurring Billing</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Debit card e-mandate presentation failures on recurring SaaS subscriptions.</p>
                </Link>

                <Link 
                  href="/developer-console?scenario=temporary_failure" 
                  onClick={() => setIsOpen(false)}
                  className="px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer group transition-colors block"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-200 group-hover:text-purple-300 transition-colors">Normal Baseline (Healthy)</span>
                    <span className="text-[10px] text-gray-400 font-mono">Optimal State</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">All payment gateways operating at optimal baseline performance. Zero critical risks.</p>
                </Link>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function MicroscopeIcon({ size = 24, className = "" }: { size?: number, className?: string }) {
  return (
    <svg 
      width={size} height={size} viewBox="0 0 24 24" fill="none" 
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
      className={className}
    >
      <path d="M6 18h8" />
      <path d="M3 22h18" />
      <path d="M14 22a7 7 0 1 0 0-14h-1" />
      <path d="M9 14h2" />
      <path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z" />
      <path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3" />
    </svg>
  );
}
