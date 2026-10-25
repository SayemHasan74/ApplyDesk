import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { formatDisplay } from '@/lib/dates';
import type { JobItem } from '@/lib/jobs/items';
import type { CertItem } from '@/lib/certifications/items';
import { DeadlineBadge } from '@/components/jobs/deadline-badge';
import { CertDeadlineBadge } from '@/components/certifications/deadline-badge';
import { ExpandableText } from '@/components/ui/expandable-text';

export function DeadlineLists({ jobs, certs, today }: { jobs: JobItem[]; certs: CertItem[]; today: string }) {
  return <div className="grid gap-4 min-[56.25rem]:grid-cols-2">
    <DeadlinePanel title="Closest job deadlines" href="/jobs">
      {jobs.length ? <ul className="divide-y">{jobs.map((job) => <li key={job.id} className="flex items-center justify-between gap-3 py-4">
        <div className="min-w-0"><div className="font-semibold"><ExpandableText text={job.company} lines={2} /></div><div className="text-sm text-muted-foreground"><ExpandableText text={job.role} lines={2} /></div><p className="mt-1 text-xs text-muted-foreground">{job.deadline && formatDisplay(job.deadline)}</p></div>
        <div className="flex shrink-0 flex-col items-end gap-2"><DeadlineBadge job={job} today={today} /><Link href="/jobs" prefetch={false} className="min-h-11 py-3 text-sm underline" aria-label={`View ${job.company}, ${job.role}`}>View</Link></div>
      </li>)}</ul> : <p className="py-6 text-sm text-muted-foreground">No saved jobs with deadlines yet.</p>}
    </DeadlinePanel>
    <DeadlinePanel title="Closest certification deadlines" href="/certifications">
      {certs.length ? <ul className="divide-y">{certs.map((cert) => <li key={cert.id} className="flex items-center justify-between gap-3 py-4">
        <div className="min-w-0"><div className="font-semibold"><ExpandableText text={cert.name} lines={2} /></div><div className="text-sm text-muted-foreground"><ExpandableText text={cert.provider} lines={2} /></div><p className="mt-1 text-xs text-muted-foreground">{cert.registrationDeadline && formatDisplay(cert.registrationDeadline)}</p></div>
        <div className="flex shrink-0 flex-col items-end gap-2"><CertDeadlineBadge cert={cert} today={today} /><Link href="/certifications" prefetch={false} className="min-h-11 py-3 text-sm underline" aria-label={`View ${cert.name}`}>View</Link></div>
      </li>)}</ul> : <p className="py-6 text-sm text-muted-foreground">No upcoming certification registration deadlines.</p>}
    </DeadlinePanel>
  </div>;
}
function DeadlinePanel({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return <section className="panel px-5 py-5 sm:px-6" aria-label={title}><div className="dashboard-heading"><h2 className="text-xl font-semibold">{title}</h2><Link href={href} prefetch={false} className="dashboard-link">View all<ArrowRight className="size-3.5" aria-hidden="true" /></Link></div>{children}</section>;
}
