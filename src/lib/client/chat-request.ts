import { z } from 'zod';
import { aiResponseSchema, applyResponseSchema, historySchema, undoResponseSchema, usageSchema } from './ai-contract';
import type { ActionItem } from '../actions/schema';

const failureSchema = z.object({ ok: z.literal(false), error: z.object({ code: z.string().max(120), message: z.string().max(4000) }).strict() }).strict();
export class ChatRequestError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
}
async function read<T extends z.ZodType>(response: Response, schema: T): Promise<z.output<T>> {
  const value: unknown = await response.json();
  const failure = failureSchema.safeParse(value);
  if (failure.success) throw new ChatRequestError(failure.data.error.code, failure.data.error.message);
  if (!response.ok) throw new Error('Request failed. Please try again.');
  const envelope = z.object({ ok: z.literal(true), data: z.unknown() }).strict().parse(value);
  return schema.parse(envelope.data);
}
export async function loadChat() {
  const [history, usage] = await Promise.all([
    fetch('/api/chat/history', { cache: 'no-store' }).then((response) => read(response, historySchema)),
    fetch('/api/ai/usage', { cache: 'no-store' }).then((response) => read(response, usageSchema)),
  ]);
  return { history, usage };
}
export async function sendChat(body: FormData, signal: AbortSignal) {
  return read(await fetch('/api/ai/chat', { method: 'POST', body, signal, cache: 'no-store' }), aiResponseSchema);
}
export async function applyChatItems(items: ActionItem[]) {
  return read(await fetch('/api/actions/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }), cache: 'no-store' }), applyResponseSchema);
}
export async function undoChatBatch(batchId?: string) {
  return read(await fetch('/api/actions/undo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(batchId ? { batchId } : {}), cache: 'no-store' }), undoResponseSchema);
}
export function chatError(error: unknown) {
  return error instanceof ChatRequestError ? error.message : error instanceof z.ZodError ? 'The response could not be read. Please try again.' : error instanceof TypeError ? 'Connection failed. Please try again.' : error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
