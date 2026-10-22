import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { withApi } from '@/lib/api/handler';
import { oauthUrl } from '@/lib/gmail/oauth';
import { isProduction } from '@/lib/env';

export const GET = withApi({ auth: 'user', role: 'admin', redirects: true }, async () => {
  const state = randomBytes(32).toString('base64url');
  (await cookies()).set('gmail_oauth_state', state, { httpOnly: true, secure: isProduction(), sameSite: 'lax', path: '/api/gmail', maxAge: 600 });
  return new Response(null, { status: 302, headers: { Location: oauthUrl(state) } });
});
