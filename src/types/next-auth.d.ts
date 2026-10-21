import type { DefaultSession } from 'next-auth';
import type { CurrentUser, SessionClaims } from '@/lib/auth/policy';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & Pick<CurrentUser, 'userId' | 'role'>;
    demoExpiresAt?: SessionClaims['demoExpiresAt'];
  }
  interface User {
    role?: CurrentUser['role'];
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    userId?: SessionClaims['userId'];
    role?: SessionClaims['role'];
    demoExpiresAt?: SessionClaims['demoExpiresAt'];
  }
}
