import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ jobs: vi.fn(), certs: vi.fn(), todos: vi.fn(), settings: vi.fn(), suggestions: vi.fn(), lean: vi.fn() }));
vi.mock('../data/jobs', () => ({ listJobs: mocks.jobs }));
vi.mock('../data/certifications', () => ({ listCerts: mocks.certs }));
vi.mock('../data/todos', () => ({ listTodos: mocks.todos }));
vi.mock('../data/users', () => ({ getSettings: mocks.settings }));
vi.mock('../db', () => ({ connectDb: vi.fn() }));
vi.mock('../models/suggestions', () => ({ Suggestion: { find: mocks.suggestions } }));
import { buildContext } from './context';
import { fixtureContext, admin, demo } from './test-fixtures';

beforeEach(() => {
  vi.resetAllMocks(); const fixture = fixtureContext(105);
  mocks.jobs.mockResolvedValue(fixture.jobs); mocks.certs.mockResolvedValue(Array(105).fill(fixture.certifications[0]));
  mocks.todos.mockResolvedValue([...Array(100).fill({ ...fixture.todos[0], status: 'done' }), ...Array(160).fill(fixture.todos[0])]);
  mocks.settings.mockResolvedValue(fixture.settings);
  const chain = { select: () => chain, sort: () => chain, limit: () => chain, lean: mocks.lean };
  mocks.suggestions.mockReturnValue(chain); mocks.lean.mockResolvedValue([]);
});
it('scopes list reads, caps compact prompt lists and keeps full lists for server resolution', async () => {
  const context = await buildContext(admin);
  expect(context.jobs).toHaveLength(105); expect(context.lists.jobs).toHaveLength(100);
  expect(context.lists.certifications).toHaveLength(100); expect(context.lists.todos).toHaveLength(150);
  expect(context.lists.todos.every(({ status }) => status !== 'done')).toBe(true);
  expect(Object.keys(context.lists.jobs[0])).toEqual(['id', 'company', 'role', 'status', 'deadline']);
  for (const list of [mocks.jobs, mocks.certs, mocks.todos]) expect(list).toHaveBeenCalledWith(admin.userId);
  expect(mocks.suggestions).toHaveBeenCalledWith({ userId: admin.userId, state: 'pending' });
});
it('never loads admin settings or Gmail suggestions for demo context', async () => {
  expect((await buildContext(demo)).settings.groundingEnabled).toBe(false);
  expect(mocks.suggestions).not.toHaveBeenCalled(); expect(mocks.settings).not.toHaveBeenCalled();
});
