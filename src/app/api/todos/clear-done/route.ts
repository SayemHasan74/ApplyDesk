import { withApi } from '@/lib/api/handler';
import { AppError } from '@/lib/errors';
import { deleteDoneTodos } from '@/lib/data/todos';

export const POST = withApi({ auth: 'user' }, async ({ user }) => {
  if (!user) throw new AppError('UNAUTHENTICATED', 'Sign in required');
  return deleteDoneTodos(user.userId);
});
