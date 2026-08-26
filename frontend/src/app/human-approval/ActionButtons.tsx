"use client";

import React, { useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ActionButtons({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: 'retry' | 'stop') => {
    try {
      setLoading(action);
      const res = await fetch(`http://127.0.0.1:8000/api/cases/${caseId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      if (!res.ok) throw new Error('Failed to execute action');
      
      router.refresh();
    } catch (e) {
      console.error(e);
      alert('Error executing action');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex justify-end gap-2">
      <button 
        onClick={() => handleAction('retry')}
        disabled={loading !== null}
        className="p-2 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 transition-colors disabled:opacity-50" 
        title="Approve Retry"
      >
        {loading === 'retry' ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
      </button>
      <button 
        onClick={() => handleAction('stop')}
        disabled={loading !== null}
        className="p-2 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors disabled:opacity-50" 
        title="Reject / Stop"
      >
        {loading === 'stop' ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
      </button>
    </div>
  );
}
