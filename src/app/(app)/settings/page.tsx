import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/session';
import { getSettings } from '@/lib/data/users';
import { SettingsForm } from '@/components/settings/settings-form';
import { getGmailStatus } from '@/lib/data/gmail';
import { GmailCard } from '@/components/settings/gmail-card';

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getUser();
  if (!user || user.role !== 'admin') redirect('/');
  const [settings, gmail, query] = await Promise.all([getSettings(user.userId), getGmailStatus(user.userId), searchParams]);
  return <div className="space-y-6"><h1 className="page-title">Settings</h1><SettingsForm initialData={settings} /><GmailCard initialData={gmail} outcome={typeof query.gmail === 'string' ? query.gmail : undefined} /></div>;
}
