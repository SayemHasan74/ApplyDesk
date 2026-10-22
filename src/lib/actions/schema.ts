import 'server-only';
import { z } from 'zod';
import { AI_CREATE_SOURCES, AI_SETTING_KEYS, AI_SUGGESTION_DECISIONS, ENTITIES } from '../constants';
import { jobCreateSchema, jobPatchSchema } from '../validators/job';
import { certCreateSchema, certPatchSchema } from '../validators/certification';
import { todoCreateSchema, todoPatchSchema } from '../validators/todo';
import { objectId } from '../validators/fields';
import { settingsPatchSchema, settingsSchema } from '../validators/settings';

const entity = z.enum(ENTITIES);
const ids = z.array(objectId).min(1).max(25).refine((values) => new Set(values).size === values.length, 'IDs must be unique');
const source = z.enum(AI_CREATE_SOURCES).default('text');
export const actionItemSchema = z.union([
  z.object({ kind: z.literal('create'), entity: z.literal('job'), data: jobCreateSchema.extend({ createdFrom: source }) }).strict(),
  z.object({ kind: z.literal('create'), entity: z.literal('certification'), data: certCreateSchema.extend({ createdFrom: source }) }).strict(),
  z.object({ kind: z.literal('create'), entity: z.literal('todo'), data: todoCreateSchema.extend({ createdFrom: z.enum(AI_CREATE_SOURCES).exclude(['url']).default('text') }) }).strict(),
  z.object({ kind: z.literal('update'), entity: z.literal('job'), id: objectId, patch: jobPatchSchema }).strict(),
  z.object({ kind: z.literal('update'), entity: z.literal('certification'), id: objectId, patch: certPatchSchema }).strict(),
  z.object({ kind: z.literal('update'), entity: z.literal('todo'), id: objectId, patch: todoPatchSchema }).strict(),
  z.object({ kind: z.literal('bulk_update'), entity: z.literal('job'), ids, patch: jobPatchSchema }).strict(),
  z.object({ kind: z.literal('bulk_update'), entity: z.literal('certification'), ids, patch: certPatchSchema }).strict(),
  z.object({ kind: z.literal('bulk_update'), entity: z.literal('todo'), ids, patch: todoPatchSchema }).strict(),
  z.object({ kind: z.literal('delete'), entity, id: objectId }).strict(),
  z.object({ kind: z.literal('bulk_delete'), entity, ids }).strict(),
  z.object({ kind: z.literal('append_note'), entity: entity.exclude(['todo']), id: objectId, text: z.string().trim().min(1).max(1000) }).strict(),
  z.object({ kind: z.literal('setting'), key: z.literal('groundingEnabled'), value: settingsPatchSchema.shape.groundingEnabled.unwrap() }).strict(),
  z.object({ kind: z.literal('setting'), key: z.literal('aiDailyLimit'), value: settingsPatchSchema.shape.aiDailyLimit.unwrap() }).strict(),
  z.object({ kind: z.literal('suggestion'), id: objectId, decision: z.enum(AI_SUGGESTION_DECISIONS) }).strict(),
]);
// Item validation is independent; only a malformed envelope rejects the whole batch.
export const applyBodySchema = z.object({ items: z.array(z.unknown()).min(1).max(30) }).strict();
export const undoBodySchema = z.object({ batchId: z.uuid().optional() }).strict();
export const settingSnapshotSchema = settingsSchema.extend({ key: z.enum(AI_SETTING_KEYS) }).strict();
export const actionResultSchema = z.union([
  z.object({ index: z.number().int().nonnegative(), ok: z.literal(true), id: objectId.optional() }).strict(),
  z.object({ index: z.number().int().nonnegative(), ok: z.literal(false), error: z.object({ code: z.string().max(120), message: z.string().max(4000) }).strict() }).strict(),
]);
export type ActionItem = z.infer<typeof actionItemSchema>;
export type ActionResult = z.infer<typeof actionResultSchema>;
