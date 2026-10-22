import { z } from 'zod';
import { certCreateSchema, certPatchSchema } from '../validators/certification';
import { objectId } from '../validators/fields';

export const actionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('create'), input: certCreateSchema }).strict(),
  z.object({ kind: z.literal('update'), id: objectId, input: certPatchSchema }).strict(),
  z.object({ kind: z.literal('delete'), id: objectId }).strict(),
]);
export type CertAction = z.infer<typeof actionSchema>;
