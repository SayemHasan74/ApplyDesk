'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { JOB_STATUSES, type JobStatus } from '@/lib/constants';
import { todayDhaka } from '@/lib/dates';
import { visibleJobs } from '@/lib/jobs/view';
import { fetchJobs } from '@/lib/jobs/request';
import type { JobItem } from '@/lib/jobs/items';
import { jobCreateSchema, jobPatchSchema, type JobCreate, type JobPatch } from '@/lib/validators/job';
import { Button } from '@/components/ui/button';
import { JobRow } from './job-row';
import { JobSheet } from './job-sheet';
import { DeleteJobDialog } from './delete-job-dialog';
import { useJobMutations } from './use-job-mutations';

export function JobsView({ initialData }: { initialData: JobItem[] }) {
  const { data: items } = useQuery({ queryKey: ['jobs'], queryFn: fetchJobs, initialData, refetchOnMount: false });
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('all');
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { run, pending, error, reset } = useJobMutations();
  useEffect(() => { const timer = setTimeout(() => setDebounced(search), 200); return () => clearTimeout(timer); }, [search]);
  const today = useMemo(() => todayDhaka(), []);
  const shown = useMemo(() => visibleJobs(items, debounced, status), [items, debounced, status]);
  const selected = editing === 'new' ? undefined : items.find((job) => job.id === editing);
  const removed = items.find((job) => job.id === deleting);
  const open = useCallback((id: string) => { reset(); setEditing(id); }, [reset]);
  const close = useCallback(() => setEditing(null), []);
  const closeDelete = useCallback(() => setDeleting(null), []);
  const askDelete = useCallback((id: string) => { reset(); setDeleting(id); }, [reset]);
  const changeStatus = useCallback((id: string, next: JobStatus) => { void run({ kind: 'update', id, input: { status: next } }); }, [run]);
  const save = useCallback((values: JobCreate | JobPatch) => editing === 'new'
    ? run({ kind: 'create', input: jobCreateSchema.parse(values) })
    : run({ kind: 'update', id: editing ?? '', input: jobPatchSchema.parse(values) }), [editing, run]);
  const remove = useCallback(async () => { if (deleting && await run({ kind: 'delete', id: deleting })) setDeleting(null); }, [deleting, run]);
  return <div className="space-y-6">
    <div className="flex items-center justify-between gap-4"><h1 className="page-title">Jobs <span className="ml-2 font-sans text-sm font-normal text-muted-foreground">{items.length} tracked</span></h1><Button onClick={() => open('new')} disabled={pending} className="min-h-11"><Plus className="size-4" aria-hidden="true" />Add job</Button></div>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <label className="flex min-h-11 flex-1 items-center gap-3 border-b-2 border-foreground"><Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="sr-only">Search company or role</span><input type="search" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" placeholder="Search company or role" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <label className="flex items-center gap-3 text-sm text-muted-foreground">Status<select className="form-control w-full sm:w-44" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{JOB_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
    </div>
    <p className="sr-only" role="status">{shown.length} jobs shown</p>
    {items.length === 0 ? <div className="border-y py-16 text-center"><h2 className="text-xl font-semibold">No jobs yet. Add your first job.</h2><Button className="mt-5 min-h-11" onClick={() => open('new')} disabled={pending}>Add job</Button></div>
      : shown.length === 0 ? <p className="border-y py-12 text-center text-muted-foreground">No jobs match your search or status filter.</p>
        : <table className="w-full table-fixed text-left"><caption className="sr-only">Your tracked jobs. Select a row to edit its details.</caption><colgroup><col className="w-auto md:w-[32%]" /><col className="hidden md:table-column md:w-[16%]" /><col className="w-[24%] md:w-[14%]" /><col className="hidden md:table-column md:w-[16%]" /><col className="w-[28%] md:w-[17%]" /><col className="w-11" /></colgroup>
          <thead className="border-b-2 border-foreground text-xs text-muted-foreground"><tr><th scope="col" className="pb-3 font-medium">Company / Role</th><th scope="col" className="hidden pb-3 font-medium md:table-cell">Deadline</th><th scope="col" className="pb-3 font-medium">Days left</th><th scope="col" className="hidden pb-3 font-medium md:table-cell">Compensation</th><th scope="col" className="pb-3 font-medium">Status</th><th scope="col"><span className="sr-only">Delete</span></th></tr></thead>
          <tbody>{shown.map((job) => <JobRow key={job.id} job={job} today={today} pending={pending} onOpen={open} onDelete={askDelete} onStatus={changeStatus} />)}</tbody>
        </table>}
    {editing && <JobSheet key={editing} job={selected} pending={pending} error={error} onClose={close} onSave={save} />}
    {removed && <DeleteJobDialog job={removed} pending={pending} onClose={closeDelete} onConfirm={remove} />}
  </div>;
}
