import 'server-only';
import { cache } from 'react';
import { auth } from '@/auth';
import { currentUserSchema, isActiveSession } from './policy';
import { AppError } from '../errors';
import { canUse } from './permissions';

export const getUser = cache(async () => {
  const session = await auth();
  if (!session || !isActiveSession(session)) return null;
  const result = currentUserSchema.safeParse({
    userId: session.user.userId, role: session.user.role,
    name: session.user.name || (session.user.role === 'demo' ? 'Demo visitor' : 'Owner'),
    email: session.user.email ?? undefined,
  });
  return result.success ? result.data : null;
});

export async function requireUser() {
  const user = await getUser();
  if (!user) throw new AppError('UNAUTHENTICATED', 'Sign in required');
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!canUse(user.role, 'settings')) throw new AppError('FORBIDDEN', 'Administrator access required');
  return user;
}
