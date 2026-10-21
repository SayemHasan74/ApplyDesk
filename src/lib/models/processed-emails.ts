import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { modelOptions, requiredText, tenantFields, ttlIndex } from './fields';

const schema = new Schema({
  ...tenantFields, gmailMessageId: requiredText(), processedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 60 * 86_400_000) },
}, { ...modelOptions, collection: 'processedEmails' });
schema.index({ userId: 1, gmailMessageId: 1 }, { unique: true });
ttlIndex(schema);
export type ProcessedEmailDocument = InferSchemaType<typeof schema>;
export const ProcessedEmail = (models.ProcessedEmail as Model<ProcessedEmailDocument> | undefined) ?? model('ProcessedEmail', schema);
