'use client';

import { useState } from 'react';
import { z } from 'zod';
import { PRIORITIES, TODO_STATUSES } from '@/lib/constants';
import type { TodoItem } from '@/lib/todos/items';
import { changedTodoFields, toTodoForm, type TodoForm } from '@/lib/todos/form';
import type { TodoPatch } from '@/lib/validators/todo';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

export function TodoSheet({ item, pending, error, onClose, onSave }: {
  item: TodoItem; pending: boolean; error?: string; onClose: () => void; onSave: (id: string, patch: TodoPatch) => Promise<boolean>;
}) {
  const [values, setValues] = useState(() => toTodoForm(item));
  const [errors, setErrors] = useState<Partial<Record<keyof TodoForm, string>>>({});
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    let patch: TodoPatch;
    try { patch = changedTodoFields(item, values); }
    catch (error) {
      if (!(error instanceof z.ZodError)) throw error;
      setErrors(Object.fromEntries(error.issues.map((issue) => [issue.path[0], issue.message])));
      requestAnimationFrame(() => document.getElementById('todo-errors')?.focus());
      return;
    }
    if (await onSave(item.id, patch)) onClose();
  }
  const attrs = (name: keyof TodoForm) => ({ id: `todo-${name}`, name, value: values[name], disabled: pending, className: 'form-control',
    'aria-invalid': !!errors[name], 'aria-describedby': errors[name] ? `todo-error-${name}` : undefined,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setValues((previous) => ({ ...previous, [name]: event.target.value })); setErrors((previous) => ({ ...previous, [name]: undefined }));
    },
  });
  const field = (name: keyof TodoForm, label: string, input: React.ReactNode) => <div key={name}><label className="field-label" htmlFor={`todo-${name}`}>{label}</label>{input}{errors[name] && <p id={`todo-error-${name}`} className="text-sm text-destructive">{errors[name]}</p>}</div>;
  return <Sheet open onOpenChange={(open) => { if (!open && !pending) onClose(); }}><SheetContent className="w-full overflow-y-auto sm:max-w-xl" showCloseButton={!pending}>
    <SheetHeader><SheetTitle>Edit to-do</SheetTitle><SheetDescription>Edit task details and optional links to your tracked items.</SheetDescription></SheetHeader>
    <form className="space-y-5 p-6" onSubmit={submit} noValidate>
      {Object.values(errors).some(Boolean) && <div id="todo-errors" tabIndex={-1} role="alert" className="border border-destructive p-3">{Object.entries(errors).filter(([, message]) => message).map(([name, message]) => <a key={name} href={`#todo-${name}`} className="block underline">{message}</a>)}</div>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {field('title', 'Title', <input {...attrs('title')} maxLength={200} />)}
      {field('details', 'Details', <textarea {...attrs('details')} rows={5} maxLength={4000} />)}
      {field('status', 'Status', <select {...attrs('status')}>{TODO_STATUSES.map((value) => <option key={value}>{value}</option>)}</select>)}
      {field('dueDate', 'Due date', <input {...attrs('dueDate')} type="date" />)}
      {field('priority', 'Priority', <select {...attrs('priority')}>{PRIORITIES.map((value) => <option key={value}>{value}</option>)}</select>)}
      {field('tag', 'Tag', <input {...attrs('tag')} maxLength={40} list="todo-tags" />)}
      {field('linkedJobId', 'Linked job ID (optional)', <input {...attrs('linkedJobId')} maxLength={24} />)}
      {field('linkedCertId', 'Linked certification ID (optional)', <input {...attrs('linkedCertId')} maxLength={24} />)}
      <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={onClose} disabled={pending}>Cancel</Button><Button type="submit" disabled={pending || JSON.stringify(values) === JSON.stringify(toTodoForm(item))}>{pending ? 'Saving…' : 'Save changes'}</Button></div>
    </form>
  </SheetContent></Sheet>;
}
