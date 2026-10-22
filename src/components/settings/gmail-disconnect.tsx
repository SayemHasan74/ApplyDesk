'use client';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/api/client';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';

export default function GmailDisconnect({ onClose, onDisconnected }: { onClose: () => void; onDisconnected: () => void }) {
  const [pending, setPending] = useState(false), locked = useRef(false);
  async function disconnect() {
    if (locked.current) return; locked.current = true; setPending(true);
    try { await apiRequest('/api/gmail/disconnect', 'POST'); toast.success('Gmail disconnected'); onDisconnected(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not disconnect Gmail'); }
    finally { locked.current = false; setPending(false); }
  }
  return <AlertDialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Disconnect Gmail?</AlertDialogTitle><AlertDialogDescription>Stop reading email and remove the saved connection. Existing suggestions remain available.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel><AlertDialogAction disabled={pending} onClick={(event) => { event.preventDefault(); void disconnect(); }}>{pending ? 'Disconnecting…' : 'Disconnect'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}
