import type { Model } from 'mongoose';
import 'server-only';
import { connectDb } from '../db';
import { ProcessedEmail, type ProcessedEmailDocument } from '../models/processed-emails';
import { Suggestion, type SuggestionDocument } from '../models/suggestions';
import { User, type UserDocument } from '../models/users';
import { objectId } from '../validators/fields';
import { AppError } from '../errors';
import type { emailSuggestions } from '../gmail/mapping';

export async function unprocessedIds(userId: string, ids: string[]) {
  objectId.parse(userId); await connectDb();
  const rows = await processedModel.find({ userId, gmailMessageId: { $in: ids } }).select('gmailMessageId -_id').limit(25).lean();
  const processed = new Set(rows.map((row) => row.gmailMessageId));
  return ids.filter((id) => !processed.has(id));
}
export async function persistEmailBatch(userId: string, ids: string[], suggestions: ReturnType<typeof emailSuggestions>[number][], refreshTokenEnc: string) {
  objectId.parse(userId); const db = await connectDb(), session = await db.startSession();
  try {
    return await session.withTransaction(async () => {
      const owner = await users.updateOne({ _id: userId, role: 'admin', 'gmail.refreshTokenEnc': refreshTokenEnc }, { $set: { 'gmail.lastSyncAt': new Date() } }, { session });
      if (!owner.matchedCount) throw new AppError('FORBIDDEN', 'Gmail is not connected.');
      const now = new Date();
      if (suggestions.length) await suggestionsModel.bulkWrite(suggestions.map((row) => ({ updateOne: { filter: { userId, gmailMessageId: row.gmailMessageId, type: row.type, suggestionKey: row.suggestionKey }, update: { $setOnInsert: { ...row, userId } }, upsert: true } })), { session });
      await processedModel.bulkWrite(ids.map((id) => ({ updateOne: { filter: { userId, gmailMessageId: id }, update: { $setOnInsert: { userId, gmailMessageId: id, processedAt: now, expiresAt: new Date(now.getTime() + 60 * 86400_000) } }, upsert: true } })), { session });
    });
  } finally { await session.endSession(); }
}

const users: Model<UserDocument> = User;

const suggestionsModel: Model<SuggestionDocument> = Suggestion;

const processedModel: Model<ProcessedEmailDocument> = ProcessedEmail;
