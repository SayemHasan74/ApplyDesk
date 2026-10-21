'use client';

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { JobItem } from '@/lib/jobs/items';
import { optimisticJobs, replaceOptimisticJob, type JobAction } from '@/lib/jobs/mutations';
import { sendJobAction } from '@/lib/jobs/request';

export function useJobMutations() {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: sendJobAction,
    retry: false,
    onMutate: async (action) => {
      await client.cancelQueries({ queryKey: ['jobs'] });
      const previous = client.getQueryData<JobItem[]>(['jobs']) ?? [];
      const temporaryId = crypto.randomUUID().replaceAll('-', '').slice(0, 24);
      client.setQueryData(['jobs'], optimisticJobs(previous, action, temporaryId, new Date().toISOString()));
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
    try { await mutateAsync(action); return true; }
    catch { return false; }
  }, [mutateAsync]);
  return { run, pending: mutation.isPending, error: mutation.error?.message, reset: mutation.reset };
}
