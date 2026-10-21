import 'server-only';
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import authConfig from './auth.config';
import { getEnv } from '@/lib/env';
import { createDemoUser } from '@/lib/demo/create-demo-user';
import { jwtCallback, signInCallback } from '@/lib/auth/callbacks';

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const env = getEnv();
  return {
    ...authConfig,
    secret: env.AUTH_SECRET,
    providers: [
      Google({ clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET,
        authorization: { params: { scope: 'openid email profile', prompt: 'select_account' } } }),
      Credentials({ id: 'demo', name: 'Demo', credentials: {}, async authorize() {
        const user = await createDemoUser();
        return user ? { id: user._id.toHexString(), name: 'Demo visitor', role: 'demo' } : null;
      } }),
    ],
    callbacks: { ...authConfig.callbacks, signIn: signInCallback, jwt: jwtCallback },
  };
});
