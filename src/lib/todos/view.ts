import { compareTodos } from '../sort';
import { todoView } from '../derive';
import type { TodoItem } from './items';

function compareTodoItems(a: TodoItem, b: TodoItem) {
  return compareTodos({ ...a, createdAt: new Date(a.createdAt) }, { ...b, createdAt: new Date(b.createdAt) });
}
export function todoSections(items: TodoItem[], today: string, tag = '') {
  const grouped = { overdue: [] as TodoItem[], today: [] as TodoItem[], upcoming: [] as TodoItem[], backlog: [] as TodoItem[], done: [] as TodoItem[] };
  for (const item of items.filter((item) => !tag || item.tag === tag).sort(compareTodoItems)) grouped[todoView(item, today)].push(item);
  return grouped;
}
export function todoTags(items: TodoItem[]) {
  return [...new Set(items.map((item) => item.tag).filter((tag): tag is string => !!tag))].sort((a, b) => a.localeCompare(b));
}
