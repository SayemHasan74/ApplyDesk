'use client';

import { useSyncExternalStore } from 'react';

function subscribe(listener: () => void) {
  window.addEventListener('applydesk-theme', listener);
  return () => window.removeEventListener('applydesk-theme', listener);
}
const snapshot = () => document.documentElement.classList.contains('dark');
const serverSnapshot = () => false;

export function ThemeToggle({ lightIcon, darkIcon }: { lightIcon: React.ReactNode; darkIcon: React.ReactNode }) {
  const dark = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    document.cookie = `theme=${next ? 'dark' : 'light'}; Path=/; Max-Age=31536000; SameSite=Lax`;
    window.dispatchEvent(new Event('applydesk-theme'));
  }
  return <button type="button" className="flex size-11 items-center justify-center rounded hover:bg-muted" onClick={toggle} aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}>
    {dark ? lightIcon : darkIcon}
  </button>;
}
