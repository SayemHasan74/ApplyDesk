import { z } from 'zod';
import { todoCreateSchema } from '../validators/todo';
import { objectId } from '../validators/fields';

export const todoItemSchema = todoCreateSchema.extend({
  id: objectId, createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(), completedAt: z.iso.datetime().nullable(),
}).strict();
export type TodoItem = z.infer<typeof todoItemSchema>;
