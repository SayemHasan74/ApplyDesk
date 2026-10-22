import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/session';
import { listSuggestions } from '@/lib/data/suggestions';
import { InboxView } from '@/components/inbox/inbox-view';
import { listJobs } from '@/lib/data/jobs';
import { canUse } from '@/lib/auth/permissions';
export default async function InboxPage() {
  const user = await getUser();
  if (!user || !canUse(user.role, 'inbox')) redirect('/');
  const [suggestions, jobs] = await Promise.all([listSuggestions(user.userId), listJobs(user.userId)]);
  return <div className="space-y-6"><h1 className="page-title">Inbox</h1><InboxView initialData={suggestions} jobLabels={Object.fromEntries(jobs.map((job) => [job.id, `${job.company} · ${job.role}`]))} /></div>;
}
