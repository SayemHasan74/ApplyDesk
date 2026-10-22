import type { Model } from 'mongoose';
import 'server-only';
import { connectDb } from '../db';
import { User, type UserDocument } from '../models/users';
import { objectId } from '../validators/fields';
import { AppError } from '../errors';

export async function getGmailConnection(userId: string) {
  objectId.parse(userId); await connectDb();
  const user = await users.findOne({ _id: userId, role: 'admin' }).select('gmail').lean();
  if (!user) throw new AppError('NOT_FOUND', 'User not found');
  return user.gmail;
}
export async function getGmailStatus(userId: string) {
  const gmail = await getGmailConnection(userId);
  return { connected: Boolean(gmail?.refreshTokenEnc), connectedAt: gmail?.connectedAt?.toISOString() ?? null, lastSyncAt: gmail?.lastSyncAt?.toISOString() ?? null };
}
export async function saveGmailConnection(userId: string, refreshTokenEnc: string | null) {
  objectId.parse(userId); await connectDb();
  const result = await users.updateOne({ _id: userId, role: 'admin' }, { $set: { gmail: { refreshTokenEnc, connectedAt: refreshTokenEnc ? new Date() : null, lastSyncAt: null } } });
  if (!result.matchedCount) throw new AppError('NOT_FOUND', 'User not found');
}
export async function setGmailSyncTime(userId: string) {
  objectId.parse(userId); await connectDb();
  await users.updateOne({ _id: userId, role: 'admin', 'gmail.refreshTokenEnc': { $ne: null } }, { $set: { 'gmail.lastSyncAt': new Date() } });
}
export async function acquireGmailSync(userId: string, refreshTokenEnc: string) {
  objectId.parse(userId); await connectDb();
  const now = new Date(), lease = new Date(now.getTime() + 180_000);
  const result = await users.updateOne({ _id: userId, role: 'admin', 'gmail.refreshTokenEnc': refreshTokenEnc, $or: [{ 'gmail.syncLeaseUntil': { $exists: false } }, { 'gmail.syncLeaseUntil': { $lte: now } }] }, { $set: { 'gmail.syncLeaseUntil': lease } });
  if (!result.matchedCount) throw new AppError('CONFLICT', 'Gmail sync is already running or the connection changed.');
  return lease;
}
export async function releaseGmailSync(userId: string, lease: Date) {
  objectId.parse(userId);
  await users.updateOne({ _id: userId, role: 'admin', 'gmail.syncLeaseUntil': lease }, { $unset: { 'gmail.syncLeaseUntil': 1 } });
}

const users: Model<UserDocument> = User;
