import Link from 'next/link';
import { getUser } from '@/lib/auth/session';
import { listJobs } from '@/lib/data/jobs';
import { todayDhaka, formatDisplay } from '@/lib/dates';
import { jobsSummary } from '@/lib/jobs/view';
import { DeadlineBadge } from '@/components/jobs/deadline-badge';
import { ExpandableText } from '@/components/ui/expandable-text';

export default async function Dashboard() {
  const user = await getUser();
  if (!user) return null;
  const [jobs] = await Promise.all([listJobs(user.userId)]);
  const today = todayDhaka();
  const summary = jobsSummary(jobs, today);
  const tiles = [['Total jobs', summary.total], ['Applied', summary.applied], ['Not applied yet', summary.saved], ['Due within 7 days', summary.due]] as const;
  return <div className="space-y-7">
    <h1 className="page-title">Dashboard</h1>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {tiles.map(([label, count]) => <Link key={label} href="/jobs" prefetch={false} className="panel px-5 py-5 transition-colors hover:bg-secondary">
        <span className={`block text-3xl font-semibold tabular-nums ${label === 'Due within 7 days' && count > 0 ? 'text-destructive' : ''}`}>{count}</span>
        <span className="mt-2 block text-sm text-muted-foreground">{label}</span>
      </Link>)}
    </div>
    <section className="panel px-5 py-5 sm:px-6" aria-labelledby="closest-deadlines">
      <div className="mb-2 flex items-center justify-between gap-4"><h2 id="closest-deadlines" className="text-xl font-semibold">Closest deadlines</h2><Link href="/jobs" prefetch={false} className="min-h-11 py-3 text-sm underline underline-offset-4">View all jobs</Link></div>
      {summary.closest.length ? <ul className="divide-y">{summary.closest.map((job) => <li key={job.id}>
        <div className="flex items-center justify-between gap-4 py-4">
          <div className="min-w-0"><div className="font-semibold"><ExpandableText text={job.company} lines={2} /></div><div className="text-sm text-muted-foreground"><ExpandableText text={job.role} lines={2} /></div><p className="mt-1 text-xs text-muted-foreground">{job.deadline && formatDisplay(job.deadline)}</p></div>
          <div className="flex shrink-0 items-center gap-3"><DeadlineBadge job={job} today={today} /><Link href="/jobs" prefetch={false} className="min-h-11 py-3 text-sm underline underline-offset-4" aria-label={`View ${job.company}, ${job.role}`}>View</Link></div>
        </div>
      </li>)}</ul> : <p className="py-6 text-sm text-muted-foreground">No saved jobs with deadlines yet.</p>}
    </section>
  </div>;
}
