'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: {
    queries: { staleTime: 5 * 60_000, gcTime: 15 * 60_000, refetchOnWindowFocus: false, refetchOnReconnect: false, retry: 1 },
    mutations: { retry: false },
  } }));
  return <QueryClientProvider client={client}>{children}<Toaster /></QueryClientProvider>;
}
