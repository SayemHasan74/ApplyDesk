import 'server-only';
import { z } from 'zod';
import { AI_ACTIONS, AI_FIELD_SOURCES, AI_INTENTS, AI_QUERY_SORTS, CERT_FORMATS, COMP_STATUSES, COST_STATUSES, ENTITIES, JOB_TYPES, PRIORITIES, TODO_VIEWS, WORK_MODES } from '../constants';
import { calendarDate, httpUrl, objectId } from '../validators/fields';
import { jobPatchSchema } from '../validators/job';
import { certPatchSchema } from '../validators/certification';
import { todoPatchSchema } from '../validators/todo';

const text = (max = 4000) => z.string().max(max).nullable().default(null);
const required = (max: number) => z.string().trim().min(1).max(max);
const strings = (max = 20, length = 4000) => z.array(z.string().max(length)).max(max).default([]);
const sources = {
  source_urls: z.array(httpUrl).max(20).default([]),
  field_sources: z.record(z.string().max(120).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/), z.enum(AI_FIELD_SOURCES)).default({}),
  confidence: z.enum(PRIORITIES).default('low'), missing_fields: strings(20, 120),
};
export const jobDraftSchema = z.object({
  company: required(120), role: required(200), job_type: z.enum(JOB_TYPES).default('other'),
  location: text(120), work_mode: z.enum(WORK_MODES).default('unknown'), open_date: calendarDate, deadline: calendarDate,
  deadline_note: text(), compensation_status: z.enum(COMP_STATUSES).default('unknown'), compensation_text: text(),
  apply_url: httpUrl.nullable().default(null), description_summary: text(), requirements: strings(), eligibility: text(), ...sources,
}).strict();
export const certDraftSchema = z.object({
  name: required(200), provider: required(120), track: text(120), url: httpUrl.nullable().default(null), start_date: calendarDate,
  registration_deadline: calendarDate, deadline_note: text(), exam_date: calendarDate, cost_status: z.enum(COST_STATUSES).default('unknown'),
  cost_text: text(), duration_text: text(120), format: z.enum(CERT_FORMATS).default('unknown'), prerequisites: strings(),
  description_summary: text(), ...sources,
}).strict();
export const todoDraftSchema = z.object({
  title: required(200), details: text(), priority: z.enum(PRIORITIES).default('medium'), due_date: calendarDate, tag: text(40),
  linked_job_id: objectId.nullable().default(null), linked_cert_id: objectId.nullable().default(null),
}).strict();
const filterDate = calendarDate;
export const filterSchema = z.object({
  statuses: z.array(z.string().max(120)).max(20).nullable().default(null), text_contains: text(200), deadline_before: filterDate, deadline_after: filterDate,
  due_before: filterDate, due_after: filterDate, view: z.enum(TODO_VIEWS).nullable().default(null), tag: text(40),
}).strict();
export const settingSchema = z.discriminatedUnion('key', [
  z.object({ key: z.literal('groundingEnabled'), value: z.boolean() }).strict(),
  z.object({ key: z.literal('aiDailyLimit'), value: z.number().int().min(1).max(100) }).strict(),
]);
const patchValuesSchema = z.record(z.string().max(120).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/), z.unknown()).superRefine((values, context) => {
  const mapped = Object.fromEntries(Object.entries(values).map(([key, value]) => [key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()), value]));
  if (![jobPatchSchema, certPatchSchema, todoPatchSchema].some((schema) => schema.safeParse(mapped).success)) context.addIssue({ code: 'custom', message: 'Invalid patch fields' });
});
export const actionSchema = z.object({
  type: z.enum(AI_ACTIONS), entity: z.enum(ENTITIES).nullable().default(null), id: objectId.nullable().default(null),
  patch: patchValuesSchema.nullable().default(null), filter: filterSchema.nullable().default(null),
  note_text: text(1000), setting: settingSchema.nullable().default(null), suggestion_id: objectId.nullable().default(null),
}).strict().superRefine((action, context) => {
  if (!action.patch) return;
  const mapped = Object.fromEntries(Object.entries(action.patch).map(([key, value]) => [key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()), value]));
  const schema = action.entity === 'job' ? jobPatchSchema : action.entity === 'certification' ? certPatchSchema : action.entity === 'todo' ? todoPatchSchema : null;
  if (!schema?.safeParse(mapped).success) context.addIssue({ code: 'custom', message: 'Patch does not match the entity' });
});
export const querySchema = filterSchema.extend({ entity: z.enum(ENTITIES), sort: z.enum(AI_QUERY_SORTS).nullable().default(null) }).strict();
export const modelOutputSchema = z.object({
  intent: z.enum(AI_INTENTS), assistant_message: z.string().max(4000), transcript: z.string().max(15000).nullable().default(null),
  job_drafts: z.array(jobDraftSchema).max(5).default([]), cert_drafts: z.array(certDraftSchema).max(5).default([]), todo_drafts: z.array(todoDraftSchema).max(20).default([]),
  actions: z.array(actionSchema).max(10).default([]), query: querySchema.nullable().default(null),
}).strict();
export type ModelOutput = z.infer<typeof modelOutputSchema>;
export type Action = z.infer<typeof actionSchema>;
export type Filter = z.infer<typeof filterSchema>;
