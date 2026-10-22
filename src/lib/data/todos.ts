import 'server-only';
import type { Model } from 'mongoose';
import { connectDb } from '../db';
import { MAX_LIST } from '../constants';
import { AppError } from '../errors';
import { Todo, type TodoDocument } from '../models/todos';
import { Job, type JobDocument } from '../models/jobs';
import { Certification, type CertificationDocument } from '../models/certifications';
import { todoCreateSchema, todoPatchSchema, type TodoCreate, type TodoPatch } from '../validators/todo';
import { objectId } from '../validators/fields';
import { todoItemSchema } from '../todos/items';
import { applyTodoStatusEffects } from '../todos/effects';
import { scopedFilter } from './scope';
import { displayDocument } from '../serialize';

const model: Model<TodoDocument> = Todo;
const jobs = Job as Model<JobDocument>;
const certifications = Certification as Model<CertificationDocument>;
const fields = [...Object.keys(todoCreateSchema.shape), 'completedAt', 'createdAt', 'updatedAt'];
const projection = [...fields, '_id'].join(' ');
const serialize = (value: Record<string, unknown>) => todoItemSchema.parse(displayDocument(value, fields));

async function verifyLinks(userId: string, values: TodoPatch) {
  const [job, cert] = await Promise.all([
    values.linkedJobId ? jobs.findOne(scopedFilter(userId, { _id: values.linkedJobId })).select('_id').lean() : true,
    values.linkedCertId ? certifications.findOne(scopedFilter(userId, { _id: values.linkedCertId })).select('_id').lean() : true,
  ]);
  if (!job || !cert) throw new AppError('VALIDATION', 'Linked items must belong to your account');
}
export async function listTodos(userId: string) {
  await connectDb();
  return (await model.find(scopedFilter(userId, {})).select(projection).sort({ createdAt: -1 }).limit(MAX_LIST).lean()).map(serialize);
}
export async function createTodo(userId: string, input: TodoCreate, expiresAt?: Date | null) {
  const values = todoCreateSchema.parse(input);
  await connectDb();
  await verifyLinks(userId, values);
  const item = await model.create({ ...values, ...applyTodoStatusEffects({ status: 'todo', completedAt: null }, values, new Date().toISOString()),
    userId, ...(expiresAt ? { expiresAt } : {}),
  });
  return serialize(item.toObject());
}
export async function updateTodo(userId: string, id: string, patch: TodoPatch) {
  objectId.parse(id);
  const values = todoPatchSchema.parse(patch);
  await connectDb();
  const current = await model.findOne(scopedFilter(userId, { _id: id })).select(projection).lean();
  if (!current) throw new AppError('NOT_FOUND', 'To-do not found');
  await verifyLinks(userId, values);
  const effects = applyTodoStatusEffects(serialize(current), values, new Date().toISOString());
  const changes: Record<string, unknown> = {};
  for (const key of Object.keys(todoPatchSchema.shape) as (keyof TodoPatch)[]) {
    if (effects[key] !== undefined) changes[key] = effects[key];
  }
  if ('completedAt' in effects) changes.completedAt = effects.completedAt;
  if (!Object.keys(changes).length) return serialize(current);
  const item = await model.findOneAndUpdate(scopedFilter(userId, { _id: id }), { $set: changes }, { returnDocument: 'after', runValidators: true }).select(projection).lean();
  if (!item) throw new AppError('NOT_FOUND', 'To-do not found');
  return serialize(item);
}
export async function deleteTodo(userId: string, id: string) {
  objectId.parse(id);
  await connectDb();
  const result = await model.deleteOne(scopedFilter(userId, { _id: id }));
  if (!result.deletedCount) throw new AppError('NOT_FOUND', 'To-do not found');
  return { id };
}
export async function deleteDoneTodos(userId: string) {
  await connectDb();
  const result = await model.deleteMany(scopedFilter(userId, { status: 'done' as const }));
  return { count: result.deletedCount };
}
