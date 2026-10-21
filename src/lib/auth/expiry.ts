import 'server-only';
import { cache } from 'react';
import type { Model } from 'mongoose';
import type { Role } from '../constants';
import { connectDb } from '../db';
import { AppError } from '../errors';
import { User, type UserDocument } from '../models/users';

const model: Model<UserDocument> = User;

export const getExpiryFor = cache(async (userId: string, role: Role) => {
  if (role === 'admin') return null;
  await connectDb();
  const user = await model.findOne({ _id: userId, role: 'demo' }).select('expiresAt').lean();
  if (!user?.expiresAt || user.expiresAt.getTime() <= Date.now()) throw new AppError('UNAUTHENTICATED', 'Demo session has expired');
  return user.expiresAt;
});
