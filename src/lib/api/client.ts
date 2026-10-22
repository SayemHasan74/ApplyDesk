export async function apiRequest(url: string, method = 'GET', body?: unknown) {
  const response = await fetch(url, { method, cache: 'no-store',
    ...(method === 'GET' ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) }),
  });
  const payload: unknown = await response.json();
  const { z } = await import('zod');
  const error = z.object({ ok: z.literal(false), error: z.object({ code: z.string().max(120), message: z.string().max(4000) }).strict() }).strict().safeParse(payload);
  if (!response.ok || error.success) throw new Error(error.success ? error.data.error.message : 'Request failed. Please try again.');
  return z.object({ ok: z.literal(true), data: z.unknown() }).strict().parse(payload).data;
}
