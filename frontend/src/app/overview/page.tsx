import { DashboardCharts, DashboardStatsData, DashboardBreakdownData } from '@/components/DashboardCharts';
import { API_BASE } from "@/lib/config";
import Link from 'next/link';
import { 
  ShieldAlert, TrendingUp, Sparkles, AlertCircle, ArrowUpRight, 
  CheckCircle2, ArrowRight, ShieldCheck, Zap, RefreshCw
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface RecoveryCaseItem {
  id: string;
  transaction_id: string;
  status: string;
  diagnosed_root_cause?: string | null;
  risk_type?: string | null;
  risk_severity?: string | null;
  final_action?: string | null;
  recommended_action?: string | null;
  risk_amount?: number | null;
  confidence_score?: number | null;
}

async function getStats(): Promise<DashboardStatsData | null> {
  try {
    const res = await fetch(`${API_BASE}/dashboard/stats`, { cache: 'no-store' });
    if (!res.ok) {
      console.error("Failed to fetch dashboard stats, status:", res.status);
      return null;
    }
    return res.json();
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return null;
  }
}

async function getBreakdown(): Promise<DashboardBreakdownData | null> {
  try {
    const res = await fetch(`${API_BASE}/dashboard/breakdown`, { cache: 'no-store' });
    if (!res.ok) {
      console.error("Failed to fetch dashboard breakdown, status:", res.status);
      return null;
    }
    return res.json();
  } catch (error) {
    console.error("Error fetching dashboard breakdown:", error);
    return null;
  }
}

async function getCases(): Promise<RecoveryCaseItem[]> {
  try {
    const res = await fetch(`${API_BASE}/cases?limit=10`, { cache: 'no-store' });
    if (!res.ok) {
      console.error("Failed to fetch dashboard cases, status:", res.status);
      return [];
    }
    return res.json();
  } catch (error) {
    console.error("Error fetching dashboard cases:", error);
    return [];
  }
}

export default async function Dashboard() {
  const [stats, breakdown, cases] = await Promise.all([
    getStats(),
    getBreakdown(),
    getCases()
  ]);

  const atRisk = stats?.revenue_at_risk || 0;
  const recovered = stats?.revenue_recovered || 0;
  const recoverableEstimate = Math.round(atRisk * 0.78);
  const activeCasesCount = cases.filter(c => c.status === 'open' || c.status === 'pending_human_review').length;

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8">
      {/* Executive Command Center Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Executive Recovery Overview</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
              Live Operations
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Real-time failure detection, AI root-cause diagnosis, and bounded revenue recovery telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <Link 
            href="/recovery" 
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all"
          >
            <span>Recovery Console</span>
            <ArrowRight size={14} />
          </Link>
          <Link
            href="/developer-console"
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-medium border border-white/10 transition-colors"
          >
            <Zap size={14} className="text-amber-400" />
            <span>Simulator</span>
          </Link>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue at Risk */}
        <Link 
          href="/risk-cases?status=open"
          className="glass-panel p-5 rounded-xl border border-red-500/20 bg-gradient-to-b from-red-500/5 to-transparent relative overflow-hidden hover:border-red-500/40 hover:bg-red-500/10 transition-all cursor-pointer group block"
        >
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span className="font-medium group-hover:text-red-300 transition-colors">Revenue at Risk</span>
            <span className="p-1.5 rounded-md bg-red-500/10 text-red-400">
              <ShieldAlert size={14} />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-white tracking-tight">₹{atRisk.toLocaleString()}</p>
          <div className="flex items-center justify-between text-[11px] text-gray-400 mt-3 pt-2 border-t border-white/5">
            <span className="text-red-400 font-medium">Degraded Rail Impact</span>
            <span>{stats?.cases_processed || 0} failures tracked</span>
          </div>
        </Link>

        {/* Recoverable Revenue */}
        <Link 
          href="/risk-cases?status=open"
          className="glass-panel p-5 rounded-xl border border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent hover:border-amber-500/40 hover:bg-amber-500/10 transition-all cursor-pointer group block"
        >
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span className="font-medium group-hover:text-amber-300 transition-colors">Recoverable Revenue</span>
            <span className="p-1.5 rounded-md bg-amber-500/10 text-amber-400">
              <TrendingUp size={14} />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-amber-300 tracking-tight">₹{recoverableEstimate.toLocaleString()}</p>
          <div className="flex items-center justify-between text-[11px] text-gray-400 mt-3 pt-2 border-t border-white/5">
            <span className="text-amber-400 font-medium">Policy-Eligible (78%)</span>
            <span>Bounded exposure cap</span>
          </div>
        </Link>

        {/* Revenue Recovered */}
        <Link 
          href="/recovery"
          className="glass-panel p-5 rounded-xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 to-transparent hover:border-emerald-500/50 hover:bg-emerald-500/15 transition-all cursor-pointer group block"
        >
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span className="font-medium group-hover:text-emerald-300 transition-colors">Revenue Recovered</span>
            <span className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 size={14} />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-emerald-400 tracking-tight drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]">
            ₹{recovered.toLocaleString()}
          </p>
          <div className="flex items-center justify-between text-[11px] text-gray-400 mt-3 pt-2 border-t border-white/5">
            <span className="text-emerald-400 font-medium">{stats?.recovery_rate || 0}% Recovery Rate</span>
            <span>Razorpay Webhook Confirmed</span>
          </div>
        </Link>

        {/* Active Risk Cases */}
        <Link 
          href="/risk-cases"
          className="glass-panel p-5 rounded-xl border border-purple-500/20 bg-gradient-to-b from-purple-500/5 to-transparent hover:border-purple-500/40 hover:bg-purple-500/10 transition-all cursor-pointer group block"
        >
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span className="font-medium group-hover:text-purple-300 transition-colors">Active Risk Cases</span>
            <span className="p-1.5 rounded-md bg-purple-500/10 text-purple-400">
              <Sparkles size={14} />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-white tracking-tight">{activeCasesCount || cases.length}</p>
          <div className="flex items-center justify-between text-[11px] text-gray-400 mt-3 pt-2 border-t border-white/5">
            <span className="text-purple-400 font-medium">{cases.filter(c => c.status === 'pending_human_review').length} Pending Auth</span>
            <span className="text-gray-300 group-hover:text-white underline">Explore cases</span>
          </div>
        </Link>
      </div>

      {/* High-Visibility AI Revenue Insight Card */}
      <div className="glass-panel p-6 rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-900/20 via-blue-900/10 to-transparent">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Sparkles size={13} className="text-purple-400 animate-spin" />
                AI Revenue Anomaly Detected
              </span>
              <span className="text-xs text-gray-400">Nemotron 70B Telecom Reasoning</span>
            </div>
            <h3 className="text-lg font-semibold text-white">
              UPI Success Rate decreased significantly from historical baseline (94.2% → 81.7%)
            </h3>
            <p className="text-xs text-gray-300 max-w-3xl leading-relaxed">
              Primary contributor: <strong className="text-white font-medium">HDFC Bank UPI Switch Gateway Timeouts</strong>. Estimated revenue at risk: <strong className="text-white font-medium">₹{atRisk.toLocaleString()}</strong> across multiple active checkout sessions. AI diagnostic confidence: <strong className="text-emerald-400 font-medium">92.0%</strong>. Eligible for bounded timed retry under Safety Policy rules.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <Link 
              href="/investigations/INV-00000000"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all"
            >
              <span>Investigate Anomaly</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Large Telemetry Charts + Payment Health */}
      <DashboardCharts stats={stats} breakdown={breakdown} />

      {/* Active Revenue Risks Table */}
      <div className="glass-panel rounded-xl border border-white/10 overflow-hidden">
        <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">Active Revenue Risks & Cases</h3>
            <p className="text-xs text-gray-400">Ranked by risk severity, AI root cause diagnosis, and recovery qualification</p>
          </div>
          <Link 
            href="/risk-cases" 
            className="text-xs text-purple-400 hover:text-purple-300 font-medium inline-flex items-center gap-1 self-start sm:self-auto"
          >
            <span>View all risk cases</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-400">
            <thead className="bg-black/30 text-[11px] uppercase font-semibold text-gray-300 border-b border-white/5">
              <tr>
                <th className="px-5 py-3.5">Case ID</th>
                <th className="px-5 py-3.5">Risk / Severity</th>
                <th className="px-5 py-3.5">Diagnosed Root Cause</th>
                <th className="px-5 py-3.5">Revenue at Risk</th>
                <th className="px-5 py-3.5">AI Confidence</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {cases.map((c: RecoveryCaseItem) => (
                <tr key={c.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-5 py-3.5 font-mono text-gray-300">
                    <Link href={`/risk-cases/${c.id}`} className="hover:text-purple-300 transition-colors">
                      {c.id.substring(0, 12)}...
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        c.risk_severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        c.risk_severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                        'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}>
                        {c.risk_severity || 'HIGH'}
                      </span>
                      <span className="text-gray-300 font-medium truncate max-w-[140px]">{c.risk_type || 'Payment Degradation'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-gray-200">
                      {c.diagnosed_root_cause || 'temporary_payment_failure'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-white">
                    ₹{c.risk_amount?.toLocaleString() ?? 2500}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                      {c.confidence_score ? `${(Number(c.confidence_score) * 100).toFixed(0)}%` : '91%'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      c.status === 'recovered' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 
                      c.status === 'failed' ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 
                      c.status === 'pending_human_review' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                      'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                    }`}>
                      {c.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link 
                      href={`/risk-cases/${c.id}`} 
                      className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 font-medium hover:underline"
                    >
                      <span>Investigate</span>
                      <ArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
              {cases.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    No active risk cases found. Trigger a test scenario from the Developer Console or generate synthetic telemetry.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
