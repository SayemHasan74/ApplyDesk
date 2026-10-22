import { withApi } from '@/lib/api/handler';
import { listChatHistory } from '@/lib/data/chat';

export const GET = withApi({ auth: 'user' }, ({ user }) => listChatHistory(user!.userId));
