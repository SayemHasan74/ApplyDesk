import { afterEach, expect, it, vi } from 'vitest';
import { applyChatItems, loadChat, sendChat, undoChatBatch } from './chat-request';

afterEach(() => vi.unstubAllGlobals());
it('loads history and usage in parallel once and makes a single multipart call per send', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ ok: true, data: [] })).mockResolvedValueOnce(Response.json({ ok: true, data: { remaining: 2, limit: 2, scope: 'demo' } }));
  vi.stubGlobal('fetch', fetcher); const pending = loadChat(); expect(fetcher).toHaveBeenCalledTimes(2); expect((await pending).usage.remaining).toBe(2);
  fetcher.mockClear(); fetcher.mockResolvedValue(Response.json({ ok: true, data: { intent: 'chat', assistantMessage: 'Hello', transcript: null, proposals: [], queryResult: null, remaining: 1 } }));
  const body = new FormData(), controller = new AbortController(); body.set('text', 'Hello');
  await sendChat(body, controller.signal); expect(fetcher).toHaveBeenCalledExactlyOnceWith('/api/ai/chat', { method: 'POST', body, signal: controller.signal, cache: 'no-store' });
});
it('uses one batch apply request and one explicit undo with no automatic retry/refetch', async () => {
  const batchId = 'b9f817b5-2907-4534-a7c7-83a34aac28a1';
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ ok: true, data: { batchId, results: [] } })).mockResolvedValueOnce(Response.json({ ok: true, data: { batchId, reverted: 1, skipped: 0 } }));
  vi.stubGlobal('fetch', fetcher); await applyChatItems([]); await undoChatBatch(batchId); expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[0][1].body).toBe('{"items":[]}'); expect(fetcher.mock.calls[1][1].body).toBe(JSON.stringify({ batchId }));
});
it('preserves the AI_LIMIT code and does not retry a failure', async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ ok: false, error: { code: 'AI_LIMIT', message: 'Demo limit reached.' } }, { status: 429 }));
  vi.stubGlobal('fetch', fetcher);
  await expect(sendChat(new FormData(), new AbortController().signal)).rejects.toMatchObject({ code: 'AI_LIMIT', message: 'Demo limit reached.' });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
