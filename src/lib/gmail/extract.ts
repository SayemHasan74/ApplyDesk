import { load } from 'cheerio';
import { z } from 'zod';

const partSchema = z.object({ mimeType: z.string().optional(), headers: z.array(z.object({ name: z.string(), value: z.string() })).optional(), body: z.object({ data: z.string().optional() }).optional(), parts: z.array(z.unknown()).optional() });
export const messageSchema = z.object({ id: z.string().min(1).max(200), threadId: z.string().min(1).max(200), internalDate: z.string().optional(), payload: z.unknown() });
function bodies(value: unknown, depth = 0): { plain: string[]; html: string[] } {
  if (depth > 30) return { plain: [], html: [] };
  const part = partSchema.parse(value), result: { plain: string[]; html: string[] } = { plain: [], html: [] };
  if (part.body?.data && (part.mimeType === 'text/plain' || part.mimeType === 'text/html')) {
    const text = Buffer.from(part.body.data, 'base64url').toString('utf8');
    if (part.mimeType === 'text/plain') result.plain.push(text);
    if (part.mimeType === 'text/html') result.html.push(text);
  }
  for (const child of part.parts ?? []) { const next = bodies(child, depth + 1); result.plain.push(...next.plain); result.html.push(...next.html); }
  return result;
}
export function extractMessage(raw: unknown) {
  const message = messageSchema.parse(raw), payload = partSchema.parse(message.payload), parts = bodies(message.payload);
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
