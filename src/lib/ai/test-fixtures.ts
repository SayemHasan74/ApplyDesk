import { jobItemSchema } from '../jobs/items';
import { certItemSchema } from '../certifications/items';
import { todoItemSchema } from '../todos/items';
import type { AiContext } from './context';
import type { Evidence } from './validate';
import type { CurrentUser } from '../auth/policy';

export const admin: CurrentUser = { userId: '0123456789abcdef01234567', role: 'admin', name: 'Owner' };
export const demo: CurrentUser = { ...admin, role: 'demo' };
export const evidence: Evidence = { text: '', today: '2026-10-22', sources: [], createdFrom: 'text' };
const stamps = { createdAt: '2026-10-21T10:00:00.000Z', updatedAt: '2026-10-21T10:00:00.000Z' };
export function fixtureContext(count = 1): AiContext {
  const jobs = Array.from({ length: count }, (_, i) => jobItemSchema.parse({ ...stamps, id: (i + 1).toString(16).padStart(24, '0'), company: `Company ${i}`, role: 'Engineer', deadline: '2026-10-25' }));
  const certifications = [certItemSchema.parse({ ...stamps, id: 'c'.repeat(24), name: 'Cloud', provider: 'Academy', registrationDeadline: '2026-10-24' })];
  const todos = [todoItemSchema.parse({ ...stamps, id: 'd'.repeat(24), title: 'Study', dueDate: '2026-10-20', completedAt: null })];
  return { jobs, certifications, todos, settings: { groundingEnabled: true, aiDailyLimit: 18 },
    suggestions: [{ id: 'e'.repeat(24), subject: 'Interview', from: 'Recruiter', type: 'status_update' }],
    lists: { jobs, certifications, todos, suggestions: [] },
  };
}
