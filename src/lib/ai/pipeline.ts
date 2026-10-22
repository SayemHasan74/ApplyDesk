import 'server-only';
import type { Part } from '@google/genai';
import type { CurrentUser } from '../auth/policy';
import { todayDhaka } from '../dates';
import { saveChatExchange } from '../data/chat';
import { updateSettings } from '../data/users';
import { buildContext, type AiContext } from './context';
import { callGemini, GroundingUnavailable } from './gemini';
import { extractJsonObject } from './json';
import type { ChatInput } from './input';
import { readInputPages } from './pages';
import { buildPrompt } from './prompt';
import { modelOutputSchema, type ModelOutput } from './schema';
import { aiResponseSchema } from './proposals';
import { getAiUsage } from './usage';
import { validateOutput } from './validate';
import { resolveProposals } from './resolve';

async function inputParts(input: ChatInput): Promise<Part[]> {
  const parts: Part[] = input.text?.trim() ? [{ text: input.text }] : [];
  for (const media of [input.image, input.audio]) if (media) parts.push({ inlineData: { mimeType: media.type, data: Buffer.from(await media.arrayBuffer()).toString('base64') } });
  return parts;
}
export function shouldGround(input: ChatInput, hasPage: boolean, context: AiContext, user: CurrentUser) {
  return user.role === 'admin' && context.settings.groundingEnabled && !input.image && !input.audio && !hasPage && (input.text?.length ?? 0) < 300;
}
async function generate(user: CurrentUser, input: ChatInput, context: AiContext, pages: Awaited<ReturnType<typeof readInputPages>>) {
  const grounded = shouldGround(input, pages.pages.length > 0, context, user);
  const parts = await inputParts(input);
  const systemInstruction = buildPrompt(context.lists, pages.pages);
  let previous = '';
  const sources = new Set(pages.sources);
  for (let attempt = 0; attempt < 2; attempt++) {
    const repair = attempt ? [{ text: `Return ONLY valid JSON matching the schema; here is your previous answer: ${previous.slice(0, 6000)}` }] : [];
    const response = await callGemini({ user, systemInstruction, parts: [...parts, ...repair], grounded });
    response.sources.forEach((source) => sources.add(source));
    previous = response.text;
    try { return { output: modelOutputSchema.parse(extractJsonObject(previous)), sources: [...sources] }; }
    catch { if (attempt === 1) break; }
  }
  return { output: modelOutputSchema.parse({ intent: 'chat', assistant_message: 'I could not read that. Please try again or add it manually.' }), sources: [...sources] };
}
function chatResponse(message: string): ModelOutput {
  return modelOutputSchema.parse({ intent: 'chat', assistant_message: message });
}
export async function runAiPipeline(user: CurrentUser, input: ChatInput) {
  const pages = await readInputPages(input.text ?? '');
  const context = await buildContext(user);
  let generated: Awaited<ReturnType<typeof generate>>;
  try { generated = await generate(user, input, context, pages); }
  catch (error) {
    if (!(error instanceof GroundingUnavailable) || !shouldGround(input, pages.pages.length > 0, context, user)) throw error;
    await updateSettings(user.userId, { groundingEnabled: false });
    generated = { output: chatResponse('Web search is unavailable. Please paste the page text, a link or a screenshot.'), sources: pages.sources };
  }
  const evidence = { text: input.text ?? '', sources: generated.sources, today: todayDhaka(),
    createdFrom: input.image ? 'image' as const : input.audio ? 'voice' as const : pages.pages.length ? 'url' as const : 'text' as const,
  };
  const result = resolveProposals(validateOutput(generated.output, evidence, context), context, evidence, user.role);
  if (!input.audio) result.transcript = null;
  if (pages.fetchNotes) result.assistantMessage = `${result.assistantMessage} ${pages.fetchNotes}`.slice(0, 4000);
  await saveChatExchange(user.userId, user.role, result.transcript || input.text?.slice(0, 4000) || '', result.assistantMessage);
  const usage = await getAiUsage(user);
  return aiResponseSchema.parse({ ...result, remaining: usage.remaining });
}
