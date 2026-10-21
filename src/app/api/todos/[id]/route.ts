import { withApi } from '@/lib/api/handler';
import { parseInput } from '@/lib/api/input';
import { AppError } from '@/lib/errors';
import { deleteTodo, updateTodo } from '@/lib/data/todos';
import { todoPatchSchema } from '@/lib/validators/todo';
import { objectId } from '@/lib/validators/fields';

export const PATCH = withApi({ auth: 'user', body: todoPatchSchema }, async ({ user, params, body }) => {
  if (!user) throw new AppError('UNAUTHENTICATED', 'Sign in required');
  return updateTodo(user.userId, parseInput(objectId, params.id), body);
});
export const DELETE = withApi({ auth: 'user' }, async ({ user, params }) => {
  if (!user) throw new AppError('UNAUTHENTICATED', 'Sign in required');
  return deleteTodo(user.userId, parseInput(objectId, params.id));
});
