import 'server-only';
import type { CurrentUser } from '../auth/policy';
import { getCount, incrementIfBelow } from '../counters';
import { todayDhaka } from '../dates';
import { AiLimitError, getAiUsage, reserveAiRequest } from '../ai/usage';

export async function gmailBudgetAvailable(user: CurrentUser) {
  const [count, usage] = await Promise.all([getCount(`ai:gmail:${todayDhaka()}`), getAiUsage(user)]);
  return user.role === 'admin' && count < 5 && usage.remaining > 0;
}
export async function reserveGmailRequest(user: CurrentUser) {
  if (user.role !== 'admin' || !await gmailBudgetAvailable(user)) throw new AiLimitError(user.role);
  if (!await incrementIfBelow(`ai:gmail:${todayDhaka()}`, 5, 3 * 86400)) throw new AiLimitError(user.role);
  await reserveAiRequest(user);
}
