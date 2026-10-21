import type { CertPatch } from '../validators/certification';

export function applyCertStatusEffects(current: { completedAt: string | null; progressPercent: number }, patch: CertPatch, today: string): CertPatch {
  const result = { ...patch };
  if (patch.status === 'completed') {
    if (!(patch.completedAt === undefined ? current.completedAt : patch.completedAt)) result.completedAt = today;
    if (patch.progressPercent === undefined && current.progressPercent < 100) result.progressPercent = 100;
  }
  return result;
}
