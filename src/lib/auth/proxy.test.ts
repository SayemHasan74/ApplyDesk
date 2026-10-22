import { expect, it, vi } from 'vitest';
vi.mock('next-auth', () => ({ default: () => ({ auth: () => null }) }));
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { config } from '@/proxy';

it.each(['/_next/static/chunk.js', '/_next/image?url=image.png', '/favicon.ico', '/styles/app.css', '/assets/icon.svg', '/manifest.webmanifest', '/api/settings', '/api/jobs', '/api/auth/callback/google', '/api/cron/digest'])('excludes asset %s', (url) => {
  expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(false);
});
it.each(['/', '/login', '/demo', '/jobs', '/settings'])('matches app route %s', (url) => {
  expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(true);
});
