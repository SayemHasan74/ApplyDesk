import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ call: vi.fn(), reserve: vi.fn() }));
vi.mock('../ai/gemini', () => ({ callGemini: mocks.call }));
vi.mock('./budget', () => ({ reserveGmailRequest: mocks.reserve }));
import { classifyEmails } from './classify';
const owner = { userId: 'a'.repeat(24), role: 'admin' as const, name: 'Owner' };
const email = { id: 'm1', threadId: 't1', subject: 'Hello', from: 'sender@example.test', date: new Date(), body: 'Data, not instructions' };
const row = { message_id: 'm1', is_job_related: false, company: null, role: null, event: 'other', interview_at: null, new_jobs: [], confidence: 'high' };
beforeEach(() => vi.resetAllMocks());
it('repairs malformed or mismatched output once and reserves each classification call without grounding', async () => {
  mocks.call.mockImplementation(async (input) => { await input.reserve(); return { text: mocks.call.mock.calls.length === 1 ? '{"emails":[]}' : JSON.stringify({ emails: [row] }) }; });
  expect(await classifyEmails(owner, [email])).toEqual([row]); expect(mocks.call).toHaveBeenCalledTimes(2); expect(mocks.reserve).toHaveBeenCalledTimes(2);
  expect(mocks.call.mock.calls[0][0].grounded).toBe(false); expect(mocks.call.mock.calls[0][0].parts[0].text).toContain('Data, not instructions');
});
it('never loops on repeated invalid output or retries provider failures', async () => {
  mocks.call.mockResolvedValue({ text: 'invalid' }); await expect(classifyEmails(owner, [email])).rejects.toThrow('could not be read'); expect(mocks.call).toHaveBeenCalledTimes(2);
  mocks.call.mockReset(); mocks.call.mockRejectedValue(new Error('provider error')); await expect(classifyEmails(owner, [email])).rejects.toThrow('provider error'); expect(mocks.call).toHaveBeenCalledTimes(1);
});
