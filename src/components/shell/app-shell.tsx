import { ChevronDown, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import type { CurrentUser } from '@/lib/auth/policy';
import { NavLink } from './nav-link';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

export function AppShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  return <>
    <a href="#main-content" className="sr-only fixed left-4 top-4 z-50 rounded bg-card p-3 focus:not-sr-only">Skip to content</a>
    <header className="sticky top-0 z-30 border-b bg-card">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-7 px-5 sm:px-8">
        <Link href="/" prefetch={false} className="brand py-4 text-[26px] font-semibold tracking-tight">ApplyDesk</Link>
        <nav aria-label="Main navigation" className="order-last flex w-full gap-6 overflow-x-auto sm:order-none sm:w-auto">
          <NavLink href="/">Dashboard</NavLink><NavLink href="/jobs">Jobs</NavLink><NavLink href="/certifications">Certifications</NavLink><NavLink href="/todos">To-do</NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-2"><ThemeToggle lightIcon={<Sun className="size-4" aria-hidden="true" />} darkIcon={<Moon className="size-4" aria-hidden="true" />} /><UserMenu user={user} chevron={<ChevronDown className="size-3 shrink-0" aria-hidden="true" />} /></div>
      </div>
      {user.role === 'demo' && <div className="border-t bg-muted px-5 py-2 text-center text-xs text-muted-foreground">Demo mode: sample data, resets after 24 hours</div>}
    </header>
    <main id="main-content" className="app-width py-8 sm:py-10">{children}</main>
  </>;
}
