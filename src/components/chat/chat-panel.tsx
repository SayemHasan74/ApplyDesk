'use client';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { Role } from '@/lib/constants';
import { useChatSession } from './use-chat-session';
import { useChatActions } from './use-chat-actions';
import { MessageList } from './message-list';
import { Composer } from './composer';

export default function ChatPanel({ open, role, onClose }: { open: boolean; role: Role; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), session = useChatSession(role), actions = useChatActions(session.pending);
  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
    if (!open && element?.open) element.close();
  }, [open]);
  return <dialog ref={dialog} className="chat-panel" aria-labelledby="chat-panel-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => {
    if (event.target === dialog.current && event.clientX < dialog.current.getBoundingClientRect().left) onClose();
    if (event.target instanceof Element && event.target.closest('a[href^="/"]')) onClose();
  }}>
    <div className="flex h-full min-h-0 flex-col"><header className="flex items-center justify-between gap-3 border-b p-4"><div><h2 id="chat-panel-title" className="text-xl font-semibold">ApplyDesk assistant</h2><p className="mt-1 text-xs text-muted-foreground">Propose. Review. Confirm.</p></div><button type="button" className="chat-icon-button" aria-label="Close assistant" onClick={onClose}><X className="size-5" /></button></header>
      <MessageList messages={session.messages} loading={session.loading} pending={session.pending} demoLimited={session.demoLimited} actions={actions} />
      <Composer pending={session.pending} disabled={session.loading || Boolean(session.limit) || actions.pending} visible={open} remaining={session.remaining} limit={session.limit} onSend={session.send} onStop={session.stop} />
    </div>
  </dialog>;
}
