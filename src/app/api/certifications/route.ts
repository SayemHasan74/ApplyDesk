import { withApi, ok } from '@/lib/api/handler';
import { AppError } from '@/lib/errors';
import { createCert, listCerts } from '@/lib/data/certifications';
import { getExpiryFor } from '@/lib/auth/expiry';
import { certCreateSchema } from '@/lib/validators/certification';

export const GET = withApi({ auth: 'user' }, async ({ user }) => {
  if (!user) throw new AppError('UNAUTHENTICATED', 'Sign in required');
  return { items: await listCerts(user.userId) };
});

export const POST = withApi({ auth: 'user', body: certCreateSchema }, async ({ user, body }) => {
  if (!user) throw new AppError('UNAUTHENTICATED', 'Sign in required');
  return ok(await createCert(user.userId, body, await getExpiryFor(user.userId, user.role)), 201);
});
