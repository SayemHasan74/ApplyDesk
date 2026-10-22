'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

export default function AppError({ reset }: { reset: () => void }) {
  useEffect(() => { toast.error('Could not load your data. Please try again.'); }, []);
  return <section className="panel p-8" role="alert"><h1 className="page-title">Could not load your data</h1><p className="my-4 text-sm text-muted-foreground">Please check your connection and try again.</p><button type="button" className="action-button" onClick={reset}>Try again</button></section>;
}
