import { objectId } from '@/lib/validators/fields';
import { withApi } from '@/lib/api/handler';
import { parseInput } from '@/lib/api/input';
import { AppError } from '@/lib/errors';
import { deleteCert, getCert, updateCert } from '@/lib/data/certifications';
import { certPatchSchema } from '@/lib/validators/certification';

export const GET = withApi({ auth: 'user' }, async ({ user, params }) => {
  if (!user) throw new AppError('UNAUTHENTICATED', 'Sign in required');
  return getCert(user.userId, parseInput(objectId, params.id));
});
export const PATCH = withApi({ auth: 'user', body: certPatchSchema }, async ({ user, params, body }) => {
  if (!user) throw new AppError('UNAUTHENTICATED', 'Sign in required');
  return updateCert(user.userId, parseInput(objectId, params.id), body);
});
export const DELETE = withApi({ auth: 'user' }, async ({ user, params }) => {
  if (!user) throw new AppError('UNAUTHENTICATED', 'Sign in required');
  return deleteCert(user.userId, parseInput(objectId, params.id));
});
