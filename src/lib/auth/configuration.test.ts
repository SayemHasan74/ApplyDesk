import { beforeEach, expect, it, vi } from 'vitest';
import type { NextAuthConfig } from 'next-auth';
import type Google from 'next-auth/providers/google';
import type Credentials from 'next-auth/providers/credentials';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({
  init: vi.fn((factory: () => NextAuthConfig) => ({ auth: factory, handlers: {}, signIn: vi.fn(), signOut: vi.fn() })),
  google: vi.fn((options: Parameters<typeof Google>[0]) => options),
  credentials: vi.fn((options: Parameters<typeof Credentials>[0]) => options),
  env: vi.fn(() => ({ AUTH_SECRET: 'secret', AUTH_GOOGLE_ID: 'id', AUTH_GOOGLE_SECRET: 'google-secret' })),
  createDemo: vi.fn(),
}));
vi.mock('next-auth', () => ({ default: mocks.init }));
vi.mock('next-auth/providers/google', () => ({ default: mocks.google }));
vi.mock('next-auth/providers/credentials', () => ({ default: mocks.credentials }));
vi.mock('@/lib/env', () => ({ getEnv: mocks.env }));
vi.mock('@/lib/demo/create-demo-user', () => ({ createDemoUser: mocks.createDemo }));
vi.mock('@/lib/auth/callbacks', () => ({ jwtCallback: vi.fn(), signInCallback: vi.fn() }));
import '@/auth';

const factory = mocks.init.mock.calls[0][0];
beforeEach(() => { mocks.google.mockClear(); mocks.credentials.mockClear(); mocks.createDemo.mockReset(); });
it('defers environment access until request-time initialization', () => {
  expect(mocks.env).not.toHaveBeenCalled();
  const config = factory();
  expect(config.session).toEqual({ strategy: 'jwt', maxAge: 90 * 24 * 60 * 60 });
  expect(config.trustHost).toBe(true);
  expect(mocks.google).toHaveBeenCalledWith({ clientId: 'id', clientSecret: 'google-secret', authorization: { params: { scope: 'openid email profile', prompt: 'select_account' } } });
});
it('ignores malicious Credentials fields and returns only a new demo identity', async () => {
  factory();
  const provider = mocks.credentials.mock.calls[0][0];
  expect(provider).toMatchObject({ id: 'demo', credentials: {} });
  mocks.createDemo.mockResolvedValue({ _id: { toHexString: () => '0123456789abcdef01234567' } });
  const result = await provider.authorize?.({ role: 'admin', userId: 'other' }, new Request('https://app.example'));
  expect(result).toEqual({ id: '0123456789abcdef01234567', name: 'Demo visitor', role: 'demo' });
  expect(mocks.createDemo).toHaveBeenCalledExactlyOnceWith();
  mocks.createDemo.mockResolvedValue(null);
  expect(await provider.authorize?.({}, new Request('https://app.example'))).toBeNull();
});
