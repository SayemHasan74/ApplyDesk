import 'server-only';
import type { ClientSession, Model } from 'mongoose';
import type { CurrentUser } from '../auth/policy';
import { connectDb } from '../db';
import { User, type UserDocument } from '../models/users';
import { AppError } from '../errors';

const users: Model<UserDocument> = User;
export async function lockActionUser(user: CurrentUser, session: ClientSession) {
  const filter = { _id: user.userId, role: user.role, ...(user.role === 'demo' ? { expiresAt: { $gt: new Date() } } : {}) };
  // The root user's version serializes action batches, undo, and concurrent demo-cap checks.
  const result = await users.updateOne(filter, { $inc: { __v: 1 } }, { session, timestamps: false });
  if (!result.matchedCount) throw new AppError('UNAUTHENTICATED', 'Session has expired');
}
export async function actionTransaction<T>(work: (session: ClientSession) => Promise<T>) {
  const db = await connectDb();
  const session = await db.startSession();
  try { return await session.withTransaction(() => work(session)); }
  finally { await session.endSession(); }
}
