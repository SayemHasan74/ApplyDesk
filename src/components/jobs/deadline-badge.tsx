import { deriveJob } from '@/lib/derive';
import type { JobItem } from '@/lib/jobs/items';

export function DeadlineBadge({ job, today }: { job: JobItem; today: string }) {
  const { badge, daysLeft } = deriveJob(job, today);
  if (badge === 'none') return null;
  const label = badge === 'closed' ? 'Closed' : daysLeft === 0 ? 'Today' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`;
  return <span className={`deadline-badge badge-${badge}`}>{label}</span>;
}
