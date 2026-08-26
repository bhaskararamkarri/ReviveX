"use client";

import React, { useState, useEffect } from 'react';
import { 
  AlertOctagon, CheckCircle2, Clock, Search, Filter, 
  X, RotateCcw, AlertTriangle, Info, ShieldAlert,
  ChevronRight
} from 'lucide-react';

interface SystemException {
  id: string;
  type: string;
  severity: string;
  status: string;
  message: string;
  details: any;
  created_at: string;
  transaction_id?: string;
  recovery_case_id?: string;
}

export default function ExceptionsPage() {
  const [exceptions, setExceptions] = useState<SystemException[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedException, setSelectedException] = useState<SystemException | null>(null);

  useEffect(() => {
    fetchExceptions();
  }, [severityFilter, statusFilter, search]);

  const fetchExceptions = async () => {
    try {
      const params = new URLSearchParams();
      if (severityFilter) params.append('severity', severityFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);

      const res = await fetch(`http://127.0.0.1:8000/api/exceptions?${params.toString()}`);
      if (res.ok) {
        setExceptions(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch exceptions', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'retry' | 'resolve' | 'ignore') => {
    if (!selectedException) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/exceptions/${selectedException.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        alert(`Action ${action} executed successfully`);
        setSelectedException(null);
        fetchExceptions();
      } else {
        const error = await res.json();
        alert(`Failed: ${error.detail}`);
      }
    } catch (err) {
      alert('Error executing action');
    }
  };

  const kpis = {
    total: exceptions.length,
    critical: exceptions.filter(e => e.severity === 'CRITICAL').length,
    open: exceptions.filter(e => e.status === 'OPEN').length,
    resolved: exceptions.filter(e => e.status === 'RESOLVED').length,
  };

  const SeverityBadge = ({ severity }: { severity: string }) => {
    const map: Record<string, { c: string, i: any }> = {
      CRITICAL: { c: 'text-red-400 bg-red-400/10 border-red-400/20', i: <ShieldAlert size={14} /> },
      ERROR: { c: 'text-orange-400 bg-orange-400/10 border-orange-400/20', i: <AlertOctagon size={14} /> },
      WARNING: { c: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', i: <AlertTriangle size={14} /> },
      INFO: { c: 'text-blue-400 bg-blue-400/10 border-blue-400/20', i: <Info size={14} /> },
    };
    const s = map[severity] || map.INFO;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${s.c}`}>
        {s.i} {severity}
      </span>
    );
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, string> = {
      OPEN: 'text-yellow-400 bg-yellow-400/10',
      IN_PROGRESS: 'text-blue-400 bg-blue-400/10',
      RESOLVED: 'text-green-400 bg-green-400/10',
      IGNORED: 'text-gray-400 bg-gray-400/10',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs ${map[status] || map.OPEN}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8 animate-fade-in relative z-10">
      <header>
        <h1 className="text-3xl font-bold text-white glow-text mb-2 flex items-center gap-3">
          <AlertOctagon className="text-red-400" />
          Exceptions Center
        </h1>
        <p className="text-gray-400">Monitor and resolve system-level anomalies.</p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 flex flex-col justify-center">
          <div className="text-gray-400 text-sm mb-1">Total Exceptions</div>
          <div className="text-2xl font-bold text-white">{kpis.total}</div>
        </div>
        <div className="glass-panel p-4 flex flex-col justify-center border-b-2 border-red-500">
          <div className="text-gray-400 text-sm mb-1">Critical</div>
          <div className="text-2xl font-bold text-red-400">{kpis.critical}</div>
        </div>
        <div className="glass-panel p-4 flex flex-col justify-center">
          <div className="text-gray-400 text-sm mb-1">Open</div>
          <div className="text-2xl font-bold text-yellow-400">{kpis.open}</div>
        </div>
        <div className="glass-panel p-4 flex flex-col justify-center">
          <div className="text-gray-400 text-sm mb-1">Resolved</div>
          <div className="text-2xl font-bold text-green-400">{kpis.resolved}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4 flex-wrap flex-1">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search exceptions..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-700 rounded py-2 pl-9 pr-4 text-white outline-none focus:border-blue-500 text-sm"
            />
          </div>
          
          <select 
            value={severityFilter} 
            onChange={e => setSeverityFilter(e.target.value)}
            className="bg-gray-900/50 border border-gray-700 rounded px-3 py-2 text-white outline-none focus:border-blue-500 text-sm"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="ERROR">Error</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>

          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-gray-900/50 border border-gray-700 rounded px-3 py-2 text-white outline-none focus:border-blue-500 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="RESOLVED">Resolved</option>
            <option value="IGNORED">Ignored</option>
          </select>
        </div>
        
        <button 
          onClick={() => { setSearch(''); setSeverityFilter(''); setStatusFilter(''); }}
          className="text-gray-400 hover:text-white text-sm flex items-center gap-2"
        >
          <X size={14} /> Clear Filters
        </button>
      </div>

      {/* Table */}
      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading exceptions...</div>
        ) : exceptions.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <CheckCircle2 size={48} className="mx-auto text-green-500/50 mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No active exceptions</h3>
            <p>The autonomous recovery pipeline is running smoothly.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/50">
                  <th className="px-6 py-4 font-medium text-gray-400 text-sm">Time</th>
                  <th className="px-6 py-4 font-medium text-gray-400 text-sm">Type</th>
                  <th className="px-6 py-4 font-medium text-gray-400 text-sm">Severity</th>
                  <th className="px-6 py-4 font-medium text-gray-400 text-sm">Message</th>
                  <th className="px-6 py-4 font-medium text-gray-400 text-sm">Status</th>
                  <th className="px-6 py-4 font-medium text-gray-400 text-sm"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {exceptions.map(exc => (
                  <tr 
                    key={exc.id} 
                    className="hover:bg-gray-800/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedException(exc)}
                  >
                    <td className="px-6 py-4 text-gray-300 text-sm whitespace-nowrap">
                      {new Date(exc.created_at).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 text-gray-300 text-sm font-mono">{exc.type}</td>
                    <td className="px-6 py-4"><SeverityBadge severity={exc.severity} /></td>
                    <td className="px-6 py-4 text-gray-300 text-sm max-w-xs truncate">{exc.message}</td>
                    <td className="px-6 py-4"><StatusBadge status={exc.status} /></td>
                    <td className="px-6 py-4 text-right text-gray-500">
                      <ChevronRight size={16} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Exception Detail Drawer / Modal */}
      {selectedException && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedException(null)}></div>
          <div className="relative w-full max-w-md bg-gray-900 h-full border-l border-gray-800 shadow-2xl flex flex-col animate-slide-in-right">
            
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/95 sticky top-0">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Exception Detail
              </h2>
              <button onClick={() => setSelectedException(null)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              
              <div>
                <div className="text-gray-400 text-xs uppercase mb-1">ID</div>
                <div className="text-white font-mono text-sm">{selectedException.id}</div>
              </div>

              <div className="flex gap-4">
                <div>
                  <div className="text-gray-400 text-xs uppercase mb-1">Severity</div>
                  <SeverityBadge severity={selectedException.severity} />
                </div>
                <div>
                  <div className="text-gray-400 text-xs uppercase mb-1">Status</div>
                  <StatusBadge status={selectedException.status} />
                </div>
              </div>

              <div>
                <div className="text-gray-400 text-xs uppercase mb-1">Message</div>
                <div className="text-white bg-gray-800/50 p-3 rounded border border-gray-700/50 text-sm break-words">
                  {selectedException.message}
                </div>
              </div>

              {selectedException.transaction_id && (
                <div>
                  <div className="text-gray-400 text-xs uppercase mb-1">Transaction ID</div>
                  <div className="text-blue-400 font-mono text-sm">{selectedException.transaction_id}</div>
                </div>
              )}

              {selectedException.recovery_case_id && (
                <div>
                  <div className="text-gray-400 text-xs uppercase mb-1">Recovery Case ID</div>
                  <div className="text-blue-400 font-mono text-sm">{selectedException.recovery_case_id}</div>
                </div>
              )}

              {selectedException.details && (
                <div>
                  <div className="text-gray-400 text-xs uppercase mb-1">Technical Details</div>
                  <pre className="text-gray-300 bg-gray-950 p-3 rounded border border-gray-800 text-xs overflow-x-auto">
                    {JSON.stringify(selectedException.details, null, 2)}
                  </pre>
                </div>
              )}

            </div>

            <div className="p-6 border-t border-gray-800 bg-gray-900/95 space-y-3">
              {selectedException.status !== 'RESOLVED' && (
                <>
                  <button 
                    onClick={() => handleAction('resolve')}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={16} /> Mark Resolved
                  </button>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleAction('retry')}
                      disabled={selectedException.severity === 'CRITICAL'}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded transition-colors flex items-center justify-center gap-2"
                    >
                      <RotateCcw size={16} /> Retry
                    </button>
                    <button 
                      onClick={() => handleAction('ignore')}
                      className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors flex items-center justify-center gap-2"
                    >
                      <X size={16} /> Ignore
                    </button>
                  </div>
                </>
              )}
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
