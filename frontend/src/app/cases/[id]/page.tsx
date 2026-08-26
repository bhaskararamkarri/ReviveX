import Link from 'next/link';

async function getCase(id: string) {
  try {
    const res = await fetch(`http://127.0.0.1:8000/api/cases/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch(e) { return null; }
}

export default async function CaseDetails(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const caseData = await getCase(params.id);

  if (!caseData) {
    return <div className="text-white p-8">Case not found.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block">&larr; Back to Dashboard</Link>
          <h1 className="text-2xl font-bold text-white glow-text">Case Details</h1>
          <p className="text-gray-400 font-mono text-sm mt-1">{caseData.id}</p>
        </div>
        <Link href={`/cases/${caseData.id}/audit`} className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors font-medium">
          View Audit Timeline
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6">
          <h2 className="text-lg font-medium text-white mb-4 border-b border-white/10 pb-2">Status & Outcome</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400">Current Status</p>
              <span className={`px-2 py-1 rounded text-sm font-medium mt-1 inline-block ${
                      caseData.status === 'recovered' ? 'bg-green-500/20 text-green-400 border border-green-500/20' : 
                      caseData.status === 'failed' ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 
                      caseData.status === 'pending_human_review' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20' :
                      'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                    }`}>{caseData.status}</span>
            </div>
            <div>
              <p className="text-sm text-gray-400">Final Action Taken</p>
              <p className="text-white font-medium">{caseData.final_action || 'Pending'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Recovered Amount</p>
              <p className="text-green-400 font-medium text-xl glow-text">₹{caseData.recovered_amount || 0}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6">
          <h2 className="text-lg font-medium text-white mb-4 border-b border-white/10 pb-2">AI Diagnosis</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400">Diagnosed Root Cause</p>
              <p className="text-white font-medium">{caseData.diagnosed_root_cause || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Confidence Score</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${(caseData.confidence_score || 0) * 100}%` }}></div>
                </div>
                <span className="text-sm text-white">{((caseData.confidence_score || 0) * 100).toFixed(1)}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-400">AI Recommended Action</p>
              <p className="text-white font-medium">{caseData.recommended_action || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 md:col-span-2">
          <h2 className="text-lg font-medium text-white mb-4 border-b border-white/10 pb-2">Detection Signals</h2>
          <pre className="bg-black/30 p-4 rounded-lg text-sm text-gray-300 font-mono overflow-x-auto border border-white/5">
            {JSON.stringify(caseData.signals, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
