import { withApi } from '@/lib/api/handler';
import { syncGmail } from '@/lib/gmail/sync';
export const POST = withApi({ auth: 'user', role: 'admin' }, ({ user }) => syncGmail(user!));
