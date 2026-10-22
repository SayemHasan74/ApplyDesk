import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ admin: vi.fn(), read: vi.fn(), update: vi.fn() }));
vi.mock('@/lib/auth/session', () => ({ getUser: vi.fn(), requireAdmin: mocks.admin }));
vi.mock('@/lib/data/users', () => ({ getSettings: mocks.read, updateSettings: mocks.update }));
import { GET, PATCH } from './route';
import { AppError } from '@/lib/errors';

const id = '0123456789abcdef01234567';
const settings = { groundingEnabled: true, aiDailyLimit: 18 };
beforeEach(() => { vi.resetAllMocks(); mocks.admin.mockResolvedValue({ userId: id, role: 'admin' }); mocks.read.mockResolvedValue(settings); mocks.update.mockResolvedValue(settings); });
const request = (body: unknown, origin = 'https://applydesk.example') => new Request('https://applydesk.example/api/settings', {
  method: 'PATCH', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
it('uses the admin guard and no-store on settings reads and sparse writes', async () => {
  const read = await GET(new Request('https://applydesk.example/api/settings'));
  expect(await read.json()).toEqual({ ok: true, data: settings }); expect(read.headers.get('Cache-Control')).toBe('no-store');
  expect(mocks.admin).toHaveBeenCalledOnce(); expect(mocks.read).toHaveBeenCalledWith(id);
  const response = await PATCH(request({ groundingEnabled: false }));
  expect(response.status).toBe(200); expect(mocks.update).toHaveBeenCalledWith(id, { groundingEnabled: false });
});
it.each([['UNAUTHENTICATED', 401], ['FORBIDDEN', 403]] as const)('rejects %s before reading private settings', async (code, status) => {
  mocks.admin.mockRejectedValue(new AppError(code, 'Access denied'));
  expect((await GET(new Request('https://applydesk.example/api/settings'))).status).toBe(status);
  expect((await PATCH(request({ aiDailyLimit: 18 }))).status).toBe(status);
  expect(mocks.read).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
});
it('rejects cross-origin requests and invalid patches without database writes', async () => {
  expect((await PATCH(request({ aiDailyLimit: 18 }, 'https://other.example'))).status).toBe(403);
  expect((await PATCH(request({ aiDailyLimit: 101 }))).status).toBe(400);
  expect((await PATCH(request({ 'settings.aiDailyLimit': 20 }))).status).toBe(400);
  expect((await PATCH(request({ role: 'admin' }))).status).toBe(400);
  expect(mocks.update).not.toHaveBeenCalled();
});
