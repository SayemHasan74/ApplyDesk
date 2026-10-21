import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return <div className="space-y-7" aria-label="Loading dashboard"><Skeleton className="h-9 w-40" /><div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{[0, 1, 2, 3].map((key) => <Skeleton key={key} className="h-28 rounded-xl" />)}</div><Skeleton className="h-80 rounded-xl" /></div>;
}
