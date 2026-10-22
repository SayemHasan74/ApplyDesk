import 'server-only';
import { z } from 'zod';
import { AI_ACTIONS, AI_FIELD_SOURCES, AI_INTENTS, AI_QUERY_SORTS, CERT_FORMATS, COMP_STATUSES, COST_STATUSES, ENTITIES, JOB_TYPES, PRIORITIES, TODO_VIEWS, WORK_MODES } from '../constants';
import { isValidDateString } from '../date-only';

const text = (max = 4000) => z.string().max(max).nullable().catch(null);
const required = (max: number) => z.string().trim().min(1).max(max);
const strings = (max = 20, length = 4000) => z.array(z.unknown()).catch([]).transform((items) => items.filter((item): item is string => typeof item === 'string' && item.length <= length).slice(0, max));
const sources = {
  source_urls: strings(20, 2048),
  field_sources: z.record(z.string().max(120), z.enum(AI_FIELD_SOURCES)).catch({}),
  confidence: z.enum(PRIORITIES).catch('low'), missing_fields: strings(20, 120),
};
export const jobDraftSchema = z.object({
  company: required(120), role: required(200), job_type: z.enum(JOB_TYPES).catch('other'),
  location: text(120), work_mode: z.enum(WORK_MODES).catch('unknown'), open_date: text(10), deadline: text(10),
  deadline_note: text(), compensation_status: z.enum(COMP_STATUSES).catch('unknown'), compensation_text: text(),
  apply_url: text(2048), description_summary: z.string().nullable().catch(null), requirements: strings(), eligibility: text(), ...sources,
}).strip();
export const certDraftSchema = z.object({
  name: required(200), provider: required(120), track: text(120), url: text(2048), start_date: text(10),
  registration_deadline: text(10), deadline_note: text(), exam_date: text(10), cost_status: z.enum(COST_STATUSES).catch('unknown'),
  cost_text: text(), duration_text: text(120), format: z.enum(CERT_FORMATS).catch('unknown'), prerequisites: strings(),
  description_summary: z.string().nullable().catch(null), ...sources,
}).strip();
export const todoDraftSchema = z.object({
  title: required(200), details: text(), priority: z.enum(PRIORITIES).catch('medium'), due_date: text(10), tag: text(40),
  linked_job_id: text(24), linked_cert_id: text(24),
}).strip();
const filterDate = z.string().max(10).refine(isValidDateString).nullable().default(null);
export const filterSchema = z.object({
  statuses: z.array(z.string().max(120)).max(20).nullable().catch(null), text_contains: text(200), deadline_before: filterDate, deadline_after: filterDate,
  due_before: filterDate, due_after: filterDate, view: z.enum(TODO_VIEWS).nullable().catch(null), tag: text(40),
}).strip();
export const settingSchema = z.discriminatedUnion('key', [
  z.object({ key: z.literal('groundingEnabled'), value: z.boolean() }).strip(),
  z.object({ key: z.literal('aiDailyLimit'), value: z.number().int().min(1).max(100) }).strip(),
]);
export const actionSchema = z.object({
  type: z.enum(AI_ACTIONS), entity: z.enum(ENTITIES).nullable().catch(null), id: text(24),
  patch: z.record(z.string(), z.unknown()).nullable().catch(null), filter: filterSchema.nullable().catch(null),
  note_text: text(), setting: settingSchema.nullable().catch(null), suggestion_id: text(24),
}).strip();
export const querySchema = filterSchema.extend({ entity: z.enum(ENTITIES), sort: z.enum(AI_QUERY_SORTS).nullable().catch(null) }).strip();
function validArray<T extends z.ZodType>(schema: T, max: number) {
  return z.array(z.unknown()).catch([]).transform((values) => values.flatMap((value): z.output<T>[] => {
    const result = schema.safeParse(value);
    return result.success ? [result.data] : [];
  }).slice(0, max));
}
export const modelOutputSchema = z.object({
  intent: z.enum(AI_INTENTS), assistant_message: z.string().max(4000), transcript: z.string().max(15000).nullable().catch(null),
  job_drafts: validArray(jobDraftSchema, 5), cert_drafts: validArray(certDraftSchema, 5), todo_drafts: validArray(todoDraftSchema, 20),
  actions: validArray(actionSchema, 10), query: querySchema.nullable().catch(null),
}).strip();
export type ModelOutput = z.infer<typeof modelOutputSchema>;
export type Action = z.infer<typeof actionSchema>;
export type Filter = z.infer<typeof filterSchema>;
