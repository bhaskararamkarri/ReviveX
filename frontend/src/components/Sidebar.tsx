import Link from 'next/link';
import Image from 'next/image';
import { LayoutDashboard, Users, AlertCircle, Settings } from 'lucide-react';

export function Sidebar() {
  return (
    <aside className="w-64 h-screen border-r border-white/10 bg-[#0a0a0a]/50 backdrop-blur-xl flex flex-col relative z-10">
      <div className="p-6">
        <div className="flex items-center gap-2">
          <Image 
            src="/logo.png" 
            alt="ReviveX Logo" 
            width={32} 
            height={32} 
            className="rounded-lg object-contain drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
          />
          <span className="font-semibold text-xl tracking-tight text-white glow-text">ReviveX</span>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-6">
        <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all">
          <LayoutDashboard size={20} />
          <span className="font-medium">Dashboard</span>
        </Link>
        <Link href="/human-approval" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all">
          <Users size={20} />
          <span className="font-medium">Human Queue</span>
        </Link>
        <Link href="/exceptions" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all">
          <AlertCircle size={20} />
          <span className="font-medium">Exceptions</span>
        </Link>
        <Link href="/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all">
          <Settings size={20} />
          <span className="font-medium">Settings</span>
        </Link>
      </nav>
      
      <div className="p-6 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500"></div>
          <div>
            <p className="text-sm font-medium text-white">Razorpay Admin</p>
            <p className="text-xs text-gray-400">admin@razorpay.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
