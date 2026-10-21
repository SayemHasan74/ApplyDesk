import { compareCerts } from '../sort';
import { deriveCert } from '../derive';
import type { CertItem } from './items';

function compareCertItems(a: CertItem, b: CertItem) {
  return compareCerts({ ...a, createdAt: new Date(a.createdAt), updatedAt: new Date(a.updatedAt) },
    { ...b, createdAt: new Date(b.createdAt), updatedAt: new Date(b.updatedAt) });
}
export function visibleCerts(items: CertItem[], search: string, status: string) {
  const term = search.trim().toLocaleLowerCase();
  return items.filter((item) => (status === 'all' || item.status === status)
    && `${item.name} ${item.provider}`.toLocaleLowerCase().includes(term)).sort(compareCertItems);
}
export function certsSummary(items: CertItem[], today: string) {
  const active = items.filter((item) => item.status === 'wishlist' || item.status === 'planned');
  return { due: active.filter((item) => { const { daysLeft } = deriveCert(item, today); return daysLeft !== null && daysLeft >= 0 && daysLeft <= 7; }).length,
    closest: active.filter((item) => item.registrationDeadline).sort(compareCertItems).slice(0, 5),
  };
}
