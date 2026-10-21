import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const env = vi.hoisted(() => ({ ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64') }));
vi.mock('./env', () => ({ getEnv: () => env }));
import { decrypt, encrypt } from './crypto';

beforeEach(() => { env.ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64'); });
it('round trips Unicode and empty strings using versioned tokens', () => {
  for (const text of ['', 'refresh token বাংলা 🔐']) {
    const token = encrypt(text);
    expect(token.startsWith('v1.')).toBe(true);
    expect(decrypt(token)).toBe(text);
  }
});
it('uses a new nonce for each encryption', () => expect(encrypt('same')).not.toBe(encrypt('same')));
it('rejects tampered ciphertext and wrong keys', () => {
  const token = encrypt('secret');
  const parts = token.split('.');
  const bytes = Buffer.from(parts[3], 'base64url');
  bytes[0] ^= 1;
  parts[3] = bytes.toString('base64url');
  expect(() => decrypt(parts.join('.'))).toThrow();
  env.ENCRYPTION_KEY = Buffer.alloc(32, 2).toString('base64');
  expect(() => decrypt(token)).toThrow();
});
it.each(['', 'v2.a.b.c', 'v1.a.b.c', 'v1.!.!.!', 'v1.a.b.c.extra'])('rejects malformed token %s', (token) => expect(() => decrypt(token)).toThrow());
