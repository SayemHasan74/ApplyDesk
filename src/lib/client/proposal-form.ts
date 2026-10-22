import { z } from 'zod';
import { formatInTimeZone } from 'date-fns-tz';
import type { Entity } from '../constants';
import { AI_CREATE_SOURCES, TIMEZONE } from '../constants';
import { createSchema } from './ai-client';

function unwrap(schema: z.core.$ZodType): z.core.$ZodType {
  if (schema instanceof z.ZodDefault) return unwrap(schema.removeDefault());
  if (schema instanceof z.ZodNullable || schema instanceof z.ZodOptional) return unwrap(schema.unwrap());
  return schema;
}
export const fieldLabel = (key: string) => key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (char) => char.toUpperCase());
export function draftFields(entity: Entity) {
  return Object.entries(createSchema(entity).shape).map(([name, schema]) => {
    const base = unwrap(schema);
    const options = name === 'createdFrom' ? AI_CREATE_SOURCES.filter((source) => entity !== 'todo' || source !== 'url') : base instanceof z.ZodEnum ? base.options.map(String) : null;
    const array = base instanceof z.ZodArray;
    const maxLength = base instanceof z.ZodString ? base.maxLength ?? 4000 : array ? 80020 : undefined;
    const type = base instanceof z.ZodNumber ? 'number' : name === 'interviewAt' ? 'datetime-local' : /Date$|At$|deadline$|validUntil$/i.test(name) ? 'date' : /Url$|^url$/i.test(name) ? 'url' : 'text';
    return { name, label: fieldLabel(name), options, array, type, maxLength, multiline: array || (maxLength ?? 0) >= 4000 };
  });
}
export function draftForm(draft: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(Object.entries(draft).map(([key, value]) => [key,
    key === 'interviewAt' && typeof value === 'string' && value ? formatInTimeZone(value, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss")
      : Array.isArray(value) ? value.join('\n') : value === null ? '' : String(value),
  ]));
}
export function parseDraftForm(entity: Entity, values: Record<string, string>) {
  const shape = createSchema(entity).shape;
  const raw = Object.fromEntries(draftFields(entity).map((field) => {
    const value = values[field.name] ?? '';
    if (field.array) return [field.name, value.split('\n').map((part) => part.trim()).filter(Boolean)];
    if (field.type === 'number') return [field.name, value.trim() ? Number(value) : Number.NaN];
    if (field.name === 'interviewAt') return [field.name, value ? `${value.length === 16 ? `${value}:00` : value}+06:00` : null];
    const schema = (shape as Record<string, z.ZodType>)[field.name];
    return [field.name, value === '' && schema.safeParse(null).success ? null : value];
  }));
  return createSchema(entity).safeParse(raw);
}
