import { z } from 'zod';
import { todoCreateSchema, todoPatchSchema } from '../validators/todo';
import { objectId } from '../validators/fields';

export const actionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('create'), input: todoCreateSchema }).strict(),
  z.object({ kind: z.literal('update'), id: objectId, input: todoPatchSchema }).strict(),
  z.object({ kind: z.literal('delete'), id: objectId }).strict(),
  z.object({ kind: z.literal('clear') }).strict(),
]);
export type TodoAction = z.infer<typeof actionSchema>;
