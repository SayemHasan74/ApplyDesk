import { Types } from 'mongoose';

export type TestDocument = Record<string, unknown>;
export function clone<T>(value: T): T {
  if (value instanceof Date) return new Date(value) as T;
  if (value instanceof Types.ObjectId) return new Types.ObjectId(value.toString()) as T;
  if (Array.isArray(value)) return value.map(clone) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, clone(child)])) as T;
  return value;
}
function comparable(value: unknown): string | number | boolean | null | undefined {
  if (value instanceof Date) return value.getTime();
  if (value instanceof Types.ObjectId) return value.toString();
  return value as string | number | boolean | null | undefined;
}
export function matches(document: TestDocument, filter: TestDocument): boolean {
  return Object.entries(filter).every(([key, condition]) => {
    if (key === '$or') return (condition as TestDocument[]).some((part) => matches(document, part));
    const value = comparable(document[key]);
    if (condition && typeof condition === 'object' && !(condition instanceof Date) && !(condition instanceof Types.ObjectId)) {
      const operators = condition as TestDocument;
      if ('$in' in operators) return (operators.$in as unknown[]).some((entry) => comparable(entry) === value);
      if ('$gt' in operators) return value !== undefined && value !== null && value > comparable(operators.$gt)!;
      if ('$lt' in operators) return value !== undefined && value !== null && value < comparable(operators.$lt)!;
    }
    return value === comparable(condition);
  });
}
export function testQuery(source: () => TestDocument[], one = false) {
  let sorting: Record<string, number> = {}, limit = Infinity;
  const evaluate = () => {
    const rows = source().sort((a, b) => {
      for (const [key, order] of Object.entries(sorting)) {
        const left = comparable(a[key])!, right = comparable(b[key])!;
        if (left !== right) return (left < right ? -1 : 1) * order;
      }
      return 0;
    }).slice(0, limit).map(clone);
    return one ? rows[0] ?? null : rows;
  };
  const chain = { select: () => chain, session: () => chain,
    sort: (value: Record<string, number>) => { sorting = value; return chain; },
    limit: (value: number) => { limit = value; return chain; }, lean: async () => evaluate(),
  };
  return chain;
}
