import 'server-only';
import type { z } from 'zod';
import type { Entity } from '../constants';
import { AppError } from '../errors';
import { prepareJobCreate, prepareJobPatch } from '../jobs/effects';
import { prepareCertCreate, prepareCertPatch } from '../certifications/writes';
import { applyTodoStatusEffects } from '../todos/effects';
import { jobCreateSchema, jobPatchSchema } from '../validators/job';
import { certCreateSchema, certPatchSchema } from '../validators/certification';
import { todoCreateSchema, todoPatchSchema } from '../validators/todo';
import type { Snapshot } from './store';

function editable<S extends z.ZodRawShape>(snapshot: Snapshot, schema: z.ZodObject<S>) {
  return schema.parse(Object.fromEntries(Object.keys(schema.shape).map((key) => [key, snapshot[key]])));
}
export function prepareCreate(entity: Entity, data: unknown, today: string, now: Date) {
  if (entity === 'job') return prepareJobCreate(jobCreateSchema.parse(data), today);
  if (entity === 'certification') return prepareCertCreate(certCreateSchema.parse(data), today);
  const values = todoCreateSchema.parse(data);
  return { ...values, ...applyTodoStatusEffects({ status: 'todo', completedAt: null }, values, now.toISOString()) };
}
export function preparePatch(entity: Entity, before: Snapshot, patch: unknown, today: string, now: Date) {
  if (entity === 'job') return prepareJobPatch(editable(before, jobCreateSchema), jobPatchSchema.parse(patch), today);
  if (entity === 'certification') return prepareCertPatch(editable(before, certCreateSchema), certPatchSchema.parse(patch), today);
  const current = editable(before, todoCreateSchema);
  const completedAt = before.completedAt instanceof Date ? before.completedAt.toISOString() : null;
  return applyTodoStatusEffects({ status: current.status, completedAt }, todoPatchSchema.parse(patch), now.toISOString());
}
export function appendNote(notes: string, text: string) {
  const combined = notes ? `${notes}\n${text}` : text;
  if (combined.length > 4000) throw new AppError('VALIDATION', 'Notes cannot exceed 4000 characters');
  return combined;
}
