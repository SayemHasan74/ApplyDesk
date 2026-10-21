'use client';

import { ChevronDown } from 'lucide-react';
import type { CurrentUser } from '@/lib/auth/policy';
import { signOutAction } from '@/app/(public)/login/actions';
import { SubmitButton } from '@/components/auth/submit-button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

export function UserMenu({ user }: { user: CurrentUser }) {
  return <DropdownMenu>
    <DropdownMenuTrigger className="flex min-h-11 max-w-44 items-center gap-2 rounded px-2 text-sm hover:bg-muted" aria-label="Open user menu">
      <span className="truncate">{user.name}</span><ChevronDown className="size-3 shrink-0" aria-hidden="true" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-56 p-3">
      <DropdownMenuLabel className="break-words">{user.name}<span className="mt-1 block text-xs font-normal text-muted-foreground">{user.email}</span></DropdownMenuLabel>
      <span className="my-2 inline-flex rounded border px-2 py-0.5 text-xs capitalize">{user.role}</span>
      <DropdownMenuSeparator /><form action={signOutAction} className="pt-2"><SubmitButton>Sign out</SubmitButton></form>
    </DropdownMenuContent>
  </DropdownMenu>;
}
