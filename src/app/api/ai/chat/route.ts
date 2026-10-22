import { withApi } from '@/lib/api/handler';
import { chatInputSchema, validateMedia } from '@/lib/ai/input';
import { runAiPipeline } from '@/lib/ai/pipeline';

export const maxDuration = 60;
export const runtime = 'nodejs';
export const POST = withApi({ auth: 'user', contentTypes: ['multipart'], maxBodyBytes: 4_000_000, body: chatInputSchema }, async ({ user, body }) => {
  return runAiPipeline(user!, await validateMedia(body));
});
