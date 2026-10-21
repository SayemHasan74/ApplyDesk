import type { TodoItem } from './items';
import { todoPatchSchema, type TodoPatch } from '../validators/todo';

export type TodoForm = { [K in keyof TodoPatch]-?: string };
export function toTodoForm(item: TodoItem): TodoForm {
  return Object.fromEntries(Object.keys(todoPatchSchema.shape).map((key) => [key, item[key as keyof TodoPatch] ?? ''])) as TodoForm;
}
export function changedTodoFields(item: TodoItem, form: TodoForm) {
  const values = todoPatchSchema.parse(Object.fromEntries(Object.entries(form).map(([key, value]) => [key,
    value === '' && !['title', 'details'].includes(key) ? null : value,
  ])));
  return todoPatchSchema.parse(Object.fromEntries(Object.entries(values).filter(([key, value]) => item[key as keyof TodoPatch] !== value)));
}
