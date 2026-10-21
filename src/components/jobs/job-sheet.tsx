'use client';

import { useCallback, useRef, useState } from 'react';
import type { JobItem } from '@/lib/jobs/items';
import { changedJobFields, formInput, toJobForm, type JobField } from '@/lib/jobs/form';
import { jobCreateSchema, jobPatchSchema, type JobCreate, type JobPatch } from '@/lib/validators/job';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { JobFields } from './job-fields';

export function JobSheet({ job, pending, error, onClose, onSave }: {
  job?: JobItem; pending: boolean; error?: string; onClose: () => void;
  onSave: (values: JobCreate | JobPatch) => Promise<boolean>;
}) {
  const [values, setValues] = useState(() => toJobForm(job));
  const [errors, setErrors] = useState<Partial<Record<JobField, string>>>({});
  const summary = useRef<HTMLDivElement>(null);
  const change = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const result = (job ? jobPatchSchema : jobCreateSchema).safeParse(formInput(values));
    if (!result.success) {
      const next: Partial<Record<JobField, string>> = {};
      for (const issue of result.error.issues) { const field = issue.path[0] as JobField; next[field] ??= issue.message; }
      setErrors(next);
      requestAnimationFrame(() => summary.current?.focus());
      return;
    }
    const success = await onSave(job ? changedJobFields(job, values) : jobCreateSchema.parse(result.data));
    if (success) onClose();
  }
  return <Sheet open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
    <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-2xl" showCloseButton={!pending}>
      <SheetHeader className="border-b p-6"><SheetTitle className="text-2xl">{job ? 'Edit job' : 'Add job'}</SheetTitle><SheetDescription>Job details stay private to your account. Dates and interview times use Dhaka time.</SheetDescription></SheetHeader>
      <form onSubmit={submit} noValidate className="space-y-6 p-6">
        {Object.values(errors).some(Boolean) && <div ref={summary} tabIndex={-1} role="alert" className="rounded border border-destructive p-3 text-sm"><p className="mb-2 font-semibold">Please check these fields:</p>{Object.entries(errors).filter(([, message]) => message).map(([field, message]) => <a className="block underline" key={field} href={`#job-${field}`}>{message}</a>)}</div>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <JobFields values={values} errors={errors} onChange={change} pending={pending} />
        <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-card py-4"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending || (!!job && JSON.stringify(values) === JSON.stringify(toJobForm(job)))}>{pending ? 'Saving…' : job ? 'Save changes' : 'Add job'}</Button></div>
      </form>
    </SheetContent>
  </Sheet>;
}
