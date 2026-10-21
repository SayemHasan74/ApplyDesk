import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock('@/auth', () => ({ auth: mocks.auth }));
import { getUser, requireAdmin, requireUser } from './session';

const userId = '0123456789abcdef01234567';
beforeEach(() => mocks.auth.mockReset());
afterEach(() => vi.useRealTimers());
it('returns null for missing sessions, invalid claims and expired demos', async () => {
  mocks.auth.mockResolvedValueOnce(null).mockResolvedValueOnce({ user: { role: 'admin' } }).mockResolvedValueOnce({ user: { userId, role: 'demo' }, demoExpiresAt: 1 });
  expect(await getUser()).toBeNull();
  expect(await getUser()).toBeNull();
  expect(await getUser()).toBeNull();
});
it('returns only the requested user properties for a valid session', async () => {
  mocks.auth.mockResolvedValue({ user: { userId, role: 'admin', name: 'Owner', email: 'owner@example.com', image: 'private-image' } });
  expect(await getUser()).toEqual({ userId, role: 'admin', name: 'Owner', email: 'owner@example.com' });
});
it('throws UNAUTHENTICATED for missing users and FORBIDDEN for demos requesting admin', async () => {
  mocks.auth.mockResolvedValue(null);
  await expect(requireUser()).rejects.toMatchObject({ code: 'UNAUTHENTICATED', status: 401 });
  mocks.auth.mockResolvedValue({ user: { userId, role: 'demo', name: 'Demo visitor' }, demoExpiresAt: Date.now() + 10000 });
  await expect(requireAdmin()).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  mocks.auth.mockResolvedValue({ user: { userId, role: 'admin', name: 'Owner' } });
  await expect(requireAdmin()).resolves.toMatchObject({ userId, role: 'admin' });
});
