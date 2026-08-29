import { DashboardCharts, DashboardStatsData, DashboardBreakdownData } from '@/components/DashboardCharts';
import { API_BASE } from "@/lib/config";
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface RecoveryCaseItem {
  id: string;
  transaction_id: string;
  status: string;
  diagnosed_root_cause?: string | null;
  risk_type?: string | null;
  final_action?: string | null;
  recommended_action?: string | null;
  risk_amount?: number | null;
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
    const res = await fetch(`${API_BASE}/cases?limit=20`, { cache: 'no-store' });
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

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-white glow-text mb-2">Recovery Overview</h1>
        <p className="text-gray-400">Real-time metrics and AI diagnostics.</p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass-panel p-6">
          <p className="text-sm font-medium text-gray-400 mb-1">Revenue at Risk</p>
          <p className="text-3xl font-bold text-white">₹{stats?.revenue_at_risk?.toLocaleString() || 0}</p>
        </div>
        <div className="glass-panel p-6 border-blue-500/30">
          <p className="text-sm font-medium text-blue-400 mb-1">Revenue Recovered</p>
          <p className="text-3xl font-bold text-blue-400 glow-text">₹{stats?.revenue_recovered?.toLocaleString() || 0}</p>
        </div>
        <div className="glass-panel p-6">
          <p className="text-sm font-medium text-gray-400 mb-1">Recovery Rate</p>
          <p className="text-3xl font-bold text-white">{stats?.recovery_rate || 0}%</p>
        </div>
        <div className="glass-panel p-6">
          <p className="text-sm font-medium text-gray-400 mb-1">Cases Processed</p>
          <p className="text-3xl font-bold text-white">{stats?.cases_processed || 0}</p>
        </div>
      </div>

      {/* Charts */}
      <DashboardCharts stats={stats} breakdown={breakdown} />

      {/* Cases Table */}
      <div className="glass-panel overflow-hidden">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h3 className="text-lg font-medium text-white">Recent Recovery Cases</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-black/20 text-xs uppercase font-semibold text-gray-300">
              <tr>
                <th className="px-6 py-4">Transaction ID</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Root Cause</th>
                <th className="px-6 py-4">Final Action</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {cases.map((c: RecoveryCaseItem) => (
                <tr key={c.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-gray-300">{c.transaction_id.substring(0, 12)}...</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      c.status === 'recovered' ? 'bg-green-500/20 text-green-400 border border-green-500/20' : 
                      c.status === 'failed' ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 
                      c.status === 'pending_human_review' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20' :
                      'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">{c.diagnosed_root_cause || c.risk_type || 'pending'}</td>
                  <td className="px-6 py-4">{c.final_action || c.recommended_action || '-'}</td>
                  <td className="px-6 py-4">₹{c.risk_amount ?? 0}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/cases/${c.id}`} className="text-blue-400 hover:text-blue-300 font-medium">View Details</Link>
                  </td>
                </tr>
              ))}
              {cases.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No cases found. Start the orchestrator to process transactions.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

