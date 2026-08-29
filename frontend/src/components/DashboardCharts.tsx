"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export interface DashboardStatsData {
  revenue_at_risk: number;
  revenue_recovered: number;
  recovery_rate: number;
  cases_processed: number;
}

export interface BreakdownItem {
  name: string;
  value: number;
}

export interface DashboardBreakdownData {
  root_causes: BreakdownItem[];
  actions: BreakdownItem[];
}

export interface DashboardChartsProps {
  breakdown: DashboardBreakdownData | null;
  stats: DashboardStatsData | null;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function DashboardCharts({ breakdown, stats }: DashboardChartsProps) {
  if (!breakdown || !stats) return null;

  const revData = [
    { name: 'At Risk', value: stats.revenue_at_risk },
    { name: 'Recovered', value: stats.revenue_recovered }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <div className="glass-panel p-6">
        <h3 className="text-lg font-medium text-gray-200 mb-6">Revenue Status</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revData}>
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)' }} />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="glass-panel p-6">
        <h3 className="text-lg font-medium text-gray-200 mb-6">Root Cause Breakdown</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={breakdown.root_causes}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {breakdown.root_causes.map((_, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-panel p-6">
        <h3 className="text-lg font-medium text-gray-200 mb-6">Action Breakdown</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={breakdown.actions} layout="vertical">
              <XAxis type="number" stroke="#6b7280" />
              <YAxis dataKey="name" type="category" stroke="#6b7280" width={100} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)' }} />
              <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

