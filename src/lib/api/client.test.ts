import { afterEach, expect, it, vi } from 'vitest';
import { apiRequest } from './client';
import { sendTodoAction } from '../todos/request';
import { sendCertAction } from '../certifications/request';

afterEach(() => vi.unstubAllGlobals());
it.each([
  ['PATCH', '/api/todos/0123456789abcdef01234567', { title: 'Edited' }],
  ['DELETE', '/api/certifications/0123456789abcdef01234567', {}],
  ['POST', '/api/todos/clear-done', {}],
])('makes exactly one JSON %s without a follow-up GET', async (method, path, body) => {
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true, data: null })); vi.stubGlobal('fetch', fetchMock);
  await apiRequest(path, method, body);
  expect(fetchMock).toHaveBeenCalledExactlyOnceWith(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
});
it('validates clear counts and delete results without a refetch', async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ ok: true, data: { count: 2 } })).mockResolvedValueOnce(Response.json({ ok: true, data: { id: '0123456789abcdef01234567' } }));
  vi.stubGlobal('fetch', fetchMock);
  expect(await sendTodoAction({ kind: 'clear' })).toEqual({ count: 2 });
  expect(await sendCertAction({ kind: 'delete', id: '0123456789abcdef01234567' })).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
it('surfaces API and network failures without retrying', async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Not allowed' } }, { status: 403 })).mockRejectedValueOnce(new TypeError('Network failed'));
  vi.stubGlobal('fetch', fetchMock);
  await expect(apiRequest('/api/todos')).rejects.toThrow('Not allowed');
  await expect(apiRequest('/api/todos')).rejects.toThrow('Network failed');
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
