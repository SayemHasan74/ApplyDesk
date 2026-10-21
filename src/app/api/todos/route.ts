import { withApi, ok } from '@/lib/api/handler';
import { AppError } from '@/lib/errors';
import { createTodo, listTodos } from '@/lib/data/todos';
import { getExpiryFor } from '@/lib/auth/expiry';
import { todoCreateSchema } from '@/lib/validators/todo';

export const GET = withApi({ auth: 'user' }, async ({ user }) => {
  if (!user) throw new AppError('UNAUTHENTICATED', 'Sign in required');
  return { items: await listTodos(user.userId) };
});

export const POST = withApi({ auth: 'user', body: todoCreateSchema }, async ({ user, body }) => {
  if (!user) throw new AppError('UNAUTHENTICATED', 'Sign in required');
  return ok(await createTodo(user.userId, body, await getExpiryFor(user.userId, user.role)), 201);
});
