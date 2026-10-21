import { afterEach, describe, expect, it, vi } from 'vitest';
import { addDays, daysBetween, formatDisplay, isValidDateString, todayDhaka } from './dates';

afterEach(() => vi.useRealTimers());
describe('calendar dates', () => {
  it.each(['2024-02-29', '2026-01-01', '2000-02-29', '0099-12-31'])('accepts %s', (value) => expect(isValidDateString(value)).toBe(true));
  it.each(['2026-02-30', '2025-02-29', '1900-02-29', '2026-13-01', '2026-00-01', '2026-01-00', '2026-1-01', 'invalid'])('rejects %s', (value) => expect(isValidDateString(value)).toBe(false));
  it('computes positive and negative differences over leap and year boundaries', () => {
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2);
    expect(daysBetween('2027-01-01', '2026-12-31')).toBe(-1);
    expect(daysBetween('2026-01-01', '2026-01-01')).toBe(0);
  });
  it('adds days across month/year boundaries', () => {
    expect(addDays('2024-02-28', 2)).toBe('2024-03-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(() => addDays('2026-01-01', 0.5)).toThrow(RangeError);
    expect(() => daysBetween('2026-02-30', '2026-03-01')).toThrow(RangeError);
  });
  it('formats dates and reads today in Dhaka', () => {
    expect(formatDisplay('2026-10-21')).toBe('21 Oct 2026');
    expect(formatDisplay('0099-12-31')).toBe('31 Dec 0099');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-31T18:01:00Z'));
    expect(todayDhaka()).toBe('2027-01-01');
  });
});
