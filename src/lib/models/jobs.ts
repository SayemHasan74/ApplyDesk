import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { COMP_STATUSES, JOB_STATUSES, JOB_TYPES, WORK_MODES } from '../constants';
import { dateOnly, modelOptions, nullableText, requiredText, stringList, tenantFields, trackedFields, ttlIndex } from './fields';

const schema = new Schema({
  ...tenantFields, ...trackedFields,
  company: requiredText(), role: requiredText(200),
  jobType: { type: String, enum: JOB_TYPES, default: 'other' },
  location: nullableText(), workMode: { type: String, enum: WORK_MODES, default: 'unknown' },
  openDate: dateOnly(), deadline: dateOnly(), deadlineNote: nullableText(4000),
  compensationStatus: { type: String, enum: COMP_STATUSES, default: 'unknown' },
  compensationText: nullableText(4000), applyUrl: nullableText(2048),
  descriptionSummary: nullableText(4000), requirements: stringList(4000), eligibility: nullableText(4000),
  status: { type: String, enum: JOB_STATUSES, default: 'saved' },
  appliedAt: dateOnly(),
  interviewAt: { ...nullableText(), validate: { validator: (value: string | null) => value === null || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)), message: 'Invalid ISO datetime with offset' } },
  gmailThreadIds: stringList(120),
}, modelOptions);
schema.index({ userId: 1, dedupeKey: 1 }, { unique: true });
schema.index({ userId: 1, status: 1 });
schema.index({ userId: 1, deadline: 1 });
ttlIndex(schema);
export type JobDocument = InferSchemaType<typeof schema>;
export const Job = (models.Job as Model<JobDocument> | undefined) ?? model('Job', schema);
