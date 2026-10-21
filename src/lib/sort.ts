import { PRIORITIES } from './constants';
import type { JobDocument } from './models/jobs';
import type { CertificationDocument } from './models/certifications';
import type { TodoDocument } from './models/todos';

function jobRank(job: Pick<JobDocument, 'status' | 'deadline'>) {
  if (job.status === 'saved') return job.deadline ? 0 : 1;
  return job.status === 'rejected' || job.status === 'withdrawn' ? 3 : 2;
}

function certRank(cert: Pick<CertificationDocument, 'status' | 'registrationDeadline'>) {
  if (cert.status === 'wishlist' || cert.status === 'planned') return cert.registrationDeadline ? 0 : 1;
  return cert.status === 'completed' || cert.status === 'dropped' ? 3 : 2;
}

export function compareJobs(a: Pick<JobDocument, 'status' | 'deadline' | 'createdAt' | 'updatedAt'>, b: typeof a) {
  const rank = jobRank(a);
  if (rank !== jobRank(b)) return rank - jobRank(b);
  if (rank === 0) return (a.deadline ?? '').localeCompare(b.deadline ?? '');
  return rank === 1 ? b.createdAt.getTime() - a.createdAt.getTime() : b.updatedAt.getTime() - a.updatedAt.getTime();
}

export function compareCerts(a: Pick<CertificationDocument, 'status' | 'registrationDeadline' | 'createdAt' | 'updatedAt'>, b: typeof a) {
  const rank = certRank(a);
  if (rank !== certRank(b)) return rank - certRank(b);
  if (rank === 0) return (a.registrationDeadline ?? '').localeCompare(b.registrationDeadline ?? '');
  return rank === 1 ? b.createdAt.getTime() - a.createdAt.getTime() : b.updatedAt.getTime() - a.updatedAt.getTime();
}

export function compareTodos(a: Pick<TodoDocument, 'priority' | 'dueDate' | 'createdAt'>, b: typeof a) {
  return PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority)
    || (a.dueDate ?? '9999-99-99').localeCompare(b.dueDate ?? '9999-99-99')
    || a.createdAt.getTime() - b.createdAt.getTime();
}
