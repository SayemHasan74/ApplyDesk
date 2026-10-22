import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { extractJsonObject } from './json';

it.each(['{"a":1}', '```json\n{"a":1}\n```', 'Here you go: {"a":1} trailing'])('extracts JSON from %s', (value) => {
  expect(extractJsonObject(value)).toEqual({ a: 1 });
});
it('handles nested braces, quotes and escaped backslashes in strings', () => {
  const object = { nested: { text: 'a } { "quoted" \\ thing', list: [{ a: 1 }] } };
  expect(extractJsonObject(`prefix ${JSON.stringify(object)} suffix`)).toEqual(object);
});
it.each(['nothing', '{"a":', '{"a":"truncated}', '{invalid}'])('rejects malformed output %s', (value) => {
  expect(() => extractJsonObject(value)).toThrow();
});
