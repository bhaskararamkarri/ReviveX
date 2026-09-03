import Link from 'next/link';
import { ActionButtons } from './ActionButtons';
import { API_BASE } from "@/lib/config";

export const dynamic = 'force-dynamic';

interface PendingCase {
  id: string;
  transaction_id: string;
  risk_amount: number;
  diagnosed_root_cause?: string | null;
  confidence_score?: number | null;
  status: string;
}

async function getPendingCases(): Promise<PendingCase[]> {
  try {
    const res = await fetch(`${API_BASE}/cases?status=pending_human_review&limit=100`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function HumanApprovalQueue() {
  const cases = await getPendingCases();

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white glow-text mb-2">Human Approval Queue</h1>
          <p className="text-gray-400">Cases requiring manual intervention by an agent.</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-lg">
          <span className="text-blue-400 font-medium">{cases.length} cases pending</span>
        </div>
      </header>

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-black/20 text-xs uppercase font-semibold text-gray-300">
              <tr>
                <th className="px-6 py-4">Transaction ID</th>
                <th className="px-6 py-4">Risk Amount</th>
                <th className="px-6 py-4">Root Cause</th>
                <th className="px-6 py-4">Confidence</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {cases.map((c: PendingCase) => (
                <tr key={c.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-white">
                    <Link href={`/cases/${c.id}`} className="hover:underline">{c.transaction_id}</Link>
                  </td>
                  <td className="px-6 py-4 font-medium text-red-400">₹{c.risk_amount}</td>
                  <td className="px-6 py-4">{c.diagnosed_root_cause || 'Unknown'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500" style={{ width: `${(c.confidence_score || 0) * 100}%` }}></div>
                      </div>
                      <span className="text-xs">{((c.confidence_score || 0) * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <ActionButtons caseId={c.id} />
                  </td>
                </tr>
              ))}
              {cases.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="text-green-400 mb-2">🎉 Inbox Zero!</div>
                    <div className="text-gray-500">No cases currently require human approval.</div>
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

