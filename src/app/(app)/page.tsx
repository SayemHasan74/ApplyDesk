import Link from 'next/link';
import { getUser } from '@/lib/auth/session';
import { listJobs } from '@/lib/data/jobs';
import { listCerts } from '@/lib/data/certifications';
import { listTodos } from '@/lib/data/todos';
import { todayDhaka } from '@/lib/dates';
import { jobsSummary } from '@/lib/jobs/view';
import { certsSummary } from '@/lib/certifications/view';
import { todoSections } from '@/lib/todos/view';
import { DeadlineLists } from '@/components/dashboard/deadline-lists';
import { ExpandableText } from '@/components/ui/expandable-text';

export default async function Dashboard() {
  const user = await getUser();
  if (!user) return null;
  const [jobs, certs, todos] = await Promise.all([listJobs(user.userId), listCerts(user.userId), listTodos(user.userId)]);
  const today = todayDhaka();
  const summary = jobsSummary(jobs, today);
  const certifications = certsSummary(certs, today);
  const sections = todoSections(todos, today);
  const tiles = [
    { label: 'Total jobs', count: summary.total, href: '/jobs' },
    { label: 'Applied', count: summary.applied, href: '/jobs' },
    { label: 'Not applied yet', count: summary.saved, href: '/jobs' },
    { label: 'Due within 7 days', count: summary.due, href: '/jobs', urgent: true },
    { label: 'Certification deadlines within 7 days', count: certifications.due, href: '/certifications' },
    { label: 'To-dos due today', count: sections.today.length, href: '/todos' },
    { label: 'Overdue to-dos', count: sections.overdue.length, href: '/todos', urgent: true },
  ];
  return <div className="space-y-7">
    <h1 className="page-title">Dashboard</h1>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
      {tiles.map(({ label, count, href, urgent }) => <Link key={label} href={href} prefetch={false} className="panel px-5 py-5 transition-colors hover:bg-secondary">
        <span className={`block text-3xl font-semibold tabular-nums ${urgent && count > 0 ? 'text-destructive' : ''}`}>{count}</span><span className="mt-2 block text-sm text-muted-foreground">{label}</span>
      </Link>)}
    </div>
    <DeadlineLists jobs={summary.closest} certs={certifications.closest} today={today} />
    <section className="panel px-5 py-5 sm:px-6" aria-labelledby="todays-todos"><div className="flex items-center justify-between gap-4"><h2 id="todays-todos" className="text-xl font-semibold">Today&apos;s to-dos</h2><Link href="/todos" prefetch={false} className="min-h-11 py-3 text-sm underline">Open list</Link></div>
      {sections.today.length ? <ul className="divide-y">{sections.today.slice(0, 5).map((item) => <li key={item.id} className="flex items-center justify-between gap-3 py-4"><div className="min-w-0"><ExpandableText text={item.title} lines={2} />{item.details && <div className="mt-1 text-sm text-muted-foreground"><ExpandableText text={item.details} lines={2} /></div>}</div><Link href="/todos" prefetch={false} className="min-h-11 shrink-0 py-3 text-sm underline" aria-label={`View ${item.title}`}>View</Link></li>)}</ul> : <p className="py-6 text-sm text-muted-foreground">No to-dos due today.</p>}
    </section>
  </div>;
}
