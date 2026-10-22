import 'server-only';
import type { Model } from 'mongoose';
import type { CurrentUser } from '../auth/policy';
import { connectDb } from '../db';
import { todayDhaka } from '../dates';
import { getCount, incrementIfBelow } from '../counters';
import { getSettings } from '../data/users';
import { getEnv } from '../env';
import { AppError } from '../errors';
import { User, type UserDocument } from '../models/users';

const users: Model<UserDocument> = User;
export class AiLimitError extends AppError {
  readonly responseCode = 'AI_LIMIT';
  constructor(role: CurrentUser['role']) {
    super('RATE_LIMITED', role === 'demo' ? 'The demo AI limit is reached for today. Everything else still works.' : 'Your daily AI limit is reached. Add items manually or try tomorrow.');
  }
}
export async function reserveAiRequest(user: CurrentUser) {
  const day = todayDhaka();
  if (user.role === 'admin') {
    const settings = await getSettings(user.userId);
    if (!await incrementIfBelow(`ai:admin:${day}`, settings.aiDailyLimit, 3 * 86400)) throw new AiLimitError(user.role);
    return;
  }
  if (!await incrementIfBelow(`ai:demo:${day}`, getEnv().DEMO_AI_DAILY_LIMIT, 3 * 86400)) throw new AiLimitError(user.role);
  await connectDb();
  const updated = await users.findOneAndUpdate({ _id: user.userId, role: 'demo', expiresAt: { $gt: new Date() }, demoAiUsed: { $lt: 2 } },
    { $inc: { demoAiUsed: 1 } }, { returnDocument: 'after' }).select('_id').lean();
  if (!updated) throw new AiLimitError(user.role);
}
export async function getAiUsage(user: CurrentUser) {
  const day = todayDhaka();
  if (user.role === 'admin') {
    const [settings, used] = await Promise.all([getSettings(user.userId), getCount(`ai:admin:${day}`)]);
    return { remaining: Math.max(0, settings.aiDailyLimit - used), limit: settings.aiDailyLimit, scope: 'admin' as const };
  }
  await connectDb();
  const [owner, global] = await Promise.all([
    users.findOne({ _id: user.userId, role: 'demo', expiresAt: { $gt: new Date() } }).select('demoAiUsed').lean(), getCount(`ai:demo:${day}`),
  ]);
  if (!owner) throw new AppError('UNAUTHENTICATED', 'Demo session has expired');
  return { remaining: Math.max(0, Math.min(2 - owner.demoAiUsed, getEnv().DEMO_AI_DAILY_LIMIT - global)), limit: 2, scope: 'demo' as const };
}
