import { expect, it } from 'vitest';
import type { Session } from 'next-auth';
import { NextRequest } from 'next/server';
import authConfig from '@/auth.config';
import { isActiveSession, isAllowedGoogleProfile, isPublicPath } from './policy';

const userId = '0123456789abcdef01234567';
const session = (role: Session['user']['role'], demoExpiresAt?: number): Session => ({
  user: { userId, role, name: 'Visitor' }, expires: '2027-01-01', demoExpiresAt,
});

it('requires a verified Google email and compares the owner case-insensitively', () => {
  expect(isAllowedGoogleProfile({ email: 'OWNER@EXAMPLE.COM', email_verified: true, sub: 'google-id' }, 'owner@example.com')).toBe(true);
  for (const profile of [null, {}, { email: 'other@example.com', email_verified: true }, { email: 'owner@example.com', email_verified: false }, { email: 'owner@example.com', email_verified: 'true' }]) {
    expect(isAllowedGoogleProfile(profile, 'owner@example.com')).toBe(false);
  }
});
it('requires valid claims and a fixed non-expired demo deadline', () => {
  expect(isActiveSession(null, 1000)).toBe(false);
  expect(isActiveSession(session('admin'), 1000)).toBe(true);
  expect(isActiveSession(session('demo', 1001), 1000)).toBe(true);
  expect(isActiveSession(session('demo', 1000), 1000)).toBe(true);
  expect(isActiveSession(session('demo', 999), 1000)).toBe(false);
  expect(isActiveSession(session('demo'), 1000)).toBe(false);
  expect(isActiveSession({ ...session('admin'), user: { userId: 'invalid', role: 'admin' } }, 1000)).toBe(false);
});
it.each(['/login', '/demo', '/api/auth/session', '/api/cron/digest', '/manifest.webmanifest', '/icon.png', '/apple-icon.png'])('allows public path %s', (path) => expect(isPublicPath(path)).toBe(true));
it.each(['/', '/jobs', '/settings', '/login/extra', '/demo-user', '/api/authentication', '/api/cron-secret'])('protects path %s', (path) => expect(isPublicPath(path)).toBe(false));
it('redirects signed-in login visits and rejects expired demos on private pages', () => {
  const login = new NextRequest('https://app.example/login');
  const result = authConfig.callbacks.authorized({ auth: session('admin'), request: login });
  expect(result).toBeInstanceOf(Response);
  if (result instanceof Response) expect(result.headers.get('location')).toBe('https://app.example/');
  expect(authConfig.callbacks.authorized({ auth: session('demo', 1), request: new NextRequest('https://app.example/') })).toBe(false);
  expect(authConfig.callbacks.authorized({ auth: null, request: new NextRequest('https://app.example/demo') })).toBe(true);
});
