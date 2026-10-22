import { expect, it } from 'vitest';
import { encodeWav } from './wav';

it('writes a mono 16-bit PCM WAV with correct header offsets and byte counts', async () => {
  const blob = encodeWav(new Float32Array([0, -1, 1]), 16000), bytes = await blob.arrayBuffer(), view = new DataView(bytes);
  const word = (offset: number, size: number) => new TextDecoder().decode(bytes.slice(offset, offset + size));
  expect(blob.type).toBe('audio/wav'); expect(blob.size).toBe(50);
  expect(word(0, 4)).toBe('RIFF'); expect(word(8, 4)).toBe('WAVE'); expect(word(12, 4)).toBe('fmt '); expect(word(36, 4)).toBe('data');
  expect(view.getUint32(4, true)).toBe(42); expect(view.getUint32(16, true)).toBe(16); expect(view.getUint16(20, true)).toBe(1);
  expect(view.getUint16(22, true)).toBe(1); expect(view.getUint32(24, true)).toBe(16000); expect(view.getUint32(28, true)).toBe(32000);
  expect(view.getUint16(32, true)).toBe(2); expect(view.getUint16(34, true)).toBe(16); expect(view.getUint32(40, true)).toBe(6);
  expect([44, 46, 48].map((offset) => view.getInt16(offset, true))).toEqual([0, -32768, 32767]);
});
it('clips samples safely, handles nonfinite values and rejects invalid rates', async () => {
  const view = new DataView(await encodeWav(new Float32Array([-2, 2, Number.NaN, Infinity]), 16000).arrayBuffer());
  expect([44, 46, 48, 50].map((offset) => view.getInt16(offset, true))).toEqual([-32768, 32767, 0, 0]);
  expect(encodeWav(new Float32Array(), 16000).size).toBe(44);
  for (const rate of [0, -1, 1.5, 192001]) expect(() => encodeWav(new Float32Array(), rate)).toThrow();
});
