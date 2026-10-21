import { AppError } from '../errors';

export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? new URL(request.url).host;
  let originHost: string;
  try {
    if (!origin) throw new Error('Missing origin');
    const parsed = new URL(origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Invalid protocol');
    originHost = parsed.host;
  } catch {
    throw new AppError('FORBIDDEN', 'Request origin is not allowed');
  }
  const site = request.headers.get('sec-fetch-site');
  if (originHost !== host || (site !== null && site !== 'same-origin')) {
    throw new AppError('FORBIDDEN', 'Request origin is not allowed');
  }
}

export function rejectUnsafeKeys(value: unknown): void {
  if (value === null || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (key.startsWith('$') || key.includes('.')) throw new AppError('VALIDATION', 'Invalid input key');
    rejectUnsafeKeys(child);
  }
}

export function mapApiError(error: unknown) {
  if (error instanceof AppError && error.status < 500) return { status: error.status, error: { code: error.code, message: error.message } };
  return { status: 500, error: { code: 'INTERNAL', message: 'An unexpected error occurred' } };
}
