'use client';

import { useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { JobItem } from '@/lib/jobs/items';
import { optimisticJobs, replaceOptimisticJob, type JobAction } from '@/lib/jobs/mutations';

export function useJobMutations(today: string) {
  const client = useQueryClient();
  const locked = useRef(false);
  const mutation = useMutation({
    mutationFn: async (action: JobAction) => (await import('@/lib/jobs/request')).sendJobAction(action),
    retry: false,
    onMutate: async (action) => {
      await client.cancelQueries({ queryKey: ['jobs'] });
      const previous = client.getQueryData<JobItem[]>(['jobs']) ?? [];
      const temporaryId = crypto.randomUUID().replaceAll('-', '').slice(0, 24);
      client.setQueryData(['jobs'], optimisticJobs(previous, action, temporaryId, new Date().toISOString(), today));
      return { previous, temporaryId };
    },
    onError: (error, _action, context) => {
      if (context) client.setQueryData(['jobs'], context.previous);
      toast.error(error.message || 'Could not save the change. Please try again.');
    },
    onSuccess: (result, action, context) => {
      client.setQueryData<JobItem[]>(['jobs'], (items = []) => replaceOptimisticJob(items, action, context.temporaryId, result));
    },
  });
  const { mutateAsync } = mutation;
  const run = useCallback(async (action: JobAction) => {
    if (locked.current) return false;
    locked.current = true;
    try { await mutateAsync(action); return true; }
    catch { return false; }
    finally { locked.current = false; }
  }, [mutateAsync]);
  return { run, pending: mutation.isPending, error: mutation.error?.message, reset: mutation.reset };
}
