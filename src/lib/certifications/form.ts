import { certCreateSchema, certPatchSchema, type CertPatch } from '../validators/certification';
import type { CertItem } from './items';

export type CertForm = { [K in keyof CertPatch]-?: string };
export type CertField = keyof CertForm;
export function toCertForm(cert?: CertItem): CertForm {
  const defaults = certCreateSchema.parse({ name: 'Name', provider: 'Provider' });
  return Object.fromEntries((Object.keys(certPatchSchema.shape) as CertField[]).map((key) => {
    const value = cert ? cert[key] : key === 'name' || key === 'provider' ? '' : defaults[key];
    return [key, Array.isArray(value) ? value.join('\n') : value === null ? '' : String(value)];
  })) as CertForm;
}
export function formInput(form: CertForm) {
  return Object.fromEntries(Object.entries(form).map(([key, value]) => {
    if (key === 'prerequisites' || key === 'sourceUrls') return [key, value.split('\n').map((line) => line.trim()).filter(Boolean)];
    if (key === 'progressPercent') return [key, value.trim() ? Number(value) : Number.NaN];
    return [key, value === '' && !['name', 'provider', 'notes'].includes(key) ? null : value];
  }));
}
export function changedCertFields(cert: CertItem, form: CertForm) {
  const values = certPatchSchema.parse(formInput(form));
  return certPatchSchema.parse(Object.fromEntries(Object.entries(values).filter(([key, value]) => JSON.stringify(cert[key as CertField]) !== JSON.stringify(value))));
}
