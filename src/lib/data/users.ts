import 'server-only';
import type { Model, ClientSession } from 'mongoose';
import { connectDb } from '../db';
import { AppError } from '../errors';
import { User, type UserDocument } from '../models/users';
import { settingsSchema, settingsPatchSchema, type SettingsPatch } from '../validators/settings';
import { objectId } from '../validators/fields';

const model: Model<UserDocument> = User;
export async function getSettings(userId: string, session?: ClientSession) {
  objectId.parse(userId);
  await connectDb();
  const query = model.findOne({ _id: userId, role: 'admin' }).select('settings -_id');
  if (session) query.session(session);
  const user = await query.lean();
  if (!user) throw new AppError('NOT_FOUND', 'Settings not found');
  return settingsSchema.parse(user.settings);
}
export async function updateSettings(userId: string, patch: SettingsPatch, session?: ClientSession) {
  objectId.parse(userId);
  const values = settingsPatchSchema.parse(patch);
  const changes: Record<string, unknown> = {};
  if (values.groundingEnabled !== undefined) changes['settings.groundingEnabled'] = values.groundingEnabled;
  if (values.aiDailyLimit !== undefined) changes['settings.aiDailyLimit'] = values.aiDailyLimit;
  if (!Object.keys(changes).length) return getSettings(userId, session);
  await connectDb();
  const user = await model.findOneAndUpdate({ _id: userId, role: 'admin' }, { $set: changes }, { returnDocument: 'after', runValidators: true, ...(session ? { session } : {}) }).select('settings -_id').lean();
  if (!user) throw new AppError('NOT_FOUND', 'Settings not found');
  return settingsSchema.parse(user.settings);
}
