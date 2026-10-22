import 'server-only';
import type { ClientSession } from 'mongoose';
import type { CurrentUser } from '../auth/policy';
import { entityStore } from './store';
import { lockActionUser } from './transaction';

export async function createActionState(user: CurrentUser, session: ClientSession, expiresAt: Date | null) {
  await lockActionUser(user, session);
  let count = 0;
  if (user.role === 'demo') {
    count += await entityStore('job').countDocuments({ userId: user.userId }).session(session);
    count += await entityStore('certification').countDocuments({ userId: user.userId }).session(session);
    count += await entityStore('todo').countDocuments({ userId: user.userId }).session(session);
  }
  return { user, session, expiresAt, count };
}
export type ActionState = Awaited<ReturnType<typeof createActionState>>;
