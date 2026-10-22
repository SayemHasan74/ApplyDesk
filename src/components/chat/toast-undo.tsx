'use client';
import { useRef, useState } from 'react';

export function ToastUndo({ onUndo }: { onUndo: () => Promise<unknown> }) {
  const [pending, setPending] = useState(false), locked = useRef(false);
  return <button type="button" className="min-h-11 px-3 font-semibold underline" disabled={pending} onClick={async () => {
    if (locked.current) return; locked.current = true; setPending(true);
    try { await onUndo(); } finally { locked.current = false; setPending(false); }
  }}>{pending ? 'Reverting…' : 'Undo'}</button>;
}
