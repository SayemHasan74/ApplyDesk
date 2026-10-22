import { certDedupeKey } from '../dedupe';
import { certCreateSchema, certPatchSchema, type CertCreate, type CertPatch } from '../validators/certification';
import { applyCertStatusEffects } from './effects';

export function prepareCertCreate(input: CertCreate, today: string) {
  const values = certCreateSchema.parse(input);
  return { ...values, ...applyCertStatusEffects({ completedAt: null, progressPercent: 0 }, values, today), dedupeKey: certDedupeKey(values.provider, values.name) };
}
export function prepareCertPatch(current: Pick<CertCreate, 'provider' | 'name' | 'completedAt' | 'progressPercent'>, patch: CertPatch, today: string) {
  const values = certPatchSchema.parse(patch);
  const changes: CertPatch & { dedupeKey?: string } = applyCertStatusEffects(current, values, today);
  if (values.provider !== undefined || values.name !== undefined) changes.dedupeKey = certDedupeKey(values.provider ?? current.provider, values.name ?? current.name);
  return changes;
}
