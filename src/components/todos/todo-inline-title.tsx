'use client';

import { useRef, useState } from 'react';
import { ExpandableText } from '@/components/ui/expandable-text';

export function TodoInlineTitle({ title, pending, onSave }: { title: string; pending: boolean; onSave: (title: string) => Promise<boolean> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const saving = useRef(false);
  async function save() {
    if (saving.current || pending) return;
    if (draft.trim() === title) { setEditing(false); return; }
    saving.current = true;
    try { if (await onSave(draft)) setEditing(false); }
    finally { saving.current = false; }
  }
  const open = () => { if (!pending) { setDraft(title); setEditing(true); } };
  if (!editing) return <div className="flex min-h-11 min-w-0 items-start gap-2" onClick={(event) => { if (event.target instanceof Element && !event.target.closest('button')) open(); }}>
    <div className="min-w-0 flex-1 cursor-text font-semibold"><ExpandableText text={title} lines={2} /></div>
    <button type="button" className="min-h-11 px-2 text-xs text-muted-foreground underline" disabled={pending} onClick={open} aria-label={`Edit title: ${title}`}>Edit</button>
  </div>;
  return <input autoFocus className="form-control" aria-label="Edit to-do title" maxLength={200} value={draft} disabled={pending} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
    if (event.key === 'Enter') { event.preventDefault(); void save(); }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setDraft(title); setEditing(false); }
  }} onBlur={() => { if (!saving.current) setEditing(false); }} />;
}
