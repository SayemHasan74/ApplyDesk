import { afterEach, expect, it, vi } from 'vitest';
import { compressImage, imageDimensions, imageQualities } from './image';

afterEach(() => vi.unstubAllGlobals());
it('scales the longest dimension to 1600, preserves aspect ratio and never upscales', () => {
  expect(imageDimensions(3200, 1600)).toEqual({ width: 1600, height: 800 });
  expect(imageDimensions(800, 3200)).toEqual({ width: 400, height: 1600 });
  expect(imageDimensions(500, 300)).toEqual({ width: 500, height: 300 });
  expect(imageDimensions(1, 10000).width).toBe(1); expect(() => imageDimensions(0, 5)).toThrow();
  expect(imageQualities()).toEqual([0.8, 0.7, 0.6, 0.5]);
});
it('steps quality without extra work after a fitting JPEG and closes the bitmap', async () => {
  const close = vi.fn(), qualities: number[] = [];
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 3200, height: 2000, close }));
  const canvas = { width: 0, height: 0, getContext: () => ({ fillRect: vi.fn(), drawImage: vi.fn(), fillStyle: '' }),
    toBlob: (callback: (blob: Blob) => void, type: string, quality: number) => { qualities.push(quality); callback(new Blob([new Uint8Array(quality > .6 ? 1_200_001 : 100)], { type })); },
  };
  vi.stubGlobal('document', { createElement: () => canvas });
  expect((await compressImage(new File(['image'], 'a.png', { type: 'image/png' }))).type).toBe('image/jpeg');
  expect(qualities).toEqual([0.8, 0.7, 0.6]); expect(canvas.width).toBe(1600); expect(close).toHaveBeenCalledTimes(1);
});
it('rejects oversized results after quality .5 and releases bitmap resources on failure', async () => {
  const close = vi.fn(); vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 10, height: 10, close }));
  const encode = vi.fn((callback: (blob: Blob) => void) => callback(new Blob([new Uint8Array(1_200_001)])));
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ({ fillRect: vi.fn(), drawImage: vi.fn() }), toBlob: encode }) });
  await expect(compressImage(new File(['image'], 'a.png', { type: 'image/png' }))).rejects.toThrow('too large');
  expect(encode).toHaveBeenCalledTimes(4); expect(close).toHaveBeenCalledTimes(1);
});
