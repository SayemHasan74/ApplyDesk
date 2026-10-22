'use client';

import { memo, useCallback, useState } from 'react';
import { PRIORITIES } from '@/lib/constants';
import type { TodoItem } from '@/lib/todos/items';
import type { TodoPatch } from '@/lib/validators/todo';
import { ExpandableText } from '@/components/ui/expandable-text';
import { TodoInlineTitle } from './todo-inline-title';

export const TodoRow = memo(function TodoRow({ item, pending, icons, onPatch, onDelete, onOpen }: {
  item: TodoItem; pending: boolean; icons: { details: React.ReactNode; remove: React.ReactNode }; onPatch: (id: string, patch: TodoPatch) => Promise<boolean>;
  onDelete: (id: string) => void; onOpen: (id: string) => void;
}) {
  const title = useCallback((value: string) => onPatch(item.id, { title: value }), [item.id, onPatch]);
  const toggle = useCallback(() => { void onPatch(item.id, { status: item.status === 'done' ? 'todo' : 'done' }); }, [item.id, item.status, onPatch]);
  const tag = useCallback((value: string | null) => onPatch(item.id, { tag: value }), [item.id, onPatch]);
  const remove = useCallback(() => onDelete(item.id), [item.id, onDelete]);
  const open = useCallback(() => onOpen(item.id), [item.id, onOpen]);
  return <li className="border-b py-4 last:border-0">
    <div className="flex items-start gap-3"><label className="flex size-11 shrink-0 items-center justify-center"><input className="size-5 accent-foreground" type="checkbox" checked={item.status === 'done'} disabled={pending} onChange={toggle} aria-label={`Complete ${item.title}`} /></label>
      <div className="min-w-0 flex-1"><TodoInlineTitle title={item.title} pending={pending} onSave={title} />{item.details && <div className="mb-2 text-sm text-muted-foreground"><ExpandableText text={item.details} lines={2} /></div>}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <label><span className="sr-only">Due date for {item.title}</span><input className="form-control text-sm" type="date" value={item.dueDate ?? ''} disabled={pending} onChange={(event) => { void onPatch(item.id, { dueDate: event.target.value || null }); }} /></label>
          <label><span className="sr-only">Priority for {item.title}</span><select className="form-control text-sm" value={item.priority} disabled={pending} onChange={(event) => { void onPatch(item.id, { priority: event.target.value as TodoItem['priority'] }); }}>{PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label>
          <TodoTag key={item.tag ?? ''} value={item.tag ?? ''} title={item.title} pending={pending} onSave={tag} />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row"><button type="button" className="flex size-11 items-center justify-center rounded hover:bg-muted" aria-label={`Edit details for ${item.title}`} onClick={open} disabled={pending}>{icons.details}</button><button type="button" className="flex size-11 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-destructive" aria-label={`Delete ${item.title}`} onClick={remove} disabled={pending}>{icons.remove}</button></div>
    </div>
  </li>;
});

function TodoTag({ value, title, pending, onSave }: { value: string; title: string; pending: boolean; onSave: (value: string | null) => Promise<boolean> }) {
  const [draft, setDraft] = useState(value);
  async function save() {
    const next = draft.trim();
    if (next !== value && !pending && !await onSave(next || null)) setDraft(value);
  }
  return <label><span className="sr-only">Tag for {title}</span><input className="form-control text-sm" placeholder="Tag" list="todo-tags" maxLength={40} value={draft} disabled={pending} onChange={(event) => setDraft(event.target.value)} onBlur={() => { void save(); }} onKeyDown={(event) => {
    if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); }
    if (event.key === 'Escape') { event.preventDefault(); setDraft(value); }
  }} /></label>;
}
