import { SubmitButton } from '@/components/auth/submit-button';
import { signInWithGoogle, startDemo } from './actions';

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { error } = await searchParams;
  const message = error === 'AccessDenied' ? 'This Google account is not allowed. Please use the owner’s account.'
    : error === 'DemoLimit' || error === 'CredentialsSignin' ? 'The demo limit has been reached. Please try again next hour.'
    : error === 'SignOutFailed' ? 'Sign-out failed. Please try again.'
    : error ? 'Sign-in could not be completed. Please try again.' : null;
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-12">
      <h1 className="text-3xl font-semibold">ApplyDesk</h1>
      <p>Track jobs, certifications, and to-dos in one place. Sign in as the owner or explore a private demo with fictional data.</p>
      {message && <p role="alert">{message}</p>}
      <form action={signInWithGoogle}><SubmitButton>Sign in with Google</SubmitButton></form>
      <form action={startDemo}><SubmitButton>Try the demo</SubmitButton></form>
    </main>
  );
}
