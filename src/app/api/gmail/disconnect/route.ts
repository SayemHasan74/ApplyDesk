import { withApi } from '@/lib/api/handler';
import { getGmailConnection, saveGmailConnection } from '@/lib/data/gmail';
import { decrypt } from '@/lib/crypto';
import { revokeToken } from '@/lib/gmail/client';

export const POST = withApi({ auth: 'user', role: 'admin' }, async ({ user, requestId }) => {
  const connection = await getGmailConnection(user!.userId);
  await saveGmailConnection(user!.userId, null);
  if (connection?.refreshTokenEnc) {
    try { if (!await revokeToken(decrypt(connection.refreshTokenEnc))) console.error('[GMAIL_REVOKE]', requestId); }
    catch { console.error('[GMAIL_REVOKE]', requestId); }
  }
  return { disconnected: true };
});
