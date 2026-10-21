import 'server-only';
import type { NextAuthConfig } from 'next-auth';
import { connectDb } from '../db';
import { getEnv } from '../env';
import { User, type UserDocument } from '../models/users';
import type { Model } from 'mongoose';
import { isAllowedGoogleProfile } from './policy';
import { AppError } from '../errors';

const userModel: Model<UserDocument> = User;

export const signInCallback: NonNullable<NonNullable<NextAuthConfig['callbacks']>['signIn']> = ({ account, profile, user }) => {
  if (account?.provider === 'google') return isAllowedGoogleProfile(profile, getEnv().ALLOWED_EMAIL);
  return account?.provider === 'demo' && user.role === 'demo';
};

type JwtContext = Parameters<NonNullable<NonNullable<NextAuthConfig['callbacks']>['jwt']>>[0];

export const jwtCallback = async ({ token, user, account, profile }: Omit<JwtContext, 'user'> & Partial<Pick<JwtContext, 'user'>>) => {
  if (!user || !account) return token;
  if (account.provider === 'google') {
    if (!isAllowedGoogleProfile(profile, getEnv().ALLOWED_EMAIL)) throw new AppError('FORBIDDEN', 'Account is not allowed');
    const email = profile?.email?.toLowerCase();
    await connectDb();
    const admin = await userModel.findOneAndUpdate({ email }, {
      $setOnInsert: { role: 'admin', email, name: (user.name || 'Owner').slice(0, 120) },
    }, { upsert: true, new: true });
    if (!admin || admin.role !== 'admin' || admin.expiresAt) throw new AppError('FORBIDDEN', 'Account is not allowed');
    token.userId = admin._id.toHexString();
    token.role = 'admin';
    delete token.demoExpiresAt;
  } else if (account.provider === 'demo' && user.role === 'demo' && user.id && /^[a-f0-9]{24}$/.test(user.id)) {
    token.userId = user.id;
    token.role = 'demo';
    token.demoExpiresAt = Date.now() + 23 * 60 * 60 * 1000;
  } else {
    throw new AppError('FORBIDDEN', 'Account is not allowed');
  }
  return token;
};
