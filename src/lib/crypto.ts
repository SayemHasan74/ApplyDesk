import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { getEnv } from './env';

export function encrypt(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(getEnv().ENCRYPTION_KEY, 'base64'), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join('.');
}

export function decrypt(token: string) {
  const parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1' || parts.slice(1).some((part) => !/^[\w-]*$/.test(part))) throw new Error('Invalid encrypted token');
  const iv = Buffer.from(parts[1], 'base64url');
  const tag = Buffer.from(parts[2], 'base64url');
  if (iv.length !== 12 || tag.length !== 16) throw new Error('Invalid encrypted token');
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(getEnv().ENCRYPTION_KEY, 'base64'), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(Buffer.from(parts[3], 'base64url')), decipher.final()]).toString('utf8');
}
