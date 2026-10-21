import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/session';
import { AppShell } from '@/components/shell/app-shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login');
  return <AppShell user={user}>{children}</AppShell>;
}
