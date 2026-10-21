'use client';

import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from './alert-dialog';
import { Button } from './button';

export function ConfirmDelete({ title, description, pending, onClose, onConfirm }: {
  title: string; description: string; pending: boolean; onClose: () => void; onConfirm: () => void;
}) {
  return <AlertDialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel><Button type="button" variant="destructive" onClick={onConfirm} disabled={pending}>{pending ? 'Deleting…' : 'Delete'}</Button></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
