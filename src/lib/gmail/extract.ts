import { load } from 'cheerio';
import { z } from 'zod';

const partSchema = z.object({ mimeType: z.string().max(120).optional(), headers: z.array(z.object({ name: z.string().max(120), value: z.string().max(4000) }).strict()).max(200).optional(), body: z.object({ data: z.string().max(50_000_000).optional() }).strict().optional(), parts: z.array(z.unknown()).max(200).optional() }).strict();
const messageSchema = z.object({ id: z.string().min(1).max(200), threadId: z.string().min(1).max(200), internalDate: z.string().max(24).optional(), payload: z.unknown() }).strict();
function readPart(value: unknown) {
  const raw = z.record(z.string(), z.unknown()).parse(value), body = raw.body && typeof raw.body === 'object' && 'data' in raw.body ? { data: raw.body.data } : undefined;
  const headers = Array.isArray(raw.headers) ? raw.headers.map((item: unknown) => {
    const header = z.object({ name: z.string(), value: z.string() }).strict().parse(item);
    return { name: header.name, value: header.value.slice(0, 4000) };
  }) : undefined;
  return partSchema.parse({ mimeType: raw.mimeType, headers, body, parts: raw.parts });
}
function bodies(value: unknown, depth = 0): { plain: string[]; html: string[] } {
  if (depth > 30) return { plain: [], html: [] };
  const part = readPart(value), result: { plain: string[]; html: string[] } = { plain: [], html: [] };
  if (part.body?.data && (part.mimeType === 'text/plain' || part.mimeType === 'text/html')) {
    const text = Buffer.from(part.body.data, 'base64url').toString('utf8');
    if (part.mimeType === 'text/plain') result.plain.push(text);
    if (part.mimeType === 'text/html') result.html.push(text);
  }
  for (const child of part.parts ?? []) { const next = bodies(child, depth + 1); result.plain.push(...next.plain); result.html.push(...next.html); }
  return result;
}
export function extractMessage(raw: unknown) {
  const wire = z.record(z.string(), z.unknown()).parse(raw);
  const message = messageSchema.parse({ id: wire.id, threadId: wire.threadId, internalDate: wire.internalDate, payload: wire.payload }), payload = readPart(message.payload), parts = bodies(message.payload);
  const header = (name: string) => payload.headers?.find((item) => item.name.toLowerCase() === name)?.value ?? '';
  let body = parts.plain.join('\n');
  if (!body) { const html = load(parts.html.join('\n')); html('script,style,head').remove(); html('br').replaceWith('\n'); body = html.root().text(); }
  const date = new Date(header('date') || Number(message.internalDate));
  return { id: message.id, threadId: message.threadId, subject: header('subject').slice(0, 4000), from: header('from').slice(0, 254), date: Number.isNaN(date.getTime()) ? new Date(0) : date, body: body.slice(0, 3000) };
}
export type GmailMessage = ReturnType<typeof extractMessage>;
export async function mapFive<T, R>(items: T[], work: (item: T) => Promise<R>) {
  const result: R[] = [];
  for (let i = 0; i < items.length; i += 5) result.push(...await Promise.all(items.slice(i, i + 5).map(work)));
  return result;
}
