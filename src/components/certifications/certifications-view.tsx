'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { CERT_STATUSES, type CertStatus } from '@/lib/constants';
import { todayDhaka } from '@/lib/dates';
import { visibleCerts } from '@/lib/certifications/view';
import { fetchCerts } from '@/lib/certifications/request';
import type { CertItem } from '@/lib/certifications/items';
import { certCreateSchema, certPatchSchema, type CertCreate, type CertPatch } from '@/lib/validators/certification';
import { Button } from '@/components/ui/button';
import { CertRow } from './cert-row';
import { CertSheet } from './cert-sheet';
import { ConfirmDelete } from '@/components/ui/confirm-delete';
import { useCertMutations } from './use-cert-mutations';

export function CertificationsView({ initialData }: { initialData: CertItem[] }) {
  const { data: items } = useQuery({ queryKey: ['certifications'], queryFn: fetchCerts, initialData, refetchOnMount: false });
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('all');
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { run, pending, error, reset } = useCertMutations();
  useEffect(() => { const timer = setTimeout(() => setDebounced(search), 200); return () => clearTimeout(timer); }, [search]);
  const today = useMemo(() => todayDhaka(), []);
  const shown = useMemo(() => visibleCerts(items, debounced, status), [items, debounced, status]);
  const selected = editing === 'new' ? undefined : items.find((cert) => cert.id === editing);
  const removed = items.find((cert) => cert.id === deleting);
  const open = useCallback((id: string) => { reset(); setEditing(id); }, [reset]);
  const close = useCallback(() => setEditing(null), []);
  const closeDelete = useCallback(() => setDeleting(null), []);
  const askDelete = useCallback((id: string) => { reset(); setDeleting(id); }, [reset]);
  const changeStatus = useCallback((id: string, next: CertStatus) => { void run({ kind: 'update', id, input: { status: next } }); }, [run]);
  const save = useCallback((values: CertCreate | CertPatch) => editing === 'new'
    ? run({ kind: 'create', input: certCreateSchema.parse(values) })
    : run({ kind: 'update', id: editing ?? '', input: certPatchSchema.parse(values) }), [editing, run]);
  const remove = useCallback(async () => { if (deleting && await run({ kind: 'delete', id: deleting })) setDeleting(null); }, [deleting, run]);
  return <div className="space-y-6">
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between"><h1 className="page-title">Certifications <span className="ml-2 font-sans text-sm font-normal text-muted-foreground">{items.length} tracked</span></h1><Button onClick={() => open('new')} disabled={pending} className="min-h-11"><Plus className="size-4" aria-hidden="true" />Add certification</Button></div>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <label className="flex min-h-11 flex-1 items-center gap-3 border-b-2 border-foreground"><Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="sr-only">Search name or provider</span><input type="search" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" placeholder="Search name or provider" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <label className="flex items-center gap-3 text-sm text-muted-foreground">Status<select className="form-control w-full sm:w-44" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{CERT_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
    </div>
    <p className="sr-only" role="status">{shown.length} certifications shown</p>
    {items.length === 0 ? <div className="border-y py-16 text-center"><h2 className="text-xl font-semibold">No certifications yet. Add your first certification.</h2><Button className="mt-5 min-h-11" onClick={() => open('new')} disabled={pending}>Add certification</Button></div>
      : shown.length === 0 ? <p className="border-y py-12 text-center text-muted-foreground">No certifications match your search or status filter.</p>
        : <table className="w-full table-fixed text-left"><caption className="sr-only">Your tracked certifications. Select a row to edit its details.</caption><colgroup><col className="w-auto md:w-[28%]" /><col className="hidden md:table-column md:w-[13%]" /><col className="w-[24%] md:w-[12%]" /><col className="hidden md:table-column md:w-[13%]" /><col className="w-[28%] md:w-[18%]" /><col className="hidden md:table-column md:w-[10%]" /><col className="w-11" /></colgroup>
          <thead className="border-b-2 border-foreground text-xs text-muted-foreground"><tr><th scope="col" className="pb-3 font-medium">Name / Provider</th><th scope="col" className="hidden pb-3 font-medium md:table-cell">Registration deadline</th><th scope="col" className="pb-3 font-medium">Days left</th><th scope="col" className="hidden pb-3 font-medium md:table-cell">Cost</th><th scope="col" className="pb-3 font-medium">Status</th><th scope="col" className="hidden pb-3 font-medium md:table-cell">Progress</th><th scope="col"><span className="sr-only">Delete</span></th></tr></thead>
          <tbody>{shown.map((cert) => <CertRow key={cert.id} cert={cert} today={today} pending={pending} onOpen={open} onDelete={askDelete} onStatus={changeStatus} />)}</tbody>
        </table>}
    {editing && <CertSheet key={editing} cert={selected} pending={pending} error={error} onClose={close} onSave={save} />}
    {removed && <ConfirmDelete title="Delete this certification?" description="This certification will be permanently removed from your list." pending={pending} onClose={closeDelete} onConfirm={remove} />}
  </div>;
}
