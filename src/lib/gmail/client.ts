import 'server-only';
import { z } from 'zod';
import { getEnv } from '../env';
import { AppError } from '../errors';

export async function tokenRequest(values: Record<string, string>) {
  const env = getEnv();
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(15_000),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: env.AUTH_GOOGLE_ID, client_secret: env.AUTH_GOOGLE_SECRET, ...values }) });
  if (!response.ok) throw new AppError('FORBIDDEN', 'Reconnect Gmail in Settings.');
  return await response.json() as unknown;
}
export async function getAccessToken(refreshToken: string) {
  const value = await tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken });
  return z.string().min(1).max(8192).parse(value && typeof value === 'object' && 'access_token' in value ? value.access_token : undefined);
}
export async function gmailGet(path: string, token: string) {
  if (!/^messages(?:\?|\/[a-zA-Z0-9_-]+\?)/.test(path)) throw new AppError('VALIDATION', 'Invalid Gmail path');
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new AppError('FORBIDDEN', 'Gmail could not be read. Reconnect or try again.');
  return await response.json() as unknown;
}
export async function revokeToken(token: string) {
  const response = await fetch('https://oauth2.googleapis.com/revoke', { method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(10_000), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token }) });
  return response.ok;
}
