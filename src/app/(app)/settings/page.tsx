import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/session';
import { getSettings } from '@/lib/data/users';
import { SettingsForm } from '@/components/settings/settings-form';

export default async function SettingsPage() {
  const user = await getUser();
  if (!user || user.role !== 'admin') redirect('/');
  return <div className="space-y-6"><h1 className="page-title">Settings</h1><SettingsForm initialData={await getSettings(user.userId)} /></div>;
}
