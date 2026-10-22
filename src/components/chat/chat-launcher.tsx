'use client';
import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Role } from '@/lib/constants';

const loadPanel = () => import('./chat-panel');
const preloadPanel = () => { void loadPanel().catch(() => toast.error('Could not load the assistant. Try opening it again.', { id: 'chat-load' })); };
const ChatPanel = dynamic(loadPanel, { ssr: false, loading: () => <div className="fixed right-0 top-0 z-50 flex h-dvh w-full items-center justify-center border-l bg-card text-sm sm:w-[400px]" role="status">Opening assistant…</div> });
export function ChatLauncher({ role, icon }: { role: Role; icon: React.ReactNode }) {
  const [mounted, setMounted] = useState(false), [open, setOpen] = useState(false), button = useRef<HTMLButtonElement>(null);
  function close() { setOpen(false); requestAnimationFrame(() => button.current?.focus()); }
  return <><button ref={button} type="button" className="chat-launcher" aria-label="Open ApplyDesk assistant" aria-haspopup="dialog" aria-expanded={open} hidden={open} onMouseEnter={preloadPanel} onFocus={preloadPanel} onClick={() => { setMounted(true); setOpen(true); }}>{icon}</button>
    {mounted && <ChatPanel open={open} role={role} onClose={close} />}
  </>;
}
