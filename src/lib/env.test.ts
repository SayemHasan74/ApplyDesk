import { afterEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { envSchema } from './env';

const requiredEnv = {
  MONGODB_URI: 'mongodb://localhost/applydesk', AUTH_SECRET: 'a'.repeat(32),
  AUTH_GOOGLE_ID: 'client-id', AUTH_GOOGLE_SECRET: 'client-secret',
  ALLOWED_EMAIL: 'owner@example.com', APP_URL: 'https://app.example',
  GEMINI_API_KEY: 'api-key', ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'), CRON_SECRET: 'cron-secret',
};
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
it('applies model and usage defaults', () => {
  expect(envSchema.parse(requiredEnv)).toMatchObject({ GEMINI_MODEL: 'gemini-2.5-flash', GEMINI_FALLBACK_MODELS: 'gemini-2.5-flash-lite', DEMO_AI_DAILY_LIMIT: 6 });
});
it('requires mandatory variables, a 32-byte key and a positive integer limit', () => {
  for (const APP_URL of ['javascript:alert(1)', 'data:text/html,attack', 'https://app.example/path', 'https://app.example/']) expect(envSchema.safeParse({ ...requiredEnv, APP_URL }).success).toBe(false);
  expect(envSchema.safeParse({ ...requiredEnv, MONGODB_URI: undefined }).success).toBe(false);
  expect(envSchema.safeParse({ ...requiredEnv, ENCRYPTION_KEY: Buffer.alloc(16).toString('base64') }).success).toBe(false);
  expect(envSchema.safeParse({ ...requiredEnv, DEMO_AI_DAILY_LIMIT: -1 }).success).toBe(false);
  expect(envSchema.safeParse({ ...requiredEnv, DEMO_AI_DAILY_LIMIT: 1.5 }).success).toBe(false);
  expect(envSchema.safeParse({ ...requiredEnv, unknown: true }).success).toBe(false);
});
it('does not read secrets on import and memoizes the first successful request-time read', async () => {
  vi.resetModules();
  const { getEnv } = await import('./env');
  for (const [key, value] of Object.entries(requiredEnv)) vi.stubEnv(key, value);
  for (const key of ['GEMINI_MODEL', 'GEMINI_FALLBACK_MODELS', 'DEMO_AI_DAILY_LIMIT']) vi.stubEnv(key, '');
  const first = getEnv();
  vi.stubEnv('GEMINI_API_KEY', 'changed');
  expect(getEnv()).toBe(first);
  expect(getEnv().GEMINI_API_KEY).toBe('api-key');
});
