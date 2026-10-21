'use client';

import { memo, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { JOB_STATUSES, type JobStatus } from '@/lib/constants';
import type { JobItem } from '@/lib/jobs/items';
import { formatDisplay } from '@/lib/dates';
import { ExpandableText } from '@/components/ui/expandable-text';
import { DeadlineBadge } from './deadline-badge';

export const JobRow = memo(function JobRow({ job, today, pending, onOpen, onDelete, onStatus }: {
  job: JobItem; today: string; pending: boolean;
  onOpen: (id: string) => void; onDelete: (id: string) => void; onStatus: (id: string, status: JobStatus) => void;
}) {
  const open = useCallback(() => { if (!pending) onOpen(job.id); }, [job.id, onOpen, pending]);
  const change = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => onStatus(job.id, event.target.value as JobStatus), [job.id, onStatus]);
  const remove = useCallback(() => onDelete(job.id), [job.id, onDelete]);
  const rowClick = useCallback((event: React.MouseEvent<HTMLTableRowElement>) => {
    if (event.target instanceof Element && !event.target.closest('button,select,a,input,textarea')) open();
  }, [open]);
  const rowKey = useCallback((event: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) { event.preventDefault(); open(); }
  }, [open]);
  return <tr className="h-44 cursor-pointer border-b transition-colors last:border-0 hover:bg-card/70" tabIndex={pending ? -1 : 0} aria-label={`Edit ${job.company}, ${job.role}`} onClick={rowClick} onKeyDown={rowKey}>
    <td className="min-w-0 py-5 pr-4 align-top">
      <div className="font-semibold"><ExpandableText text={job.company} lines={2} /></div>
      <div className="text-sm text-muted-foreground"><ExpandableText text={job.role} lines={2} /></div>
      <div className="mt-2 text-xs text-muted-foreground md:hidden">{job.deadline ? formatDisplay(job.deadline) : <i>No deadline listed</i>}</div>
      {job.deadlineNote && <div className="mt-1 text-xs text-muted-foreground"><ExpandableText text={job.deadlineNote} lines={2} /></div>}
      {job.descriptionSummary && <div className="mt-2 text-xs leading-relaxed text-muted-foreground"><ExpandableText text={job.descriptionSummary} lines={2} /></div>}
    </td>
    <td className="hidden py-5 pr-4 align-top text-sm md:table-cell">{job.deadline ? formatDisplay(job.deadline) : <i className="text-muted-foreground">No deadline listed</i>}</td>
    <td className="py-5 pr-2 align-top"><DeadlineBadge job={job} today={today} /></td>
    <td className="hidden py-5 pr-4 align-top text-sm md:table-cell">{job.compensationText ? <ExpandableText text={job.compensationText} lines={2} /> : <i className="text-muted-foreground">Not found</i>}</td>
    <td className="py-5 align-top"><select className="form-control min-w-0 px-1 text-xs sm:px-2 sm:text-sm" aria-label={`Status for ${job.company}, ${job.role}`} value={job.status} onChange={change} disabled={pending}>
      {JOB_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
    </select></td>
    <td className="py-5 pl-1 align-top"><button type="button" className="flex size-11 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-destructive" onClick={remove} disabled={pending} aria-label={`Delete ${job.company}, ${job.role}`}><Trash2 className="size-4" aria-hidden="true" /></button></td>
  </tr>;
});
