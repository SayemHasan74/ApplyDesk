import { z } from 'zod';
import { PRIORITIES, TODO_CREATED_FROM, TODO_STATUSES } from '../constants';
import { calendarDate, nullableText, objectId, sparsePatch } from './fields';

export const todoCreateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200), details: z.string().max(4000).default(''),
  status: z.enum(TODO_STATUSES).default('todo'), priority: z.enum(PRIORITIES).default('medium'),
  dueDate: calendarDate, tag: nullableText(40), linkedJobId: objectId.nullable().default(null),
  linkedCertId: objectId.nullable().default(null), createdFrom: z.enum(TODO_CREATED_FROM).default('manual'),
}).strict();
export const todoPatchSchema = sparsePatch(todoCreateSchema.omit({ createdFrom: true }).shape);
export type TodoCreate = z.infer<typeof todoCreateSchema>;
export type TodoPatch = z.infer<typeof todoPatchSchema>;
