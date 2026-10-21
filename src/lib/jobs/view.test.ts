import { expect, it } from 'vitest';
import { buildSeed } from '../demo/seed';
import { jobItemSchema } from './items';
import { jobsSummary, visibleJobs } from './view';

const items = buildSeed('2026-10-21').jobs.map((job, index) => jobItemSchema.parse({ ...Object.fromEntries(Object.entries(job).filter(([key]) => key !== 'dedupeKey')), id: index.toString(16).padStart(24, '0'), createdAt: '2026-10-21T00:00:00Z', updatedAt: '2026-10-21T00:00:00Z' }));
it('derives dashboard counts using the same saved-deadline rules as the list', () => {
  const result = jobsSummary(items, '2026-10-21');
  expect(result).toMatchObject({ total: 8, applied: 3, saved: 4, due: 1 });
  expect(result.closest.map((job) => job.company)).toEqual(['Northwind Tech', 'Fabrikam Systems']);
});
it('filters and sorts in memory without mutating the original list', () => {
  expect(visibleJobs(items, ' NORTHWIND ', 'saved').map((job) => job.company)).toEqual(['Northwind Tech']);
  expect(visibleJobs(items, 'trainee', 'all').map((job) => job.company)).toEqual(['Wingtip Software']);
  expect(visibleJobs(items, '', 'all').slice(0, 4).map((job) => job.company)).toEqual(['Northwind Tech', 'Fabrikam Systems', 'Adventure Works', 'Litware Inc']);
  expect(visibleJobs(items, '', 'all').at(-1)?.status).toBe('rejected');
  expect(items[0].company).toBe('Northwind Tech');
});
