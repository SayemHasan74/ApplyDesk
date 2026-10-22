'use client';
import Link from 'next/link';
import { ExpandableText } from '@/components/ui/expandable-text';
import { duplicateUpdate, toApplyItem, type ReviewEntry } from '@/lib/client/ai-client';
import { fieldLabel } from '@/lib/client/proposal-form';
import { ProposalFields, ProposalValue, SourceLinks } from './proposal-fields';
import { ProposalEditor } from './proposal-editor';

export function ProposalCard({ entry, pending, onChange, onConfirm }: {
  entry: ReviewEntry; pending: boolean; onChange: (entry: ReviewEntry) => void; onConfirm: (entry: ReviewEntry) => void;
}) {
  const p = entry.proposal;
  let valid = false;
  try { valid = Boolean(toApplyItem(entry)) || p.kind === 'undo_last'; } catch { valid = false; }
  const unavailable = p.kind === 'run_sync_gmail' || p.kind === 'suggestion';
  const title = p.kind === 'create' ? `New ${p.entity === 'todo' ? 'to-do' : p.entity}` : 'label' in p ? p.label : p.kind.replaceAll('_', ' ');
  const route = 'entity' in p ? p.entity === 'job' ? '/jobs' : p.entity === 'certification' ? '/certifications' : '/todos' : '/';
  if (entry.discarded) return <div className="border-l-2 pl-3 text-xs text-muted-foreground">Proposal discarded</div>;
  return <article className={`chat-proposal ${p.kind.includes('delete') ? 'border-destructive' : ''}`} aria-label={title}>
    <div className="flex items-start justify-between gap-2"><h3 className="min-w-0 text-sm font-semibold capitalize"><ExpandableText text={title} lines={2} /></h3>
      {p.kind === 'create' && p.confidence && <span className="deadline-badge badge-closed text-[11px]">{p.confidence} confidence</span>}
    </div>
    {p.kind === 'create' && <>
      {p.duplicateOfId && <div className="my-3 rounded bg-muted p-2 text-xs"><p>Already tracking this</p><div className="flex gap-3"><Link href={route} className="inline-flex min-h-11 items-center underline">Open</Link><button type="button" disabled={pending || entry.saved} className="min-h-11 underline" onClick={() => onChange({ ...entry, proposal: duplicateUpdate(p), editing: false, invalid: false })}>Update it</button></div></div>}
      {entry.editing ? <ProposalEditor entity={p.entity} draft={p.draft} pending={pending || entry.saved} onChange={(draft) => onChange({ ...entry, invalid: !draft, proposal: draft ? { ...p, draft } : p })} /> : <ProposalFields values={p.draft} />}
      {Boolean(p.missingFields?.length) && <p className="mt-3 text-xs text-[var(--warning-text)]"><ExpandableText text={`Missing: ${p.missingFields!.join(', ')}`} lines={2} /></p>}
      {Boolean(p.sources?.length) && <div className="mt-2 text-xs"><SourceLinks sources={p.sources!} /></div>}
    </>}
    {p.kind === 'update' && <dl className="mt-3 space-y-3 text-xs">{Object.entries(p.patch).map(([key, value]) => <div key={key}><dt className="mb-1 text-muted-foreground">{fieldLabel(key)}</dt><dd className="grid grid-cols-[1fr_auto_1fr] gap-2"><span>{key in p.before ? <ProposalValue value={p.before[key]} /> : 'Not provided'}</span><span aria-label="changes to">→</span><ProposalValue value={value} /></dd></div>)}</dl>}
    {p.kind === 'update' && p.notes && <div className="mt-2 text-xs text-muted-foreground"><ExpandableText text={p.notes} lines={2} /></div>}
    {(p.kind === 'bulk_update' || p.kind === 'bulk_delete') && <div className="mt-3 space-y-2 text-xs"><ExpandableText text={p.description} lines={2} />
      {p.kind === 'bulk_update' && <ProposalFields values={p.patch} />}
      <fieldset disabled={pending || entry.saved}><legend className="sr-only">Items to change</legend>{p.items.map((item) => <label key={item.id} className="flex min-h-11 items-center gap-2 border-t py-2"><input type="checkbox" className="size-4 shrink-0" checked={entry.selectedIds.includes(item.id)} onChange={(event) => onChange({ ...entry, selectedIds: event.target.checked ? [...entry.selectedIds, item.id] : entry.selectedIds.filter((id) => id !== item.id) })} /><ExpandableText text={item.label} lines={2} /></label>)}</fieldset>
    </div>}
    {p.kind === 'append_note' && <div className="mt-3 text-xs"><ExpandableText text={p.text} lines={2} /></div>}
    {p.kind === 'delete' && <p className="mt-2 text-xs text-destructive">Delete this item after confirmation.</p>}
    {p.kind === 'setting' && <div className="mt-3 text-xs"><p>{fieldLabel(p.key)}</p><div className="flex gap-2"><ProposalValue value={p.before} /><span>→</span><ProposalValue value={p.value} /></div></div>}
    {p.kind === 'undo_last' && <p className="mt-2 text-xs">Revert your most recent action batch.</p>}
    {p.kind === 'suggestion' && <p className="mt-2 text-xs">{p.decision === 'accept' ? 'Accept' : 'Dismiss'} this Gmail suggestion.</p>}
    {entry.error && <p role="alert" className="mt-3 text-xs text-destructive">{entry.error}</p>}
    {entry.saved ? <p role="status" className="mt-3 text-sm font-semibold text-[var(--success-text)]">{p.kind === 'undo_last' ? 'Reverted' : 'Saved'}</p> : <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
      <button type="button" className="action-button text-xs" disabled={pending || !valid || unavailable} onClick={() => onConfirm(entry)}>{pending ? 'Saving…' : p.kind === 'run_sync_gmail' ? 'Gmail sync is not set up yet' : 'Confirm'}</button>
      {p.kind === 'create' && <button type="button" className="chat-secondary" disabled={pending || (entry.editing && entry.invalid)} onClick={() => onChange({ ...entry, editing: !entry.editing })}>{entry.editing ? 'Review' : 'Edit'}</button>}
      <button type="button" className="chat-secondary" disabled={pending} onClick={() => onChange({ ...entry, discarded: true })}>Discard</button>
    </div>}
  </article>;
}
