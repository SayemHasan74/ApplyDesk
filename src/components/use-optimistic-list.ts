'use client';

import { useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useOptimisticList<Item, Action, Result>({ key, request, optimistic, replace }: {
  key: 'certifications' | 'todos'; request: (action: Action) => Promise<Result>;
  optimistic: (items: Item[], action: Action, temporaryId: string, now: string) => Item[];
  replace: (items: Item[], action: Action, temporaryId: string, result: Result) => Item[];
}) {
  const client = useQueryClient();
  const locked = useRef(false);
  const mutation = useMutation({ mutationFn: request, retry: false,
    onMutate: async (action) => {
      await client.cancelQueries({ queryKey: [key] });
      const previous = client.getQueryData<Item[]>([key]) ?? [];
      const temporaryId = crypto.randomUUID().replaceAll('-', '').slice(0, 24);
      client.setQueryData([key], optimistic(previous, action, temporaryId, new Date().toISOString()));
      return { previous, temporaryId };
    },
    onError: (error, _action, context) => {
      if (context) client.setQueryData([key], context.previous);
      toast.error(error.message || 'Could not save the change. Please try again.');
    },
    onSuccess: (result, action, context) => {
      client.setQueryData<Item[]>([key], (items = []) => replace(items, action, context.temporaryId, result));
    },
  });
  const { mutateAsync } = mutation;
  const run = useCallback(async (action: Action) => {
    if (locked.current) return false;
    locked.current = true;
    try { await mutateAsync(action); return true; }
    catch { return false; }
    finally { locked.current = false; }
  }, [mutateAsync]);
  return { run, pending: mutation.isPending, error: mutation.error?.message, reset: mutation.reset };
}
