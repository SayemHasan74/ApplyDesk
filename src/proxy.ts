import NextAuth from 'next-auth';
import authConfig from './auth.config';

const { auth: checkAuth } = NextAuth(() => ({ ...authConfig }));
export default checkAuth;

export const config = {
  matcher: ['/((?!api(?:/|$)|_next/static|_next/image|favicon\\.ico|.*\\.[^/]+$).*)'],
};
