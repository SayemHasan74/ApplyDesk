import { expect, it, vi } from 'vitest';
import manifest from '../app/manifest';
import { readFileSync, existsSync } from 'node:fs';
import { envSchema } from './env';
vi.mock('server-only', () => ({}));

it('provides the required standalone identity and generated maskable icon', () => {
  expect(manifest()).toEqual({ name: 'ApplyDesk', short_name: 'ApplyDesk', start_url: '/', display: 'standalone', background_color: '#4f46e5', theme_color: '#4f46e5', icons: [
    { src: '/icon-192', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ] });
});
it('keeps deployment environment names complete, Singapore pinned and the old bitmap removed', () => {
  const entries = readFileSync('.env.example', 'utf8').trim().split(/\r?\n/).filter((line) => line && !line.startsWith('#'));
  expect(entries.every((line) => /^[A-Z_]+=$/.test(line))).toBe(true);
  expect(entries.map((line) => line.slice(0, -1)).sort()).toEqual(Object.keys(envSchema.shape).sort());
  expect(JSON.parse(readFileSync('vercel.json', 'utf8'))).toEqual({ regions: ['sin1'] });
  expect(existsSync('src/app/favicon.ico')).toBe(false);
});
