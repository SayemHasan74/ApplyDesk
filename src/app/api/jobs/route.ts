import { withApi, ok } from '@/lib/api/handler';
import { AppError } from '@/lib/errors';
import { createJob, listJobs } from '@/lib/data/jobs';
import { getExpiryFor } from '@/lib/auth/expiry';
import { jobCreateSchema } from '@/lib/validators/job';

export const GET = withApi({ auth: 'user' }, async ({ user }) => {
  if (!user) throw new AppError('UNAUTHENTICATED', 'Sign in required');
  return { items: await listJobs(user.userId) };
});

export const POST = withApi({ auth: 'user', body: jobCreateSchema }, async ({ user, body }) => {
  if (!user) throw new AppError('UNAUTHENTICATED', 'Sign in required');
  return ok(await createJob(user.userId, body, await getExpiryFor(user.userId, user.role)), 201);
});
