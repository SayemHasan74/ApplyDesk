import { withApi } from '@/lib/api/handler';
import { parseInput } from '@/lib/api/input';
import { AppError } from '@/lib/errors';
import { deleteJob, getJob, updateJob } from '@/lib/data/jobs';
import { jobIdSchema, jobPatchSchema } from '@/lib/validators/job';

export const GET = withApi({ auth: 'user' }, async ({ user, params }) => {
  if (!user) throw new AppError('UNAUTHENTICATED', 'Sign in required');
  return getJob(user.userId, parseInput(jobIdSchema, params.id));
});
export const PATCH = withApi({ auth: 'user', body: jobPatchSchema }, async ({ user, params, body }) => {
  if (!user) throw new AppError('UNAUTHENTICATED', 'Sign in required');
  return updateJob(user.userId, parseInput(jobIdSchema, params.id), body);
});
export const DELETE = withApi({ auth: 'user' }, async ({ user, params }) => {
  if (!user) throw new AppError('UNAUTHENTICATED', 'Sign in required');
  return deleteJob(user.userId, parseInput(jobIdSchema, params.id));
});
