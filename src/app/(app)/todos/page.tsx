import { MoreHorizontal, Trash2 } from 'lucide-react';
import { todayDhaka } from '@/lib/dates';
import { getUser } from '@/lib/auth/session';
import { listTodos } from '@/lib/data/todos';
import { TodosView } from '@/components/todos/todos-view';

export default async function Todos() {
  const user = await getUser();
  if (!user) return null;
  return <TodosView icons={{ details: <MoreHorizontal className="size-4" aria-hidden="true" />, remove: <Trash2 className="size-4" aria-hidden="true" /> }} initialToday={todayDhaka()} initialData={await listTodos(user.userId)} />;
}
