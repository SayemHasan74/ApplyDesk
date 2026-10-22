import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ admin: vi.fn(), cookie: vi.fn(), set: vi.fn(), token: vi.fn(), save: vi.fn(), connection: vi.fn(), revoke: vi.fn(), sync: vi.fn() }));
vi.mock('../auth/session', () => ({ getUser: vi.fn(), requireAdmin: mocks.admin }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: mocks.cookie, set: mocks.set }) }));
vi.mock('../env', () => ({ isProduction: () => false, getEnv: () => ({ AUTH_GOOGLE_ID: 'client', AUTH_GOOGLE_SECRET: 'secret', APP_URL: 'https://app.example', CRON_SECRET: 'cron' }) }));
vi.mock('./client', () => ({ tokenRequest: mocks.token, revokeToken: mocks.revoke }));
vi.mock('../crypto', () => ({ encrypt: (value: string) => `encrypted:${value}`, decrypt: () => 'refresh' }));
vi.mock('../data/gmail', () => ({ saveGmailConnection: mocks.save, getGmailConnection: mocks.connection }));
vi.mock('./sync', () => ({ syncGmail: mocks.sync }));
import { GET as connect } from '../../app/api/gmail/connect/route';
import { GET as callback } from '../../app/api/gmail/callback/route';
import { POST as disconnect } from '../../app/api/gmail/disconnect/route';
import { POST as sync } from '../../app/api/gmail/sync/route';
import { AppError } from '../errors';
const state = 'a'.repeat(43), owner = { userId: 'a'.repeat(24), role: 'admin', name: 'Owner' };
const request = (path: string, method = 'GET') => new Request(`https://app.example/api/gmail/${path}`, { method, headers: method === 'POST' ? { Origin: 'https://app.example' } : {} });
beforeEach(() => { vi.resetAllMocks(); mocks.admin.mockResolvedValue(owner); mocks.cookie.mockReturnValue({ value: state }); mocks.token.mockResolvedValue({ refresh_token: 'refresh' }); });
it('connects with exactly the readonly scope and a random, expiring httpOnly state cookie', async () => {
  const response = await connect(request('connect')), url = new URL(response.headers.get('location')!);
  expect(response.status).toBe(302); expect(url.origin).toBe('https://accounts.google.com');
  expect(Object.fromEntries(url.searchParams)).toMatchObject({ scope: 'https://www.googleapis.com/auth/gmail.readonly', access_type: 'offline', prompt: 'consent', include_granted_scopes: 'false', redirect_uri: 'https://app.example/api/gmail/callback' });
  expect(url.searchParams.get('state')).toMatch(/^[\w-]{43}$/); expect(mocks.set).toHaveBeenCalledWith('gmail_oauth_state', url.searchParams.get('state'), expect.objectContaining({ httpOnly: true, maxAge: 600, path: '/api/gmail', sameSite: 'lax' }));
});
it('checks state before token exchange and requires an encrypted refresh token before redirecting', async () => {
  const invalid = await callback(request('callback?state=wrong&code=x'));
  expect(invalid.headers.get('location')).toBe('/settings?gmail=error'); expect(mocks.token).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  const valid = await callback(request(`callback?state=${state}&code=x`));
  expect(valid.headers.get('location')).toBe('/settings?gmail=connected'); expect(mocks.save).toHaveBeenCalledWith(owner.userId, 'encrypted:refresh');
  expect(mocks.set).toHaveBeenCalledWith('gmail_oauth_state', '', expect.objectContaining({ maxAge: 0 }));
  mocks.save.mockClear(); mocks.token.mockResolvedValue({ access_token: 'no-refresh' }); expect((await callback(request(`callback?state=${state}&code=x`))).headers.get('location')).toBe('/settings?gmail=error'); expect(mocks.save).not.toHaveBeenCalled();
});
it('clears the saved connection even when best-effort revocation fails', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.connection.mockResolvedValue({ refreshTokenEnc: 'encrypted' }); mocks.revoke.mockRejectedValue(new Error('private token failure'));
  const response = await disconnect(request('disconnect', 'POST'));
  expect(response.status).toBe(200); expect(mocks.save).toHaveBeenCalledWith(owner.userId, null); expect(log).toHaveBeenCalledWith('[GMAIL_REVOKE]', expect.any(String)); log.mockRestore();
});
it('never exposes Gmail endpoints to demos or unauthenticated sessions', async () => {
  for (const error of [new AppError('FORBIDDEN', 'Administrator access required'), new AppError('UNAUTHENTICATED', 'Sign in required')]) {
    mocks.admin.mockRejectedValue(error);
    expect((await connect(request('connect'))).status).toBe(error.status);
    expect((await sync(request('sync', 'POST'))).status).toBe(error.status);
    expect((await disconnect(request('disconnect', 'POST'))).status).toBe(error.status);
    expect((await callback(request(`callback?state=${state}&code=x`))).status).toBe(error.status);
  }
  expect(mocks.token).not.toHaveBeenCalled(); expect(mocks.sync).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
});
