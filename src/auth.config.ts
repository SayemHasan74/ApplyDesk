import type { NextAuthConfig } from 'next-auth';
import { isActiveSession, isPublicPath } from '@/lib/auth/policy';

const authConfig = {
  pages: { signIn: '/login', error: '/login' },
  providers: [],
  session: { strategy: 'jwt', maxAge: 90 * 24 * 60 * 60 },
  trustHost: true,
  logger: {
    error() { console.error('[AUTH]', crypto.randomUUID()); },
    warn() { console.error('[AUTH_WARNING]', crypto.randomUUID()); },
  },
  callbacks: {
    authorized({ auth, request }) {
      const active = isActiveSession(auth);
      if (request.nextUrl.pathname === '/login' && active) return Response.redirect(new URL('/', request.url));
      return isPublicPath(request.nextUrl.pathname) || active;
    },
    session({ session, token }) {
      if (token.userId) session.user.userId = token.userId;
      if (token.role) session.user.role = token.role;
      if (token.demoExpiresAt !== undefined) session.demoExpiresAt = token.demoExpiresAt;
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
