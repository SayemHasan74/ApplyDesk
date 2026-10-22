import { MAX_LIST } from '../constants';
import type { CertItem } from './items';
import { applyCertStatusEffects } from './effects';

import type { CertAction } from './actions';
export type { CertAction } from './actions';

export function optimisticCerts(items: CertItem[], action: CertAction, temporaryId: string, now: string, today: string) {
  if (action.kind === 'delete') return items.filter((item) => item.id !== action.id);
  if (action.kind === 'create') return [{ ...action.input,
    ...applyCertStatusEffects({ completedAt: null, progressPercent: 0 }, action.input, today),
    id: temporaryId, createdAt: now, updatedAt: now,
  }, ...items].slice(0, MAX_LIST);
  return items.map((item) => item.id === action.id ? ({ ...item,
    ...applyCertStatusEffects(item, action.input, today), updatedAt: now,
  }) : item);
}
export function replaceCert(items: CertItem[], action: CertAction, temporaryId: string, result: CertItem | null) {
  if (!result) return items;
  return items.map((item) => item.id === (action.kind === 'create' ? temporaryId : action.id) ? result : item);
}
