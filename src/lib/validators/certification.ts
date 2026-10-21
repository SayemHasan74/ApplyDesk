import { z } from 'zod';
import { CERT_FORMATS, CERT_STATUSES, COST_STATUSES, CREATED_FROM, PRIORITIES } from '../constants';
import { calendarDate, httpUrl, nullableText, sparsePatch } from './fields';

export const certCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  provider: z.string().trim().min(1, 'Provider is required').max(120),
  track: nullableText(), url: httpUrl.nullable().default(null),
  startDate: calendarDate, registrationDeadline: calendarDate, deadlineNote: nullableText(4000), examDate: calendarDate,
  costStatus: z.enum(COST_STATUSES).default('unknown'), costText: nullableText(4000), durationText: nullableText(),
  format: z.enum(CERT_FORMATS).default('unknown'), prerequisites: z.array(z.string().max(4000)).max(20).default([]),
  descriptionSummary: nullableText(4000), status: z.enum(CERT_STATUSES).default('wishlist'),
  priority: z.enum(PRIORITIES).default('medium'), progressPercent: z.number().int().min(0).max(100).default(0),
  completedAt: calendarDate, credentialUrl: httpUrl.nullable().default(null), validUntil: calendarDate,
  notes: z.string().max(4000).default(''), sourceUrls: z.array(httpUrl).max(20).default([]),
  createdFrom: z.enum(CREATED_FROM).default('manual'),
}).strict();
export const certPatchSchema = sparsePatch(certCreateSchema.omit({ createdFrom: true }).shape);
export type CertCreate = z.infer<typeof certCreateSchema>;
export type CertPatch = z.infer<typeof certPatchSchema>;
