import { z } from 'zod';

export const settingsSchema = z.object({ groundingEnabled: z.boolean(), aiDailyLimit: z.number().int().min(1).max(100) }).strict();
export const settingsPatchSchema = settingsSchema.partial();
export type Settings = z.infer<typeof settingsSchema>;
export type SettingsPatch = z.infer<typeof settingsPatchSchema>;
