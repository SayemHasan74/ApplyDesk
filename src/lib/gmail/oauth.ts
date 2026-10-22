import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { getEnv } from '../env';

export function stateMatches(actual: string | null, expected: string | undefined) {
  if (!actual || !expected || !/^[\w-]{43}$/.test(actual) || !/^[\w-]{43}$/.test(expected)) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}
export function oauthUrl(state: string) {
  const env = getEnv(), url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({ client_id: env.AUTH_GOOGLE_ID, redirect_uri: `${env.APP_URL}/api/gmail/callback`, response_type: 'code', scope: 'https://www.googleapis.com/auth/gmail.readonly', access_type: 'offline', prompt: 'consent', include_granted_scopes: 'false', state }).toString();
  return url.toString();
}
