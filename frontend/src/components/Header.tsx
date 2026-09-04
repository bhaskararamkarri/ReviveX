"use client";

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { 
  Bell, 
  Search, 
  ChevronRight, 
  ChevronDown,
  ShieldAlert,
  Activity,
  Settings,
  Zap,
  CheckCircle2,
  Lock,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CommandPalette } from '@/components/CommandPalette';
import { ActiveIncidentDropdown } from '@/components/ActiveIncidentDropdown';

export function Header() {
  const pathname = usePathname();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);

  const notifRef = React.useRef<HTMLDivElement>(null);
  const profileRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getPageTitle = (path: string) => {
    if (path.startsWith('/overview') || path === '/') return 'Executive Overview';
    if (path.startsWith('/incidents')) return 'Incident Stream';
    if (path.startsWith('/risk-cases')) return 'Risk Cases';
    if (path.startsWith('/investigations')) return 'AI Investigations';
    if (path.startsWith('/recovery')) return 'Recovery Execution Monitor';
    if (path.startsWith('/transactions')) return 'Transaction Explorer';
    if (path.startsWith('/audit')) return 'Audit Trail';
    if (path.startsWith('/policies')) return 'Safety Policy Center';
    if (path.startsWith('/ai-assistant')) return 'Operational AI Assistant';
    if (path.startsWith('/developer-console')) return 'Developer Console';
    return 'Control Center';
  };

  return (
    <>
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

          {/* Global Search Input Trigger */}
          <div 
            className="relative hidden lg:block ml-2 cursor-pointer group"
            onClick={() => setIsCommandPaletteOpen(true)}
          >
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-gray-300" />
            <div className="bg-white/5 border border-white/10 rounded-lg pl-8 pr-12 py-1.5 text-xs text-gray-400 w-52 group-hover:border-purple-500/50 group-hover:bg-white/10 transition-colors">
              Search or jump to...
            </div>
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400 font-mono">
              ⌘K
            </span>
          </div>
        </div>

        {/* Right: Clean, Well-Spaced Controls */}
        <div className="flex items-center gap-3">
          {/* Active Incident Tag / Dropdown */}
          <ActiveIncidentDropdown />

          {/* Test Mode Badge */}
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>Test Mode</span>
          </span>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications Popover */}
          <div className="relative" ref={notifRef}>
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Notifications"
            >
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.8)]"></span>
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-[#111114] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden text-xs">
                <div className="p-3 border-b border-white/10 flex items-center justify-between">
                  <span className="font-semibold text-white">System Notifications</span>
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-mono">2 New</span>
                </div>

                <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
                  <Link 
                    href="/incidents/RC-001" 
                    onClick={() => setIsNotificationsOpen(false)}
                    className="p-3 block hover:bg-white/5 transition-colors space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-red-400 flex items-center gap-1">
                        <ShieldAlert size={12} /> UPI Degradation Alert
                      </span>
                      <span className="text-[10px] text-gray-500">Live</span>
                    </div>
                    <p className="text-gray-300 text-[11px] leading-tight">
                      HDFC Bank UPI timeout detected on 14 checkouts. AI investigation ready.
                    </p>
                  </Link>

                  <Link 
                    href="/audit" 
                    onClick={() => setIsNotificationsOpen(false)}
                    className="p-3 block hover:bg-white/5 transition-colors space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Safety Guardrail Verified
                      </span>
                      <span className="text-[10px] text-gray-500">2m ago</span>
                    </div>
                    <p className="text-gray-300 text-[11px] leading-tight">
                      MAX_RETRIES (2) enforced on 5 failed checkout retries.
                    </p>
                  </Link>
                </div>

                <div className="p-2 border-t border-white/10 text-center bg-black/40">
                  <Link 
                    href="/audit" 
                    onClick={() => setIsNotificationsOpen(false)}
                    className="text-[11px] text-purple-400 hover:underline font-medium"
                  >
                    View Complete Audit Trail →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Merchant & Operator Profile Dropdown */}
          <div className="relative pl-3 border-l border-white/10" ref={profileRef}>
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg hover:bg-white/5 transition-colors text-xs text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                AS
              </div>
              <div className="hidden sm:block">
                <span className="font-semibold text-gray-200 block text-xs leading-none">Acme Commerce</span>
                <span className="text-[10px] text-gray-400 block mt-0.5">Admin (ops@acme.com)</span>
              </div>
              <ChevronDown size={12} className="text-gray-400 ml-0.5" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#111114] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden text-xs">
                <div className="p-3 border-b border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">Acme Commerce</span>
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">TEST MODE</span>
                  </div>
                  <span className="text-[11px] text-gray-400 font-mono block">merch_default</span>
                </div>

                <div className="p-2 space-y-1">
                  <Link 
                    href="/policies" 
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-colors"
                  >
                    <Settings size={14} className="text-gray-400" />
                    <span>Safety Policies & Config</span>
                  </Link>

                  <Link 
                    href="/developer-console" 
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-colors"
                  >
                    <Zap size={14} className="text-amber-400" />
                    <span>Developer Sandbox</span>
                  </Link>

                  <Link 
                    href="/audit" 
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-colors"
                  >
                    <Activity size={14} className="text-purple-400" />
                    <span>Merchant Audit Trail</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      
      {/* Modals */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
      />
    </>
  );
}
