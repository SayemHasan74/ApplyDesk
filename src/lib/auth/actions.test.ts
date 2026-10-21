import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ signIn: vi.fn(), signOut: vi.fn(), redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }) }));
vi.mock('@/auth', () => ({ signIn: mocks.signIn, signOut: mocks.signOut }));
vi.mock('next-auth', () => ({ AuthError: class AuthError extends Error { type = 'CredentialsSignin'; } }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
import { AuthError } from 'next-auth';
import { signInWithGoogle, startDemo, signOutAction } from '@/app/(public)/login/actions';

beforeEach(() => { vi.clearAllMocks(); mocks.signIn.mockReset(); mocks.signOut.mockReset(); });
it('makes exactly one server-side sign-in call for each action', async () => {
  await signInWithGoogle();
  expect(mocks.signIn).toHaveBeenCalledExactlyOnceWith('google', { redirectTo: '/' });
  mocks.signIn.mockClear();
  await startDemo();
  expect(mocks.signIn).toHaveBeenCalledExactlyOnceWith('demo', { redirectTo: '/' });
});
it('uses the server sign-out method once and preserves redirect control flow', async () => {
  const redirect = new Error('NEXT_REDIRECT');
  mocks.signOut.mockRejectedValueOnce(redirect);
  await expect(signOutAction()).rejects.toBe(redirect);
  expect(mocks.signOut).toHaveBeenCalledExactlyOnceWith({ redirectTo: '/login' });
});
it('shows a rate-limit message when Credentials rejects a demo', async () => {
  mocks.signIn.mockRejectedValueOnce(new AuthError());
  await expect(startDemo()).rejects.toThrow('REDIRECT:/login?error=DemoLimit');
  expect(mocks.signIn).toHaveBeenCalledTimes(1);
});
