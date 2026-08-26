import Link from 'next/link';

async function getAuditLogs(id: string) {
  try {
    const res = await fetch(`http://127.0.0.1:8000/api/cases/${id}/audit`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch(e) { return []; }
}

export default async function AuditTimeline(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const logs = await getAuditLogs(params.id);

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <header className="mb-8">
        <Link href={`/cases/${params.id}`} className="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block">&larr; Back to Case</Link>
        <h1 className="text-2xl font-bold text-white glow-text">Audit Timeline</h1>
        <p className="text-gray-400 font-mono text-sm mt-1">{params.id}</p>
      </header>

      <div className="glass-panel p-8">
        <div className="relative border-l border-white/20 ml-4 space-y-8">
          {logs.map((log: any) => (
            <div key={log.id} className="relative pl-8">
              <div className="absolute -left-2.5 top-1.5 w-5 h-5 rounded-full bg-blue-500 border-4 border-[#0a0a0a] glow-primary"></div>
              
              <div className="bg-black/30 border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-wider">{log.event}</span>
                    <span className="ml-3 text-sm text-gray-400 font-mono">Actor: {log.actor}</span>
                  </div>
                  <span className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                
                {log.details && (
                  <div className="mt-4 bg-black/40 rounded border border-white/5 p-3 overflow-x-auto">
                    <pre className="text-xs text-gray-300 font-mono">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {logs.length === 0 && (
            <p className="text-gray-500 pl-8">No audit logs found for this case.</p>
          )}
        </div>
      </div>
    </div>
  );
}
