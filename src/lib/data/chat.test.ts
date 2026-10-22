import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ find: vi.fn(), insert: vi.fn(), remove: vi.fn(), lean: vi.fn(), expiry: vi.fn() }));
vi.mock('../db', () => ({ connectDb: vi.fn() }));
vi.mock('../auth/expiry', () => ({ getExpiryFor: mocks.expiry }));
vi.mock('../models/chat-messages', () => ({ ChatMessage: { find: mocks.find, insertMany: mocks.insert, deleteMany: mocks.remove } }));
import { listChatHistory, saveChatExchange } from './chat';
const userId = 'a'.repeat(24);
beforeEach(() => {
  vi.resetAllMocks(); const chain = { select: () => chain, sort: () => chain, skip: () => chain, limit: () => chain, lean: mocks.lean };
  mocks.find.mockReturnValue(chain); mocks.lean.mockResolvedValue([]); mocks.expiry.mockResolvedValue(null);
});
it('returns the latest 50 tenant-scoped text-only history entries ascending', async () => {
  mocks.lean.mockResolvedValue([{ role: 'assistant', text: 'Second', createdAt: new Date('2026-10-22') }, { role: 'user', text: 'First', createdAt: new Date('2026-10-21') }]);
  expect((await listChatHistory(userId)).map(({ text }) => text)).toEqual(['First', 'Second']);
  expect(mocks.find).toHaveBeenCalledWith({ userId });
});
it('writes one bounded text batch, preserves demo expiry and prunes with tenant-scoped cutoff', async () => {
  const cutoff = new Date('2026-10-20'); const expiresAt = new Date('2026-10-23');
  mocks.expiry.mockResolvedValue(expiresAt); mocks.lean.mockResolvedValue([{ createdAt: cutoff, _id: 'b'.repeat(24) }]);
  await saveChatExchange(userId, 'demo', 'x'.repeat(5000), 'Review this.');
  expect(mocks.insert).toHaveBeenCalledTimes(1);
  expect(mocks.insert.mock.calls[0][0]).toMatchObject([{ role: 'user', userId, text: 'x'.repeat(4000), expiresAt }, { role: 'assistant', userId, text: 'Review this.', expiresAt }]);
  expect(mocks.remove).toHaveBeenCalledWith({ userId, $or: [{ createdAt: { $lt: cutoff } }, { createdAt: cutoff, _id: { $lt: 'b'.repeat(24) } }] });
});
