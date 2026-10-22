import { expect, it } from 'vitest';
import { User } from './users';
import { Job } from './jobs';
import { Certification } from './certifications';
import { Todo } from './todos';
import { Suggestion } from './suggestions';
import { ProcessedEmail } from './processed-emails';
import { ActionLog } from './action-logs';
import { ChatMessage } from './chat-messages';
import { Counter } from './counters';

const userId = '0123456789abcdef01234567';
it.each(['2026-02-30T10:00:00+06:00', '2026-10-21T24:00:00+06:00', '2026-10-21T10:00:00'])('rejects invalid interview timestamp %s', async (interviewAt) => {
  await expect(new Job({ userId, company: 'C', role: 'R', dedupeKey: 'c|r', interviewAt }).validate()).rejects.toThrow();
});
it.each(['2024-02-29T10:30:00+06:00', '2026-10-21T10:00:00Z'])('accepts valid interview timestamp %s', async (interviewAt) => {
  await expect(new Job({ userId, company: 'C', role: 'R', dedupeKey: 'c|r', interviewAt }).validate()).resolves.toBeUndefined();
});
it('sets domain defaults, nulls and separate nested values', async () => {
  const job = new Job({ userId, company: 'Company', role: 'Engineer', dedupeKey: 'company|engineer' });
  await expect(job.validate()).resolves.toBeUndefined();
  expect(job.toObject()).toMatchObject({ status: 'saved', jobType: 'other', workMode: 'unknown', compensationStatus: 'unknown', deadline: null, notes: '', sourceUrls: [], requirements: [], createdFrom: 'manual', priority: 'medium' });
  const cert = new Certification({ userId, name: 'Course', provider: 'Provider', dedupeKey: 'provider|course' });
  await expect(cert.validate()).resolves.toBeUndefined();
  expect(cert.toObject()).toMatchObject({ status: 'wishlist', costStatus: 'unknown', format: 'unknown', progressPercent: 0, notes: '', registrationDeadline: null });
  const todo = new Todo({ userId, title: 'Task' });
  await expect(todo.validate()).resolves.toBeUndefined();
  expect(todo.toObject()).toMatchObject({ status: 'todo', dueDate: null, linkedJobId: null, linkedCertId: null, completedAt: null });
  const user = new User({ role: 'admin', name: 'Owner', email: 'OWNER@EXAMPLE.COM' });
  expect(user.toObject()).toMatchObject({ email: 'owner@example.com', settings: { groundingEnabled: true, aiDailyLimit: 18 }, gmail: { refreshTokenEnc: null, connectedAt: null, lastSyncAt: null }, demoAiUsed: 0 });
});
it('enforces tenant identity, bounds, calendar dates and domain enums', async () => {
  await expect(new Todo({ title: 'Task' }).validate()).rejects.toThrow();
  await expect(new Todo({ userId: 'invalid', title: 'Task' }).validate()).rejects.toThrow();
  await expect(new Todo({ userId, title: 'x'.repeat(201) }).validate()).rejects.toThrow();
  await expect(new Todo({ userId, title: 'Task', createdFrom: 'url' }).validate()).rejects.toThrow();
  await expect(new Todo({ userId, title: 'Task', dueDate: '2026-02-30' }).validate()).rejects.toThrow();
  await expect(new Certification({ userId, name: 'Course', provider: 'P', dedupeKey: 'p|c', progressPercent: 101 }).validate()).rejects.toThrow();
  await expect(new Job({ userId, company: 'C', role: 'R', dedupeKey: 'c|r', requirements: Array.from({ length: 21 }, () => 'item') }).validate()).rejects.toThrow();
  expect(new Todo({ userId, title: 'Task', unexpected: 'ignored' }).toObject()).not.toHaveProperty('unexpected');
});
it('declares absolute TTL indexes and prevents automatic index creation', () => {
  for (const schema of [User.schema, Job.schema, Certification.schema, Todo.schema, Suggestion.schema, ProcessedEmail.schema, ActionLog.schema, ChatMessage.schema, Counter.schema]) {
    expect(schema.options.autoIndex).toBe(false);
    expect(schema.options.strict).toBe(true);
    expect(schema.options.timestamps).toBe(true);
    expect(schema.indexes()).toContainEqual([{ expiresAt: 1 }, { expireAfterSeconds: 0 }]);
  }
  expect(Job.schema.indexes()).toContainEqual([{ userId: 1, dedupeKey: 1 }, { unique: true }]);
  expect(Certification.schema.indexes()).toContainEqual([{ userId: 1, dedupeKey: 1 }, { unique: true }]);
  expect(Suggestion.schema.indexes()).toContainEqual([{ userId: 1, gmailMessageId: 1, type: 1, suggestionKey: 1 }, { unique: true }]);
  expect(ProcessedEmail.schema.indexes()).toContainEqual([{ userId: 1, gmailMessageId: 1 }, { unique: true }]);
});
it('sets retention periods as expiration dates and keeps email uniqueness sparse', () => {
  const now = Date.now();
  const processed = new ProcessedEmail({ userId, gmailMessageId: 'message' });
  expect(processed.expiresAt.getTime() - now).toBeGreaterThanOrEqual(60 * 86_400_000);
  const chat = new ChatMessage({ userId, role: 'user', text: 'Hello' });
  expect(chat.expiresAt.getTime() - now).toBeGreaterThanOrEqual(30 * 86_400_000);
  expect(User.schema.indexes()).toContainEqual([{ email: 1 }, expect.objectContaining({ unique: true, sparse: true })]);
});
