"use client";

import { usePathname } from 'next/navigation';
import { Bell, ShieldCheck, ShieldAlert, Sparkles, Building2, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  const pathname = usePathname();

  const getPageTitle = (path: string) => {
    if (path.startsWith('/overview') || path === '/') return 'Executive Overview';
    if (path.startsWith('/incidents')) return 'Incident Stream';
    if (path.startsWith('/risk-cases') || path.startsWith('/cases')) return 'Risk Cases';
    if (path.startsWith('/investigations') || path.startsWith('/investigation')) return 'AI Investigation';
    if (path.startsWith('/recovery')) return 'Recovery Operations';
    if (path.startsWith('/transactions')) return 'Transaction Explorer';
    if (path.startsWith('/audit')) return 'Audit Trail';
    if (path.startsWith('/policies')) return 'Safety Policy Center';
    if (path.startsWith('/ai-assistant')) return 'AI Operations Assistant';
    if (path.startsWith('/developer-console')) return 'Developer Console';
    return 'Control Center';
  };

  return (
    <header className="h-16 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10 select-none">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs">
        <Link href="/overview" className="text-gray-400 hover:text-white transition-colors font-medium">ReviveX</Link>
        <ChevronRight size={13} className="text-gray-600" />
        <span className="text-white font-semibold">{getPageTitle(pathname)}</span>
        
        {/* Core Principle Tag */}
        <div className="hidden xl:flex items-center gap-1.5 ml-4 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300 font-medium">
          <Sparkles size={11} className="text-purple-400" />
          <span>AI proposes • Policy decides • Safety enforces • Engine executes • Audit proves</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Active Incident Indicator */}
        <Link 
          href="/incidents"
          className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/25 rounded-full text-red-400 text-xs font-medium hover:bg-red-500/15 transition-all"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>
          <ShieldAlert size={13} />
          <span>Incident: UPI Degradation</span>
        </Link>

        {/* Merchant Selector */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-md text-xs text-gray-300">
          <Building2 size={13} className="text-gray-400" />
          <span className="font-medium">Acme Corp</span>
        </div>

        {/* Environment Indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/25 rounded-md text-amber-400 text-xs font-semibold">
          <ShieldCheck size={14} />
          <span>TEST MODE</span>
        </div>

        {/* Notifications */}
        <button className="relative p-1.5 text-gray-400 hover:text-white transition-colors" title="Notifications">
          <Bell size={17} />
          <span className="absolute 0.5 top-0.5 right-0.5 w-2 h-2 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.8)]"></span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-white/10">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-gray-200">Admin User</p>
            <p className="text-[10px] text-gray-500">Risk Operations</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-xs font-semibold shadow border border-white/10">
            A
          </div>
        </div>
      </div>
    </header>
  );
}

