import { deriveJob } from '../derive';
import { compareJobs } from '../sort';
import type { JobItem } from './items';

function compareJobItems(a: JobItem, b: JobItem) {
  return compareJobs({ ...a, createdAt: new Date(a.createdAt), updatedAt: new Date(a.updatedAt) },
    { ...b, createdAt: new Date(b.createdAt), updatedAt: new Date(b.updatedAt) });
}

export function visibleJobs(items: JobItem[], search: string, status: string) {
  const term = search.trim().toLocaleLowerCase();
  return items.filter((item) => (status === 'all' || item.status === status)
    && `${item.company} ${item.role}`.toLocaleLowerCase().includes(term)).sort(compareJobItems);
}

export function jobsSummary(items: JobItem[], today: string) {
  const saved = items.filter((job) => job.status === 'saved');
  return {
    total: items.length,
    applied: items.filter((job) => ['applied', 'assessment', 'interview', 'offer'].includes(job.status)).length,
    saved: saved.length,
    due: saved.filter((job) => { const { daysLeft } = deriveJob(job, today); return daysLeft !== null && daysLeft >= 0 && daysLeft <= 7; }).length,
    closest: saved.filter((job) => job.deadline).sort(compareJobItems).slice(0, 5),
  };
}
