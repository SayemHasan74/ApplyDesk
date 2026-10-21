'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const active = usePathname() === href;
  return <Link href={href} prefetch={false} aria-current={active ? 'page' : undefined}
    className={`flex min-h-12 shrink-0 items-center border-b-2 px-1 text-sm ${active ? 'border-foreground font-semibold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{children}</Link>;
}
