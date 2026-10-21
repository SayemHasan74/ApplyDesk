import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { ROLES } from '../constants';
import { modelOptions, ttlIndex } from './fields';

const schema = new Schema({
  role: { type: String, enum: ROLES, required: true },
  email: { type: String, lowercase: true, unique: true, sparse: true, maxlength: 254 },
  name: { type: String, required: true, maxlength: 120 },
  expiresAt: { type: Date, default: undefined },
  settings: {
    groundingEnabled: { type: Boolean, default: true },
    aiDailyLimit: { type: Number, default: 18, min: 0 },
  },
  gmail: {
    refreshTokenEnc: { type: String, default: null },
    connectedAt: { type: Date, default: null },
    lastSyncAt: { type: Date, default: null },
  },
  demoAiUsed: { type: Number, default: 0, min: 0 },
}, modelOptions);
ttlIndex(schema);
export type UserDocument = InferSchemaType<typeof schema>;
export const User = (models.User as Model<UserDocument> | undefined) ?? model('User', schema);
