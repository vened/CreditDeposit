import type { ISODate } from './types';

const DAY_MS = 86_400_000;

function utcDate(year: number, month: number, day: number): Date {
  const result = new Date(0);
  result.setUTCFullYear(year, month, day);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = utcDate(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function checkedDate(value: ISODate): Date {
  if (!isISODate(value)) throw new RangeError('Укажите существующую дату в формате ГГГГ-ММ-ДД');
  const [year, month, day] = value.split('-').map(Number);
  return utcDate(year, month - 1, day);
}

function toISO(date: Date): ISODate {
  const year = date.getUTCFullYear();
  if (!Number.isFinite(year) || year < 1 || year > 9999) throw new RangeError('Дата за пределами допустимого календаря');
  return date.toISOString().slice(0, 10);
}

function integer(value: number): void {
  if (!Number.isSafeInteger(value)) throw new RangeError('Смещение даты должно быть целым числом');
}

export function addDays(date: ISODate, n: number): ISODate {
  integer(n);
  const result = checkedDate(date);
  result.setUTCDate(result.getUTCDate() + n);
  return toISO(result);
}

// Call with the original anniversary and total month offset to avoid February drift.
export function addMonthsClamped(date: ISODate, n: number): ISODate {
  integer(n);
  const original = checkedDate(date);
  const target = utcDate(original.getUTCFullYear(), original.getUTCMonth() + n, 1);
  const lastDay = utcDate(target.getUTCFullYear(), target.getUTCMonth() + 1, 0).getUTCDate();
  target.setUTCDate(Math.min(original.getUTCDate(), lastDay));
  return toISO(target);
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return (checkedDate(b).getTime() - checkedDate(a).getTime()) / DAY_MS;
}

export function daysInYear(date: ISODate): 365 | 366 {
  const year = checkedDate(date).getUTCFullYear();
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 366 : 365;
}

export function firstOfNextMonth(date: ISODate): ISODate {
  const current = checkedDate(date);
  return toISO(utcDate(current.getUTCFullYear(), current.getUTCMonth() + 1, 1));
}
