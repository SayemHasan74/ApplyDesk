'use client';

import type { JobItem } from '@/lib/jobs/items';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export function DeleteJobDialog({ job, pending, onClose, onConfirm }: { job: JobItem; pending: boolean; onClose: () => void; onConfirm: () => void }) {
  return <AlertDialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this job?</AlertDialogTitle><AlertDialogDescription>The role at {job.company} will be permanently removed from your list.</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel><Button type="button" variant="destructive" onClick={onConfirm} disabled={pending}>{pending ? 'Deleting…' : 'Delete job'}</Button></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
