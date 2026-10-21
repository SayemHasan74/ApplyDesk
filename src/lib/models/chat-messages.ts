import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { CHAT_ROLES } from '../constants';
import { modelOptions, requiredText, tenantFields, ttlIndex } from './fields';

const schema = new Schema({
  ...tenantFields, role: { type: String, enum: CHAT_ROLES, required: true }, text: requiredText(4000),
  expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 86_400_000) },
}, { ...modelOptions, collection: 'chatMessages' });
schema.index({ userId: 1, createdAt: 1 });
ttlIndex(schema);
export type ChatMessageDocument = InferSchemaType<typeof schema>;
export const ChatMessage = (models.ChatMessage as Model<ChatMessageDocument> | undefined) ?? model('ChatMessage', schema);
