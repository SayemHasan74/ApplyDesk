import { expect, it } from 'vitest';
import { certDedupeKey, jobDedupeKey, normalizeKey } from './dedupe';

it('normalizes case, compatibility characters, punctuation and spaces', () => {
  expect(normalizeKey('  CAFÉ,  ＡＣＭＥ! ')).toBe('cafe acme');
  expect(normalizeKey('বাংলা ১২৩ 世界 42')).toBe('বল ১২৩ 世界 42');
  expect(normalizeKey('!!!')).toBe('');
});
it('constructs stable entity keys without confusing company and role', () => {
  expect(jobDedupeKey(' ACME Inc. ', 'Senior Engineer!')).toBe('acme inc|senior engineer');
  expect(certDedupeKey('Provider!', ' A  Course ')).toBe('provider|a course');
  expect(jobDedupeKey('a', 'b')).not.toBe(jobDedupeKey('b', 'a'));
});
