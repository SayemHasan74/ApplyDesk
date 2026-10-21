import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-12" aria-label="Loading sign-in"><Skeleton className="h-9 w-40" /><Skeleton className="h-12 w-full" /><Skeleton className="h-9 w-40" /><Skeleton className="h-9 w-32" /></main>;
}
