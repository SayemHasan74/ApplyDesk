import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ connection: vi.fn(), time: vi.fn(), lock: vi.fn(), release: vi.fn(), available: vi.fn(), token: vi.fn(), get: vi.fn(), ids: vi.fn(), persist: vi.fn(), jobs: vi.fn(), classify: vi.fn() }));
vi.mock('../data/gmail', () => ({ getGmailConnection: mocks.connection, setGmailSyncTime: mocks.time, acquireGmailSync: mocks.lock, releaseGmailSync: mocks.release }));
vi.mock('../data/gmail-sync', () => ({ unprocessedIds: mocks.ids, persistEmailBatch: mocks.persist }));
vi.mock('../data/jobs', () => ({ listJobs: mocks.jobs }));
vi.mock('../crypto', () => ({ decrypt: () => 'private-refresh-token' }));
vi.mock('./budget', () => ({ gmailBudgetAvailable: mocks.available }));
vi.mock('./client', () => ({ getAccessToken: mocks.token, gmailGet: mocks.get }));
vi.mock('./classify', () => ({ classifyEmails: mocks.classify }));
import { syncGmail } from './sync';
import { AiLimitError } from '../ai/usage';
const admin = { userId: 'a'.repeat(24), name: 'Owner', role: 'admin' as const };
beforeEach(() => {
  vi.resetAllMocks(); mocks.connection.mockResolvedValue({ refreshTokenEnc: 'encrypted' }); mocks.available.mockResolvedValue(true); mocks.token.mockResolvedValue('access'); mocks.jobs.mockResolvedValue([]); mocks.ids.mockImplementation(async (_, ids) => ids); mocks.classify.mockImplementation(async (_, rows) => rows.map((row: { id: string }) => ({ message_id: row.id, is_job_related: false, company: null, role: null, event: 'other', interview_at: null, new_jobs: [], confidence: 'high' })));
});
it('does not classify when no new IDs remain and does not persist message bodies', async () => {
  mocks.get.mockResolvedValue({ messages: [{ id: 'old' }] }); mocks.ids.mockResolvedValue([]);
  expect(await syncGmail(admin)).toEqual({ processed: 0, suggestions: 0 }); expect(mocks.classify).not.toHaveBeenCalled(); expect(mocks.get).toHaveBeenCalledTimes(1); expect(mocks.release).toHaveBeenCalledTimes(1);
});
it('splits 25 emails into batches of 10/10/5 and marks non-job email IDs processed', async () => {
  const ids = Array.from({ length: 25 }, (_, i) => `m${i}`);
  mocks.get.mockImplementation(async (path: string) => path.startsWith('messages?') ? { messages: ids.map((id) => ({ id })) } : { id: path.split('/')[1].split('?')[0], threadId: 'thread', payload: { mimeType: 'text/plain', body: { data: Buffer.from('Private email body').toString('base64url') } } });
  expect(await syncGmail(admin)).toEqual({ processed: 25, suggestions: 0 }); expect(mocks.classify.mock.calls.map((call) => call[1].length)).toEqual([10, 10, 5]); expect(mocks.persist).toHaveBeenCalledTimes(3);
  expect(JSON.stringify(mocks.persist.mock.calls)).not.toContain('Private email body'); expect(mocks.persist.mock.calls.flatMap((call) => call[1])).toEqual(ids);
});
it('guards demo, disconnected, exhausted budgets, concurrent runs and releases leases on errors', async () => {
  await expect(syncGmail({ ...admin, role: 'demo' })).rejects.toThrow('Administrator');
  mocks.connection.mockResolvedValue(null); await expect(syncGmail(admin)).rejects.toThrow('not connected');
  mocks.connection.mockResolvedValue({ refreshTokenEnc: 'encrypted' }); mocks.available.mockResolvedValue(false); expect(await syncGmail(admin)).toEqual({ skipped: 'AI limit' }); expect(mocks.get).not.toHaveBeenCalled();
  mocks.available.mockResolvedValue(true); mocks.lock.mockRejectedValueOnce(new Error('already running')); await expect(syncGmail(admin)).rejects.toThrow('already running');
  mocks.get.mockRejectedValueOnce(new Error('Network failure')); await expect(syncGmail(admin)).rejects.toThrow('Network failure'); expect(mocks.release).toHaveBeenCalledTimes(1);
});
it('returns a skipped result when a later reservation exhausts the budget', async () => {
  mocks.get.mockImplementation(async (path: string) => path.startsWith('messages?') ? { messages: [{ id: 'm1' }] } : { id: 'm1', threadId: 't1', payload: {} });
  mocks.classify.mockRejectedValue(new AiLimitError('admin')); expect(await syncGmail(admin)).toEqual({ skipped: 'AI limit' }); expect(mocks.persist).not.toHaveBeenCalled(); expect(mocks.release).toHaveBeenCalledTimes(1);
});
