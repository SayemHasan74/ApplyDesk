import { expect, it } from 'vitest';
import { ERROR_STATUSES } from '../constants';
import { AppError } from '../errors';
import { checkOrigin, mapApiError, rejectUnsafeKeys } from './security';

const request = (headers: HeadersInit) => new Request('https://applydesk.example/test', { headers });
it('accepts same-origin and forwarded-host requests', () => {
  expect(() => checkOrigin(request({ origin: 'https://applydesk.example', 'sec-fetch-site': 'same-origin' }))).not.toThrow();
  expect(() => checkOrigin(request({ origin: 'https://public.example', 'x-forwarded-host': 'public.example', host: 'internal' }))).not.toThrow();
});
it.each<HeadersInit>([
  {}, { origin: 'null' }, { origin: 'invalid' }, { origin: 'https://evil.example' },
  { origin: 'https://applydesk.example:444' },
  { origin: 'https://applydesk.example', 'sec-fetch-site': 'same-site' },
  { origin: 'https://applydesk.example', 'sec-fetch-site': 'cross-site' },
])('rejects unsafe origin headers %j', (headers) => expect(() => checkOrigin(request(headers))).toThrow(AppError));
it('maps every known error and hides unexpected details', () => {
  for (const [code, status] of Object.entries(ERROR_STATUSES)) {
    const error = new AppError(code as keyof typeof ERROR_STATUSES, 'Public message');
    expect(mapApiError(error)).toEqual({ status, error: { code, message: status === 500 ? 'An unexpected error occurred' : 'Public message' } });
  }
  expect(mapApiError(new Error('secret database URI'))).toEqual({ status: 500, error: { code: 'INTERNAL', message: 'An unexpected error occurred' } });
});
it('rejects Mongo operator and dotted keys at every depth', () => {
  expect(() => rejectUnsafeKeys({ items: [{ $where: 'bad' }] })).toThrow(AppError);
  expect(() => rejectUnsafeKeys({ 'a.b': true })).toThrow(AppError);
  expect(() => rejectUnsafeKeys({ items: [{ title: 'safe' }], optional: null })).not.toThrow();
});
