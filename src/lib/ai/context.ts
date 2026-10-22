import 'server-only';
import type { CurrentUser } from '../auth/policy';
import { listJobs } from '../data/jobs';
import { listCerts } from '../data/certifications';
import { listTodos } from '../data/todos';
import { getSettings } from '../data/users';
import { connectDb } from '../db';
import { Suggestion, type SuggestionDocument } from '../models/suggestions';
import type { Model } from 'mongoose';

const suggestionsModel = Suggestion as Model<SuggestionDocument>;

async function pendingSuggestions(user: CurrentUser) {
  if (user.role !== 'admin') return [];
  await connectDb();
  const rows = await suggestionsModel.find({ userId: user.userId, state: 'pending' }).select('_id emailSubject emailFrom type').sort({ createdAt: -1 }).limit(20).lean();
  return rows.map((row) => ({ id: row._id.toString(), subject: row.emailSubject, from: row.emailFrom, type: row.type }));
}
export async function buildContext(user: CurrentUser) {
  const [jobs, certifications, todos, suggestions, settings] = await Promise.all([
    listJobs(user.userId), listCerts(user.userId), listTodos(user.userId), pendingSuggestions(user),
    user.role === 'admin' ? getSettings(user.userId) : Promise.resolve({ groundingEnabled: false, aiDailyLimit: 2 }),
  ]);
  const lists = {
    jobs: jobs.slice(0, 100).map(({ id, company, role, status, deadline }) => ({ id, company, role, status, deadline })),
    certifications: certifications.slice(0, 100).map(({ id, name, provider, status, registrationDeadline, progressPercent }) => ({ id, name, provider, status, registrationDeadline, progressPercent })),
    todos: [...todos.filter((todo) => todo.status !== 'done'), ...todos.filter((todo) => todo.status === 'done')].slice(0, 150)
      .map(({ id, title, status, dueDate, tag }) => ({ id, title, status, dueDate, tag })), suggestions,
  };
  return { jobs, certifications, todos, suggestions, settings, lists };
}
export type AiContext = Awaited<ReturnType<typeof buildContext>>;
