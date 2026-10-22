import { afterEach, expect, it, vi } from 'vitest';
import { sendJobAction } from './request';
import './actions';
import './items';

afterEach(() => vi.unstubAllGlobals());

it('sends one JSON DELETE compatible with the API body checks and never refetches', async () => {
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true, data: { id: '0123456789abcdef01234567' } }));
  vi.stubGlobal('fetch', fetchMock);
  await expect(sendJobAction({ kind: 'delete', id: '0123456789abcdef01234567' })).resolves.toBeNull();
  expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/jobs/0123456789abcdef01234567', {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: '{}', cache: 'no-store',
  });
});

it('preserves server error messages for optimistic rollback feedback', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ok: false,
    error: { code: 'CONFLICT', message: 'You already track this role at this company.' },
  }, { status: 409 })));
  await expect(sendJobAction({ kind: 'delete', id: '0123456789abcdef01234567' }))
    .rejects.toThrow('You already track this role at this company.');
});
