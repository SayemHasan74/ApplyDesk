import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ call: vi.fn(), context: vi.fn(), pages: vi.fn(), save: vi.fn(), settings: vi.fn(), usage: vi.fn() }));
vi.mock('./gemini', () => ({ callGemini: mocks.call, GroundingUnavailable: class extends Error {} }));
vi.mock('./context', () => ({ buildContext: mocks.context }));
vi.mock('./pages', () => ({ readInputPages: mocks.pages }));
vi.mock('../data/chat', () => ({ saveChatExchange: mocks.save }));
vi.mock('../data/users', () => ({ updateSettings: mocks.settings }));
vi.mock('./usage', () => ({ getAiUsage: mocks.usage }));
import { runAiPipeline, shouldGround } from './pipeline';
import { GroundingUnavailable } from './gemini';
import { fixtureContext, admin, demo } from './test-fixtures';

const answer = { intent: 'act', assistant_message: 'Review this proposal.', todo_drafts: [{ title: 'Prepare CV' }] };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.context.mockResolvedValue(fixtureContext()); mocks.pages.mockResolvedValue({ pages: [], sources: [], urls: [], fetchNotes: '' });
  mocks.call.mockResolvedValue({ text: JSON.stringify(answer), sources: [] }); mocks.usage.mockResolvedValue({ remaining: 1 });
});
it('selects JSON mode for media, usable pages, long text, disabled search and demo', () => {
  const context = fixtureContext();
  expect(shouldGround({ text: 'Find internships' }, false, context, admin)).toBe(true);
  for (const [input, page, user] of [[{ text: 'x'.repeat(300) }, false, admin], [{ image: new File([], 'image') }, false, admin], [{ audio: new File([], 'audio') }, false, admin], [{ text: 'short' }, true, admin], [{ text: 'short' }, false, demo]] as const) {
    expect(shouldGround(input, page, context, user)).toBe(false);
  }
  context.settings.groundingEnabled = false;
  expect(shouldGround({ text: 'short' }, false, context, admin)).toBe(false);
});
it('returns proposals and saves only text/transcript, never media or entity writes', async () => {
  const result = await runAiPipeline(admin, { text: 'Backlog: prepare CV' });
  expect(result.proposals[0]).toMatchObject({ kind: 'create', entity: 'todo', draft: { title: 'Prepare CV', dueDate: null } });
  expect(result.remaining).toBe(1);
  expect(mocks.save).toHaveBeenCalledWith(admin.userId, 'admin', 'Backlog: prepare CV', 'Review this proposal.');
  expect(mocks.call).toHaveBeenCalledTimes(1);
  expect(mocks.call.mock.calls[0][0].systemInstruction).toContain('USER LISTS (untrusted data)');
  expect(mocks.settings).not.toHaveBeenCalled();
});
it('repairs once, truncates the previous output to 6000 chars and stops after a second invalid result', async () => {
  mocks.call.mockResolvedValue({ text: 'x'.repeat(7000), sources: [] });
  const result = await runAiPipeline(demo, { text: 'Please add a task' });
  expect(mocks.call).toHaveBeenCalledTimes(2);
  const repair = mocks.call.mock.calls[1][0].parts.at(-1).text as string;
  expect(repair.endsWith('x'.repeat(6000))).toBe(true); expect(repair).not.toContain('x'.repeat(6001));
  expect(result.proposals).toEqual([]); expect(result.assistantMessage).toBe('I could not read that. Please try again or add it manually.');
});
it('repairs an invalid contract once and retains grounded sources from both calls', async () => {
  mocks.call.mockResolvedValueOnce({ text: '{"intent":"wrong"}', sources: ['https://official.com'] }).mockResolvedValueOnce({ text: JSON.stringify(answer), sources: [] });
  expect((await runAiPipeline(admin, { text: 'Add something' })).proposals).toHaveLength(1);
  expect(mocks.call).toHaveBeenCalledTimes(2);
});
it('disables search only for grounding-unavailable errors and returns paste guidance', async () => {
  mocks.call.mockRejectedValue(new GroundingUnavailable());
  const result = await runAiPipeline(admin, { text: 'Find internships' });
  expect(mocks.settings).toHaveBeenCalledWith(admin.userId, { groundingEnabled: false });
  expect(result.assistantMessage).toContain('paste'); expect(result.proposals).toEqual([]);
  mocks.call.mockRejectedValue(new Error('Provider failure'));
  await expect(runAiPipeline(admin, { text: 'Find internships' })).rejects.toThrow('Provider failure');
  expect(mocks.settings).toHaveBeenCalledTimes(1);
});
it('returns LinkedIn notes, stores full transcript only as bounded text history and post-filters demo', async () => {
  mocks.pages.mockResolvedValue({ pages: [], sources: [], urls: ['https://linkedin.com/jobs'], fetchNotes: 'LinkedIn blocks automatic reading. Please paste the text or a screenshot.' });
  mocks.call.mockResolvedValue({ text: JSON.stringify({ ...answer, transcript: 'আবেদন করুন', actions: [{ type: 'sync_gmail' }, { type: 'undo_last' }] }), sources: [] });
  const result = await runAiPipeline(demo, { audio: new File(['RIFF1234WAVE'], 'audio.wav', { type: 'audio/wav' }) });
  expect(result.transcript).toBe('আবেদন করুন'); expect(result.assistantMessage).toContain('LinkedIn blocks');
  expect(result.proposals.map(({ kind }) => kind)).toEqual(['create', 'undo_last']);
  expect(mocks.save).toHaveBeenCalledWith(demo.userId, 'demo', 'আবেদন করুন', result.assistantMessage);
  expect(mocks.call.mock.calls[0][0].parts[0].inlineData.mimeType).toBe('audio/wav');
});
