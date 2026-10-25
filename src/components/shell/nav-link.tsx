'use client';

import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const active = usePathname() === href;
  return <Link href={href} prefetch={false} aria-current={active ? 'page' : undefined}
    className={`flex min-h-12 shrink-0 items-center border-b-2 px-1 text-sm font-medium transition-colors ${active ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{children}<NavigationProgress /></Link>;
}

function NavigationProgress() {
  const { pending } = useLinkStatus();
  return pending ? <span className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 animate-pulse bg-foreground motion-reduce:animate-none" role="status"><span className="sr-only">Opening page…</span></span> : null;
}
