import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/providers';
import { cookies } from 'next/headers';
import { getUser } from '@/lib/auth/session';
import './globals.css';

export const metadata: Metadata = { title: 'ApplyDesk', description: 'Personal jobs, certifications and to-do tracker' };
export const viewport: Viewport = { themeColor: '#4f46e5', width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const theme = cookieStore.get('theme')?.value;
  const hasSession = cookieStore.getAll().some(({ name }) => /^(?:__Secure-)?authjs\.session-token(?:\.\d+)?$/.test(name));
  const user = hasSession ? await getUser() : null;
  return <html lang="en" className={theme === 'dark' ? 'dark' : undefined}><body><Providers key={user?.userId ?? 'anonymous'}>{children}</Providers></body></html>;
}
