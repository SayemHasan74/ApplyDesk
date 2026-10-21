import { z } from 'zod';
import { AppError } from '../errors';
import { rejectUnsafeKeys } from './security';
import type { CONTENT_TYPES } from '../constants';

export async function readBody(request: Request, maxBytes: number, contentTypes: readonly (typeof CONTENT_TYPES[number])[]) {
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > maxBytes)) {
    throw new AppError('TOO_LARGE', 'Request body is too large');
  }
  const type = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  const json = type === 'application/json' && contentTypes.includes('json');
  const multipart = type === 'multipart/form-data' && contentTypes.includes('multipart');
  if (!json && !multipart) throw new AppError('VALIDATION', 'Unsupported content type');
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > maxBytes) {
          await reader.cancel();
          throw new AppError('TOO_LARGE', 'Request body is too large');
        }
        chunks.push(chunk.value);
      }
    } finally { reader.releaseLock(); }
  }
  const bytes = Buffer.concat(chunks);
  try {
    if (json) return JSON.parse(bytes.toString('utf8')) as unknown;
    const form = await new Response(bytes, { headers: { 'content-type': request.headers.get('content-type') ?? '' } }).formData();
    const result: Record<string, FormDataEntryValue | FormDataEntryValue[]> = Object.create(null);
    for (const key of new Set(form.keys())) {
      const values = form.getAll(key);
      result[key] = values.length === 1 ? values[0] : values;
    }
    return result;
  } catch {
    throw new AppError('VALIDATION', 'Malformed request body');
  }
}

export function parseInput<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  rejectUnsafeKeys(value);
  const result = schema.safeParse(value);
  if (!result.success) throw new AppError('VALIDATION', result.error.issues[0]?.message ?? 'Invalid input');
  return result.data;
}
