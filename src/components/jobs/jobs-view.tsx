'use client';

import dynamic from 'next/dynamic';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { JOB_STATUSES, type JobStatus } from '@/lib/constants';
import { visibleJobs } from '@/lib/jobs/view';
import type { JobItem } from '@/lib/jobs/items';
import type { JobCreate, JobPatch } from '@/lib/validators/job';
import { JobRow } from './job-row';
import { useJobMutations } from './use-job-mutations';

const JobSheet = dynamic(() => import('./job-sheet').then((module) => module.JobSheet), { ssr: false });
const DeleteJobDialog = dynamic(() => import('./delete-job-dialog').then((module) => module.DeleteJobDialog), { ssr: false });

export function JobsView({ initialData, initialToday, icons }: { initialData: JobItem[]; initialToday: string; icons: { add: React.ReactNode; search: React.ReactNode; remove: React.ReactNode } }) {
  const { data: items } = useQuery({ queryKey: ['jobs'], queryFn: async () => (await import('@/lib/jobs/request')).fetchJobs(), initialData, refetchOnMount: false });
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('all');
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const today = useMemo(() => initialToday, [initialToday]);
  const { run, pending, error, reset } = useJobMutations(today);
  useEffect(() => { const timer = setTimeout(() => setDebounced(search), 200); return () => clearTimeout(timer); }, [search]);
  const shown = useMemo(() => visibleJobs(items, debounced, status), [items, debounced, status]);
  const selected = editing === 'new' ? undefined : items.find((job) => job.id === editing);
  const removed = items.find((job) => job.id === deleting);
  const open = useCallback((id: string) => { reset(); setEditing(id); }, [reset]);
  const close = useCallback(() => setEditing(null), []);
  const closeDelete = useCallback(() => setDeleting(null), []);
  const askDelete = useCallback((id: string) => { reset(); setDeleting(id); }, [reset]);
  const changeStatus = useCallback((id: string, next: JobStatus) => { void run({ kind: 'update', id, input: { status: next } }); }, [run]);
  const save = useCallback(async (values: JobCreate | JobPatch) => {
    const { jobCreateSchema, jobPatchSchema } = await import('@/lib/validators/job');
    return editing === 'new' ? run({ kind: 'create', input: jobCreateSchema.parse(values) })
      : run({ kind: 'update', id: editing ?? '', input: jobPatchSchema.parse(values) });
  }, [editing, run]);
  const remove = useCallback(async () => { if (deleting && await run({ kind: 'delete', id: deleting })) setDeleting(null); }, [deleting, run]);
  return <div className="space-y-6">
    <div className="flex items-center justify-between gap-4"><h1 className="page-title">Jobs <span className="ml-2 font-sans text-sm font-normal text-muted-foreground">{items.length} tracked</span></h1><button onClick={() => open('new')} disabled={pending} className="action-button">{icons.add}Add job</button></div>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <label className="flex min-h-11 flex-1 items-center gap-3 border-b-2 border-foreground">{icons.search}<span className="sr-only">Search company or role</span><input type="search" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" placeholder="Search company or role" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <label className="flex items-center gap-3 text-sm text-muted-foreground">Status<select className="form-control w-full sm:w-44" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{JOB_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
    </div>
    <p className="sr-only" role="status">{shown.length} jobs shown</p>
    {items.length === 0 ? <div className="border-y py-16 text-center"><h2 className="text-xl font-semibold">No jobs yet. Add your first job.</h2><button className="action-button mt-5" onClick={() => open('new')} disabled={pending}>Add job</button></div>
      : shown.length === 0 ? <p className="border-y py-12 text-center text-muted-foreground">No jobs match your search or status filter.</p>
        : <table className="w-full table-fixed text-left"><caption className="sr-only">Your tracked jobs. Select a row to edit its details.</caption><colgroup><col className="w-auto md:w-[32%]" /><col className="hidden md:table-column md:w-[16%]" /><col className="w-[24%] md:w-[14%]" /><col className="hidden md:table-column md:w-[16%]" /><col className="w-[28%] md:w-[17%]" /><col className="w-11" /></colgroup>
          <thead className="border-b-2 border-foreground text-xs text-muted-foreground"><tr><th scope="col" className="pb-3 font-medium">Company / Role</th><th scope="col" className="hidden pb-3 font-medium md:table-cell">Deadline</th><th scope="col" className="pb-3 font-medium">Days left</th><th scope="col" className="hidden pb-3 font-medium md:table-cell">Compensation</th><th scope="col" className="pb-3 font-medium">Status</th><th scope="col"><span className="sr-only">Delete</span></th></tr></thead>
          <tbody>{shown.map((job) => <JobRow key={job.id} job={job} today={today} deleteIcon={icons.remove} pending={pending} onOpen={open} onDelete={askDelete} onStatus={changeStatus} />)}</tbody>
        </table>}
    {editing && <JobSheet key={editing} job={selected} pending={pending} error={error} onClose={close} onSave={save} />}
    {removed && <DeleteJobDialog job={removed} pending={pending} onClose={closeDelete} onConfirm={remove} />}
  </div>;
}
