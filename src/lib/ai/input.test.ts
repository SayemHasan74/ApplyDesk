import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { chatInputSchema, matchesMagic, validateMedia } from './input';

it.each([['image/jpeg', Buffer.from([255, 216, 255])], ['image/png', Buffer.from([137, 80, 78, 71])],
  ['image/webp', Buffer.from('RIFF1234WEBP')], ['audio/wav', Buffer.from('RIFF1234WAVE')]])('checks declared %s bytes', async (mime, bytes) => {
  expect(matchesMagic(bytes, mime)).toBe(true);
  expect(matchesMagic(Buffer.from('invalid bytes'), mime)).toBe(false);
  const field = mime.startsWith('image') ? 'image' : 'audio';
  await expect(validateMedia({ [field]: new File([bytes], 'media', { type: mime }) })).resolves.toBeTruthy();
});
it('rejects MIME mismatches, oversized files, empty media and duplicate fields', async () => {
  await expect(validateMedia({ image: new File(['RIFF1234WAVE'], 'fake.png', { type: 'image/png' }) })).rejects.toMatchObject({ code: 'VALIDATION' });
  await expect(validateMedia({ audio: new File([new Uint8Array(2_000_001)], 'huge.wav', { type: 'audio/wav' }) })).rejects.toThrow();
  await expect(validateMedia({ image: new File([], 'empty.png', { type: 'image/png' }) })).rejects.toThrow();
  expect(chatInputSchema.safeParse({ text: ['a', 'b'] }).success).toBe(false);
});
it('requires content, permits long pasted descriptions and rejects unknown form fields', () => {
  expect(chatInputSchema.safeParse({ text: 'a'.repeat(15000) }).success).toBe(true);
  for (const value of [{}, { text: ' ' }, { text: 'a'.repeat(15001) }, { text: 'ok', unknown: 1 }]) expect(chatInputSchema.safeParse(value).success).toBe(false);
});
