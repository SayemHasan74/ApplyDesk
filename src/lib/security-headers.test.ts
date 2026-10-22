import { expect, it } from 'vitest';
import nextConfig, { securityHeaders } from '../../next.config';

it('sets every required security header with production CSP only', async () => {
  const headers = Object.fromEntries(securityHeaders(true).map(({ key, value }) => [key, value]));
  expect(headers).toEqual({
    'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), geolocation=(), microphone=(self)',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  });
  expect(securityHeaders(false).some(({ key }) => key === 'Content-Security-Policy')).toBe(false);
  expect(nextConfig.poweredByHeader).toBe(false); expect(nextConfig.reactStrictMode).toBe(true);
  expect(await nextConfig.headers?.()).toEqual([{ source: '/:path*', headers: securityHeaders() }]);
});
