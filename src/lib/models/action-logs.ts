import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { ACTION_OPS, ENTITIES } from '../constants';
import { modelOptions, requiredText, tenantFields, ttlIndex } from './fields';

const schema = new Schema({
  ...tenantFields, batchId: requiredText(), seq: { type: Number, required: true, min: 0 },
  entity: { type: String, enum: ENTITIES, required: true },
  op: { type: String, enum: ACTION_OPS, required: true }, docId: requiredText(),
  before: { type: Schema.Types.Mixed, default: null }, after: { type: Schema.Types.Mixed, default: null },
  undone: { type: Boolean, default: false },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 86_400_000) },
}, { ...modelOptions, collection: 'actionLogs' });
schema.index({ userId: 1, batchId: 1 });
schema.index({ userId: 1, undone: 1, createdAt: 1 });
ttlIndex(schema);
export type ActionLogDocument = InferSchemaType<typeof schema>;
export const ActionLog = (models.ActionLog as Model<ActionLogDocument> | undefined) ?? model('ActionLog', schema);
