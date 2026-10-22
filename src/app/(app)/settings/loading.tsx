import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return <div className="space-y-6" aria-label="Loading settings"><Skeleton className="h-9 w-32" /><Skeleton className="h-32 max-w-2xl" /><Skeleton className="h-32 max-w-2xl" /></div>;
}
