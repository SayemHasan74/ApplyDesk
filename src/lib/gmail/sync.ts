import 'server-only';
import { z } from 'zod';
import type { CurrentUser } from '../auth/policy';
import { AppError } from '../errors';
import { AiLimitError } from '../ai/usage';
import { GMAIL_QUERY } from '../constants';
import { decrypt } from '../crypto';
import { acquireGmailSync, getGmailConnection, releaseGmailSync, setGmailSyncTime } from '../data/gmail';
import { unprocessedIds, persistEmailBatch } from '../data/gmail-sync';
import { listJobs } from '../data/jobs';
import { gmailGet, getAccessToken } from './client';
import { extractMessage, mapFive } from './extract';
import { gmailBudgetAvailable } from './budget';
import { classifyEmails } from './classify';
import { emailSuggestions } from './mapping';

export async function syncGmail(user: CurrentUser) {
  if (user.role !== 'admin') throw new AppError('FORBIDDEN', 'Administrator access required');
  const connection = await getGmailConnection(user.userId);
  if (!connection?.refreshTokenEnc) throw new AppError('FORBIDDEN', 'Gmail is not connected.');
  if (!await gmailBudgetAvailable(user)) return { skipped: 'AI limit' as const };
  const lease = await acquireGmailSync(user.userId, connection.refreshTokenEnc);
  try { return await syncConnected(user, connection.refreshTokenEnc); }
  finally { await releaseGmailSync(user.userId, lease); }
}
async function syncConnected(user: CurrentUser, refreshTokenEnc: string) {
  const token = await getAccessToken(decrypt(refreshTokenEnc));
  const listed = z.object({ messages: z.array(z.object({ id: z.string().min(1).max(200) })).max(25).optional() }).parse(await gmailGet(`messages?${new URLSearchParams({ q: GMAIL_QUERY, maxResults: '25' })}`, token));
  const ids = await unprocessedIds(user.userId, [...new Set(listed.messages?.map((row) => row.id) ?? [])]);
  if (!ids.length) { await setGmailSyncTime(user.userId); return { processed: 0, suggestions: 0 }; }
  const [messages, jobs] = await Promise.all([mapFive(ids, async (id) => extractMessage(await gmailGet(`messages/${encodeURIComponent(id)}?format=full`, token))), listJobs(user.userId)]);
  let processed = 0, suggestions = 0;
  try {
    for (let i = 0; i < messages.length; i += 10) {
      const batch = messages.slice(i, i + 10), classified = await classifyEmails(user, batch);
      const proposals = classified.flatMap<ReturnType<typeof emailSuggestions>[number]>((row) => emailSuggestions(batch.find((email) => email.id === row.message_id)!, row, jobs));
      await persistEmailBatch(user.userId, batch.map((email) => email.id), proposals, refreshTokenEnc);
      processed += batch.length; suggestions += proposals.length;
    }
  } catch (error) { if (error instanceof AiLimitError) return { skipped: 'AI limit' as const }; throw error; }
  await setGmailSyncTime(user.userId); return { processed, suggestions };
}
