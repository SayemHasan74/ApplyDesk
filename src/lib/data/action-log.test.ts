import { expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
vi.mock('server-only', () => ({}));
import { ActionLog } from '../models/action-logs';
import { validatedSnapshot } from '../actions/store';

it('preserves empty nested fields in full audit snapshots', () => {
  const now = new Date();
  const before = { _id: new Types.ObjectId(), userId: 'a'.repeat(24), createdAt: now, updatedAt: now, fieldSources: {}, notes: '', requirements: [] };
  const log = new ActionLog({ userId: before.userId, batchId: 'batch', seq: 0, entity: 'job', op: 'update', docId: before._id.toString(), before, after: before });
  expect(log.toObject().before).toEqual(before); expect(log.toObject().after).toEqual(before);
  expect(ActionLog.schema.options.minimize).toBe(false);
});
it('keeps empty map fields when validating the snapshot used by the audit log', async () => {
  const now = new Date();
  const snapshot = await validatedSnapshot('job', { _id: new Types.ObjectId(), userId: 'a'.repeat(24), createdAt: now, updatedAt: now, company: 'C', role: 'R', dedupeKey: 'c|r', fieldSources: {} });
  expect(snapshot).toHaveProperty('fieldSources', {});
});
