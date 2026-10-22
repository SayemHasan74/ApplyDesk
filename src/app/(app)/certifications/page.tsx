import { Plus, Search, Trash2 } from 'lucide-react';
import { todayDhaka } from '@/lib/dates';
import { getUser } from '@/lib/auth/session';
import { listCerts } from '@/lib/data/certifications';
import { CertificationsView } from '@/components/certifications/certifications-view';

export default async function Certifications() {
  const user = await getUser();
  if (!user) return null;
  return <CertificationsView icons={{ add: <Plus className="size-4" aria-hidden="true" />, search: <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />, remove: <Trash2 className="size-4" aria-hidden="true" /> }} initialToday={todayDhaka()} initialData={await listCerts(user.userId)} />;
}
