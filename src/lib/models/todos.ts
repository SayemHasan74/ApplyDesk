import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { PRIORITIES, TODO_CREATED_FROM, TODO_STATUSES } from '../constants';
import { dateOnly, modelOptions, nullableText, requiredText, tenantFields, ttlIndex } from './fields';

const schema = new Schema({
  ...tenantFields, title: requiredText(200), details: { type: String, default: '', maxlength: 4000 },
  status: { type: String, enum: TODO_STATUSES, default: 'todo' },
  priority: { type: String, enum: PRIORITIES, default: 'medium' },
  dueDate: dateOnly(), tag: nullableText(),
  linkedJobId: { ...nullableText(24), match: /^[a-f0-9]{24}$/ },
  linkedCertId: { ...nullableText(24), match: /^[a-f0-9]{24}$/ },
  completedAt: { type: Date, default: null },
  createdFrom: { type: String, enum: TODO_CREATED_FROM, default: 'manual' },
}, modelOptions);
schema.index({ userId: 1, status: 1, dueDate: 1 });
ttlIndex(schema);
export type TodoDocument = InferSchemaType<typeof schema>;
export const Todo = (models.Todo as Model<TodoDocument> | undefined) ?? model('Todo', schema);
