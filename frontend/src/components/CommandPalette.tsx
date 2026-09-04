"use client";

import * as React from 'react';
import { 
  Search, 
  TriangleAlert, 
  Microscope,
  RotateCcw,
  LayoutDashboard,
  TableProperties,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        // The open trigger will be handled in Header, but we can also manage a global store if needed.
        // For simplicity, Header will manage the isOpen state and pass it down.
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#111113] rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-white/10">
          <Search size={18} className="text-gray-400 mr-3" />
          <input 
            type="text" 
            placeholder="Type a command, risk case ID, transaction, or batch..." 
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
            autoFocus
          />
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            &times;
          </button>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto max-h-[60vh] p-2 space-y-4">
          
          {/* Section: Risk Cases & Investigations */}
          <div className="px-2">
            <h3 className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2 mt-2">Risk Cases & Investigations</h3>
            <div className="space-y-1">
              <Link href="/risk-cases/RC-001" onClick={onClose} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 group">
                <div className="flex items-center gap-3">
                  <TriangleAlert size={15} className="text-red-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-200">RC-001: UPI Degradation (HDFC UPI) — <span className="text-gray-500 text-xs">₹8.40L Risk</span></span>
                </div>
                <ArrowRight size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              <Link href="/investigations/INV-00000000" onClick={onClose} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 group">
                <div className="flex items-center gap-3">
                  <Microscope size={15} className="text-purple-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-200">INV-00000000: AI Root Cause Analysis (HDFC Gateway Latency)</span>
                </div>
                <ArrowRight size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              <Link href="/risk-cases/RC-002" onClick={onClose} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 group">
                <div className="flex items-center gap-3">
                  <TriangleAlert size={15} className="text-amber-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-200">RC-002: Mobile Checkout Drop-off — <span className="text-gray-500 text-xs">₹3.20L Risk</span></span>
                </div>
                <ArrowRight size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          </div>

          {/* Section: Recovery Operations */}
          <div className="px-2">
            <h3 className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Recovery Operations</h3>
            <div className="space-y-1">
              <Link href="/recovery" onClick={onClose} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 group">
                <div className="flex items-center gap-3">
                  <RotateCcw size={15} className="text-blue-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-200">RB-024: Payment Retry Batch (438 Transactions)</span>
                </div>
                <ArrowRight size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              <Link href="/recovery" onClick={onClose} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 group">
                <div className="flex items-center gap-3">
                  <RotateCcw size={15} className="text-emerald-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-200">RB-023: Completed Subscription Recovery (₹82.4K Recovered)</span>
                </div>
                <ArrowRight size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          </div>

          {/* Section: Navigation */}
          <div className="px-2 pb-2">
            <h3 className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Navigation</h3>
            <div className="space-y-1">
              <Link href="/overview" onClick={onClose} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 group">
                <div className="flex items-center gap-3">
                  <LayoutDashboard size={15} className="text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-200">Overview Dashboard</span>
                </div>
                <ArrowRight size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              <Link href="/transactions" onClick={onClose} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 group">
                <div className="flex items-center gap-3">
                  <TableProperties size={15} className="text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-200">Transaction Explorer</span>
                </div>
                <ArrowRight size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
