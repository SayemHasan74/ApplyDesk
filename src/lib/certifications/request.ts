import { apiRequest } from '../api/client';
import { MAX_LIST } from '../constants';
import type { CertAction } from './mutations';

export async function fetchCerts() {
  const { z } = await import('zod');
  const { certItemSchema } = await import('./items');
  return z.object({ items: z.array(certItemSchema).max(MAX_LIST) }).strict().parse(await apiRequest('/api/certifications')).items;
}
export async function sendCertAction(action: CertAction) {
  const { actionSchema } = await import('./actions');
  const { certItemSchema } = await import('./items');
  action = actionSchema.parse(action);
  const data = await apiRequest(action.kind === 'create' ? '/api/certifications' : `/api/certifications/${action.id}`,
    action.kind === 'create' ? 'POST' : action.kind === 'update' ? 'PATCH' : 'DELETE', action.kind === 'delete' ? {} : action.input);
  return action.kind === 'delete' ? null : certItemSchema.parse(data);
}
