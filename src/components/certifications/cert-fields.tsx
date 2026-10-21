'use client';

import { CERT_FORMATS, CERT_STATUSES, COST_STATUSES, PRIORITIES } from '@/lib/constants';
import type { CertField, CertForm } from '@/lib/certifications/form';

export function CertFields({ values, errors, onChange, pending }: {
  values: CertForm; errors: Partial<Record<CertField, string>>; pending: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}) {
  const attrs = (name: CertField) => ({ id: `cert-${name}`, name, value: values[name], onChange, disabled: pending,
    'aria-invalid': !!errors[name], 'aria-describedby': errors[name] ? `cert-error-${name}` : undefined, className: 'form-control' });
  const input = (name: CertField, label: string, type = 'text', maxLength = 120) => <Field key={name} name={name} label={label} error={errors[name]}>
    <input {...attrs(name)} type={type} maxLength={maxLength} min={type === 'number' ? 0 : undefined} max={type === 'number' ? 100 : undefined} step={type === 'number' ? 1 : undefined} />
  </Field>;
  const select = (name: CertField, label: string, options: readonly string[]) => <Field key={name} name={name} label={label} error={errors[name]}>
    <select {...attrs(name)}>{options.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}</select>
  </Field>;
  const area = (name: CertField, label: string) => <Field key={name} name={name} label={label} error={errors[name]} wide>
    <textarea {...attrs(name)} rows={3} maxLength={name === 'sourceUrls' ? 40980 : name === 'prerequisites' ? 80020 : 4000} className="form-control min-h-24 resize-y" />
  </Field>;
  return <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
    {input('name', 'Name', 'text', 200)}{input('provider', 'Provider')}{input('track', 'Track')}{input('url', 'Certification URL', 'url', 2048)}
    {values.url && /^https?:\/\//i.test(values.url) && <a href={values.url} target="_blank" rel="noopener noreferrer" className="text-sm underline">Open certification link ↗</a>}
    {input('startDate', 'Start date', 'date')}{input('registrationDeadline', 'Registration deadline', 'date')}{area('deadlineNote', 'Deadline note')}
    {input('examDate', 'Exam date', 'date')}{select('costStatus', 'Cost', COST_STATUSES)}{area('costText', 'Cost details')}{input('durationText', 'Duration')}
    {select('format', 'Format', CERT_FORMATS)}{area('prerequisites', 'Prerequisites (one per line)')}{area('descriptionSummary', 'Description')}
    {select('status', 'Status', CERT_STATUSES)}{select('priority', 'Priority', PRIORITIES)}{input('progressPercent', 'Progress (%)', 'number')}
    {input('completedAt', 'Completed date', 'date')}{input('credentialUrl', 'Credential URL', 'url', 2048)}{input('validUntil', 'Valid until', 'date')}
    {area('notes', 'Notes')}{area('sourceUrls', 'Source URLs (one per line)')}
  </div>;
}
function Field({ name, label, error, children, wide }: { name: CertField; label: string; error?: string; children: React.ReactNode; wide?: boolean }) {
  return <div className={wide ? 'sm:col-span-2' : undefined}><label className="field-label" htmlFor={`cert-${name}`}>{label}</label>{children}{error && <p id={`cert-error-${name}`} className="mt-1 text-xs text-destructive">{error}</p>}</div>;
}
