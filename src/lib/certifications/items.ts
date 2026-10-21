import { z } from 'zod';
import { certCreateSchema } from '../validators/certification';
import { objectId } from '../validators/fields';

export const certItemSchema = certCreateSchema.extend({ id: objectId, createdAt: z.iso.datetime(), updatedAt: z.iso.datetime() }).strict();
export type CertItem = z.infer<typeof certItemSchema>;
