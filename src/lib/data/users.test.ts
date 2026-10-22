import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ find: vi.fn(), update: vi.fn(), lean: vi.fn(), select: vi.fn() }));
vi.mock('../db', () => ({ connectDb: vi.fn() }));
vi.mock('../models/users', () => ({ User: { findOne: mocks.find, findOneAndUpdate: mocks.update } }));
import { getSettings, updateSettings } from './users';

const userId = '0123456789abcdef01234567';
beforeEach(() => {
  vi.resetAllMocks();
  const chain = { select: mocks.select, lean: mocks.lean };
  mocks.find.mockReturnValue(chain); mocks.update.mockReturnValue(chain); mocks.select.mockReturnValue(chain);
  mocks.lean.mockResolvedValue({ settings: { groundingEnabled: true, aiDailyLimit: 18 } });
});
it('limits reads to the requested admin and projects only settings', async () => {
  expect(await getSettings(userId)).toEqual({ groundingEnabled: true, aiDailyLimit: 18 });
  expect(mocks.find).toHaveBeenCalledWith({ _id: userId, role: 'admin' });
  expect(mocks.select).toHaveBeenCalledWith('settings -_id');
});
it('whitelists nested settings paths without replacing unrelated settings', async () => {
  await updateSettings(userId, { aiDailyLimit: 27 });
  expect(mocks.update).toHaveBeenCalledWith({ _id: userId, role: 'admin' }, { $set: { 'settings.aiDailyLimit': 27 } }, { returnDocument: 'after', runValidators: true });
  await updateSettings(userId, { groundingEnabled: false });
  expect(mocks.update).toHaveBeenLastCalledWith({ _id: userId, role: 'admin' }, { $set: { 'settings.groundingEnabled': false } }, expect.anything());
});
it('rejects absent or demo user records and invalid patches before writing', async () => {
  mocks.lean.mockResolvedValue(null);
  await expect(getSettings(userId)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  await expect(updateSettings(userId, { aiDailyLimit: 0 })).rejects.toThrow();
  expect(mocks.update).not.toHaveBeenCalled();
});
