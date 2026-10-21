import { expect, it } from 'vitest';
import { buildSeed } from './seed';
import { Job } from '../models/jobs';
import { Certification } from '../models/certifications';
import { Todo } from '../models/todos';
import { certDedupeKey, jobDedupeKey } from '../dedupe';
import { daysBetween } from '../dates';

it('creates the requested 8 jobs, 5 certifications and 8 todos without tenant fields', () => {
  const seed = buildSeed('2026-12-30');
  expect(seed.jobs).toHaveLength(8);
  expect(seed.certifications).toHaveLength(5);
  expect(seed.todos).toHaveLength(8);
  for (const item of [...seed.jobs, ...seed.certifications, ...seed.todos]) {
    expect(item.createdFrom).toBe('manual');
    expect(item).not.toHaveProperty('userId');
    expect(item).not.toHaveProperty('expiresAt');
  }
  expect(buildSeed('2026-12-30')).toEqual(seed);
});
it('uses the specified statuses, prices, deadlines and dedupe keys across year boundaries', () => {
  const { jobs, certifications } = buildSeed('2026-12-30');
  expect(jobs[0]).toMatchObject({ company: 'Northwind Tech', status: 'saved', deadline: '2027-01-02', compensationStatus: 'paid', compensationText: 'BDT 15,000/month' });
  expect(jobs[1]).toMatchObject({ company: 'Contoso Labs', status: 'interview', interviewAt: '2027-01-03T15:00:00+06:00' });
  expect(jobs[3]).toMatchObject({ status: 'rejected', deadline: '2026-12-28' });
  expect(jobs[4]).toMatchObject({ deadline: null, deadlineNote: 'Rolling basis, apply early' });
  expect(jobs[6]).toMatchObject({ status: 'applied', appliedAt: '2026-12-27', deadline: '2027-01-04' });
  expect(certifications[0]).toMatchObject({ status: 'in_progress', progressPercent: 40, costStatus: 'free' });
  expect(certifications[3]).toMatchObject({ status: 'completed', completedAt: '2026-12-10' });
  expect(certifications[4]).toMatchObject({ registrationDeadline: '2027-01-03', costText: 'BDT 4,000' });
  for (const job of jobs) expect(job.dedupeKey).toBe(jobDedupeKey(job.company, job.role));
  for (const cert of certifications) expect(cert.dedupeKey).toBe(certDedupeKey(cert.provider, cert.name));
});
it('distributes todo dates and includes exactly one done item with null links', () => {
  const now = new Date('2026-10-21T05:00:00Z');
  const { todos } = buildSeed('2026-10-21', now);
  expect(todos.map((todo) => todo.dueDate ? daysBetween('2026-10-21', todo.dueDate) : null)).toEqual([-2, -1, 0, 0, 3, 6, null, null]);
  expect(todos.filter((todo) => todo.status === 'done')).toHaveLength(1);
  expect(todos.find((todo) => todo.status === 'done')?.completedAt).toEqual(now);
  for (const todo of todos) expect(todo).toMatchObject({ linkedJobId: null, linkedCertId: null });
});
it('validates every seeded document against the unchanged models', async () => {
  const seed = buildSeed('2024-02-28');
  const tenant = { userId: '0123456789abcdef01234567', expiresAt: new Date('2024-03-01') };
  await Promise.all([
    ...seed.jobs.map((job) => new Job({ ...job, ...tenant }).validate()),
    ...seed.certifications.map((cert) => new Certification({ ...cert, ...tenant }).validate()),
    ...seed.todos.map((todo) => new Todo({ ...todo, ...tenant }).validate()),
  ]);
});
