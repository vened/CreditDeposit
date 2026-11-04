import Decimal from 'decimal.js';
import type { Money } from './types';

// A private constructor keeps arithmetic independent of a caller's Decimal config.
export const FinanceDecimal = Decimal.clone({ precision: 48, rounding: Decimal.ROUND_HALF_UP });

export function parseDecimalInput(raw: string): string | null {
  const input = raw.trim();
  // A grouping separator is allowed only between complete three-digit groups.
  if (!/^-?(?:\d+|\d{1,3}(?:[ \u00a0\u202f]\d{3})+)(?:[.,]\d+)?$/.test(input)) return null;
  return input.replace(/[ \u00a0\u202f]/g, '').replace(',', '.');
}

export function money(value: Decimal.Value): Money {
  const decimal = new FinanceDecimal(value);
  if (!decimal.isFinite()) throw new RangeError('Сумма должна быть конечным числом');
  const rounded = decimal.toDecimalPlaces(2);
  return rounded.isZero() ? '0.00' : rounded.toFixed(2);
}
