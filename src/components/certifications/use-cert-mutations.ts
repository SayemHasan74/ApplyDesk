'use client';

import { useOptimisticList } from '@/components/use-optimistic-list';
import { sendCertAction } from '@/lib/certifications/request';
import { optimisticCerts, replaceCert } from '@/lib/certifications/mutations';

export function useCertMutations() {
  return useOptimisticList({ key: 'certifications', request: sendCertAction, optimistic: optimisticCerts, replace: replaceCert });
}
