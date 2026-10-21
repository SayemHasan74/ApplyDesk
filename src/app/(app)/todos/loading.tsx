import { Skeleton } from '@/components/ui/skeleton';
export default function Loading() {
  return <div className="space-y-6" aria-label="Loading to-dos"><Skeleton className="h-9 w-32" /><Skeleton className="h-28 w-full" /><Skeleton className="h-11 w-64" />{[0, 1, 2, 3, 4].map((key) => <div className="space-y-3 border-t pt-4" key={key}><Skeleton className="h-8 w-32" /><Skeleton className="h-28 w-full" /></div>)}</div>;
}
