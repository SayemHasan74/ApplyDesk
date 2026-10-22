import { Types, type Model } from 'mongoose';
import { vi } from 'vitest';
import type { Entity } from '../constants';
import { Job } from '../models/jobs';
import { Certification } from '../models/certifications';
import { Todo } from '../models/todos';
import { ActionLog } from '../models/action-logs';
import { User } from '../models/users';
import { clone, matches, testQuery, type TestDocument } from './test-query';

export const owner = { userId: 'a'.repeat(24), role: 'admin' as const, name: 'Owner' };
export const visitor = { userId: 'b'.repeat(24), role: 'demo' as const, name: 'Visitor' };
export const demoExpiry = new Date('2099-01-01');
const models = { job: Job, certification: Certification, todo: Todo, logs: ActionLog, users: User };
type Collection = keyof typeof models;
type Database = Record<Collection, Map<string, TestDocument>>;
const duplicate = () => Object.assign(new Error('Database duplicate details must stay private'), { code: 11000 });
function installModelMocks(kind: Collection, model: Model<TestDocument>, hooks: { rows: (kind: Collection, filter: TestDocument) => TestDocument[]; put: (kind: Collection, value: TestDocument) => void; replace: (kind: Collection, old: TestDocument, value: TestDocument) => void; controls: { failAudit: boolean }; table: (kind: Collection) => Map<string, TestDocument> }) {
  const { rows, put, replace, controls, table } = hooks;
  vi.spyOn(model, 'find').mockImplementation((filter: unknown) => testQuery(() => rows(kind, filter as TestDocument)) as unknown as ReturnType<typeof model.find>);
  vi.spyOn(model, 'findOne').mockImplementation((filter: unknown) => testQuery(() => rows(kind, filter as TestDocument), true) as unknown as ReturnType<typeof model.findOne>);
  vi.spyOn(model, 'countDocuments').mockImplementation((filter: unknown) => ({ session: async () => rows(kind, filter as TestDocument).length }) as unknown as ReturnType<typeof model.countDocuments>);
  vi.spyOn(model, 'bulkWrite').mockImplementation(async (operations) => {
    for (const raw of operations) {
      const operation = raw as unknown as Record<string, TestDocument>;
      if (operation.insertOne) put(kind, operation.insertOne.document as TestDocument);
      if (operation.updateOne) {
        const spec = operation.updateOne, found = rows(kind, spec.filter as TestDocument)[0];
        if (found) replace(kind, found, { ...found, ...((spec.update as TestDocument).$set as TestDocument) });
      }
    }
    return {} as Awaited<ReturnType<typeof model.bulkWrite>>;
  });
  const insert = vi.spyOn(model, 'insertMany');
  insert.mockImplementation((async (input: unknown) => {
    const documents = input as TestDocument[];
    if (kind === 'logs' && controls.failAudit) throw new Error('Private log failure');
    for (const document of documents) put(kind, { _id: new Types.ObjectId(), createdAt: new Date(), updatedAt: new Date(), ...document });
    return documents;
  }) as Parameters<typeof insert.mockImplementation>[0]);
  vi.spyOn(model, 'deleteMany').mockImplementation((async (filter: TestDocument) => {
    const found = rows(kind, filter); found.forEach((row) => table(kind).delete(String(row._id)));
    return { acknowledged: true, deletedCount: found.length };
  }) as unknown as typeof model.deleteMany);
  vi.spyOn(model, 'deleteOne').mockImplementation((async (filter: TestDocument) => {
    const found = rows(kind, filter)[0]; if (found) table(kind).delete(String(found._id));
    return { acknowledged: true, deletedCount: found ? 1 : 0 };
  }) as unknown as typeof model.deleteOne);
  vi.spyOn(model, 'replaceOne').mockImplementation((async (filter: TestDocument, value: TestDocument) => {
    const found = rows(kind, filter)[0]; if (found) replace(kind, found, value);
    return { acknowledged: true, matchedCount: found ? 1 : 0, modifiedCount: found ? 1 : 0 };
  }) as unknown as typeof model.replaceOne);
  vi.spyOn(model, 'updateOne').mockImplementation((async (filter: TestDocument, update: TestDocument) => {
    const found = rows(kind, filter)[0];
    if (found && update.$inc) for (const [key, value] of Object.entries(update.$inc as TestDocument)) found[key] = Number(found[key] ?? 0) + Number(value);
    return { acknowledged: true, matchedCount: found ? 1 : 0 };
  }) as unknown as typeof model.updateOne);
  vi.spyOn(model, 'updateMany').mockImplementation((async (filter: TestDocument, update: TestDocument) => {
    for (const found of rows(kind, filter)) Object.assign(found, update.$set);
    return { acknowledged: true };
  }) as unknown as typeof model.updateMany);
  vi.spyOn(model, 'findOneAndUpdate').mockImplementation(((filter: TestDocument, update: TestDocument) => {
    const found = rows(kind, filter)[0];
    if (found) for (const [key, value] of Object.entries(update.$set as TestDocument)) {
      const [parent, child] = key.split('.'); (found[parent] as TestDocument)[child] = value;
    }
    return testQuery(() => found ? [found] : [], true);
  }) as unknown as typeof model.findOneAndUpdate);
}
export function createHarness() {
  let database: Database = { job: new Map(), certification: new Map(), todo: new Map(), logs: new Map(), users: new Map() };
  const controls = { failAudit: false, transactions: 0 };
  const rows = (kind: Collection, filter: TestDocument) => [...database[kind].values()].filter((row) => matches(row, filter));
  const put = (kind: Collection, value: TestDocument) => {
    const id = String(value._id);
    if (database[kind].has(id)) throw duplicate();
    if (value.dedupeKey && [...database[kind].values()].some((row) => row.userId === value.userId && row.dedupeKey === value.dedupeKey)) throw duplicate();
    database[kind].set(id, clone(value));
  };
  const replace = (kind: Collection, old: TestDocument, value: TestDocument) => {
    if (value.dedupeKey && [...database[kind].values()].some((row) => String(row._id) !== String(old._id) && row.userId === value.userId && row.dedupeKey === value.dedupeKey)) throw duplicate();
    database[kind].set(String(old._id), clone(value));
  };
  const session = { withTransaction: async <T>(work: () => Promise<T>) => {
    const before = Object.fromEntries(Object.entries(database).map(([kind, table]) => [kind, new Map([...table].map(([key, value]) => [key, clone(value)]))])) as Database;
    controls.transactions++;
    try { return await work(); } catch (error) { database = before; throw error; }
  }, endSession: vi.fn().mockResolvedValue(undefined) };
  for (const kind of Object.keys(models) as Collection[]) installModelMocks(kind, models[kind] as unknown as Model<TestDocument>, { rows, put, replace, controls, table: (name) => database[name] });
  for (const user of [owner, visitor]) put('users', { _id: new Types.ObjectId(user.userId), role: user.role, name: user.name, settings: { groundingEnabled: true, aiDailyLimit: 18 }, expiresAt: demoExpiry });
  const seed = (entity: Entity, values: TestDocument, userId = owner.userId) => {
    const now = new Date('2026-10-20T01:02:03.000Z');
    const model = models[entity] as unknown as Model<TestDocument>;
    const document = new model({ userId, _id: new Types.ObjectId(), __v: 0, createdAt: now, updatedAt: now, ...values }).toObject({ flattenMaps: true });
    put(entity, document); return clone(document);
  };
  return { rows, seed, controls, session, db: { startSession: async () => session }, collection: (kind: Collection) => database[kind] };
}
