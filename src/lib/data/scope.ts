export function scopedFilter<T extends Record<string, unknown>>(userId: string, filter: T) {
  return { ...filter, userId };
}
