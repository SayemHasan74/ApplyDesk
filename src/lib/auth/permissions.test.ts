import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ auth: vi.fn(), read: vi.fn() }));
vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('../env', () => ({ getEnv: () => ({ CRON_SECRET: 'expected-secret' }), isProduction: () => false }));
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
vi.mock('../data/users', () => ({ getSettings: mocks.read, updateSettings: mocks.read }));
vi.mock('../data/gmail', () => ({ getGmailStatus: mocks.read, getGmailConnection: mocks.read, saveGmailConnection: mocks.read }));
vi.mock('../data/suggestions', () => ({ listSuggestions: mocks.read }));
vi.mock('../data/jobs', () => ({ listJobs: mocks.read }));
import { canUse } from './permissions';
import { ADMIN_CAPABILITIES } from '../constants';
import { GET as settings, PATCH as patchSettings } from '../../app/api/settings/route';
import { GET as connect } from '../../app/api/gmail/connect/route';
import { GET as callback } from '../../app/api/gmail/callback/route';
import { POST as disconnect } from '../../app/api/gmail/disconnect/route';
import { POST as sync } from '../../app/api/gmail/sync/route';
import { POST as cron } from '../../app/api/cron/gmail-sync/route';
import SettingsPage from '../../app/(app)/settings/page';
import InboxPage from '../../app/(app)/inbox/page';

beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ user: { userId: 'b'.repeat(24), role: 'demo', name: 'Demo' }, demoExpiresAt: Date.now() + 3600_000 }); });
it.each(ADMIN_CAPABILITIES)('limits %s to the owner', (capability) => { expect(canUse('demo', capability)).toBe(false); expect(canUse('admin', capability)).toBe(true); });
it('returns 403 for every privileged API when a demo has no cron secret', async () => {
  const cases = [[settings, 'settings', 'GET'], [patchSettings, 'settings', 'PATCH'], [connect, 'gmail/connect', 'GET'], [callback, 'gmail/callback', 'GET'], [disconnect, 'gmail/disconnect', 'POST'], [sync, 'gmail/sync', 'POST'], [cron, 'cron/gmail-sync', 'POST']] as const;
  for (const [handler, path, method] of cases) {
    const response = await handler(new Request(`https://app.example/api/${path}`, { method, headers: { Origin: 'https://app.example' } }));
    expect(response.status, path).toBe(403); expect(response.headers.get('cache-control')).toBe('no-store');
  }
  expect(mocks.read).not.toHaveBeenCalled();
});
it('redirects demos away from privileged pages before loading any owner data', async () => {
  await expect(SettingsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('REDIRECT:/');
  await expect(InboxPage()).rejects.toThrow('REDIRECT:/');
  expect(mocks.read).not.toHaveBeenCalled();
});
