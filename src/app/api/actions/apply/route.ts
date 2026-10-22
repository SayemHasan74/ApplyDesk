import { withApi } from '@/lib/api/handler';
import { applyBodySchema } from '@/lib/actions/schema';
import { applyActions } from '@/lib/actions/apply';

export const POST = withApi({ auth: 'user', body: applyBodySchema, maxBodyBytes: 200 * 1024 }, ({ user, body }) => applyActions(user!, body));
