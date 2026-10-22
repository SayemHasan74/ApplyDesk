import { formatInTimeZone } from 'date-fns-tz';
import { TIMEZONE } from './constants';

export function todayDhaka() {
  return formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd');
}

export { isValidDateString, daysBetween, addDays, formatDisplay } from './date-only';
