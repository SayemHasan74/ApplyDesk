'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import type { Proposal } from '@/lib/client/ai-contract';
import { reviewEntry, confirmableEntries, type ReviewEntry } from '@/lib/client/ai-client';
import { chatError } from '@/lib/client/chat-request';
import type { useChatActions } from './use-chat-actions';
import { ProposalCard } from './proposal-card';

export function ProposalList({ proposals, actions, sending }: { proposals: Proposal[]; actions: ReturnType<typeof useChatActions>; sending: boolean }) {
  const [entries, setEntries] = useState(() => proposals.map(reviewEntry));
  const pending = actions.pending || sending;
  const applicable = confirmableEntries(entries).filter(({ item }) => item.kind !== 'suggestion');
  function change(entry: ReviewEntry) { setEntries((old) => old.map((value) => value.proposal.id === entry.proposal.id ? entry : value)); }
  async function confirm(selected: ReviewEntry[]) {
    try {
      if (selected.length === 1 && selected[0].proposal.kind === 'undo_last') {
        const result = await actions.undo(); if (result) change({ ...selected[0], saved: true, error: undefined }); return;
      }
      const response = await actions.apply(selected);
      if (!response) return;
      setEntries((old) => old.map((entry) => {
        const index = response.selected.findIndex((value) => value.entry.proposal.id === entry.proposal.id);
        const result = response.results.find((value) => value.index === index);
        return !result ? entry : { ...entry, saved: result.ok, error: result.ok ? undefined : result.error.message };
      }));
    } catch (error) {
      const message = chatError(error);
      setEntries((old) => old.map((entry) => selected.some((value) => value.proposal.id === entry.proposal.id) ? { ...entry, error: message } : entry));
      if (selected[0]?.proposal.kind !== 'undo_last') toast.error(message);
    }
  }
  return <div className="space-y-3">
    {applicable.length > 1 && <button type="button" className="action-button w-full" disabled={pending || applicable.length > 30} onClick={() => void confirm(applicable.map(({ entry }) => entry))}>Confirm all ({applicable.length})</button>}
    {entries.map((entry) => <ProposalCard key={entry.proposal.id} entry={entry} pending={pending} onChange={change} onConfirm={(value) => void confirm([value])} />)}
  </div>;
}
