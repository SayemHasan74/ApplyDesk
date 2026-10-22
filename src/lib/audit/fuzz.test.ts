import { expect, it, vi } from 'vitest';
import { z } from 'zod';
vi.mock('server-only', () => ({}));
vi.mock('../auth/session', () => ({ getUser: vi.fn(), requireAdmin: vi.fn() }));
import { jobCreateSchema, jobPatchSchema, jobIdSchema } from '../validators/job';
import { certCreateSchema, certPatchSchema } from '../validators/certification';
import { todoCreateSchema, todoPatchSchema } from '../validators/todo';
import { settingsSchema, settingsPatchSchema } from '../validators/settings';
import { actionItemSchema, applyBodySchema, undoBodySchema } from '../actions/schema';
import { chatInputSchema } from '../ai/input';
import { jobDraftSchema, certDraftSchema, todoDraftSchema, filterSchema, actionSchema, settingSchema, querySchema, modelOutputSchema } from '../ai/schema';
import { currentUserSchema, sessionClaimsSchema } from '../auth/policy';
import { classifierSchema, emailClassificationSchema, suggestionPayloadSchema, syncResultSchema } from '../gmail/schema';
import { proposalSchema, aiResponseSchema, queryResultSchema, actionResultSchema, applyResponseSchema, undoResponseSchema, usageSchema, historySchema, messageSchema } from '../client/ai-contract';
import { reviewEntrySchema, reviewEntry } from '../client/ai-client';
import { objectId, calendarDate, httpUrl } from '../validators/fields';
import { checkOrigin } from '../api/security';
import { withApi } from '../api/handler';
import { envSchema } from '../env';
import { jobActionSchema } from '../jobs/actions';
import { actionSchema as certActionSchema } from '../certifications/actions';
import { actionSchema as todoActionSchema } from '../todos/actions';
import { jobItemSchema } from '../jobs/items';
import { certItemSchema } from '../certifications/items';
import { todoItemSchema } from '../todos/items';

