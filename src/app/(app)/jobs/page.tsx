import { getUser } from '@/lib/auth/session';
import { listJobs } from '@/lib/data/jobs';
import { JobsView } from '@/components/jobs/jobs-view';

export default async function Jobs() {
  const user = await getUser();
  if (!user) return null;
  return <JobsView initialData={await listJobs(user.userId)} />;
}
