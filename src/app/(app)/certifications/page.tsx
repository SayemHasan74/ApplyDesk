import { getUser } from '@/lib/auth/session';
import { listCerts } from '@/lib/data/certifications';
import { CertificationsView } from '@/components/certifications/certifications-view';

export default async function Certifications() {
  const user = await getUser();
  if (!user) return null;
  return <CertificationsView initialData={await listCerts(user.userId)} />;
}
