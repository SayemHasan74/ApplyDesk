import { z } from 'zod';
import type { Session } from 'next-auth';
import { ROLES } from '../constants';

export const sessionClaimsSchema = z.object({
  userId: z.string().regex(/^[a-f0-9]{24}$/), role: z.enum(ROLES),
  demoExpiresAt: z.number().int().positive().optional(),
}).strict();
export const currentUserSchema = sessionClaimsSchema.omit({ demoExpiresAt: true }).extend({
  name: z.string().max(120), email: z.email().max(254).optional(),
}).strict();
export type SessionClaims = z.infer<typeof sessionClaimsSchema>;
export type CurrentUser = z.infer<typeof currentUserSchema>;

export function isAllowedGoogleProfile(profile: unknown, allowedEmail: string) {
  if (!profile || typeof profile !== 'object') return false;
  const result = z.object({ email: z.email().max(254), email_verified: z.literal(true) }).strict().safeParse({
    email: 'email' in profile ? profile.email : undefined,
    email_verified: 'email_verified' in profile ? profile.email_verified : undefined,
  });
  return result.success && result.data.email.toLowerCase() === allowedEmail.toLowerCase();
}

export function isActiveSession(session: Session | null, now = Date.now()) {
  const result = sessionClaimsSchema.safeParse({
    userId: session?.user?.userId, role: session?.user?.role, demoExpiresAt: session?.demoExpiresAt,
  });
  return result.success && (result.data.role === 'admin' || (result.data.demoExpiresAt !== undefined && now <= result.data.demoExpiresAt));
}

export function isPublicPath(path: string) {
  return path === '/login' || path === '/demo' || path === '/api/auth' || path.startsWith('/api/auth/')
    || path === '/api/cron' || path.startsWith('/api/cron/') || path === '/manifest.webmanifest'
    || path.startsWith('/icon') || path.startsWith('/apple-icon');
}
