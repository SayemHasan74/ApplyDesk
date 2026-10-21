import 'server-only';
import { connectDb } from './db';
import { Counter, type CounterDocument } from './models/counters';
import type { Model } from 'mongoose';

const counterModel: Model<CounterDocument> = Counter;

export async function incrementIfBelow(key: string, limit: number, ttlSeconds: number): Promise<boolean> {
  await connectDb();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  try {
    await counterModel.findOneAndUpdate({ key, count: { $lt: limit } }, {
      $inc: { count: 1 }, $setOnInsert: { expiresAt },
    }, { upsert: true });
    return true;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) return false;
    throw error;
  }
}

export async function getCount(key: string) {
  await connectDb();
  const counter = await counterModel.findOne({ key }).select('count').lean();
  return counter?.count ?? 0;
}
