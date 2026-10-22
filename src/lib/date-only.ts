function utcDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (year < 100) date.setUTCFullYear(year);
  return date;
}

export function isValidDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return utcDate(value).toISOString().slice(0, 10) === value;
}

function requireDate(value: string) {
  if (!isValidDateString(value)) throw new RangeError('Invalid calendar date');
  return utcDate(value);
}

export function daysBetween(fromStr: string, toStr: string) {
  return (requireDate(toStr).getTime() - requireDate(fromStr).getTime()) / 86_400_000;
}

export function addDays(dateStr: string, n: number) {
  if (!Number.isInteger(n)) throw new RangeError('Days must be an integer');
  const date = requireDate(dateStr);
  date.setUTCDate(date.getUTCDate() + n);
  const result = date.toISOString().slice(0, 10);
  if (!isValidDateString(result)) throw new RangeError('Date is out of range');
  return result;
}

const displayFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' });

export function formatDisplay(dateStr: string) {
  const parts = displayFormatter.formatToParts(requireDate(dateStr));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((value) => value.type === type)?.value;
  return `${part('day')} ${part('month')} ${part('year')?.padStart(4, '0')}`;
}
