import { SubmitButton } from '@/components/auth/submit-button';
import { startDemo } from '../login/actions';

export default function Demo() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-12">
      <h1 className="text-3xl font-semibold">Explore ApplyDesk</h1>
      <p>Start a private demo with fictional jobs, certifications, and to-dos. Your demo data deletes automatically after 24 hours.</p>
      <form action={startDemo}><SubmitButton>Enter the demo</SubmitButton></form>
    </main>
  );
}
