import 'server-only';
import { z } from 'zod';

const required = z.string().min(1).max(4096);
export const envSchema = z.object({
  MONGODB_URI: required.regex(/^mongodb(?:\+srv)?:\/\//),
  AUTH_SECRET: required.min(32),
  AUTH_GOOGLE_ID: required,
  AUTH_GOOGLE_SECRET: required,
  ALLOWED_EMAIL: z.email().max(254),
  APP_URL: z.url().max(2048),
  GEMINI_API_KEY: required,
  GEMINI_MODEL: required.default('gemini-2.5-flash'),
  GEMINI_FALLBACK_MODELS: required.default('gemini-2.5-flash-lite'),
  ENCRYPTION_KEY: required.refine((value) => /^[A-Za-z0-9+/]{43}=$/.test(value) && Buffer.from(value, 'base64').length === 32, 'Encryption key must be 32 bytes in base64'),
  CRON_SECRET: required,
  DEMO_AI_DAILY_LIMIT: z.coerce.number().int().positive().default(6),
  TELEGRAM_BOT_TOKEN: required.optional(),
  TELEGRAM_CHAT_ID: required.optional(),
}).strict();

let cached: z.infer<typeof envSchema> | undefined;
export function getEnv() {
  if (cached) return cached;
  const values = Object.fromEntries(Object.keys(envSchema.shape).map((key) => [key, process.env[key] || undefined]));
  cached = envSchema.parse(values);
  return cached;
}
