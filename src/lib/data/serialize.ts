import { Types } from 'mongoose';

export function displayDocument(value: Record<string, unknown>, fields: readonly string[]) {
  const result: Record<string, unknown> = {};
  for (const key of fields) result[key] = value[key] instanceof Date ? value[key].toISOString() : value[key];
  return { ...result, id: value._id instanceof Types.ObjectId ? value._id.toHexString() : undefined };
}
