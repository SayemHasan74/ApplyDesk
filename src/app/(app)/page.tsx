import Link from 'next/link';
import { ArrowRight, BriefcaseBusiness, CalendarDays, Check, Clock3, Award } from 'lucide-react';
import { getUser } from '@/lib/auth/session';
import { listJobs } from '@/lib/data/jobs';
import { listCerts } from '@/lib/data/certifications';
import { listTodos } from '@/lib/data/todos';
import { countSuggestions } from '@/lib/data/suggestions';
import { formatDisplay, todayDhaka } from '@/lib/dates';
import { jobsSummary } from '@/lib/jobs/view';
import { certsSummary } from '@/lib/certifications/view';
import { todoSections } from '@/lib/todos/view';
import { DeadlineLists } from '@/components/dashboard/deadline-lists';
import { ExpandableText } from '@/components/ui/expandable-text';

export default async function Dashboard() {
  const user = await getUser();
  if (!user) return null;
  const [jobs, certs, todos, inbox] = await Promise.all([listJobs(user.userId), listCerts(user.userId), listTodos(user.userId), user.role === 'admin' ? countSuggestions(user.userId) : Promise.resolve(0)]);
  const today = todayDhaka();
  const summary = jobsSummary(jobs, today);
  const certifications = certsSummary(certs, today);
  const sections = todoSections(todos, today);
  const tiles = [
    { label: 'Total jobs', count: summary.total, href: '/jobs', icon: BriefcaseBusiness },
    { label: 'Applied', count: summary.applied, href: '/jobs', icon: Check },
    { label: 'Not applied yet', count: summary.saved, href: '/jobs', icon: BriefcaseBusiness },
    { label: 'Due within 7 days', count: summary.due, href: '/jobs', urgent: true, icon: Clock3 },
    { label: 'Certification deadlines within 7 days', count: certifications.due, href: '/certifications', icon: Award },
    { label: 'To-dos due today', count: sections.today.length, href: '/todos', icon: CalendarDays },
    { label: 'Overdue to-dos', count: sections.overdue.length, href: '/todos', urgent: true, icon: Clock3 },
  ];
  return <div className="space-y-7">
    <div className="flex items-center justify-between gap-4"><h1 className="page-title">Dashboard</h1><span className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="hidden size-4 sm:block" aria-hidden="true" />{formatDisplay(today)}</span></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 min-[900px]:grid-cols-5 sm:gap-4">
      {tiles.map(({ label, count, href, urgent, icon: Icon }) => <Link key={label} href={href} prefetch={false} className="panel min-h-28 px-4 py-4 transition-colors hover:bg-secondary sm:px-5">
        <div className="flex items-center justify-between gap-3"><span className={`block text-3xl font-semibold tabular-nums ${urgent && count > 0 ? 'text-destructive' : ''}`}>{count}</span><Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /></div><span className="mt-2 block text-xs leading-relaxed text-muted-foreground">{label}</span>
      </Link>)}
      {inbox > 0 && <Link href="/inbox" prefetch={false} className="panel px-5 py-5 transition-colors hover:bg-secondary"><span className="block text-3xl font-semibold tabular-nums">{inbox}</span><span className="mt-2 block text-sm text-muted-foreground">Inbox ({inbox})</span></Link>}
    </div>
    <DeadlineLists jobs={summary.closest} certs={certifications.closest} today={today} />
    <section className="panel px-5 py-5 sm:px-6" aria-labelledby="todays-todos"><div className="dashboard-heading"><h2 id="todays-todos" className="text-xl font-semibold">Today&apos;s to-dos</h2><Link href="/todos" prefetch={false} className="dashboard-link">Open list<ArrowRight className="size-3.5" aria-hidden="true" /></Link></div>
      {sections.today.length ? <ul className="divide-y">{sections.today.slice(0, 5).map((item) => <li key={item.id} className="flex items-center justify-between gap-3 py-4"><div className="min-w-0"><ExpandableText text={item.title} lines={2} />{item.details && <div className="mt-1 text-sm text-muted-foreground"><ExpandableText text={item.details} lines={2} /></div>}</div><Link href="/todos" prefetch={false} className="min-h-11 shrink-0 py-3 text-sm underline" aria-label={`View ${item.title}`}>View</Link></li>)}</ul> : <p className="py-6 text-sm text-muted-foreground">No to-dos due today.</p>}
    </section>
  </div>;
}
