import { expect, it } from 'vitest';
import { settingsPatchSchema } from './settings';

it('accepts sparse settings changes and inclusive integer bounds', () => {
  expect(settingsPatchSchema.parse({ groundingEnabled: false })).toEqual({ groundingEnabled: false });
  expect(settingsPatchSchema.parse({ aiDailyLimit: 1 })).toEqual({ aiDailyLimit: 1 });
  expect(settingsPatchSchema.parse({ aiDailyLimit: 100 })).toEqual({ aiDailyLimit: 100 });
});
it.each([{ aiDailyLimit: 0 }, { aiDailyLimit: 101 }, { aiDailyLimit: 1.5 }, { aiDailyLimit: '18' }, { groundingEnabled: 1 }, { $set: {} }, { 'settings.aiDailyLimit': 10 }, { role: 'admin' }])('rejects invalid or unknown settings %j', (value) => {
  expect(settingsPatchSchema.safeParse(value).success).toBe(false);
});
