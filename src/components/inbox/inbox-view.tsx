'use client';
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { SuggestionItem } from '@/lib/data/suggestions';
import { apiRequest } from '@/lib/api/client';
import { ExpandableText } from '@/components/ui/expandable-text';
import { ProposalFields } from '@/components/chat/proposal-fields';

export function InboxView({ initialData, jobLabels }: { initialData: SuggestionItem[]; jobLabels: Record<string, string> }) {
  const [items, setItems] = useState(initialData), [pending, setPending] = useState(false), locked = useRef(false), client = useQueryClient();
  async function decide(id: string, decision: 'accept' | 'dismiss') {
    if (locked.current) return; locked.current = true; setPending(true);
    const previous = items; setItems((old) => old.filter((item) => item.id !== id));
    try {
      const { applyResponseSchema } = await import('@/lib/client/ai-contract');
      const response = applyResponseSchema.parse(await apiRequest('/api/actions/apply', 'POST', { items: [{ kind: 'suggestion', id, decision }] }));
      const result = response.results[0];
      if (!result?.ok) throw new Error(result && !result.ok ? result.error.message : 'Suggestion was not saved');
      if (decision === 'accept') await client.invalidateQueries({ queryKey: ['jobs'] });
      toast.success(decision === 'accept' ? 'Suggestion accepted' : 'Suggestion dismissed');
    } catch (error) { setItems(previous); toast.error(error instanceof Error ? error.message : 'Could not save suggestion'); }
    finally { locked.current = false; setPending(false); }
  }
  if (!items.length) return <p role="status" className="panel p-6 text-sm text-muted-foreground">No pending suggestions. Sync Gmail from Settings to check for new emails.</p>;
  return <div className="space-y-4">{items.map((item) => <article key={item.id} className="panel p-5"><h2 className="text-lg font-semibold"><ExpandableText text={item.emailSubject} lines={2} /></h2>
    <div className="mt-2 text-sm text-muted-foreground"><ExpandableText text={item.emailFrom} lines={2} /><time dateTime={item.emailDate}>{new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.emailDate))}</time></div>
    <div className="mt-4 text-sm font-semibold"><ExpandableText text={item.type === 'new_job' && 'company' in item.payload ? `Add new job: ${item.payload.company} · ${item.payload.role}` : `Set ${jobLabels[item.jobId ?? ''] ?? 'tracked job'} → ${item.payload.status}`} lines={2} /><span className="text-xs font-normal">{item.confidence} confidence</span></div><ProposalFields values={item.payload} />
    <div className="mt-4 flex gap-3"><button type="button" className="action-button" disabled={pending} onClick={() => void decide(item.id, 'accept')}>Accept</button><button type="button" className="min-h-11 px-3 underline" disabled={pending} onClick={() => void decide(item.id, 'dismiss')}>Dismiss</button></div>
  </article>)}</div>;
}
