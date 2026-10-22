'use client';
import { useEffect, useRef } from 'react';
import { CHAT_EXAMPLE_COMMANDS, DEMO_CHAT_EXAMPLES } from '@/lib/constants';
import type { ChatMessage } from '@/lib/client/ai-contract';
import type { useChatActions } from './use-chat-actions';
import { MessageBubble } from './message-bubble';

export function MessageList({ messages, loading, pending, demoLimited, actions }: {
  messages: ChatMessage[]; loading: boolean; pending: boolean; demoLimited: boolean; actions: ReturnType<typeof useChatActions>;
}) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [messages.length, pending]);
  return <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4" role="log" aria-label="Chat messages" aria-busy={pending || loading}>
    {loading ? <p role="status" className="py-6 text-sm text-muted-foreground">Loading your conversation…</p> : !messages.length && <div className="space-y-4 py-5 text-sm"><h3 className="font-semibold">What would you like to track?</h3><p className="text-muted-foreground">Send a message, screenshot, or voice note. Review every proposed change before saving.</p><ul className="space-y-2">{CHAT_EXAMPLE_COMMANDS.map((text) => <li className="rounded border bg-background p-3 text-xs" key={text}>{text}</li>)}</ul></div>}
    <div className="space-y-4">{messages.map((message) => <MessageBubble key={message.id} message={message} actions={actions} pending={pending} />)}</div>
    {pending && <p role="status" className="mt-4 text-sm text-muted-foreground">ApplyDesk is thinking…</p>}
    {demoLimited && <details className="mt-4 rounded border p-3 text-sm"><summary className="min-h-11 py-2 font-medium">See what the AI does</summary><div className="mt-3 space-y-3">{DEMO_CHAT_EXAMPLES.map(([user, assistant]) => <div key={user} className="space-y-2"><p className="rounded bg-muted p-3"><strong>You:</strong> {user}</p><p className="rounded border p-3"><strong>ApplyDesk:</strong> {assistant}</p></div>)}</div></details>}
    <div ref={end} />
  </div>;
}
