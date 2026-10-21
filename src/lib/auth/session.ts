import 'server-only';
import { z } from 'zod';
import { ROLES } from '../constants';
import { AppError } from '../errors';

export const userSchema = z.object({ id: z.string().regex(/^[a-f0-9]{24}$/), role: z.enum(ROLES), name: z.string().max(120), email: z.email().max(254).optional() }).strict();

export async function getUser(): Promise<z.infer<typeof userSchema>> {
  throw new AppError('UNAUTHENTICATED', 'Sign in required');
}
