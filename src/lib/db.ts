import 'server-only';
import mongoose from 'mongoose';
import { getEnv } from './env';

declare global {
  var applyDeskDb: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined;
}

export async function connectDb(uri = getEnv().MONGODB_URI) {
  const cache = globalThis.applyDeskDb ??= { conn: null, promise: null };
  if (cache.conn) return cache.conn;
  cache.promise ??= mongoose.connect(uri, {
    maxPoolSize: 5, serverSelectionTimeoutMS: 5000, bufferCommands: false, autoIndex: false,
  });
  try {
    cache.conn = await cache.promise;
    return cache.conn;
  } catch (error) {
    cache.promise = null;
    cache.conn = null;
    throw error;
  }
}
