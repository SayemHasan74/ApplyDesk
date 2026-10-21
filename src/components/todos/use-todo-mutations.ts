'use client';

import { useOptimisticList } from '@/components/use-optimistic-list';
import { sendTodoAction } from '@/lib/todos/request';
import { optimisticTodos, replaceTodo } from '@/lib/todos/mutations';

export function useTodoMutations() {
  return useOptimisticList({ key: 'todos', request: sendTodoAction, optimistic: optimisticTodos, replace: replaceTodo });
}
