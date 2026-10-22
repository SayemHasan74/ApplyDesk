import { z } from 'zod';
import { GMAIL_EVENTS, PRIORITIES } from '../constants';
import { calendarDate, httpUrl, nullableText } from '../validators/fields';
import { jobCreateSchema, jobPatchSchema } from '../validators/job';

export const emailClassificationSchema = z.object({
  message_id: z.string().min(1).max(200), is_job_related: z.boolean(), company: nullableText(120), role: nullableText(200),
  event: z.enum(GMAIL_EVENTS), interview_at: z.iso.datetime({ offset: true }).max(120).nullable(),
  new_jobs: z.array(z.object({ company: z.string().min(1).max(120), role: z.string().min(1).max(200), apply_url: httpUrl.nullable(), location: nullableText(120), deadline: calendarDate }).strict()).max(5),
  confidence: z.enum(PRIORITIES),
}).strict();
export const classifierSchema = z.object({ emails: z.array(emailClassificationSchema).max(10) }).strict();
export type EmailClassification = z.infer<typeof emailClassificationSchema>;
export const suggestionPayloadSchema = z.union([
  jobPatchSchema.pick({ status: true, interviewAt: true }).required({ status: true }),
  jobCreateSchema.extend({ createdFrom: z.literal('email') }),
]);
export const syncResultSchema = z.union([z.object({ processed: z.number().int().nonnegative(), suggestions: z.number().int().nonnegative() }).strict(), z.object({ skipped: z.literal('AI limit') }).strict()]);
