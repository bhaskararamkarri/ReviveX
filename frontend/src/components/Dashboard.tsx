"use client";

import React, { useEffect, useState } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from "recharts";
import { 
  ShieldAlert, Activity, DollarSign, CheckCircle2, 
  AlertTriangle, RotateCcw, Mail, StopCircle, UserCheck
} from "lucide-react";
import clsx from "clsx";

import { API_BASE } from "@/lib/config";

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f43f5e', '#f59e0b'];
const ACTION_COLORS: any = {
  "RETRY": "#3b82f6",
  "SEND_NUDGE": "#8b5cf6",
  "STOP": "#f43f5e",
  "HUMAN_APPROVAL": "#f59e0b",
};

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [breakdown, setBreakdown] = useState<any>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [resStats, resBreakdown, resCases] = await Promise.all([
          fetch(`${API_BASE}/dashboard/stats`).then(r => r.json()),
          fetch(`${API_BASE}/dashboard/breakdown`).then(r => r.json()),
          fetch(`${API_BASE}/cases?limit=10`).then(r => r.json())
        ]);
        setStats(resStats);
        setBreakdown(resBreakdown);
        setCases(resCases);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#09090b]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-8 font-sans selection:bg-violet-500/30">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-violet-500/20 rounded-xl border border-violet-500/30">
              <ShieldAlert className="w-8 h-8 text-violet-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                ReviveX
              </h1>
              <p className="text-sm text-gray-400">AI Revenue Recovery Agent</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-400 bg-white/5 px-4 py-2 rounded-full border border-white/10">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span>System Active</span>
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard 
            title="Revenue At Risk" 
            value={`₹${stats?.revenue_at_risk?.toLocaleString()}`}
            icon={<AlertTriangle className="text-amber-500" />}
            trend="+12%"
          />
          <StatCard 
            title="Revenue Recovered" 
            value={`₹${stats?.revenue_recovered?.toLocaleString()}`}
            icon={<DollarSign className="text-green-500" />}
            trend="+45%"
            highlight
          />
          <StatCard 
            title="Recovery Rate" 
            value={`${stats?.recovery_rate}%`}
            icon={<Activity className="text-blue-500" />}
          />
          <StatCard 
            title="Cases Processed" 
            value={stats?.cases_processed}
            icon={<CheckCircle2 className="text-violet-500" />}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-gray-400" />
              Root Cause Breakdown
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdown?.root_causes}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {breakdown?.root_causes.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center">
              <ShieldAlert className="w-5 h-5 mr-2 text-gray-400" />
              AI Recommended Actions
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakdown?.actions} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: '#27272a', opacity: 0.4}}
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {breakdown?.actions.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={ACTION_COLORS[entry.name] || COLORS[0]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Cases Table */}
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-white/10 flex justify-between items-center">
            <h3 className="text-lg font-semibold">Recent Recovery Cases</h3>
            <button className="text-sm text-violet-400 hover:text-violet-300 transition-colors">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-gray-400 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 font-medium">Case ID</th>
                  <th className="px-6 py-4 font-medium">Root Cause</th>
                  <th className="px-6 py-4 font-medium">AI Confidence</th>
                  <th className="px-6 py-4 font-medium">Action Taken</th>
                  <th className="px-6 py-4 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 text-gray-300 font-mono text-xs">{c.id.split('-')[0]}...</td>
                    <td className="px-6 py-4">
                      <span className="capitalize text-gray-200">
                        {c.diagnosed_root_cause?.replace(/_/g, ' ') || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {c.confidence_score ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-violet-500 rounded-full" 
                              style={{ width: `${c.confidence_score * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-400">{(c.confidence_score * 100).toFixed(0)}%</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <ActionBadge action={c.final_action} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend, highlight }: any) {
  return (
    <div className={clsx(
      "glass-card p-6 relative overflow-hidden group",
      highlight && "border-green-500/30 bg-green-500/5 shadow-[0_0_30px_rgba(34,197,94,0.1)]"
    )}>
      {highlight && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-green-500/20 transition-all duration-500"></div>
      )}
      <div className="flex justify-between items-start mb-4 relative z-10">
        <p className="text-gray-400 font-medium text-sm">{title}</p>
        <div className="p-2 bg-white/5 rounded-lg border border-white/10">
          {icon}
        </div>
      </div>
      <div className="relative z-10">
        <h4 className="text-3xl font-bold tracking-tight text-white mb-1">{value}</h4>
        {trend && (
          <p className="text-xs text-green-400 font-medium">{trend} from last batch</p>
        )}
      </div>
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  if (!action) return <span className="text-gray-500">-</span>;
  
  const config: any = {
    "RETRY": { icon: RotateCcw, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
    "SEND_NUDGE": { icon: Mail, color: "text-violet-400", bg: "bg-violet-400/10 border-violet-400/20" },
    "STOP": { icon: StopCircle, color: "text-rose-400", bg: "bg-rose-400/10 border-rose-400/20" },
    "HUMAN_APPROVAL": { icon: UserCheck, color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" }
  };
  
  const conf = config[action] || { icon: Activity, color: "text-gray-400", bg: "bg-gray-400/10 border-gray-400/20" };
  const Icon = conf.icon;
  
  return (
    <span className={clsx("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border", conf.bg, conf.color)}>
      <Icon className="w-3.5 h-3.5 mr-1.5" />
      {action.replace(/_/g, ' ')}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: any = {
    "recovered": { color: "text-green-400", bg: "bg-green-400/10 border-green-400/20" },
    "failed": { color: "text-rose-400", bg: "bg-rose-400/10 border-rose-400/20" },
    "pending_human_review": { color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
    "open": { color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" }
  };
  
  const conf = config[status] || { color: "text-gray-400", bg: "bg-gray-400/10 border-gray-400/20" };
  
  return (
    <span className={clsx("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize whitespace-nowrap", conf.bg, conf.color)}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
