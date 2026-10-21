import { expect, it, vi } from 'vitest';
vi.mock('next-auth', () => ({ default: () => ({ auth: () => null }) }));
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { config } from '@/proxy';

it.each(['/_next/static/chunk.js', '/_next/image?url=image.png', '/favicon.ico', '/styles/app.css', '/assets/icon.svg', '/manifest.webmanifest'])('excludes asset %s', (url) => {
  expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(false);
});
it.each(['/', '/login', '/demo', '/jobs', '/settings', '/api/auth/callback/google', '/api/cron/digest'])('matches app route %s', (url) => {
  expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(true);
});
