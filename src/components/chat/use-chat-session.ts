'use client';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Role } from '@/lib/constants';
import type { ChatMessage } from '@/lib/client/ai-contract';
import { multipartInput } from '@/lib/client/ai-client';
import { chatError, ChatRequestError, loadChat, sendChat } from '@/lib/client/chat-request';

export function useChatSession(role: Role) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true), [pending, setPending] = useState(false), [limit, setLimit] = useState('');
  const initial = useRef<ReturnType<typeof loadChat> | null>(null), active = useRef(true), controller = useRef<AbortController | null>(null);
  const previews = useRef<string[]>([]);
  useEffect(() => {
    active.current = true;
    const urls = previews.current;
    initial.current ??= loadChat();
    void initial.current.then(({ history, usage }) => {
      if (!active.current) return;
      setMessages(history.map((message, index) => ({ ...message, id: `history-${index}` }))); setRemaining(usage.remaining);
      if (!usage.remaining) setLimit('No AI requests left today. Your manual lists still work.');
    }).catch((error: unknown) => { if (active.current) toast.error(chatError(error)); }).finally(() => { if (active.current) setLoading(false); });
    return () => { active.current = false; controller.current?.abort(); urls.forEach((url) => URL.revokeObjectURL(url)); };
  }, []);
  async function send(text: string, image?: File, audio?: File) {
    if (controller.current || limit || loading) return false;
    let body: FormData;
    try { body = multipartInput(text, image, audio); } catch (error) { toast.error(chatError(error)); return false; }
    const id = crypto.randomUUID(), abort = new AbortController(); controller.current = abort;
    const imageUrl = image ? URL.createObjectURL(image) : undefined; if (imageUrl) previews.current.push(imageUrl);
    setMessages((old) => [...old, { id, role: 'user', text, imageUrl }]); setPending(true);
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; abort.abort(); }, 40_000);
    try {
      const response = await sendChat(body, abort.signal);
      if (!active.current) return true;
      setRemaining(response.remaining);
      setMessages((old) => [...old.map((message) => message.id === id ? { ...message, transcript: response.transcript } : message), { id: crypto.randomUUID(), role: 'assistant', text: response.assistantMessage, response }]);
    } catch (error) {
      if (!active.current) return true;
      const message = abort.signal.aborted ? timedOut ? 'The AI took too long. Please try again or add it manually.' : 'Stopped. You can send another message.' : chatError(error);
      if (error instanceof ChatRequestError && error.code === 'AI_LIMIT') { setLimit(message); setRemaining(0); }
      toast.error(message);
      setMessages((old) => [...old, { id: crypto.randomUUID(), role: 'assistant', text: message }]);
    } finally { clearTimeout(timer); controller.current = null; if (active.current) setPending(false); }
    return true;
  }
  return { messages, remaining, loading, pending, limit, demoLimited: role === 'demo' && Boolean(limit), send, stop: () => controller.current?.abort() };
}
