import 'server-only';
import { GoogleGenAI, ThinkingLevel, type Part, type GenerateContentConfig } from '@google/genai';
import type { CurrentUser } from '../auth/policy';
import { getEnv } from '../env';
import { AiServiceError, AppError } from '../errors';
import { reserveAiRequest } from './usage';

export class GroundingUnavailable extends AppError {
  constructor() { super('INTERNAL', 'Web search is unavailable. Paste a link, text or a screenshot.'); }
}
function providerError(error: unknown) {
  if (!error || typeof error !== 'object') return { status: 0, message: '' };
  return { status: 'status' in error ? Number(error.status) : 0, message: error instanceof Error ? error.message : '' };
}
function configuration(systemInstruction: string, grounded: boolean, model: string, signal: AbortSignal): GenerateContentConfig {
  const thinkingConfig = /^gemini-[34](?:\.|-)/.test(model) ? { thinkingLevel: ThinkingLevel.LOW }
    : /^gemini-2\.5-flash(?:-|$)/.test(model) ? { thinkingBudget: 0 } : undefined;
  return { systemInstruction, temperature: 0.1, maxOutputTokens: 8192, abortSignal: signal,
    httpOptions: { retryOptions: { attempts: 1 } }, automaticFunctionCalling: { disable: true }, automaticContinuation: false,
    ...(thinkingConfig ? { thinkingConfig } : {}),
    ...(grounded ? { tools: [{ googleSearch: {} }] } : { responseMimeType: 'application/json' }),
  };
}
export async function callGemini(input: { systemInstruction: string; parts: Part[]; grounded: boolean; user: CurrentUser; reserve?: () => Promise<void>; singleAttempt?: boolean; signal?: AbortSignal }) {
  const env = getEnv();
  const client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const models = [...new Set([env.GEMINI_MODEL, ...env.GEMINI_FALLBACK_MODELS.split(',').map((value) => value.trim()).filter(Boolean)])];
  const controller = new AbortController();
  const signal = input.signal ? AbortSignal.any([controller.signal, input.signal]) : controller.signal;
  const timer = setTimeout(() => controller.abort(), 45000);
  let status = 0;
  try {
    for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
      if (signal.aborted) break;
      await (input.reserve ? input.reserve() : reserveAiRequest(input.user));
      if (signal.aborted) break;
      try {
        const response = await client.models.generateContent({ model: models[modelIndex], contents: [{ role: 'user', parts: input.parts }],
          config: configuration(input.systemInstruction, input.grounded, models[modelIndex], signal),
        });
        const sources = response.candidates?.flatMap((candidate) => candidate.groundingMetadata?.groundingChunks?.flatMap((chunk) => chunk.web?.uri ? [chunk.web.uri] : []) ?? []) ?? [];
        return { text: response.text ?? '', sources: [...new Set(sources)] };
      } catch (error) {
        const failure = providerError(error);
        status = failure.status;
        if (signal.aborted) break;
        if (input.singleAttempt) break;
        if (input.grounded && /tools?|search|grounding|quota for tools/i.test(failure.message)) throw new GroundingUnavailable();
        if ([429, 500, 503].includes(status) && modelIndex + 1 < models.length) continue;
        break;
      }
    }
  } finally { clearTimeout(timer); }
  if (status === 429 && !signal.aborted) throw new AppError('RATE_LIMITED', 'The AI is busy or the free limit is reached. Try again later or add it manually.');
  throw new AiServiceError();
}
