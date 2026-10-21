import { z } from 'zod';
import { COMP_STATUSES, CREATED_FROM, JOB_STATUSES, JOB_TYPES, PRIORITIES, WORK_MODES } from '../constants';
import { isValidDateString } from '../dates';

export const jobIdSchema = z.string().regex(/^[a-f0-9]{24}$/, 'Invalid job ID');
const date = z.string().max(10).refine(isValidDateString, 'Enter a valid calendar date').nullable().default(null);
const text = (max: number) => z.string().max(max).nullable().default(null);
const httpUrl = z.url().max(2048).refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), 'Use an http or https URL');

export const jobCreateSchema = z.object({
  company: z.string().trim().min(1, 'Company is required').max(120),
  role: z.string().trim().min(1, 'Role is required').max(200),
  jobType: z.enum(JOB_TYPES).default('other'), location: text(120),
  workMode: z.enum(WORK_MODES).default('unknown'), openDate: date, deadline: date,
  deadlineNote: text(4000), compensationStatus: z.enum(COMP_STATUSES).default('unknown'),
  compensationText: text(4000), applyUrl: httpUrl.nullable().default(null),
  sourceUrls: z.array(httpUrl).max(20).default([]), descriptionSummary: text(4000),
  requirements: z.array(z.string().max(4000)).max(20).default([]), eligibility: text(4000),
  status: z.enum(JOB_STATUSES).default('saved'), appliedAt: date,
  interviewAt: z.iso.datetime({ offset: true }).max(120).nullable().default(null),
  priority: z.enum(PRIORITIES).default('medium'), notes: z.string().max(4000).default(''),
  createdFrom: z.enum(CREATED_FROM).default('manual'),
}).strict();

const editable = jobCreateSchema.omit({ createdFrom: true });
type WithoutDefault<T> = T extends z.ZodDefault<infer Inner> ? Inner : T;
const patchFields = Object.fromEntries(Object.entries(editable.shape).map(([key, schema]) => [key,
  schema instanceof z.ZodDefault ? schema.removeDefault() : schema,
])) as { [K in keyof typeof editable.shape]: WithoutDefault<typeof editable.shape[K]> };
export const jobPatchSchema = z.object(patchFields).strict().partial();
export type JobCreate = z.infer<typeof jobCreateSchema>;
export type JobPatch = z.infer<typeof jobPatchSchema>;
