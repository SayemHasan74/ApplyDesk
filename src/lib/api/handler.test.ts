import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { z } from 'zod';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock('../auth/session', () => ({ getUser: mocks.getUser }));
vi.mock('../env', () => ({ getEnv: () => ({ CRON_SECRET: 'cron-secret' }) }));
import { withApi, ok } from './handler';
import { AppError } from '../errors';

const post = (body: string, headers: Record<string, string> = {}) => new Request('https://app.example/api/test', {
  method: 'POST', body, headers: { origin: 'https://app.example', 'content-type': 'application/json', ...headers },
});
beforeEach(() => { mocks.getUser.mockReset(); });
afterEach(() => vi.restoreAllMocks());
it('checks origin before authentication, and authentication before parsing', async () => {
  const handler = vi.fn();
  const route = withApi({ auth: 'user', body: z.object({}).strict() }, handler);
  expect((await route(post('{}', { origin: 'https://evil.example' }))).status).toBe(403);
  expect(mocks.getUser).not.toHaveBeenCalled();
  mocks.getUser.mockRejectedValue(new AppError('UNAUTHENTICATED', 'Sign in required'));
  expect((await route(post('not-json'))).status).toBe(401);
  expect(handler).not.toHaveBeenCalled();
});
it('parses strict body/query schemas and awaits route params', async () => {
  const route = withApi({ auth: 'none', body: z.object({ title: z.string().max(200) }).strict(), query: z.object({}).strict() },
    ({ body, params, requestId }) => ok({ title: body.title, id: params.id, requestId }, 201));
  const response = await route(post('{"title":"Task"}'), { params: Promise.resolve({ id: '123' }) });
  expect(response.status).toBe(201);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toMatchObject({ ok: true, data: { title: 'Task', id: '123', requestId: expect.stringMatching(/^[a-f0-9-]{36}$/) } });
  const invalid = await route(post('{"title":"Task","extra":true}'));
  expect(invalid.status).toBe(400);
  expect(await invalid.json()).toMatchObject({ ok: false, error: { code: 'VALIDATION', message: expect.any(String) } });
});
it('enforces declared and actual body limits, types and malformed JSON', async () => {
  const route = withApi({ auth: 'none', body: z.object({}).strict(), maxBodyBytes: 10 }, () => ({}));
  expect((await route(post('{}', { 'content-length': '11' }))).status).toBe(413);
  expect((await route(post('{"value":12345}'))).status).toBe(413);
  expect((await route(post('{}', { 'content-type': 'text/plain' }))).status).toBe(400);
  expect((await route(post('{'))).status).toBe(400);
  expect((await route(post('{"$gt":1}'))).status).toBe(400);
});
it('authenticates cron without origin or session and rejects mismatched lengths', async () => {
  const route = withApi({ auth: 'cron' }, () => ({ synced: true }));
  for (const secret of ['', 'short', 'wrong-value']) {
    expect((await route(new Request('https://app.example', { headers: { 'x-cron-secret': secret } }))).status).toBe(401);
  }
  const response = await route(new Request('https://app.example', { headers: { 'x-cron-secret': 'cron-secret' } }));
  expect(response.status).toBe(200);
  expect(mocks.getUser).not.toHaveBeenCalled();
});
it('returns a generic 500 and logs only its code and request id', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  const route = withApi({ auth: 'none' }, () => { throw new Error('private information'); });
  const response = await route(new Request('https://app.example'));
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ ok: false, error: { code: 'INTERNAL', message: 'An unexpected error occurred' } });
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(log).toHaveBeenCalledWith('[INTERNAL]', expect.stringMatching(/^[a-f0-9-]{36}$/));
});
