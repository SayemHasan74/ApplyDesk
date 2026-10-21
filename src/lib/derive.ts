import type { DEADLINE_BADGES, TODO_VIEWS } from './constants';
import { daysBetween } from './dates';
import type { JobDocument } from './models/jobs';
import type { CertificationDocument } from './models/certifications';
import type { TodoDocument } from './models/todos';

function deadlineView(deadline: string | null | undefined, active: boolean, today: string) {
  const daysLeft = deadline ? daysBetween(today, deadline) : null;
  let badge: typeof DEADLINE_BADGES[number] = 'none';
  if (active && daysLeft !== null) {
    badge = daysLeft < 0 ? 'closed' : daysLeft <= 3 ? 'critical' : daysLeft <= 7 ? 'soon' : 'ok';
  }
  return { daysLeft, badge };
}

export function deriveJob(job: Pick<JobDocument, 'status' | 'deadline'>, today: string) {
  return deadlineView(job.deadline, job.status === 'saved', today);
}

export function deriveCert(cert: Pick<CertificationDocument, 'status' | 'registrationDeadline'>, today: string) {
  return deadlineView(cert.registrationDeadline, cert.status === 'wishlist' || cert.status === 'planned', today);
}

export function todoView(todo: Pick<TodoDocument, 'status' | 'dueDate'>, today: string): typeof TODO_VIEWS[number] {
  if (todo.status === 'done') return 'done';
  if (!todo.dueDate) return 'backlog';
  return todo.dueDate < today ? 'overdue' : todo.dueDate === today ? 'today' : 'upcoming';
}
