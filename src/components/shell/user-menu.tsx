'use client';

import { useRef } from 'react';
import Link from 'next/link';
import type { CurrentUser } from '@/lib/auth/policy';
import { signOutAction } from '@/app/(public)/login/actions';
import { SubmitButton } from '@/components/auth/submit-button';

export function UserMenu({ user, chevron }: { user: CurrentUser; chevron: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  return <details ref={ref} className="relative" onKeyDown={(event) => { if (event.key === 'Escape' && ref.current) { ref.current.open = false; ref.current.querySelector('summary')?.focus(); } }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }}>
    <summary className="flex min-h-11 max-w-44 list-none items-center gap-2 rounded px-2 text-sm hover:bg-muted" aria-label="Open user menu"><span className="truncate">{user.name}</span>{chevron}</summary>
    <div className="absolute right-0 z-50 mt-2 w-56 rounded border bg-card p-3 shadow-md">
      <p className="break-words text-sm font-semibold">{user.name}<span className="mt-1 block text-xs font-normal text-muted-foreground">{user.email}</span></p>
      <span className="my-2 inline-flex rounded border px-2 py-0.5 text-xs capitalize">{user.role}</span>
      {user.role === 'admin' && <Link href="/inbox" prefetch={false} className="block min-h-11 border-t py-3 text-sm underline" onClick={() => { if (ref.current) ref.current.open = false; }}>Inbox</Link>}
      {user.role === 'admin' && <Link href="/settings" prefetch={false} className="block min-h-11 border-t py-3 text-sm underline" onClick={() => { if (ref.current) ref.current.open = false; }}>Settings</Link>}
      <form action={signOutAction} className="border-t pt-2"><SubmitButton>Sign out</SubmitButton></form>
    </div>
  </details>;
}
