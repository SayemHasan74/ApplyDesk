import { withApi } from '@/lib/api/handler';
import { getSettings, updateSettings } from '@/lib/data/users';
import { settingsPatchSchema } from '@/lib/validators/settings';
import { AppError } from '@/lib/errors';

export const GET = withApi({ auth: 'user', role: 'admin' }, async ({ user }) => {
  if (!user) throw new AppError('UNAUTHENTICATED', 'Sign in required');
  return getSettings(user.userId);
});
export const PATCH = withApi({ auth: 'user', role: 'admin', body: settingsPatchSchema }, async ({ user, body }) => {
  if (!user) throw new AppError('UNAUTHENTICATED', 'Sign in required');
  return updateSettings(user.userId, body);
});
