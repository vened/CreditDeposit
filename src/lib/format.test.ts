import { expect, it } from 'vitest';
import { formatDate, formatMoney, formatPercent } from './format';

it('formats kopecks and large ruble amounts without losing precision', () => {
  expect(formatMoney('100000.50')).toBe('100\u00a0000,50\u00a0₽');
  expect(formatMoney('1234567890123456.78')).toBe('1\u00a0234\u00a0567\u00a0890\u00a0123\u00a0456,78\u00a0₽');
  expect(formatMoney('-0.01')).toBe('−0,01\u00a0₽');
});
it('formats dates and rates in Russian', () => {
  expect(formatDate('2026-01-31')).toBe('31.01.2026');
  expect(formatPercent('12.500000')).toBe('12,5%');
  expect(() => formatDate('2026-02-29')).toThrow();
});
