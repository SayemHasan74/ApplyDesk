import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  agentRules: false,
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    const headers = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(self)' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
    ];
    if (process.env.NODE_ENV === 'production') headers.push({
      key: 'Content-Security-Policy',
      value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    });
    return [{ source: '/:path*', headers }];
  },
};

export default nextConfig;
