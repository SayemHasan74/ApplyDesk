import { formatInTimeZone } from 'date-fns-tz';
import { TIMEZONE } from '../constants';
import { jobCreateSchema, jobPatchSchema, type JobPatch } from '../validators/job';
import type { JobItem } from './items';

export type JobForm = { [K in keyof JobPatch]-?: string };
export type JobField = keyof JobForm;

export function toJobForm(job?: JobItem): JobForm {
  return Object.fromEntries((Object.keys(jobPatchSchema.shape) as JobField[]).map((key) => {
    const fallback = jobCreateSchema.shape[key].safeParse(undefined);
    const value = job ? job[key] : fallback.success ? fallback.data : '';
    if (key === 'interviewAt' && typeof value === 'string' && value) return [key, formatInTimeZone(value, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss")];
    return [key, Array.isArray(value) ? value.join('\n') : value ?? ''];
  })) as JobForm;
}

export function formInput(form: JobForm) {
  return Object.fromEntries(Object.entries(form).map(([key, value]) => {
    if (key === 'requirements' || key === 'sourceUrls') return [key, value.split('\n').map((line) => line.trim()).filter(Boolean)];
    if (key === 'interviewAt') return [key, value ? `${value.length === 16 ? `${value}:00` : value}+06:00` : null];
    return [key, value === '' && !['company', 'role', 'notes'].includes(key) ? null : value];
  }));
}

export function changedJobFields(job: JobItem, form: JobForm) {
  const values = jobPatchSchema.parse(formInput(form));
  return jobPatchSchema.parse(Object.fromEntries(Object.entries(values).filter(([key, value]) => {
    if (key === 'interviewAt' && typeof value === 'string' && job.interviewAt) return Date.parse(value) !== Date.parse(job.interviewAt);
    return JSON.stringify(job[key as JobField]) !== JSON.stringify(value);
  })));
}
