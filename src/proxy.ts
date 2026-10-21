import NextAuth from 'next-auth';
import authConfig from './auth.config';

const { auth: checkAuth } = NextAuth(() => ({ ...authConfig }));
export default checkAuth;

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.[^/]+$).*)'],
};
