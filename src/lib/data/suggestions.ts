import type { Model } from 'mongoose';
import 'server-only';
import { z } from 'zod';
import { Suggestion, type SuggestionDocument } from '../models/suggestions';
import { connectDb } from '../db';
import { MAX_LIST, PRIORITIES, SUGGESTION_TYPES } from '../constants';
import { objectId } from '../validators/fields';
import { suggestionPayloadSchema } from '../gmail/schema';

export const suggestionItemSchema = z.object({ id: objectId, type: z.enum(SUGGESTION_TYPES), jobId: objectId.nullable(), emailSubject: z.string(), emailFrom: z.string(), emailDate: z.string(), confidence: z.enum(PRIORITIES), payload: suggestionPayloadSchema });
export type SuggestionItem = z.infer<typeof suggestionItemSchema>;
export async function listSuggestions(userId: string) {
  objectId.parse(userId); await connectDb();
  const rows = await model.find({ userId, state: 'pending' }).select('_id type jobId emailSubject emailFrom emailDate confidence payload').sort({ createdAt: -1 }).limit(MAX_LIST).lean();
  return rows.map((row) => suggestionItemSchema.parse({ id: row._id.toString(), type: row.type, jobId: row.jobId ?? null, emailSubject: row.emailSubject, emailFrom: row.emailFrom, emailDate: row.emailDate.toISOString(), confidence: row.confidence, payload: row.payload }));
}
export async function countSuggestions(userId: string) {
  objectId.parse(userId); await connectDb();
  return model.countDocuments({ userId, state: 'pending' });
}

const model: Model<SuggestionDocument> = Suggestion;
