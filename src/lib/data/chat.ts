import 'server-only';
import { connectDb } from '../db';
import { ChatMessage, type ChatMessageDocument } from '../models/chat-messages';
import type { Model } from 'mongoose';
import { objectId } from '../validators/fields';
import { getExpiryFor } from '../auth/expiry';
import type { Role } from '../constants';

const messages = ChatMessage as Model<ChatMessageDocument>;

export async function listChatHistory(userId: string) {
  objectId.parse(userId);
  await connectDb();
  const rows = await messages.find({ userId }).select('role text createdAt -_id').sort({ createdAt: -1, _id: -1 }).limit(50).lean();
  return rows.reverse().map(({ role, text, createdAt }) => ({ role, text, createdAt: createdAt.toISOString() }));
}
export async function saveChatExchange(userId: string, role: Role, userText: string, assistantText: string) {
  objectId.parse(userId);
  const expiresAt = await getExpiryFor(userId, role);
  await connectDb();
  const now = new Date();
  const texts = [{ role: 'user' as const, text: userText }, { role: 'assistant' as const, text: assistantText }].filter(({ text }) => text.trim());
  await messages.insertMany(texts.map((entry) => ({ ...entry, userId, createdAt: now, ...(expiresAt ? { expiresAt } : {}), text: entry.text.slice(0, 4000) })));
  const boundary = await messages.find({ userId }).select('_id createdAt').sort({ createdAt: -1, _id: -1 }).skip(49).limit(1).lean();
  if (boundary[0]) await messages.deleteMany({ userId, $or: [
    { createdAt: { $lt: boundary[0].createdAt } }, { createdAt: boundary[0].createdAt, _id: { $lt: boundary[0]._id } },
  ] });
}
