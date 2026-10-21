import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { PRIORITIES, SUGGESTION_STATES, SUGGESTION_TYPES } from '../constants';
import { modelOptions, nullableText, requiredText, tenantFields, ttlIndex } from './fields';

const schema = new Schema({
  ...tenantFields,
  type: { type: String, enum: SUGGESTION_TYPES, required: true },
  jobId: { ...nullableText(24), match: /^[a-f0-9]{24}$/ },
  gmailMessageId: requiredText(), gmailThreadId: requiredText(),
  emailSubject: requiredText(4000), emailFrom: requiredText(254), emailDate: { type: Date, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  confidence: { type: String, enum: PRIORITIES, required: true },
  state: { type: String, enum: SUGGESTION_STATES, default: 'pending' },
}, modelOptions);
schema.index({ userId: 1, state: 1 });
schema.index({ userId: 1, gmailMessageId: 1, type: 1 }, { unique: true });
ttlIndex(schema);
export type SuggestionDocument = InferSchemaType<typeof schema>;
export const Suggestion = (models.Suggestion as Model<SuggestionDocument> | undefined) ?? model('Suggestion', schema);
