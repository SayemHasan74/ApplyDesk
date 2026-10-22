import 'server-only';
import { z } from 'zod';
import { mongo } from 'mongoose';
import { AppError } from '../errors';
import type { ActionResult } from './schema';

export class ItemDatabaseError extends Error {
  constructor(readonly index: number, readonly failure: unknown) { super('Action write failed'); }
}
export function actionFailure(index: number, error: unknown): ActionResult {
  if (error instanceof z.ZodError) return { index, ok: false, error: { code: 'VALIDATION', message: 'Invalid action fields' } };
  if (error instanceof AppError && error.status < 500) return { index, ok: false, error: { code: error.code, message: error.message } };
  if (error && typeof error === 'object' && 'code' in error && error.code === 11000) return { index, ok: false, error: { code: 'CONFLICT', message: 'An item with these details already exists' } };
  if (error instanceof Error && error.name === 'ValidationError') return { index, ok: false, error: { code: 'VALIDATION', message: 'Invalid action fields' } };
  return { index, ok: false, error: { code: 'INTERNAL', message: 'An unexpected error occurred' } };
}
export function isTransientTransactionError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'hasErrorLabel' in error && typeof error.hasErrorLabel === 'function' && error.hasErrorLabel('TransientTransactionError'));
}
export function isDatabaseError(error: unknown) {
  return error instanceof mongo.MongoError || Boolean(error && typeof error === 'object' && 'code' in error && typeof error.code === 'number');
}
export async function writeAction<T>(index: number, operation: () => Promise<T>) {
  try { return await operation(); }
  catch (error) {
    if (isTransientTransactionError(error)) throw error;
    throw new ItemDatabaseError(index, error);
  }
}
