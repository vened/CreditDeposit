import { FinanceDecimal, money } from './finance/money';
import { isISODate } from './finance/dates';
import type { ISODate, Money } from './finance/types';

export function formatMoney(value: Money): string {
  const normalized = money(value);
  const [integer, fraction] = normalized.replace('-', '').split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
  return `${normalized.startsWith('-') ? '−' : ''}${grouped},${fraction}\u00a0₽`;
}

export function formatPercent(value: string): string {
  const decimal = new FinanceDecimal(value);
  if (!decimal.isFinite()) throw new RangeError('Ставка должна быть конечным числом');
  return `${decimal.toFixed().replace('.', ',')}%`;
}

export function formatDate(value: ISODate): string {
  if (!isISODate(value)) throw new RangeError('Некорректная дата');
  return value.split('-').reverse().join('.');
}
