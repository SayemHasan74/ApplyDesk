import 'server-only';
import type { Entity } from '../constants';
import { daysBetween, formatDisplay, isValidDateString } from '../date-only';
import { deriveCert, deriveJob, todoView } from '../derive';
import { compareJobs, compareCerts, compareTodos } from '../sort';
import type { AiContext } from './context';
import type { Filter } from './schema';

export function entityRows(context: AiContext, entity: Entity) {
  return entity === 'job' ? context.jobs : entity === 'certification' ? context.certifications : context.todos;
}
export type Row = ReturnType<typeof entityRows>[number];
export function rowLabel(row: Row) {
  if ('company' in row) return `${row.company}, ${row.role}`;
  if ('provider' in row) return `${row.name}, ${row.provider}`;
  return row.title;
}
function dateMatch(value: string | null, before: string | null, after: string | null) {
  if (before && (!isValidDateString(before) || !value || value > before)) return false;
  if (after && (!isValidDateString(after) || !value || value < after)) return false;
  return true;
}
export function matchesFilter(row: Row, filter: Filter | null, today: string) {
  if (!filter) return false;
  if (filter.statuses && !filter.statuses.includes(row.status)) return false;
  if (filter.text_contains && !rowLabel(row).toLowerCase().includes(filter.text_contains.toLowerCase())) return false;
  const deadline = 'deadline' in row ? row.deadline : 'registrationDeadline' in row ? row.registrationDeadline : null;
  if (!dateMatch(deadline, filter.deadline_before, filter.deadline_after)) return false;
  if (!dateMatch('dueDate' in row ? row.dueDate : null, filter.due_before, filter.due_after)) return false;
  if (filter.tag !== null && (!('tag' in row) || row.tag !== filter.tag)) return false;
  if (!filter.view) return true;
  if ('dueDate' in row) return todoView(row, today) === filter.view;
  const derived = 'deadline' in row ? deriveJob(row, today) : deriveCert(row, today);
  const done = 'deadline' in row ? ['rejected', 'withdrawn'].includes(row.status) : ['completed', 'dropped'].includes(row.status);
  if (filter.view === 'done') return done;
  if (done) return false;
  if (filter.view === 'backlog') return derived.daysLeft === null;
  return derived.daysLeft !== null && (filter.view === 'overdue' ? derived.daysLeft < 0 : filter.view === 'today' ? derived.daysLeft === 0 : derived.daysLeft > 0);
}
export function sortedRows(rows: Row[], sort: string | null) {
  return [...rows].sort((a, b) => {
    if (sort === 'name') return rowLabel(a).localeCompare(rowLabel(b));
    if (sort === 'created') return b.createdAt.localeCompare(a.createdAt);
    const dates = <T extends Row>(row: T) => ({ ...row, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) });
    if ('deadline' in a && 'deadline' in b) return compareJobs(dates(a), dates(b));
    if ('registrationDeadline' in a && 'registrationDeadline' in b) return compareCerts(dates(a), dates(b));
    if ('dueDate' in a && 'dueDate' in b) return compareTodos(dates(a), dates(b));
    return 0;
  });
}
export function queryDetail(row: Row, today: string) {
  const date = 'deadline' in row ? row.deadline : 'registrationDeadline' in row ? row.registrationDeadline : row.dueDate;
  return date ? `${formatDisplay(date)} (${daysBetween(today, date)} days left)` : 'No deadline';
}
