import { Skeleton } from '@/components/ui/skeleton';
export default function Loading() {
  return <div className="space-y-6" aria-label="Loading inbox"><Skeleton className="h-9 w-32" />{[0, 1, 2].map((key) => <Skeleton key={key} className="h-56 w-full" />)}</div>;
}
