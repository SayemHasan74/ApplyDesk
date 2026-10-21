import { z } from 'zod';
import { isValidDateString } from '../dates';

export const objectId = z.string().max(24).regex(/^[a-f0-9]{24}$/, 'Invalid ID');
export const calendarDate = z.string().max(10).refine(isValidDateString, 'Enter a valid calendar date').nullable().default(null);
export const nullableText = (max = 120) => z.string().max(max).nullable().default(null);
export const httpUrl = z.url().max(2048).refine((value) => /^https?:\/\//i.test(value), 'Use an http or https URL');

type WithoutDefault<T> = T extends z.ZodDefault<infer Inner> ? Inner : T;
export function sparsePatch<S extends z.ZodRawShape>(shape: S) {
  const fields = Object.fromEntries(Object.entries(shape).map(([key, schema]) => [key,
    schema instanceof z.ZodDefault ? schema.removeDefault() : schema,
  ])) as { [K in keyof S]: WithoutDefault<S[K]> };
  return z.object(fields).strict().partial();
}
