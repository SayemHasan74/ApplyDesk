import { cookies } from 'next/headers';
import { z } from 'zod';
import { withApi } from '@/lib/api/handler';
import { stateMatches } from '@/lib/gmail/oauth';
import { tokenRequest } from '@/lib/gmail/client';
import { encrypt } from '@/lib/crypto';
import { getEnv } from '@/lib/env';
import { saveGmailConnection } from '@/lib/data/gmail';

const querySchema = z.object({ state: z.string().max(128).optional(), code: z.string().min(1).max(4096).optional(), error: z.string().max(120).optional(), error_description: z.string().max(1000).optional(), scope: z.string().max(2048).optional(), authuser: z.string().max(120).optional(), prompt: z.string().max(120).optional() }).strict();
export const GET = withApi({ auth: 'user', role: 'admin', redirects: true, errorRedirect: '/settings?gmail=error', query: querySchema }, async ({ user, query }) => {
  const jar = await cookies();
  const expected = jar.get('gmail_oauth_state')?.value;
  jar.set('gmail_oauth_state', '', { path: '/api/gmail', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 0 });
  if (query.error || !stateMatches(query.state ?? null, expected)) throw new Error('Invalid OAuth state');
  const code = z.string().min(1).max(4096).parse(query.code);
  const tokens = z.object({ refresh_token: z.string().min(1).max(8192) }).parse(await tokenRequest({ code, grant_type: 'authorization_code', redirect_uri: `${getEnv().APP_URL}/api/gmail/callback` }));
  await saveGmailConnection(user!.userId, encrypt(tokens.refresh_token));
  return new Response(null, { status: 303, headers: { Location: '/settings?gmail=connected' } });
});
