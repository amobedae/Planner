import {
  addDays as fnsAddDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay as fnsIsSameDay,
  isToday as fnsIsToday,
  parseISO,
  startOfWeek,
} from 'date-fns';

export const ISO = 'yyyy-MM-dd';

export function toISO(date: Date): string {
  return format(date, ISO);
}

export function fromISO(iso: string): Date {
  return parseISO(iso);
}

export function todayISO(): string {
  return toISO(new Date());
}

export function addDays(iso: string, amount: number): string {
  return toISO(fnsAddDays(fromISO(iso), amount));
}

export function isToday(iso: string): boolean {
  return fnsIsToday(fromISO(iso));
}

export function isSameDay(a: string, b: string): boolean {
  return fnsIsSameDay(fromISO(a), fromISO(b));
}

export function weekDays(iso: string): string[] {
  const start = startOfWeek(fromISO(iso), { weekStartsOn: 1 });
  const end = endOfWeek(fromISO(iso), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end }).map(toISO);
}

export function formatLong(iso: string): string {
  return format(fromISO(iso), 'EEEE, MMMM d');
}

export function formatMedium(iso: string): string {
  return format(fromISO(iso), 'MMM d, yyyy');
}

export function formatDayLabel(iso: string): string {
  return format(fromISO(iso), 'EEE');
}

export function formatDayNumber(iso: string): string {
  return format(fromISO(iso), 'd');
}

export function formatMonthYear(iso: string): string {
  return format(fromISO(iso), 'MMMM yyyy');
}

export function formatShort(iso: string): string {
  return format(fromISO(iso), 'MMM d');
}

export function formatWeekRange(startIso: string, endIso: string): string {
  const start = fromISO(startIso);
  const end = fromISO(endIso);
  const startLabel = format(start, start.getFullYear() === end.getFullYear() ? 'MMM d' : 'MMM d, yyyy');
  return `${startLabel} – ${format(end, 'MMM d, yyyy')}`;
}

export function monthGrid(iso: string): string[] {
  const date = fromISO(iso);
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = startOfWeek(firstOfMonth, { weekStartsOn: 1 });
  const lastOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const end = endOfWeek(lastOfMonth, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end }).map(toISO);
}

export function isSameMonth(iso: string, referenceIso: string): boolean {
  const a = fromISO(iso);
  const b = fromISO(referenceIso);
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}
