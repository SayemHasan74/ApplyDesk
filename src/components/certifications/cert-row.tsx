'use client';

import { memo, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { CERT_STATUSES, type CertStatus } from '@/lib/constants';
import type { CertItem } from '@/lib/certifications/items';
import { formatDisplay } from '@/lib/dates';
import { ExpandableText } from '@/components/ui/expandable-text';
import { CertProgress } from './cert-progress';
import { CertDeadlineBadge } from './deadline-badge';

export const CertRow = memo(function CertRow({ cert, today, pending, onOpen, onDelete, onStatus }: {
  cert: CertItem; today: string; pending: boolean;
  onOpen: (id: string) => void; onDelete: (id: string) => void; onStatus: (id: string, status: CertStatus) => void;
}) {
  const open = useCallback(() => { if (!pending) onOpen(cert.id); }, [cert.id, onOpen, pending]);
  const change = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => onStatus(cert.id, event.target.value as CertStatus), [cert.id, onStatus]);
  const remove = useCallback(() => onDelete(cert.id), [cert.id, onDelete]);
  const rowClick = useCallback((event: React.MouseEvent<HTMLTableRowElement>) => {
    if (event.target instanceof Element && !event.target.closest('button,select,a,input,textarea')) open();
  }, [open]);
  const rowKey = useCallback((event: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) { event.preventDefault(); open(); }
  }, [open]);
  return <tr className="h-44 cursor-pointer border-b transition-colors last:border-0 hover:bg-card/70" tabIndex={pending ? -1 : 0} aria-label={`Edit ${cert.name}, ${cert.provider}`} onClick={rowClick} onKeyDown={rowKey}>
    <td className="min-w-0 py-5 pr-4 align-top">
      <div className="font-semibold"><ExpandableText text={cert.name} lines={2} /></div>
      <div className="text-sm text-muted-foreground"><ExpandableText text={cert.provider} lines={2} /></div>
      <div className="mt-2 text-xs text-muted-foreground md:hidden">{cert.registrationDeadline ? formatDisplay(cert.registrationDeadline) : <i>No deadline listed</i>}</div>
      {cert.deadlineNote && <div className="mt-1 text-xs text-muted-foreground"><ExpandableText text={cert.deadlineNote} lines={2} /></div>}
      <div className="mt-2 md:hidden"><CertProgress value={cert.progressPercent} /></div>
      {cert.descriptionSummary && <div className="mt-2 text-xs leading-relaxed text-muted-foreground"><ExpandableText text={cert.descriptionSummary} lines={2} /></div>}
    </td>
    <td className="hidden py-5 pr-4 align-top text-sm md:table-cell">{cert.registrationDeadline ? formatDisplay(cert.registrationDeadline) : <i className="text-muted-foreground">No deadline listed</i>}</td>
    <td className="py-5 pr-2 align-top"><CertDeadlineBadge cert={cert} today={today} /></td>
    <td className="hidden py-5 pr-4 align-top text-sm md:table-cell">{cert.costText ? <ExpandableText text={cert.costText} lines={2} /> : <i className="text-muted-foreground">Not found</i>}</td>
    <td className="py-5 align-top"><select className="form-control min-w-0 px-1 text-xs sm:px-2 sm:text-sm" aria-label={`Status for ${cert.name}, ${cert.provider}`} value={cert.status} onChange={change} disabled={pending}>
      {CERT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
    </select></td>
    <td className="hidden py-5 px-2 align-top md:table-cell"><CertProgress value={cert.progressPercent} /></td>
    <td className="py-5 pl-1 align-top"><button type="button" className="flex size-11 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-destructive" onClick={remove} disabled={pending} aria-label={`Delete ${cert.name}, ${cert.provider}`}><Trash2 className="size-4" aria-hidden="true" /></button></td>
  </tr>;
});
