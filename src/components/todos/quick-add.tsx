'use client';

import { useState } from 'react';
import { PRIORITIES } from '@/lib/constants';
import type { TodoCreate } from '@/lib/validators/todo';

export function QuickAdd({ pending, onCreate }: { pending: boolean; onCreate: (input: TodoCreate) => Promise<boolean> }) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const { todoCreateSchema } = await import('@/lib/validators/todo');
    const result = todoCreateSchema.safeParse({ title, dueDate: dueDate || null, priority });
    if (!result.success) { setError(result.error.issues[0].message); return; }
    setError('');
    if (await onCreate(result.data)) { setTitle(''); setDueDate(''); setPriority('medium'); }
  }
  return <form onSubmit={submit} noValidate className="panel space-y-3 p-4">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_7rem_auto] sm:items-end">
      <label className="col-span-2 sm:col-span-1"><span className="field-label">New to-do</span><input className="form-control" placeholder="Add a task, then press Enter" maxLength={200} value={title} disabled={pending} onChange={(event) => setTitle(event.target.value)} aria-invalid={!!error} aria-describedby={error ? 'quick-add-error' : undefined} /></label>
      <label><span className="field-label">Due date (optional)</span><input className="form-control" type="date" value={dueDate} disabled={pending} onChange={(event) => setDueDate(event.target.value)} /></label>
      <label><span className="field-label">Priority</span><select className="form-control" value={priority} disabled={pending} onChange={(event) => setPriority(event.target.value)}>{PRIORITIES.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <button type="submit" className="action-button col-span-2 sm:col-span-1" disabled={pending}>{pending ? 'Saving…' : 'Add to-do'}</button>
    </div>
    {error && <p id="quick-add-error" role="alert" className="text-sm text-destructive">{error}</p>}
  </form>;
}
