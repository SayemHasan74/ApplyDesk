import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { CERT_FORMATS, CERT_STATUSES, COST_STATUSES } from '../constants';
import { dateOnly, modelOptions, nullableText, requiredText, stringList, tenantFields, trackedFields, ttlIndex } from './fields';

const schema = new Schema({
  ...tenantFields, ...trackedFields,
  name: requiredText(200), provider: requiredText(), track: nullableText(), url: nullableText(2048),
  startDate: dateOnly(), registrationDeadline: dateOnly(), deadlineNote: nullableText(4000), examDate: dateOnly(),
  costStatus: { type: String, enum: COST_STATUSES, default: 'unknown' },
  costText: nullableText(4000), durationText: nullableText(),
  format: { type: String, enum: CERT_FORMATS, default: 'unknown' },
  prerequisites: stringList(4000), descriptionSummary: nullableText(4000),
  status: { type: String, enum: CERT_STATUSES, default: 'wishlist' },
  progressPercent: { type: Number, default: 0, min: 0, max: 100 },
  completedAt: dateOnly(), credentialUrl: nullableText(2048), validUntil: dateOnly(),
}, modelOptions);
schema.index({ userId: 1, dedupeKey: 1 }, { unique: true });
schema.index({ userId: 1, status: 1 });
schema.index({ userId: 1, registrationDeadline: 1 });
ttlIndex(schema);
export type CertificationDocument = InferSchemaType<typeof schema>;
export const Certification = (models.Certification as Model<CertificationDocument> | undefined) ?? model('Certification', schema);
