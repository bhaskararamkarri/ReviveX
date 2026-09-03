"use client";

import { usePathname, useSearchParams } from 'next/navigation';
import { 
  Bell, 
  Search, 
  ChevronRight, 
  ChevronDown,
  Building2
} from 'lucide-react';
import Link from 'next/link';

export function Header() {
  const pathname = usePathname();

  const getPageTitle = (path: string) => {
    if (path.startsWith('/overview') || path === '/') return 'Executive Overview';
    if (path.startsWith('/incidents')) return 'Incident Stream';
    if (path.startsWith('/risk-cases') || path.startsWith('/cases')) return 'Risk Cases';
    if (path.startsWith('/investigations') || path.startsWith('/investigation')) return 'AI Investigations';
    if (path.startsWith('/recovery')) return 'Recovery Execution Monitor';
    if (path.startsWith('/transactions')) return 'Transaction Explorer';
    if (path.startsWith('/audit')) return 'Audit Trail';
    if (path.startsWith('/policies')) return 'Safety Policy Center';
    if (path.startsWith('/ai-assistant')) return 'Operational AI Assistant';
    if (path.startsWith('/developer-console')) return 'Developer Console';
    return 'Control Center';
  };

  return (
    <header className="h-16 border-b border-white/10 bg-[#0a0a0c]/85 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30 select-none">
      {/* Left: Breadcrumbs & Quick Search */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs">
          <Link href="/overview" className="text-gray-400 hover:text-white transition-colors font-medium">
            ReviveX
          </Link>
          <ChevronRight size={13} className="text-gray-600 shrink-0" />
          <span className="text-white font-semibold whitespace-nowrap">
            {getPageTitle(pathname)}
          </span>
        </div>

        {/* Global Search Input */}
        <div className="relative hidden lg:block ml-2">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search or jump to..." 
            readOnly
            className="bg-white/5 border border-white/10 rounded-lg pl-8 pr-12 py-1.5 text-xs text-gray-300 w-52 focus:outline-none focus:border-purple-500/50 cursor-pointer placeholder:text-gray-400"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400 font-mono">
            ⌘K
          </span>
        </div>
      </div>

      {/* Right: Clean, Well-Spaced Controls */}
      <div className="flex items-center gap-3">
        {/* Active Incident Tag */}
        <Link 
          href="/incidents"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/25 text-red-300 text-xs hover:bg-red-500/20 transition-all font-medium"
        >
          <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
          <span className="hidden sm:inline">Active Incident:</span>
          <span>UPI Degradation</span>
          <span className="font-mono text-[10px] bg-red-500/20 px-1 rounded text-red-200">RC-001</span>
        </Link>

        {/* Test Mode Badge */}
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          <span>Test Mode</span>
        </span>

        {/* Notifications */}
        <button 
          className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Notifications"
        >
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.8)]"></span>
        </button>

        {/* Merchant & Operator Profile Dropdown */}
        <div className="flex items-center gap-2 pl-3 border-l border-white/10">
          <button className="flex items-center gap-2 px-2.5 py-1 rounded-lg hover:bg-white/5 transition-colors text-xs text-left">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-[0_0_10px_rgba(168,85,247,0.3)]">
              AS
            </div>
            <div className="hidden sm:block">
              <span className="font-semibold text-gray-200 block text-xs leading-none">Acme Commerce</span>
              <span className="text-[10px] text-gray-400 block mt-0.5">Admin (ops@acme.com)</span>
            </div>
            <ChevronDown size={12} className="text-gray-400 ml-0.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
