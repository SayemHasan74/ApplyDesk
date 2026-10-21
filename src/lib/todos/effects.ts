import type { TodoPatch } from '../validators/todo';
import type { TodoItem } from './items';

export function applyTodoStatusEffects(current: Pick<TodoItem, 'status' | 'completedAt'>, patch: TodoPatch, now: string) {
  if (patch.status === undefined || patch.status === current.status) return { ...patch };
  if (patch.status === 'done') return { ...patch, completedAt: now };
  return current.status === 'done' ? { ...patch, completedAt: null } : { ...patch };
}
