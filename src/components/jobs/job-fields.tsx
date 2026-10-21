'use client';

import { COMP_STATUSES, JOB_STATUSES, JOB_TYPES, PRIORITIES, WORK_MODES } from '@/lib/constants';
import type { JobField, JobForm } from '@/lib/jobs/form';

export function JobFields({ values, errors, onChange, pending }: {
  values: JobForm; errors: Partial<Record<JobField, string>>; pending: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}) {
  const select = (name: JobField, label: string, options: readonly string[]) => <Field key={name} name={name} label={label} error={errors[name]}>
    <select id={`job-${name}`} name={name} className="form-control" value={values[name]} onChange={onChange} disabled={pending} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `error-${name}` : undefined}>{options.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}</select>
  </Field>;
  const input = (name: JobField, label: string, type = 'text', maxLength = 120) => <Field key={name} name={name} label={label} error={errors[name]}>
    <input id={`job-${name}`} name={name} type={type} step={type === 'datetime-local' ? 1 : undefined} className="form-control" maxLength={maxLength} value={values[name]} onChange={onChange} disabled={pending} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `error-${name}` : undefined} />
  </Field>;
  const area = (name: JobField, label: string) => <Field key={name} name={name} label={label} error={errors[name]} wide>
    <textarea id={`job-${name}`} name={name} className="form-control min-h-24 resize-y" rows={3} maxLength={name === 'sourceUrls' ? 40980 : name === 'requirements' ? 80020 : 4000} value={values[name]} onChange={onChange} disabled={pending} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `error-${name}` : undefined} />
  </Field>;
  return <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
    {input('company', 'Company')}{input('role', 'Role', 'text', 200)}
    {select('jobType', 'Job type', JOB_TYPES)}{select('workMode', 'Work mode', WORK_MODES)}
    {input('location', 'Location')}{select('status', 'Status', JOB_STATUSES)}
    {input('openDate', 'Open date', 'date')}{input('deadline', 'Deadline', 'date')}
    {area('deadlineNote', 'Deadline note')}{select('compensationStatus', 'Compensation', COMP_STATUSES)}{select('priority', 'Priority', PRIORITIES)}
    {area('compensationText', 'Compensation details')}{input('applyUrl', 'Application URL', 'url', 2048)}
    {values.applyUrl && /^https?:\/\//i.test(values.applyUrl) && <a className="self-center text-sm underline underline-offset-4" href={values.applyUrl} target="_blank" rel="noopener noreferrer">Open application link ↗</a>}
    {area('sourceUrls', 'Source URLs (one per line)')}{area('descriptionSummary', 'Description')}
    {area('requirements', 'Requirements (one per line)')}{area('eligibility', 'Eligibility')}
    {input('appliedAt', 'Applied date', 'date')}{input('interviewAt', 'Interview time (Dhaka)', 'datetime-local')}
    {area('notes', 'Notes')}
  </div>;
}

function Field({ name, label, error, children, wide }: { name: JobField; label: string; error?: string; children: React.ReactNode; wide?: boolean }) {
  return <div className={wide ? 'sm:col-span-2' : undefined}><label className="field-label" htmlFor={`job-${name}`}>{label}</label>{children}{error && <p id={`error-${name}`} className="mt-1 text-xs text-destructive">{error}</p>}</div>;
}
