import { Schema } from 'mongoose';
import { isValidDateString } from '../dates';
import { CREATED_FROM, PRIORITIES } from '../constants';

export const nullableText = (maxLength = 120) => ({ type: String, default: null, maxlength: maxLength });
export const requiredText = (maxLength = 120) => ({ type: String, required: true, maxlength: maxLength });
export const dateOnly = () => ({ type: String, default: null, validate: { validator: (value: string | null) => value === null || isValidDateString(value), message: 'Invalid calendar date' } });
export const stringList = (maxLength: number) => ({ type: [{ type: String, maxlength: maxLength }], default: [], validate: { validator: (items: string[]) => items.length <= 20, message: 'Too many items' } });
export const tenantFields = {
  userId: { type: String, required: true, match: /^[a-f0-9]{24}$/ },
  expiresAt: { type: Date, default: undefined },
};
export const trackedFields = {
  priority: { type: String, enum: PRIORITIES, default: 'medium' },
  notes: { type: String, default: '', maxlength: 4000 },
  sourceUrls: stringList(2048),
  fieldSources: { type: Map, of: String, default: () => new Map<string, string>() },
  createdFrom: { type: String, enum: CREATED_FROM, default: 'manual' },
  dedupeKey: requiredText(500),
};
export const modelOptions = { timestamps: true, strict: true, autoIndex: false } as const;
export function ttlIndex(schema: Schema) {
  schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}
