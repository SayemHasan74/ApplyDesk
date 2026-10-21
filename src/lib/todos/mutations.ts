import { z } from 'zod';
import { todoCreateSchema, todoPatchSchema } from '../validators/todo';
import { objectId } from '../validators/fields';
import { MAX_LIST } from '../constants';
import { todoItemSchema, type TodoItem } from './items';
import { applyTodoStatusEffects } from './effects';

const actionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('create'), input: todoCreateSchema }).strict(),
  z.object({ kind: z.literal('update'), id: objectId, input: todoPatchSchema }).strict(),
  z.object({ kind: z.literal('delete'), id: objectId }).strict(),
  z.object({ kind: z.literal('clear') }).strict(),
]);
export type TodoAction = z.infer<typeof actionSchema>;
export function optimisticTodos(items: TodoItem[], action: TodoAction, temporaryId: string, now: string) {
  action = actionSchema.parse(action);
  if (action.kind === 'clear') return items.filter((item) => item.status !== 'done');
  if (action.kind === 'delete') return items.filter((item) => item.id !== action.id);
  if (action.kind === 'create') return [todoItemSchema.parse({ ...action.input, completedAt: null,
    ...applyTodoStatusEffects({ status: 'todo', completedAt: null }, action.input, now),
    id: temporaryId, createdAt: now, updatedAt: now,
  }), ...items].slice(0, MAX_LIST);
  return items.map((item) => item.id === action.id ? todoItemSchema.parse({ ...item,
    ...applyTodoStatusEffects(item, action.input, now), updatedAt: now,
  }) : item);
}
export function replaceTodo(items: TodoItem[], action: TodoAction, temporaryId: string, result: TodoItem | { count: number } | null) {
  if (!result || !('id' in result)) return items;
  const id = action.kind === 'create' ? temporaryId : 'id' in action ? action.id : undefined;
  return items.map((item) => item.id === id ? result : item);
}
