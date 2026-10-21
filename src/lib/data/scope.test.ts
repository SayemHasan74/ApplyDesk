import { expect, it } from 'vitest';
import { scopedFilter } from './scope';

it('always overwrites a caller-supplied tenant without mutating its filter', () => {
  const filter = { userId: 'attacker', status: 'saved' };
  expect(scopedFilter('owner', filter)).toEqual({ userId: 'owner', status: 'saved' });
  expect(filter.userId).toBe('attacker');
  expect(scopedFilter('visitor', { userId: { $ne: 'visitor' }, _id: 'document' })).toEqual({ userId: 'visitor', _id: 'document' });
});
