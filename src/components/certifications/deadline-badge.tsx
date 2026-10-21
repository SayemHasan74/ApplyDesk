import { deriveCert } from '@/lib/derive';
import type { CertItem } from '@/lib/certifications/items';

export function CertDeadlineBadge({ cert, today }: { cert: CertItem; today: string }) {
  const { badge, daysLeft } = deriveCert(cert, today);
  if (badge === 'none') return null;
  const label = badge === 'closed' ? 'Closed' : daysLeft === 0 ? 'Today' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`;
  return <span className={`deadline-badge badge-${badge}`}>{label}</span>;
}
