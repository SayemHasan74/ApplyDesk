'use server';

import { AuthError } from 'next-auth';
import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { signIn, signOut } from '@/auth';

export async function signInWithGoogle() {
  try {
    await signIn('google', { redirectTo: '/' });
  } catch (error) {
    if (error instanceof AuthError) redirect('/login?error=SignInFailed');
    throw error;
  }
}

export async function startDemo() {
  try {
    await signIn('demo', { redirectTo: '/' });
  } catch (error) {
    if (error instanceof AuthError) redirect(`/login?error=${error.type === 'CredentialsSignin' ? 'DemoLimit' : 'SignInFailed'}`);
    throw error;
  }
}

export async function signOutAction() {
  try {
    await signOut({ redirectTo: '/login' });
  } catch (error) {
    if (error instanceof AuthError) {
      console.error('[SIGN_OUT]', randomUUID());
      redirect('/login?error=SignOutFailed');
    }
    throw error;
  }
}
