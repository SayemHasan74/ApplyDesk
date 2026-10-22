'use client';

import dynamic from 'next/dynamic';
import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { TodoItem } from '@/lib/todos/items';
import { todoSections, todoTags } from '@/lib/todos/view';
import type { TodoCreate, TodoPatch } from '@/lib/validators/todo';
import { QuickAdd } from './quick-add';
import { TodoRow } from './todo-row';
import { useTodoMutations } from './use-todo-mutations';
import { TodoSection } from './todo-section';

const ConfirmDelete = dynamic(() => import('@/components/ui/confirm-delete').then((module) => module.ConfirmDelete), { ssr: false });
const TodoSheet = dynamic(() => import('./todo-sheet').then((module) => module.TodoSheet), { ssr: false });

export function TodosView({ initialData, initialToday, icons }: { initialData: TodoItem[]; initialToday: string; icons: { details: React.ReactNode; remove: React.ReactNode } }) {
  const { data: items } = useQuery({ queryKey: ['todos'], queryFn: async () => (await import('@/lib/todos/request')).fetchTodos(), initialData, refetchOnMount: false });
  const { run, pending, error, reset } = useTodoMutations();
  const [tag, setTag] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const today = useMemo(() => initialToday, [initialToday]);
  const sections = useMemo(() => todoSections(items, today, tag), [items, today, tag]);
  const tags = useMemo(() => todoTags(items), [items]);
  const selected = items.find((item) => item.id === editing);
  const patch = useCallback(async (id: string, values: TodoPatch) => {
    const { todoPatchSchema } = await import('@/lib/validators/todo');
    const parsed = todoPatchSchema.safeParse(values);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return false; }
    return run({ kind: 'update', id, input: parsed.data });
  }, [run]);
  const create = useCallback((input: TodoCreate) => run({ kind: 'create', input }), [run]);
  const open = useCallback((id: string) => { reset(); setEditing(id); }, [reset]);
  const close = useCallback(() => setEditing(null), []);
  const askDelete = useCallback((id: string) => setDeleting(id), []);
  const closeDelete = useCallback(() => setDeleting(null), []);
  const clear = useCallback(() => setDeleting('done'), []);
  const remove = useCallback(async () => {
    if (!deleting) return;
    if (await run(deleting === 'done' ? { kind: 'clear' } : { kind: 'delete', id: deleting })) setDeleting(null);
  }, [deleting, run]);
  return <div className="space-y-6">
    <h1 className="page-title">To-do <span className="ml-2 font-sans text-sm font-normal text-muted-foreground">{items.filter((item) => item.status !== 'done').length} open</span></h1>
    <QuickAdd pending={pending} onCreate={create} />
    <label className="flex items-center gap-3 text-sm"><span>Filter by tag</span><select className="form-control max-w-60" value={tag} onChange={(event) => setTag(event.target.value)}><option value="">All tags</option>{tags.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
    <datalist id="todo-tags">{tags.map((value) => <option key={value} value={value} />)}</datalist>
    {items.length === 0 && <p className="py-4 text-muted-foreground">No to-dos yet. Add your first task above.</p>}
    {(['overdue', 'today', 'upcoming', 'backlog', 'done'] as const).map((section) => <TodoSection key={section} name={section} count={sections[section].length} pending={pending} onClear={clear}>
      {sections[section].length ? <ul>{sections[section].map((item) => <TodoRow key={item.id} item={item} icons={icons} pending={pending} onPatch={patch} onDelete={askDelete} onOpen={open} />)}</ul> : <p className="py-4 text-sm text-muted-foreground">No tasks here.</p>}
    </TodoSection>)}
    {selected && <TodoSheet key={selected.id} item={selected} pending={pending} error={error} onClose={close} onSave={patch} />}
    {deleting && <ConfirmDelete title={deleting === 'done' ? 'Clear all done to-dos?' : 'Delete this to-do?'} description={deleting === 'done' ? 'All completed tasks in your account will be permanently removed, including tasks outside the current filter.' : 'This task will be permanently removed from your list.'} pending={pending} onClose={closeDelete} onConfirm={remove} />}
  </div>;
}
