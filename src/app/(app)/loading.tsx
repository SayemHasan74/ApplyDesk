import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return <div className="space-y-7" aria-label="Loading dashboard"><Skeleton className="h-9 w-40" /><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{[0, 1, 2, 3, 4, 5, 6].map((key) => <Skeleton key={key} className="h-28 rounded-xl" />)}</div><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-80 rounded-xl" /><Skeleton className="h-80 rounded-xl" /></div><Skeleton className="h-48 rounded-xl" /></div>;
}
