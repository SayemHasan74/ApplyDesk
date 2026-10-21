'use client';

import { useCallback, useRef, useState } from 'react';
import type { CertItem } from '@/lib/certifications/items';
import { changedCertFields, formInput, toCertForm, type CertField } from '@/lib/certifications/form';
import { certCreateSchema, certPatchSchema, type CertCreate, type CertPatch } from '@/lib/validators/certification';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { CertFields } from './cert-fields';

export function CertSheet({ cert, pending, error, onClose, onSave }: {
  cert?: CertItem; pending: boolean; error?: string; onClose: () => void;
  onSave: (values: CertCreate | CertPatch) => Promise<boolean>;
}) {
  const [values, setValues] = useState(() => toCertForm(cert));
  const [errors, setErrors] = useState<Partial<Record<CertField, string>>>({});
  const summary = useRef<HTMLDivElement>(null);
  const change = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const result = (cert ? certPatchSchema : certCreateSchema).safeParse(formInput(values));
    if (!result.success) {
      const next: Partial<Record<CertField, string>> = {};
      for (const issue of result.error.issues) { const field = issue.path[0] as CertField; next[field] ??= issue.message; }
      setErrors(next);
      requestAnimationFrame(() => summary.current?.focus());
      return;
    }
    const success = await onSave(cert ? changedCertFields(cert, values) : certCreateSchema.parse(result.data));
    if (success) onClose();
  }
  return <Sheet open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
    <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-2xl" showCloseButton={!pending}>
      <SheetHeader className="border-b p-6"><SheetTitle className="text-2xl">{cert ? 'Edit certification' : 'Add certification'}</SheetTitle><SheetDescription>Certification details stay private to your account. Dates use Dhaka time.</SheetDescription></SheetHeader>
      <form onSubmit={submit} noValidate className="space-y-6 p-6">
        {Object.values(errors).some(Boolean) && <div ref={summary} tabIndex={-1} role="alert" className="rounded border border-destructive p-3 text-sm"><p className="mb-2 font-semibold">Please check these fields:</p>{Object.entries(errors).filter(([, message]) => message).map(([field, message]) => <a className="block underline" key={field} href={`#cert-${field}`}>{message}</a>)}</div>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <CertFields values={values} errors={errors} onChange={change} pending={pending} />
        <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-card py-4"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending || (!!cert && JSON.stringify(values) === JSON.stringify(toCertForm(cert)))}>{pending ? 'Saving…' : cert ? 'Save changes' : 'Add certification'}</Button></div>
      </form>
    </SheetContent>
  </Sheet>;
}
