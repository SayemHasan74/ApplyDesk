'use client';
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Entity } from '@/lib/constants';
import { ENTITIES } from '@/lib/constants';
import type { ReviewEntry } from '@/lib/client/ai-client';
import { confirmableEntries } from '@/lib/client/ai-client';
import { applyChatItems, chatError, undoChatBatch } from '@/lib/client/chat-request';
import { ToastUndo } from './toast-undo';
import { apiRequest } from '@/lib/api/client';
import { syncResultSchema } from '@/lib/gmail/schema';

const queryKey = (entity: Entity) => entity === 'job' ? 'jobs' : entity === 'certification' ? 'certifications' : 'todos';
export function useChatActions(sending: boolean) {
  const client = useQueryClient(), router = useRouter(), pathname = usePathname();
  const [pending, setPending] = useState(false), locked = useRef(false);
  async function refresh(entities: Entity[]) {
    await Promise.all([...new Set(entities)].map((entity) => client.invalidateQueries({ queryKey: [queryKey(entity)] })));
    if (pathname === '/') router.refresh();
  }
  async function undo(batchId?: string, entities: Entity[] = [...ENTITIES]) {
    if (locked.current || sending) return null;
    locked.current = true; setPending(true);
    try {
      const result = await undoChatBatch(batchId);
      await refresh(entities); toast.success('Reverted'); return result;
    } catch (error) { toast.error(chatError(error)); throw error; }
    finally { locked.current = false; setPending(false); }
  }
  async function apply(entries: ReviewEntry[]) {
    if (locked.current || sending) return null;
    const selected = confirmableEntries(entries);
    if (!selected.length) return null;
    if (selected.length > 30) throw new Error('Confirm at most 30 proposals at a time');
    locked.current = true; setPending(true);
    try {
      const result = await applyChatItems(selected.map(({ item }) => item));
      const entities = [...new Set(result.results.flatMap((row) => {
        const item = selected[row.index]?.item;
        return row.ok && item ? 'entity' in item ? [item.entity] : item.kind === 'suggestion' && item.decision === 'accept' ? ['job' as const] : [] : [];
      }))];
      if (result.results.some((row) => row.ok)) {
        await refresh(entities);
        toast.success('Done', { duration: 10_000, action: <ToastUndo onUndo={() => undo(result.batchId, entities).catch(() => null)} /> });
      }
      return { selected, results: result.results };
    } finally { locked.current = false; setPending(false); }
  }
  async function sync() {
    if (locked.current || sending) return null;
    locked.current = true; setPending(true);
    try {
      const result = syncResultSchema.parse(await apiRequest('/api/gmail/sync', 'POST'));
      if ('skipped' in result) throw new Error('Gmail sync skipped: AI limit reached.');
      toast.success(`Processed ${result.processed} emails; ${result.suggestions} suggestions.`);
      if (pathname === '/') router.refresh();
      return result;
    } finally { locked.current = false; setPending(false); }
  }
  return { pending, apply, undo, sync };
}
