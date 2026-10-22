import 'server-only';
import type { z } from 'zod';
import type { Entity, CreatedFrom } from '../constants';
import { isValidDateString } from '../date-only';
import { jobCreateSchema, jobPatchSchema } from '../validators/job';
import { certCreateSchema, certPatchSchema } from '../validators/certification';
import { todoCreateSchema, todoPatchSchema } from '../validators/todo';
import { httpUrl } from '../validators/fields';
import { rejectUnsafeKeys } from '../api/security';
import type { AiContext } from './context';
import type { ModelOutput } from './schema';

export type Evidence = { text: string; sources: string[]; today: string; createdFrom: CreatedFrom };
const camelCase = (key: string) => key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
export function validDate(value: unknown, today: string, deadline = false) {
  if (typeof value !== 'string' || !isValidDateString(value)) return null;
  const year = Number(today.slice(0, 4));
  if (deadline && (value < `${year - 2}${today.slice(4)}` || value > `${year + 3}${today.slice(4)}`)) return null;
  return value;
}
const url = (value: unknown) => httpUrl.safeParse(value).success ? value as string : null;
function supportedLink(value: unknown, sources: string[], evidence: Evidence) {
  const link = url(value);
  const typed: string[] = evidence.text.match(/https?:\/\/[^\s<>"']+/gi) ?? [];
  return link && (sources.includes(link) || evidence.sources.includes(link) || typed.includes(link)) ? link : null;
}
function cleanValues(values: Record<string, unknown>, evidence: Evidence, context: AiContext) {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (key.startsWith('$') || key.includes('.')) continue;
    try { rejectUnsafeKeys(value); cleaned[camelCase(key)] = value; } catch { continue; }
  }
  const sources = Array.isArray(cleaned.sourceUrls) ? cleaned.sourceUrls.filter((value) => url(value)).slice(0, 20) as string[] : [];
  if ('sourceUrls' in cleaned) cleaned.sourceUrls = sources;
  for (const key of ['applyUrl', 'url', 'credentialUrl']) if (key in cleaned) cleaned[key] = supportedLink(cleaned[key], sources, evidence);
  for (const key of ['openDate', 'deadline', 'startDate', 'registrationDeadline', 'examDate', 'dueDate', 'completedAt', 'validUntil', 'appliedAt']) {
    if (key in cleaned) cleaned[key] = validDate(cleaned[key], evidence.today, key === 'deadline' || key === 'registrationDeadline');
  }
  for (const [key, ids] of [['linkedJobId', context.lists.jobs], ['linkedCertId', context.lists.certifications]] as const) {
    if (key in cleaned && !ids.some(({ id }) => id === cleaned[key])) cleaned[key] = null;
  }
  if (typeof cleaned.descriptionSummary === 'string') cleaned.descriptionSummary = cleaned.descriptionSummary.slice(0, 600);
  for (const key of ['requirements', 'prerequisites']) if (Array.isArray(cleaned[key])) cleaned[key] = cleaned[key].filter((value) => typeof value === 'string' && value.length <= 120).slice(0, 8);
  const fieldSources = cleaned.fieldSources && typeof cleaned.fieldSources === 'object' ? cleaned.fieldSources as Record<string, unknown> : {};
  for (const [key, text, source] of [['compensationStatus', 'compensationText', 'compensation_status'], ['costStatus', 'costText', 'cost_status']]) {
    if (key in cleaned && cleaned[key] !== 'unknown' && !cleaned[text] && !fieldSources[source] && !fieldSources[camelCase(source)] && !fieldSources[text] && !fieldSources[source.replace('_status', '_text')]) cleaned[key] = 'unknown';
  }
  return cleaned;
}
function validFields(shape: Record<string, z.ZodType>, values: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  const rejected: string[] = [];
  for (const [key, value] of Object.entries(values)) {
    const parsed = Object.hasOwn(shape, key) ? shape[key].safeParse(value) : null;
    if (parsed?.success) result[key] = parsed.data;
    else rejected.push(key);
  }
  return { result, rejected };
}
export function validatePatch(entity: Entity, raw: Record<string, unknown>, evidence: Evidence, context: AiContext) {
  const schema = entity === 'job' ? jobPatchSchema : entity === 'certification' ? certPatchSchema : todoPatchSchema;
  const cleaned = cleanValues(raw, evidence, context);
  const { result, rejected } = validFields(schema.shape, cleaned);
  const unsafe = Object.keys(raw).filter((key) => key.startsWith('$') || key.includes('.'));
  const notes = [...unsafe, ...rejected].length ? `Ignored fields: ${[...unsafe, ...rejected].join(', ')}`.slice(0, 4000) : undefined;
  return { patch: schema.parse(result), notes };
}
function validateDraft(entity: Entity, raw: Record<string, unknown>, evidence: Evidence, context: AiContext) {
  const schema = entity === 'job' ? jobCreateSchema : entity === 'certification' ? certCreateSchema : todoCreateSchema;
  const cleaned = cleanValues(raw, evidence, context);
  if (entity === 'todo' && cleaned.details === null) cleaned.details = '';
  const { result } = validFields(schema.shape, cleaned);
  result.createdFrom = entity === 'todo' && evidence.createdFrom === 'url' ? 'text' : evidence.createdFrom;
  const parsed = schema.safeParse(result);
  return parsed.success ? parsed.data : null;
}
export function validateOutput(output: ModelOutput, evidence: Evidence, context: AiContext) {
  const groups = [
    ['job', output.job_drafts], ['certification', output.cert_drafts], ['todo', output.todo_drafts],
  ] as const;
  const drafts = groups.flatMap(([entity, rows]) => rows.flatMap((raw) => {
    const draft = validateDraft(entity, raw, evidence, context);
    if (!draft) return [];
    return [{ entity, draft, confidence: 'confidence' in raw ? raw.confidence : undefined,
      missingFields: 'missing_fields' in raw ? raw.missing_fields : undefined,
      sources: 'sourceUrls' in draft ? draft.sourceUrls : [],
    }];
  }));
  const actions = output.actions.filter((action) => {
    if (!action.id) return !['update', 'delete', 'append_note'].includes(action.type);
    const rows = action.entity === 'job' ? context.lists.jobs : action.entity === 'certification' ? context.lists.certifications : action.entity === 'todo' ? context.lists.todos : [];
    return rows.some(({ id }) => id === action.id);
  });
  return { ...output, drafts, actions };
}
export type ValidatedOutput = ReturnType<typeof validateOutput>;
