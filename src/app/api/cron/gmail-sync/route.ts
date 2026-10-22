import type { Model } from 'mongoose';
import { withApi } from '@/lib/api/handler';
import { connectDb } from '@/lib/db';
import { User, type UserDocument } from '@/lib/models/users';
import { syncGmail } from '@/lib/gmail/sync';
import { AppError } from '@/lib/errors';

export const maxDuration = 60;
export const POST = withApi({ auth: 'cron' }, async () => {
  await connectDb();
  const admins = await users.find({ role: 'admin' }).select('_id name role').limit(2).lean();
  if (admins.length !== 1) throw new AppError('NOT_FOUND', 'Administrator not found');
  return syncGmail({ userId: admins[0]._id.toString(), name: admins[0].name, role: 'admin' });
});

const users: Model<UserDocument> = User;
