import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ generate: vi.fn(), reserve: vi.fn() }));
vi.mock('@google/genai', () => ({ GoogleGenAI: class { models = { generateContent: mocks.generate }; } }));
vi.mock('./usage', () => ({ reserveAiRequest: mocks.reserve }));
vi.mock('../env', () => ({ getEnv: () => ({ GEMINI_API_KEY: 'test-only', GEMINI_MODEL: 'primary', GEMINI_FALLBACK_MODELS: 'fallback, final' }) }));
import { callGemini, GroundingUnavailable } from './gemini';
import { admin } from './test-fixtures';
import { mapApiError } from '../api/security';

const input = { user: admin, parts: [{ text: 'Question' }], systemInstruction: 'System', grounded: false };
beforeEach(() => { vi.resetAllMocks(); mocks.reserve.mockResolvedValue(undefined); mocks.generate.mockResolvedValue({ text: '{}', candidates: [] }); });
afterEach(() => vi.useRealTimers());
it('uses JSON mode, disables implicit retries/continuations, deduplicates sources', async () => {
  mocks.generate.mockResolvedValue({ text: '{}', candidates: [{ groundingMetadata: { groundingChunks: [{ web: { uri: 'https://example.com' } }, { web: { uri: 'https://example.com' } }] } }] });
  expect(await callGemini(input)).toEqual({ text: '{}', sources: ['https://example.com'] });
  const config = mocks.generate.mock.calls[0][0].config;
  expect(config).toMatchObject({ temperature: 0.1, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 0 }, responseMimeType: 'application/json', httpOptions: { retryOptions: { attempts: 1 } }, automaticContinuation: false });
  expect(mocks.reserve.mock.invocationCallOrder[0]).toBeLessThan(mocks.generate.mock.invocationCallOrder[0]);
});
it('makes only one provider call for Gmail and uses its supplied reservation on provider failure', async () => {
  const reserve = vi.fn().mockResolvedValue(undefined);
  mocks.generate.mockRejectedValue(Object.assign(new Error('busy'), { status: 503 }));
  await expect(callGemini({ ...input, singleAttempt: true, reserve })).rejects.toThrow();
  expect(mocks.generate).toHaveBeenCalledTimes(1); expect(reserve).toHaveBeenCalledTimes(1); expect(mocks.reserve).not.toHaveBeenCalled();
  expect(mocks.generate.mock.calls[0][0].config).not.toHaveProperty('thinkingConfig');
});
it('uses search tools without JSON mode, reserves thinking and fallback retries individually', async () => {
  mocks.generate.mockRejectedValueOnce(Object.assign(new Error('thinkingConfig unsupported'), { status: 400 }))
    .mockRejectedValueOnce(Object.assign(new Error('busy'), { status: 503 })).mockResolvedValue({ text: '{}', candidates: [] });
  await callGemini({ ...input, grounded: true });
  expect(mocks.generate.mock.calls.map(([arg]) => arg.model)).toEqual(['primary', 'primary', 'fallback']);
  expect(mocks.generate.mock.calls[1][0].config).not.toHaveProperty('thinkingConfig');
  expect(mocks.generate.mock.calls[0][0].config).not.toHaveProperty('responseMimeType');
  expect(mocks.generate.mock.calls[0][0].config.tools).toEqual([{ googleSearch: {} }]);
  expect(mocks.reserve).toHaveBeenCalledTimes(3);
});
it('maps provider failures without leaking content and never retries 400 errors', async () => {
  mocks.generate.mockRejectedValue(Object.assign(new Error('private provider details'), { status: 400 }));
  const error = await callGemini(input).catch((error: unknown) => error);
  expect(mapApiError(error)).toEqual({ status: 500, error: { code: 'INTERNAL', message: 'The AI could not answer. Please try again or add it manually.' } });
  expect(mocks.generate).toHaveBeenCalledTimes(1);
});
it('tries every configured fallback once on 429 and stops if budget reservation fails', async () => {
  mocks.generate.mockRejectedValue(Object.assign(new Error('busy'), { status: 429 }));
  await expect(callGemini(input)).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  expect(mocks.generate).toHaveBeenCalledTimes(3); expect(mocks.reserve).toHaveBeenCalledTimes(3);
  mocks.generate.mockClear(); mocks.reserve.mockRejectedValue(new Error('Limit'));
  await expect(callGemini(input)).rejects.toThrow('Limit'); expect(mocks.generate).not.toHaveBeenCalled();
});
it('recognizes grounding unavailability without another provider call', async () => {
  mocks.generate.mockRejectedValue(Object.assign(new Error('Search tools are unavailable'), { status: 400 }));
  await expect(callGemini({ ...input, grounded: true })).rejects.toBeInstanceOf(GroundingUnavailable);
  expect(mocks.generate).toHaveBeenCalledTimes(1);
});
it('aborts a hanging provider request after 45 seconds without retry', async () => {
  vi.useFakeTimers();
  mocks.generate.mockImplementation(({ config }) => new Promise((_, reject) => config.abortSignal.addEventListener('abort', () => reject(new Error('aborted')))));
  const result = callGemini(input).catch((error: unknown) => error);
  await vi.advanceTimersByTimeAsync(45000);
  expect(await result).toMatchObject({ code: 'INTERNAL' });
  expect(mocks.generate).toHaveBeenCalledTimes(1);
});
