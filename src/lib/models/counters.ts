import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { modelOptions, requiredText, ttlIndex } from './fields';

const schema = new Schema({
  key: { ...requiredText(500), unique: true }, count: { type: Number, default: 0, min: 0 },
  expiresAt: { type: Date, required: true },
}, modelOptions);
ttlIndex(schema);
export type CounterDocument = InferSchemaType<typeof schema>;
export const Counter = (models.Counter as Model<CounterDocument> | undefined) ?? model('Counter', schema);
