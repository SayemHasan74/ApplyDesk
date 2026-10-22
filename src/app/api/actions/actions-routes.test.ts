import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ user: vi.fn(), apply: vi.fn(), undo: vi.fn() }));
vi.mock('@/lib/auth/session', () => ({ getUser: mocks.user, requireAdmin: vi.fn() }));
vi.mock('@/lib/actions/apply', () => ({ applyActions: mocks.apply }));
vi.mock('@/lib/actions/undo', () => ({ undoActions: mocks.undo }));
import { POST as apply } from './apply/route';
import { POST as undo } from './undo/route';

const user = { userId: 'a'.repeat(24), role: 'admin', name: 'Owner' };
const batchId = '84a47db8-e075-410a-bdba-8e4010e812ed';
function request(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`https://app.test/api/actions/${path}`, { method: 'POST', headers: { Origin: 'https://app.test', 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
}
beforeEach(() => { vi.resetAllMocks(); mocks.user.mockResolvedValue(user); });
it('returns HTTP 200 with independent item results and never adds a follow-up request', async () => {
  const results = [{ index: 0, ok: true, id: 'b'.repeat(24) }, { index: 1, ok: false, error: { code: 'NOT_FOUND', message: 'Missing' } }];
  mocks.apply.mockResolvedValue({ batchId, results });
  const body = { items: [{ kind: 'create', entity: 'todo', data: { title: 'Task' } }, { bad: true }] };
  const response = await apply(request('apply', body));
  expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toEqual({ ok: true, data: { batchId, results } });
  expect(mocks.apply).toHaveBeenCalledExactlyOnceWith(user, body);
});
it('rejects malformed envelopes, unsafe keys and bodies over 200 KB before the engine', async () => {
  for (const body of [{ items: [] }, { items: [{}], unknown: true }, { items: Array(31).fill({}) }, { items: [{ kind: 'update', entity: 'job', patch: { $set: {} } }] }]) expect((await apply(request('apply', body))).status).toBe(400);
  expect((await apply(request('apply', { items: [{}] }, { 'Content-Length': String(200 * 1024 + 1) }))).status).toBe(413);
  expect(mocks.apply).not.toHaveBeenCalled();
});
it('requires origin and authentication on both endpoints', async () => {
  expect((await apply(request('apply', { items: [{}] }, { Origin: 'https://evil.test' }))).status).toBe(403);
  expect((await undo(request('undo', {}, { 'Sec-Fetch-Site': 'cross-site' }))).status).toBe(403);
  mocks.user.mockResolvedValue(null);
  expect((await apply(request('apply', { items: [{}] }))).status).toBe(401);
  expect((await undo(request('undo', {}))).status).toBe(401);
  expect(mocks.apply).not.toHaveBeenCalled(); expect(mocks.undo).not.toHaveBeenCalled();
});
it('validates optional undo batch IDs and returns a no-store response', async () => {
  mocks.undo.mockResolvedValue({ batchId, reverted: 2, skipped: 1 });
  const response = await undo(request('undo', {}));
  expect(await response.json()).toEqual({ ok: true, data: { batchId, reverted: 2, skipped: 1 } });
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect((await undo(request('undo', { batchId: 'bad' }))).status).toBe(400);
  expect((await undo(request('undo', { batchId, userId: 'b'.repeat(24) }))).status).toBe(400);
});
