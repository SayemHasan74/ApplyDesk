import 'server-only';
import { z } from 'zod';
import { AppError } from '../errors';

const file = z.instanceof(File).optional();
export const chatInputSchema = z.object({ text: z.string().max(15000).optional(), image: file, audio: file }).strict()
  .refine((value) => Boolean(value.text?.trim() || value.image || value.audio), 'Provide text, an image or audio');
export type ChatInput = z.infer<typeof chatInputSchema>;
export function matchesMagic(bytes: Uint8Array, mime: string) {
  const head = Buffer.from(bytes);
  if (mime === 'image/jpeg') return head.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  if (mime === 'image/png') return head.subarray(0, 4).equals(Buffer.from([137, 80, 78, 71]));
  if (mime === 'image/webp' || mime === 'audio/wav') return head.length >= 12 && head.toString('ascii', 0, 4) === 'RIFF'
    && head.toString('ascii', 8, 12) === (mime === 'image/webp' ? 'WEBP' : 'WAVE');
  return false;
}
export async function validateMedia(input: ChatInput) {
  for (const [kind, media] of [['image', input.image], ['audio', input.audio]] as const) {
    if (!media) continue;
    const allowed = kind === 'image' ? ['image/jpeg', 'image/png', 'image/webp'] : ['audio/wav'];
    if (!media.size || media.size > (kind === 'image' ? 1_500_000 : 2_000_000) || !allowed.includes(media.type)
      || !matchesMagic(new Uint8Array(await media.slice(0, 12).arrayBuffer()), media.type)) throw new AppError('VALIDATION', `Invalid ${kind} format or size`);
  }
  return input;
}
