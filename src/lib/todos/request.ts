import { apiRequest } from '../api/client';
import { MAX_LIST } from '../constants';
import type { TodoAction } from './mutations';

export async function fetchTodos() {
  const { z } = await import('zod');
  const { todoItemSchema } = await import('./items');
  return z.object({ items: z.array(todoItemSchema).max(MAX_LIST) }).strict().parse(await apiRequest('/api/todos')).items;
}
export async function sendTodoAction(action: TodoAction) {
  const { actionSchema } = await import('./actions');
  const { todoItemSchema } = await import('./items');
  const { z } = await import('zod');
  action = actionSchema.parse(action);
  if (action.kind === 'clear') return z.object({ count: z.number().int().nonnegative() }).strict().parse(await apiRequest('/api/todos/clear-done', 'POST'));
  const data = await apiRequest(action.kind === 'create' ? '/api/todos' : `/api/todos/${action.id}`,
    action.kind === 'create' ? 'POST' : action.kind === 'update' ? 'PATCH' : 'DELETE', action.kind === 'delete' ? {} : action.input);
  return action.kind === 'delete' ? null : todoItemSchema.parse(data);
}