const id = 'a'.repeat(24), uuid = 'b9f817b5-2907-4534-a7c7-83a34aac28a1';
const classification = { message_id: 'm1', is_job_related: true, company: 'C', role: 'R', event: 'application_confirmation', interview_at: null, new_jobs: [], confidence: 'high' };
const proposal = { id: uuid, kind: 'create' as const, entity: 'todo' as const, draft: { title: 'Task' } };
const boundaries: [string, z.ZodType, Record<string, unknown>][] = [
  ['environment', envSchema, { MONGODB_URI: 'mongodb://localhost/applydesk', AUTH_SECRET: 's'.repeat(32), AUTH_GOOGLE_ID: 'test-id', AUTH_GOOGLE_SECRET: 'test-secret', ALLOWED_EMAIL: 'test@example.com', APP_URL: 'https://app.example', GEMINI_API_KEY: 'test-key', ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'), CRON_SECRET: 'test-cron' }],
  ['job mutation', jobActionSchema, { kind: 'create', input: { company: 'C', role: 'R' } }], ['cert mutation', certActionSchema, { kind: 'create', input: { name: 'N', provider: 'P' } }], ['todo mutation', todoActionSchema, { kind: 'create', input: { title: 'T' } }],
  ['job item', jobItemSchema, { company: 'C', role: 'R', id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }], ['cert item', certItemSchema, { name: 'N', provider: 'P', id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }], ['todo item', todoItemSchema, { title: 'T', id, completedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
  ['chat message', messageSchema, { id: uuid, role: 'user', text: 'Hello' }],
  ['job create', jobCreateSchema, { company: 'C', role: 'R' }], ['job patch', jobPatchSchema, {}],
  ['cert create', certCreateSchema, { name: 'Course', provider: 'Academy' }], ['cert patch', certPatchSchema, {}],
  ['todo create', todoCreateSchema, { title: 'Task' }], ['todo patch', todoPatchSchema, {}],
  ['settings', settingsSchema, { groundingEnabled: true, aiDailyLimit: 18 }], ['settings patch', settingsPatchSchema, {}],
  ['apply item', actionItemSchema, { kind: 'create', entity: 'todo', data: { title: 'Task' } }], ['apply envelope', applyBodySchema, { items: [{}] }], ['undo', undoBodySchema, {}],
  ['chat input', chatInputSchema, { text: 'Hello' }], ['job draft', jobDraftSchema, { company: 'C', role: 'R' }], ['cert draft', certDraftSchema, { name: 'N', provider: 'P' }], ['todo draft', todoDraftSchema, { title: 'T' }],
  ['filter', filterSchema, {}], ['model action', actionSchema, { type: 'update', entity: 'job', id, patch: { status: 'applied' } }], ['model setting', settingSchema, { key: 'groundingEnabled', value: false }], ['query', querySchema, { entity: 'job' }], ['model output', modelOutputSchema, { intent: 'chat', assistant_message: 'Hello' }],
  ['claims', sessionClaimsSchema, { userId: id, role: 'demo' }], ['user', currentUserSchema, { userId: id, role: 'demo', name: 'Demo' }],
  ['classifier', classifierSchema, { emails: [classification] }], ['email', emailClassificationSchema, classification], ['suggestion payload', suggestionPayloadSchema, { status: 'applied' }], ['sync result', syncResultSchema, { processed: 0, suggestions: 0 }],
  ['proposal', proposalSchema, proposal], ['AI response', aiResponseSchema, { intent: 'chat', assistantMessage: 'Hello', transcript: null, proposals: [], queryResult: null, remaining: 1 }],
  ['query result', queryResultSchema, { entity: 'todo', items: [], text: 'No matches' }], ['action result', actionResultSchema, { index: 0, ok: true }], ['apply response', applyResponseSchema, { batchId: uuid, results: [] }], ['undo response', undoResponseSchema, { batchId: uuid, reverted: 0, skipped: 0 }], ['usage', usageSchema, { remaining: 1, limit: 2, scope: 'demo' }], ['review state', reviewEntrySchema, reviewEntry(proposal)],
];
it.each(boundaries)('%s rejects unknown, operator and dotted object keys', (_label, schema, valid) => {
  expect(schema.safeParse(valid).success).toBe(true);
  for (const key of ['unknownField', '$set', '$where', 'a.b', '__proto__.polluted']) expect(schema.safeParse({ ...valid, [key]: 'injected' }).success, key).toBe(false);
});
it('rejects overlong strings throughout all registered contracts without throwing from safeParse', () => {
  function paths(value: unknown, prefix: string[] = []): string[][] {
    if (typeof value === 'string') return [prefix];
    if (!value || typeof value !== 'object') return [];
    return Object.entries(value).flatMap(([key, child]) => paths(child, [...prefix, key]));
  }
  let checked = 0;
  for (const [name, schema, valid] of boundaries) {
    const parsed: unknown = schema.parse(valid);
    for (const path of paths(parsed)) {
      const mutated = structuredClone(parsed) as Record<string, unknown>;
      let parent = mutated;
      for (const key of path.slice(0, -1)) parent = parent[key] as Record<string, unknown>;
      parent[path.at(-1)!] = 'x'.repeat(300001);
      expect(schema.safeParse(mutated).success, `${name}.${path.join('.')}`).toBe(false); checked++;
    }
  }
  expect(checked).toBeGreaterThan(100);
  expect(historySchema.safeParse([{ role: 'user', text: 'x'.repeat(4001), createdAt: new Date().toISOString() }]).success).toBe(false);
});
it('fuzzes every editable field for bounds and rejects malformed IDs, dates and URL schemes', () => {
  for (const schema of [jobCreateSchema, jobPatchSchema, certCreateSchema, certPatchSchema, todoCreateSchema, todoPatchSchema]) {
    const base = schema === jobCreateSchema ? { company: 'C', role: 'R' } : schema === certCreateSchema ? { name: 'N', provider: 'P' } : schema === todoCreateSchema ? { title: 'T' } : {};
    for (const key of Object.keys(schema.shape)) {
      const field = schema.shape[key as keyof typeof schema.shape] as z.ZodType;
      expect(schema.safeParse({ ...base, [key]: 'x'.repeat(16001) }).success, key).toBe(false);
      for (const invalid of /(?:Date$|At$|deadline$|validUntil$)/i.test(key) && key !== 'format' ? ['2025-02-29', '2026-02-30', '2026-13-01', '2026-01-00', '2026-1-01'] : /Id$/.test(key) ? ['invalid', 'A'.repeat(24), '0'.repeat(25)] : /Url$|^url$/.test(key) ? ['javascript:alert(1)', 'data:text/html,attack'] : []) expect(field.safeParse(invalid).success, `${key}: ${invalid}`).toBe(false);
      if (['sourceUrls', 'requirements', 'prerequisites'].includes(key)) expect(field.safeParse(Array(21).fill('https://example.com')).success).toBe(false);
    }
  }
  for (const schema of [objectId, jobIdSchema]) for (const value of ['', 'x', 'A'.repeat(24), 'a'.repeat(25)]) expect(schema.safeParse(value).success).toBe(false);
  for (const value of ['2026-02-30', '2025-02-29', '2026-1-01']) expect(calendarDate.safeParse(value).success).toBe(false);
  for (const value of ['javascript:alert(1)', 'data:text/html,attack']) expect(httpUrl.safeParse(value).success).toBe(false);
  expect(historySchema.safeParse([{ role: 'user', text: 'Hello', createdAt: new Date().toISOString(), injected: true }]).success).toBe(false);
});
it('rejects unsafe and invalid values inside AI drafts, action patches and classifier jobs', () => {
  expect(actionSchema.safeParse({ type: 'update', entity: 'job', id, patch: { title: 'Wrong entity field' } }).success).toBe(false);
  for (const value of [{ unknownField: true }, { '$set': {} }, { 'a.b': 1 }, { deadline: '2026-02-30' }, { applyUrl: 'javascript:bad' }, { notes: 'x'.repeat(4001) }]) {
    expect(actionSchema.safeParse({ type: 'update', entity: 'job', id, patch: value }).success).toBe(false);
    expect(actionItemSchema.safeParse({ kind: 'update', entity: 'job', id, patch: value }).success).toBe(false);
    expect(proposalSchema.safeParse({ id: uuid, kind: 'update', entity: 'job', targetId: id, label: 'Job', before: {}, patch: value }).success).toBe(false);
  }
  for (const draft of [{ company: 'C', role: 'R', deadline: '2026-02-30' }, { company: 'C', role: 'R', apply_url: 'data:text/html,attack' }, { company: 'C', role: 'R', field_sources: { '$set': 'text' } }]) expect(jobDraftSchema.safeParse(draft).success).toBe(false);
  for (const url of ['javascript:bad', 'data:text/html,attack']) expect(classifierSchema.safeParse({ emails: [{ ...classification, new_jobs: [{ company: 'C', role: 'R', apply_url: url, location: null, deadline: null }] }] }).success).toBe(false);
});
it.each(['POST', 'PATCH', 'DELETE'])('%s rejects every disallowed origin before invoking the handler', async (method) => {
  const handler = vi.fn(() => ({})), route = withApi({ auth: 'none', body: z.object({}).strict() }, handler);
  const cases: Record<string, string>[] = [{}, { Origin: 'https://evil.example' }, { Origin: 'https://app.example', 'Sec-Fetch-Site': 'cross-site' }];
  for (const headers of cases) {
    const request = new Request('https://app.example/api/test', { method, body: '{}', headers: { 'Content-Type': 'application/json', ...headers } });
    expect(() => checkOrigin(request)).toThrow(); expect((await route(request)).status).toBe(403);
  }
  expect(handler).not.toHaveBeenCalled();
});
