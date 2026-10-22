import { withApi } from '@/lib/api/handler';
import { getAiUsage } from '@/lib/ai/usage';

export const GET = withApi({ auth: 'user' }, ({ user }) => getAiUsage(user!));
