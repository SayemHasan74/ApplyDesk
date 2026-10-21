import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return <div className="space-y-6" aria-label="Loading jobs"><div className="flex justify-between"><Skeleton className="h-9 w-32" /><Skeleton className="h-11 w-28" /></div><Skeleton className="h-11 w-full" />{[0, 1, 2, 3, 4].map((key) => <Skeleton key={key} className="h-28 w-full border-b" />)}</div>;
}
