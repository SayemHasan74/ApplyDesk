'use client';

import { useOptimisticList } from '@/components/use-optimistic-list';
import { optimisticCerts, replaceCert } from '@/lib/certifications/mutations';
import { useCallback } from 'react';
import type { CertItem } from '@/lib/certifications/items';
import type { CertAction } from '@/lib/certifications/mutations';

export function useCertMutations(today: string) {
  const optimistic = useCallback((items: CertItem[], action: CertAction, id: string, now: string) => optimisticCerts(items, action, id, now, today), [today]);
  return useOptimisticList({ key: 'certifications', request: async (action: CertAction) => (await import('@/lib/certifications/request')).sendCertAction(action), optimistic, replace: replaceCert });
}
