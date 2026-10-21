import { z } from 'zod';
import { certCreateSchema, certPatchSchema } from '../validators/certification';
import { objectId } from '../validators/fields';
import { todayDhaka } from '../dates';
import { MAX_LIST } from '../constants';
import { certItemSchema, type CertItem } from './items';
import { applyCertStatusEffects } from './effects';

const actionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('create'), input: certCreateSchema }).strict(),
  z.object({ kind: z.literal('update'), id: objectId, input: certPatchSchema }).strict(),
  z.object({ kind: z.literal('delete'), id: objectId }).strict(),
]);
export type CertAction = z.infer<typeof actionSchema>;
export function optimisticCerts(items: CertItem[], action: CertAction, temporaryId: string, now: string) {
  action = actionSchema.parse(action);
  if (action.kind === 'delete') return items.filter((item) => item.id !== action.id);
  if (action.kind === 'create') return [certItemSchema.parse({ ...action.input,
    ...applyCertStatusEffects({ completedAt: null, progressPercent: 0 }, action.input, todayDhaka()),
    id: temporaryId, createdAt: now, updatedAt: now,
  }), ...items].slice(0, MAX_LIST);
  return items.map((item) => item.id === action.id ? certItemSchema.parse({ ...item,
    ...applyCertStatusEffects(item, action.input, todayDhaka()), updatedAt: now,
  }) : item);
}
export function replaceCert(items: CertItem[], action: CertAction, temporaryId: string, result: CertItem | null) {
  if (!result) return items;
  return items.map((item) => item.id === (action.kind === 'create' ? temporaryId : action.id) ? result : item);
}
