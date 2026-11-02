import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { recordingToWav } from './audio';

const decode = vi.fn(), close = vi.fn(), offline = vi.fn();
beforeEach(() => {
  decode.mockResolvedValue({ duration: 0.01 }); close.mockResolvedValue(undefined);
  offline.mockClear();
  vi.stubGlobal('AudioContext', class { decodeAudioData = decode; close = close; });
  vi.stubGlobal('OfflineAudioContext', class {
    destination = {};
    constructor(...args: unknown[]) { offline(...args); }
    createBufferSource() { return { buffer: null, connect: vi.fn(), start: vi.fn() }; }
    async startRendering() { return { getChannelData: () => new Float32Array(160) }; }
  });
});
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
it('resamples decoded audio to mono 16 kHz WAV and closes its audio context', async () => {
  const file = await recordingToWav(new Blob(['encoded audio']));
  expect(file.type).toBe('audio/wav'); expect(file.name).toBe('recording.wav');
  expect(offline).toHaveBeenCalledWith(1, 160, 16000);
  const header = new DataView(await file.arrayBuffer());
  expect(header.getUint16(22, true)).toBe(1); expect(header.getUint32(24, true)).toBe(16000);
  expect(close).toHaveBeenCalledOnce();
});
it('rejects empty recordings without creating an audio context', async () => {
  await expect(recordingToWav(new Blob())).rejects.toThrow('empty');
  expect(decode).not.toHaveBeenCalled();
});
it('rejects undecodable or zero-duration audio and always releases the context', async () => {
  decode.mockRejectedValueOnce(new Error('Decode failed'));
  await expect(recordingToWav(new Blob(['bad']))).rejects.toThrow('Decode failed');
  decode.mockResolvedValueOnce({ duration: 0 });
  await expect(recordingToWav(new Blob(['empty audio']))).rejects.toThrow('no audio');
  expect(close).toHaveBeenCalledTimes(2); expect(offline).not.toHaveBeenCalled();
});
