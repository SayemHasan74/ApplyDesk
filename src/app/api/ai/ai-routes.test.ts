import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ user: vi.fn(), pipeline: vi.fn(), usage: vi.fn(), history: vi.fn() }));
vi.mock('@/lib/auth/session', () => ({ getUser: mocks.user, requireAdmin: vi.fn() }));
vi.mock('@/lib/ai/pipeline', () => ({ runAiPipeline: mocks.pipeline }));
vi.mock('@/lib/ai/usage', async (importOriginal) => ({ ...await importOriginal<typeof import('@/lib/ai/usage')>(), getAiUsage: mocks.usage }));
vi.mock('@/lib/data/chat', () => ({ listChatHistory: mocks.history }));
import { POST, maxDuration, runtime } from './chat/route';
import { GET as usage } from './usage/route';
import { GET as history } from '../chat/history/route';
import { AiLimitError } from '@/lib/ai/usage';
import { admin } from '@/lib/ai/test-fixtures';

function request(form = new FormData(), headers: Record<string, string> = { Origin: 'https://app.test' }) {
  return new Request('https://app.test/api/ai/chat', { method: 'POST', body: form, headers });
}
beforeEach(() => { vi.resetAllMocks(); mocks.user.mockResolvedValue(admin); mocks.pipeline.mockResolvedValue({ proposals: [], remaining: 1 }); });
it('wraps multipart chat in origin/auth/size/content checks with no-store JSON', async () => {
  const form = new FormData(); form.set('text', 'x'.repeat(15000));
  const response = await POST(request(form));
  expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store');
  expect(mocks.pipeline).toHaveBeenCalledWith(admin, { text: 'x'.repeat(15000) });
  expect(maxDuration).toBe(60); expect(runtime).toBe('nodejs');
});
it('rejects anonymous and cross-origin calls before pipeline execution', async () => {
  expect((await POST(request(new FormData(), {}))).status).toBe(403);
  mocks.user.mockResolvedValue(null);
  expect((await POST(request())).status).toBe(401);
  expect(mocks.pipeline).not.toHaveBeenCalled();
});
it('rejects oversized/unknown/empty fields and media magic mismatches before AI use', async () => {
  const form = new FormData(); form.set('text', 'hello');
  expect((await POST(request(form, { Origin: 'https://app.test', 'Content-Length': '4000001' }))).status).toBe(413);
  const unknown = new FormData(); unknown.set('text', 'hi'); unknown.set('secret', 'no');
  expect((await POST(request(unknown))).status).toBe(400);
  expect((await POST(request())).status).toBe(400);
  const media = new FormData(); media.set('image', new File(['fake'], 'image.png', { type: 'image/png' }));
  expect((await POST(request(media))).status).toBe(400);
  expect(mocks.pipeline).not.toHaveBeenCalled();
});
it('returns AI_LIMIT with HTTP 429 and never exposes provider secrets', async () => {
  const form = new FormData(); form.set('text', 'hi'); mocks.pipeline.mockRejectedValue(new AiLimitError('demo'));
  const response = await POST(request(form));
  expect(response.status).toBe(429); expect(await response.json()).toMatchObject({ ok: false, error: { code: 'AI_LIMIT' } });
});
it('serves tenant usage and text history through authenticated no-store routes', async () => {
  mocks.usage.mockResolvedValue({ remaining: 4, limit: 18, scope: 'admin' }); mocks.history.mockResolvedValue([]);
  expect(await (await usage(new Request('https://app.test/api/ai/usage'))).json()).toEqual({ ok: true, data: { remaining: 4, limit: 18, scope: 'admin' } });
  const response = await history(new Request('https://app.test/api/chat/history'));
  expect(await response.json()).toEqual({ ok: true, data: [] });
  expect(mocks.history).toHaveBeenCalledWith(admin.userId); expect(response.headers.get('cache-control')).toBe('no-store');
});
