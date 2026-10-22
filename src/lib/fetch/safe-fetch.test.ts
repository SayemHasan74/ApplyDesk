import { EventEmitter } from 'node:events';
import type { IncomingMessage, RequestOptions } from 'node:http';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ dns: vi.fn(), request: vi.fn() }));
vi.mock('node:dns', () => ({ lookup: mocks.dns }));
vi.mock('node:http', () => ({ request: mocks.request }));
vi.mock('node:https', () => ({ request: mocks.request }));
import { publicLookup, safeFetch, validateFetchUrl } from './safe-fetch';

type Reply = { status?: number; headers?: Record<string, string>; chunks?: Buffer[]; hang?: boolean };
let replies: Reply[];
beforeEach(() => {
  vi.resetAllMocks(); replies = [{ chunks: [Buffer.from('Readable page')] }];
  mocks.dns.mockImplementation((host, options, callback) => callback(null, [{ address: '8.8.8.8', family: 4 }]));
  mocks.request.mockImplementation((url: URL, options: RequestOptions, callback: (response: IncomingMessage) => void) => {
    const request = new EventEmitter();
    const response = Object.assign(new EventEmitter(), { statusCode: 200, headers: { 'content-type': 'text/html' }, destroy: vi.fn() });
    const reply = replies.shift() ?? {};
    Object.assign(response, { statusCode: reply.status ?? 200, headers: { 'content-type': 'text/html', ...reply.headers } });
    const stop = (error: Error) => request.emit('error', error);
    options.signal?.addEventListener('abort', () => stop(new Error('aborted')));
    return Object.assign(request, { destroy: stop, end: () => queueMicrotask(() => {
      callback(response as unknown as IncomingMessage);
      if (!reply.hang) { reply.chunks?.forEach((chunk) => response.emit('data', chunk)); response.emit('end'); }
    }) });
  });
});
afterEach(() => vi.useRealTimers());
it.each(['file:///etc/passwd', 'ftp://public.com', 'http://localhost', 'http://127.0.0.1', 'http://169.254.169.254',
  'https://user:pass@example.com', 'https://example.com:8443', 'https://linkedin.com/jobs', 'https://www.linkedin.com/jobs', 'https://www.linkedin.com./jobs', 'http://[::ffff:127.0.0.1]'])('rejects unsafe URL %s before connecting', (url) => {
  expect(() => validateFetchUrl(url)).toThrow(); expect(mocks.request).not.toHaveBeenCalled();
});
it('checks every DNS answer at connect time and returns only public addresses', () => {
  const callback = vi.fn();
  mocks.dns.mockImplementationOnce((host, options, done) => done(null, [{ address: '8.8.8.8', family: 4 }, { address: '10.0.0.1', family: 4 }]));
  publicLookup('mixed.example', {}, callback);
  expect(callback.mock.calls[0][0]).toBeInstanceOf(Error);
  publicLookup('public.example', { all: true }, callback);
  expect(callback).toHaveBeenLastCalledWith(null, [{ address: '8.8.8.8', family: 4 }]);
  publicLookup('public.example', {}, callback);
  expect(callback).toHaveBeenLastCalledWith(null, '8.8.8.8', 4);
});
it('uses native requests with identity encoding and revalidates redirects', async () => {
  replies = [{ status: 302, headers: { location: '/final' } }, { chunks: [Buffer.from('Final page')] }];
  expect(await safeFetch('https://example.com/start')).toEqual({ finalUrl: 'https://example.com/final', html: 'Final page' });
  expect(mocks.request.mock.calls[0][1]).toMatchObject({ lookup: publicLookup, agent: false, headers: { 'Accept-Encoding': 'identity', Accept: 'text/html,application/xhtml+xml' } });
  replies = [{ status: 302, headers: { location: 'http://127.0.0.1/private' } }];
  await expect(safeFetch('https://example.com')).rejects.toThrow();
});
it('rejects excessive redirects, oversized bodies, binary content and encoded responses', async () => {
  replies = Array.from({ length: 4 }, () => ({ status: 302, headers: { location: '/again' } }));
  await expect(safeFetch('https://example.com')).rejects.toThrow('Too many redirects');
  replies = [{ chunks: [Buffer.alloc(1_500_001)] }];
  await expect(safeFetch('https://example.com')).rejects.toThrow('too large');
  const invalidHeaders: Record<string, string>[] = [{ 'content-type': 'application/pdf' }, { 'content-encoding': 'gzip' }];
  for (const headers of invalidHeaders) {
    replies = [{ headers }]; await expect(safeFetch('https://example.com')).rejects.toThrow('could not be read');
  }
});
it('applies a single eight-second deadline across the request', async () => {
  vi.useFakeTimers(); replies = [{ hang: true }];
  const pending = safeFetch('https://example.com').catch((error: unknown) => error);
  await vi.advanceTimersByTimeAsync(8000);
  expect(await pending).toBeInstanceOf(Error);
});
