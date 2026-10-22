import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ count: vi.fn(), increment: vi.fn(), usage: vi.fn(), reserve: vi.fn() }));
vi.mock('../counters', () => ({ getCount: mocks.count, incrementIfBelow: mocks.increment }));
vi.mock('../ai/usage', async (original) => ({ ...await original<typeof import('../ai/usage')>(), getAiUsage: mocks.usage, reserveAiRequest: mocks.reserve }));
import { gmailBudgetAvailable, reserveGmailRequest } from './budget';
const admin = { userId: 'a'.repeat(24), name: 'Owner', role: 'admin' as const };
beforeEach(() => { vi.resetAllMocks(); mocks.count.mockResolvedValue(0); mocks.usage.mockResolvedValue({ remaining: 2 }); mocks.increment.mockResolvedValue(true); });
it('requires both budgets and reserves every actual classification call', async () => {
  await reserveGmailRequest(admin); await reserveGmailRequest(admin);
  expect(mocks.increment).toHaveBeenCalledTimes(2); expect(mocks.reserve).toHaveBeenCalledTimes(2);
  expect(mocks.increment).toHaveBeenCalledWith(expect.stringMatching(/^ai:gmail:\d{4}-\d{2}-\d{2}$/), 5, 259200);
});
it('blocks a full Gmail budget, exhausted admin quota, demo role and concurrent counter failure', async () => {
  mocks.count.mockResolvedValue(5); expect(await gmailBudgetAvailable(admin)).toBe(false); await expect(reserveGmailRequest(admin)).rejects.toThrow();
  mocks.count.mockResolvedValue(0); mocks.usage.mockResolvedValue({ remaining: 0 }); await expect(reserveGmailRequest(admin)).rejects.toThrow();
  expect(mocks.reserve).not.toHaveBeenCalled(); mocks.usage.mockResolvedValue({ remaining: 2 });
  await expect(reserveGmailRequest({ ...admin, role: 'demo' })).rejects.toThrow(); mocks.increment.mockResolvedValue(false); await expect(reserveGmailRequest(admin)).rejects.toThrow(); expect(mocks.reserve).not.toHaveBeenCalled();
});
