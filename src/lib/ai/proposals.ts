import 'server-only';
import { z } from 'zod';
import { AI_INTENTS, AI_SETTING_KEYS, AI_SUGGESTION_DECISIONS, ENTITIES, PRIORITIES } from '../constants';
import { settingSchema } from './schema';
import { objectId } from '../validators/fields';

const id = z.uuid();
const label = z.string().max(400);
const object = z.record(z.string(), z.unknown());
const item = z.object({ id: objectId, label }).strict();
const entity = z.enum(ENTITIES);
export const proposalSchema = z.discriminatedUnion('kind', [
  z.object({ id, kind: z.literal('create'), entity, draft: object, duplicateOfId: objectId.optional(), confidence: z.enum(PRIORITIES).optional(), missingFields: z.array(z.string()).max(20).optional(), sources: z.array(z.string()).max(20).optional() }).strict(),
  z.object({ id, kind: z.literal('update'), entity, targetId: objectId, label, before: object, patch: object, notes: z.string().max(4000).optional() }).strict(),
  z.object({ id, kind: z.literal('append_note'), entity, targetId: objectId, label, text: z.string().max(4000) }).strict(),
  z.object({ id, kind: z.literal('delete'), entity, targetId: objectId, label }).strict(),
  z.object({ id, kind: z.literal('bulk_update'), entity, items: z.array(item).min(1).max(25), patch: object, description: z.string().max(4000) }).strict(),
  z.object({ id, kind: z.literal('bulk_delete'), entity, items: z.array(item).min(1).max(25), description: z.string().max(4000) }).strict(),
  z.object({ id, kind: z.literal('undo_last') }).strict(),
  z.object({ id, kind: z.literal('setting'), key: z.enum(AI_SETTING_KEYS), before: z.union([z.boolean(), z.number()]), value: z.union([z.boolean(), z.number()]) }).strict().refine((value) => settingSchema.safeParse({ key: value.key, value: value.value }).success),
  z.object({ id, kind: z.literal('suggestion'), suggestionId: objectId, decision: z.enum(AI_SUGGESTION_DECISIONS), label }).strict(),
  z.object({ id, kind: z.literal('run_sync_gmail') }).strict(),
]);
export const queryResultSchema = z.object({ entity, items: z.array(item.extend({ detail: z.string() })).max(500), text: z.string() }).strict();
export const aiResponseSchema = z.object({ intent: z.enum(AI_INTENTS), assistantMessage: z.string().max(4000), transcript: z.string().max(15000).nullable(),
  proposals: z.array(proposalSchema).max(40), queryResult: queryResultSchema.nullable(), remaining: z.number().int().nonnegative(),
}).strict();
export type Proposal = z.infer<typeof proposalSchema>;
