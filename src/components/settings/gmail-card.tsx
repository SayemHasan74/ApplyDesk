'use client';
import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/api/client';
import type { getGmailStatus } from '@/lib/data/gmail';

const DisconnectDialog = dynamic(() => import('./gmail-disconnect'), { ssr: false });
export function GmailCard({ initialData, outcome }: { initialData: Awaited<ReturnType<typeof getGmailStatus>>; outcome?: string }) {
  const [status, setStatus] = useState(initialData), [pending, setPending] = useState(false), [confirm, setConfirm] = useState(false), [result, setResult] = useState('');
  const locked = useRef(false);
  async function sync() {
    if (locked.current) return; locked.current = true; setPending(true);
    try {
      const { syncResultSchema } = await import('@/lib/gmail/schema');
      const response = syncResultSchema.parse(await apiRequest('/api/gmail/sync', 'POST'));
      const message = 'skipped' in response ? 'Sync skipped: AI limit reached.' : `Processed ${response.processed} emails; ${response.suggestions} suggestions.`;
      setResult(message); toast.success(message);
      if (!('skipped' in response)) setStatus((old) => ({ ...old, lastSyncAt: new Date().toISOString() }));
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Gmail sync failed'); }
    finally { locked.current = false; setPending(false); }
  }
  return <section className="panel max-w-2xl p-5" aria-labelledby="gmail-heading"><h2 id="gmail-heading" className="text-xl font-semibold">Gmail</h2>
    <p className="mt-2 text-sm text-muted-foreground">Read-only access. Emails produce suggestions for you to review.</p>
    {outcome === 'connected' && <p role="status" className="mt-3 text-sm">Gmail connected.</p>}{outcome === 'error' && <p role="alert" className="mt-3 text-sm text-destructive">Gmail could not connect. Please try again.</p>}
    <p className="mt-4 text-sm">{status.connected ? 'Connected' : 'Not connected'}</p><p className="mt-1 text-sm text-muted-foreground">Last sync: {status.lastSyncAt ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(status.lastSyncAt)) : 'Never'}</p>
    <div className="mt-4 flex flex-wrap gap-3">{status.connected ? <><button type="button" className="action-button" disabled={pending} onClick={() => void sync()}>{pending ? 'Syncing…' : 'Sync now'}</button><button type="button" className="min-h-11 px-3 underline" disabled={pending} onClick={() => setConfirm(true)}>Disconnect</button></> : <a href="/api/gmail/connect" className="action-button inline-flex items-center">Connect Gmail</a>}</div>
    {result && <p role="status" className="mt-3 text-sm">{result}</p>}
    {confirm && <DisconnectDialog onClose={() => setConfirm(false)} onDisconnected={() => { setStatus({ connected: false, connectedAt: null, lastSyncAt: null }); setResult(''); setConfirm(false); }} />}
  </section>;
}
