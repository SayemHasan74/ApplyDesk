import { withApi } from '@/lib/api/handler';
import { chatInputSchema, validateMedia } from '@/lib/ai/input';
import { runAiPipeline } from '@/lib/ai/pipeline';
import { getAiUsage } from '@/lib/ai/usage';
import { mapApiError } from '@/lib/api/security';

export const maxDuration = 60;
export const runtime = 'nodejs';
export const POST = withApi({ auth: 'user', contentTypes: ['multipart'], maxBodyBytes: 4_000_000, body: chatInputSchema }, async ({ user, body, request, requestId }) => {
  const input = await validateMedia(body);
  try { return await runAiPipeline(user!, input, request.signal); }
  catch (error) {
    const usage = await getAiUsage(user!);
    const mapped = mapApiError(error);
    if (mapped.status >= 500) console.error('[AI_REQUEST]', requestId);
    return Response.json({ ok: false, error: mapped.error }, { status: mapped.status,
      headers: { 'Cache-Control': 'no-store', 'X-AI-Remaining': String(usage.remaining) },
    });
  }
});
