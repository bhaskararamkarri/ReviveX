"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  BrainCircuit, 
  ShieldAlert, 
  Activity, 
  Settings, 
  AlertTriangle, 
  Zap,
  Repeat,
  FileText,
  Bot,
  Radio,
  Building2,
  Lock
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.DEMO_MODE === 'true';
  
  const isActive = (path: string) => {
    if (path === '/overview') return pathname === '/overview' || pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <aside className="w-64 h-screen border-r border-white/10 bg-[#0a0a0a]/90 backdrop-blur-xl flex flex-col relative z-20 shrink-0 select-none">
      {/* Brand */}
      <div className="p-5 border-b border-white/10">
        <Link href="/overview" className="flex items-center gap-3 group">
          <div className="relative">
            <Image 
              src="/logo.png" 
              alt="ReviveX Logo" 
              width={34} 
              height={34} 
              className="rounded-lg object-contain drop-shadow-[0_0_10px_rgba(168,85,247,0.4)]" 
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight text-white group-hover:text-purple-300 transition-colors">ReviveX</span>
              <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded">
                {isDemoMode ? 'DEMO' : 'ENT'}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-normal leading-tight">Revenue Recovery Infra</p>
          </div>
        </Link>
      </div>
      
      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5 scrollbar-thin scrollbar-thumb-white/10">
        {isDemoMode ? (
          /* FOCUSED 4-ROUTE DEMO SURFACE */
          <div>
            <div className="px-3 py-1.5 mb-2 rounded bg-purple-500/10 border border-purple-500/20 text-[10px] font-semibold text-purple-300 flex items-center gap-1.5">
              <Zap size={12} className="text-purple-400" />
              <span>JUDGE DEMO MODE (4 ROUTES)</span>
            </div>
            <div className="space-y-1">
              <NavItem href="/overview" icon={<LayoutDashboard size={16} />} label="1. Overview" active={isActive('/overview')} />
              <NavItem href="/risk-cases/RC-001" icon={<ShieldAlert size={16} />} label="2. Risk Case Deep Dive" active={isActive('/risk-cases')} />
              <NavItem href="/recovery" icon={<Radio size={16} className="text-emerald-400 animate-pulse" />} label="3. Recovery Monitor" badge="Live" active={isActive('/recovery')} />
              <NavItem href="/audit" icon={<Activity size={16} />} label="4. Immutable Audit" active={isActive('/audit')} />
            </div>
          </div>
        ) : (
          /* STANDARD FULL 12-ROUTE ENTERPRISE NAVIGATION */
          <>
            {/* REVENUE INTELLIGENCE */}
            <div>
              <p className="px-3 text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1.5">Revenue Intelligence</p>
              <div className="space-y-0.5">
                <NavItem href="/overview" icon={<LayoutDashboard size={16} />} label="Overview" active={isActive('/overview')} />
                <NavItem href="/incidents" icon={<AlertTriangle size={16} />} label="Incidents" active={isActive('/incidents')} />
                <NavItem href="/risk-cases" icon={<ShieldAlert size={16} />} label="Risk Cases" active={isActive('/risk-cases')} />
                <NavItem href="/investigations" icon={<BrainCircuit size={16} />} label="Investigations" active={isActive('/investigations')} />
              </div>
            </div>

            {/* RECOVERY */}
            <div>
              <p className="px-3 text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1.5">Recovery</p>
              <div className="space-y-0.5">
                <NavItem href="/recovery" icon={<Repeat size={16} />} label="Recovery Batches" active={pathname === '/recovery'} />
                <NavItem href="/recovery?tab=active" icon={<Radio size={16} className="text-emerald-400 animate-pulse" />} label="Active Recovery" badge="Live" active={pathname === '/recovery'} />
              </div>
            </div>

            {/* OPERATIONS */}
            <div>
              <p className="px-3 text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1.5">Operations</p>
              <div className="space-y-0.5">
                <NavItem href="/transactions" icon={<FileText size={16} />} label="Transactions" active={isActive('/transactions')} />
                <NavItem href="/audit" icon={<Activity size={16} />} label="Audit Trail" active={isActive('/audit')} />
              </div>
            </div>

            {/* CONTROL */}
            <div>
              <p className="px-3 text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1.5">Control & Intelligence</p>
              <div className="space-y-0.5">
                <NavItem href="/policies" icon={<Settings size={16} />} label="Safety Policies" active={isActive('/policies')} />
                <NavItem href="/ai-assistant" icon={<Bot size={16} className="text-purple-400" />} label="AI Assistant" active={isActive('/ai-assistant')} />
                <NavItem href="/developer-console" icon={<Zap size={16} />} label="Developer Console" active={isActive('/developer-console')} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Section */}
      <div className="p-3 border-t border-white/10 bg-black/40 space-y-2 text-xs">
        {/* Merchant & Gateway Status */}
        <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/5 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-gray-300 font-medium">
              <Building2 size={13} className="text-gray-400" />
              <span>Acme Commerce</span>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.2 rounded">
              <Lock size={9} /> TEST MODE
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <span>Gateway</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]"></span>
              Razorpay Test
            </span>
          </div>
        </div>

        {/* Operator Profile */}
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
            AS
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-medium text-gray-200 truncate">Acme Commerce</p>
            <p className="text-[10px] text-gray-400 truncate">ops@acme.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ href, icon, label, active, badge }: { href: string; icon: React.ReactNode; label: string; active: boolean; badge?: string }) {
  return (
    <Link 
      href={href} 
      className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all text-xs font-medium ${
        active 
          ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.15)] font-semibold' 
          : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={active ? 'text-purple-400' : 'text-gray-400'}>{icon}</span>
        <span>{label}</span>
      </div>
      {badge && (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-600 text-white shadow-[0_0_8px_rgba(168,85,247,0.5)]">
          {badge}
        </span>
      )}
    </Link>
  );
}

