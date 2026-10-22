import { Plus, Search, Trash2 } from 'lucide-react';
import { todayDhaka } from '@/lib/dates';
import { getUser } from '@/lib/auth/session';
import { listJobs } from '@/lib/data/jobs';
import { JobsView } from '@/components/jobs/jobs-view';

export default async function Jobs() {
  const user = await getUser();
  if (!user) return null;
  return <JobsView icons={{ add: <Plus className="size-4" aria-hidden="true" />, search: <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />, remove: <Trash2 className="size-4" aria-hidden="true" /> }} initialToday={todayDhaka()} initialData={await listJobs(user.userId)} />;
}
