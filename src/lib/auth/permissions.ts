import { ADMIN_CAPABILITIES, type Role } from '../constants';
export function canUse(role: Role, capability: typeof ADMIN_CAPABILITIES[number]) {
  return role === 'admin' && ADMIN_CAPABILITIES.includes(capability);
}
