import 'server-only';
import { randomUUID } from 'node:crypto';
import { formatInTimeZone } from 'date-fns-tz';
import { DEMO_TTL_HOURS, TIMEZONE } from '../constants';
import { incrementIfBelow } from '../counters';
import { connectDb } from '../db';
import { User } from '../models/users';
import { Job } from '../models/jobs';
import { Certification } from '../models/certifications';
import { Todo } from '../models/todos';
import { buildSeed } from './seed';

export async function createDemoUser() {
  const now = new Date();
  const hour = formatInTimeZone(now, TIMEZONE, 'yyyy-MM-dd-HH');
  if (!await incrementIfBelow(`demo-create:${hour}`, 20, 60 * 60)) return null;
  await connectDb();
  const expiresAt = new Date(now.getTime() + DEMO_TTL_HOURS * 60 * 60 * 1000);
  const user = await User.create({ role: 'demo', name: 'Demo visitor', expiresAt });
  const userId = user._id.toHexString();
  const seed = buildSeed(formatInTimeZone(now, TIMEZONE, 'yyyy-MM-dd'), now);
  const writes = [
    Job.insertMany(seed.jobs.map((job) => new Job({ ...job, userId, expiresAt }))),
    Certification.insertMany(seed.certifications.map((cert) => new Certification({ ...cert, userId, expiresAt }))),
    Todo.insertMany(seed.todos.map((todo) => new Todo({ ...todo, userId, expiresAt }))),
  ];
  try {
    await Promise.all(writes);
  } catch (error) {
    await Promise.allSettled(writes);
    const cleanup = await Promise.allSettled([
      Job.deleteMany({ userId }), Certification.deleteMany({ userId }), Todo.deleteMany({ userId }), User.deleteOne({ _id: user._id }),
    ]);
    if (cleanup.some((result) => result.status === 'rejected')) console.error('[DEMO_CLEANUP]', randomUUID());
    throw error;
  }
  return user;
}
