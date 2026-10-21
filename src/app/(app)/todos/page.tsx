import { getUser } from '@/lib/auth/session';
import { listTodos } from '@/lib/data/todos';
import { TodosView } from '@/components/todos/todos-view';

export default async function Todos() {
  const user = await getUser();
  if (!user) return null;
  return <TodosView initialData={await listTodos(user.userId)} />;
}
