import { MAX_LIST } from '../constants';
import type { TodoItem } from './items';
import { applyTodoStatusEffects } from './effects';

import type { TodoAction } from './actions';
export type { TodoAction } from './actions';

export function optimisticTodos(items: TodoItem[], action: TodoAction, temporaryId: string, now: string) {
  if (action.kind === 'clear') return items.filter((item) => item.status !== 'done');
  if (action.kind === 'delete') return items.filter((item) => item.id !== action.id);
  if (action.kind === 'create') return [{ ...action.input, completedAt: null,
    ...applyTodoStatusEffects({ status: 'todo', completedAt: null }, action.input, now),
    id: temporaryId, createdAt: now, updatedAt: now,
  }, ...items].slice(0, MAX_LIST);
  return items.map((item) => item.id === action.id ? ({ ...item,
    ...applyTodoStatusEffects(item, action.input, now), updatedAt: now,
  }) : item);
}
export function replaceTodo(items: TodoItem[], action: TodoAction, temporaryId: string, result: TodoItem | { count: number } | null) {
  if (!result || !('id' in result)) return items;
  const id = action.kind === 'create' ? temporaryId : 'id' in action ? action.id : undefined;
  return items.map((item) => item.id === id ? result : item);
}
