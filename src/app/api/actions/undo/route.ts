import { withApi } from '@/lib/api/handler';
import { undoBodySchema } from '@/lib/actions/schema';
import { undoActions } from '@/lib/actions/undo';

export const POST = withApi({ auth: 'user', body: undoBodySchema }, ({ user, body }) => undoActions(user!, body));
