'use client';

import type { TodoAction } from '@/lib/todos/mutations';

import { useOptimisticList } from '@/components/use-optimistic-list';
import { optimisticTodos, replaceTodo } from '@/lib/todos/mutations';

export function useTodoMutations() {
  return useOptimisticList({ key: 'todos', request: async (action: TodoAction) => (await import('@/lib/todos/request')).sendTodoAction(action), optimistic: optimisticTodos, replace: replaceTodo });
}
