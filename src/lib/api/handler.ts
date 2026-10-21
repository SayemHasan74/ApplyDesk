import 'server-only';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { getUser } from '../auth/session';
import { AUTH_MODES, CONTENT_TYPES } from '../constants';
import { getEnv } from '../env';
import { AppError } from '../errors';
import { parseInput, readBody } from './input';
import { checkOrigin, mapApiError } from './security';

const optionsSchema = z.object({
  auth: z.enum(AUTH_MODES),
  contentTypes: z.array(z.enum(CONTENT_TYPES)).optional(),
  maxBodyBytes: z.number().int().positive().optional(),
}).strict();
type RouteContext = { params: Promise<Record<string, string | string[]>> };

export function ok<T>(data: T, status = 200) {
  return Response.json({ ok: true, data: data ?? null }, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function authenticate(mode: typeof AUTH_MODES[number], request: Request) {
  if (mode === 'user') return getUser();
  if (mode === 'cron') {
    const actual = Buffer.from(request.headers.get('x-cron-secret') ?? '');
    const expected = Buffer.from(getEnv().CRON_SECRET);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new AppError('UNAUTHENTICATED', 'Invalid cron credentials');
  }
  return null;
}

export function withApi<B extends z.ZodType = z.ZodUndefined, Q extends z.ZodType = z.ZodUndefined>(
  options: z.infer<typeof optionsSchema> & { body?: B; query?: Q },
  handler: (context: {
    user: Awaited<ReturnType<typeof getUser>> | null; body: z.output<B>; query: z.output<Q>;
    request: Request; params: Awaited<RouteContext['params']>; requestId: string;
  }) => unknown | Promise<unknown>,
) {
  optionsSchema.parse({ auth: options.auth, contentTypes: options.contentTypes, maxBodyBytes: options.maxBodyBytes });
  return async (request: Request, context?: RouteContext) => {
    const requestId = randomUUID();
    try {
      if (request.method !== 'GET' && options.auth !== 'cron') checkOrigin(request);
      const user = await authenticate(options.auth, request);
      const maxBytes = options.maxBodyBytes ?? 100 * 1024;
      if (Number(request.headers.get('content-length') ?? 0) > maxBytes) throw new AppError('TOO_LARGE', 'Request body is too large');
      const bodyValue = options.body || request.body !== null
        ? await readBody(request, maxBytes, options.contentTypes ?? ['json']) : undefined;
      const body = parseInput(options.body ?? z.undefined(), options.body ? bodyValue : undefined) as z.output<B>;
      const query = parseInput(options.query ?? z.undefined(), options.query ? Object.fromEntries(new URL(request.url).searchParams) : undefined) as z.output<Q>;
      const result = await handler({ user, body, query, request, params: await (context?.params ?? Promise.resolve({})), requestId });
      if (result instanceof Response) {
        if (result.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
          throw new Error('API handlers must return JSON');
        }
        await result.clone().json();
        const response = new Response(result.body, result);
        response.headers.set('Cache-Control', 'no-store');
        return response;
      }
      return ok(result);
    } catch (error) {
      const mapped = mapApiError(error);
      if (mapped.status >= 500) console.error('[INTERNAL]', requestId);
      return Response.json({ ok: false, error: mapped.error }, { status: mapped.status, headers: { 'Cache-Control': 'no-store' } });
    }
  };
}
