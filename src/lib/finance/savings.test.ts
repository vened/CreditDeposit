import { describe, expect, it } from 'vitest';
import Decimal from 'decimal.js';
import { CalculationError } from './calculation-error';
import { calculateSavings } from './savings';
import type { AccountResult, SavingsInput } from './types';

function input(overrides: Partial<SavingsInput> = {}): SavingsInput {
  return {
    openingBalance: '100000', annualRate: '12', startDate: '2026-10-01', endDate: '2026-10-31',
    basis: 'daily', payout: 'monthly', capitalize: false, partialMonths: 'actual', events: [], rateChanges: [],
    ...overrides,
  };
}

function cents(value: string): number { return Math.round(Number(value) * 100); }
function expectInvariants(result: AccountResult, opening: string): void {
  expect(cents(result.capital)).toBe(cents(result.closingBalance) + cents(result.paidExternally) + cents(result.pendingInterest));
  expect(cents(result.earnedInterest)).toBe(cents(result.paidInterest) + cents(result.pendingInterest));
  expect(cents(result.capital)).toBe(cents(result.netContributions) + cents(result.earnedInterest));
  expect(result.months.reduce((sum, row) => sum + cents(row.earnedInterest), 0)).toBe(cents(result.earnedInterest));
  expect(result.months.reduce((sum, row) => sum + cents(row.paidInterest), 0)).toBe(cents(result.paidInterest));
  expect(result.months.reduce((sum, row) => sum + cents(row.netFlow), cents(opening))).toBe(cents(result.netContributions));
  expect(result.months.at(-1)?.closingBalance).toBe(result.closingBalance);
}

describe('calculateSavings', () => {
  it('keeps October interest pending when the horizon excludes payout day', () => {
    const result = calculateSavings(input());
    expect(result).toMatchObject({ earnedInterest: '986.30', paidInterest: '0.00', pendingInterest: '986.30', closingBalance: '100000.00', paidExternally: '0.00', netContributions: '100000.00', capital: '100986.30' });
    expect(result.months).toEqual([{ month: '2026-10', days: 30, openingBalance: '100000.00', netFlow: '0.00', minimumBalance: '100000.00', earnedInterest: '986.30', paidInterest: '0.00', pendingInterest: '986.30', closingBalance: '100000.00' }]);
  });

  it('includes the October 31 payout when ending November 1', () => {
    expect(calculateSavings(input({ endDate: '2026-11-01' }))).toMatchObject({ earnedInterest: '1019.18', paidInterest: '1019.18', pendingInterest: '0.00', paidExternally: '1019.18', closingBalance: '100000.00' });
  });

  it('uses the leap-year denominator on a single day', () => {
    expect(calculateSavings(input({ openingBalance: '36600', annualRate: '1', startDate: '2024-02-29', endDate: '2024-03-01' })).earnedInterest).toBe('1.00');
  });

  it.each([
    ['daily', true, '200.10', '200.10', '0.00', '100200.10'],
    ['monthly', true, '200.00', '0.00', '200.00', '100000.00'],
    ['daily', false, '200.00', '200.00', '0.00', '100000.00'],
  ] as const)('separates accrual from %s payout and capitalization=%s', (payout, capitalize, earnedInterest, paidInterest, pendingInterest, closingBalance) => {
    expect(calculateSavings(input({ annualRate: '36.5', startDate: '2026-01-01', endDate: '2026-01-03', payout, capitalize }))).toMatchObject({ earnedInterest, paidInterest, pendingInterest, closingBalance });
  });

  it.each([['daily', '2300.00'], ['monthly-min', '1550.00']] as const)('uses the %s basis after a January withdrawal', (basis, earnedInterest) => {
    const result = calculateSavings(input({ annualRate: '36.5', startDate: '2026-01-01', endDate: '2026-02-01', basis, events: [{ date: '2026-01-16', amount: '-50000' }] }));
    expect(result).toMatchObject({ earnedInterest, paidInterest: earnedInterest, closingBalance: '50000.00', netContributions: '50000.00' });
    expect(result.months[0].minimumBalance).toBe('50000.00');
  });

  it.each([
    ['2026-01-02', '2026-02-01', 'exclude', '0.00'],
    ['2026-01-01', '2026-01-31', 'exclude', '0.00'],
    ['2026-01-01', '2026-02-01', 'exclude', '3100.00'],
    ['2026-01-02', '2026-02-01', 'actual', '3000.00'],
  ] as const)('tests real calendar completeness %s..%s (%s)', (startDate, endDate, partialMonths, earnedInterest) => {
    expect(calculateSavings(input({ annualRate: '36.5', startDate, endDate, basis: 'monthly-min', partialMonths })).earnedInterest).toBe(earnedInterest);
  });

  it('weights monthly minimum by each effective daily rate', () => {
    expect(calculateSavings(input({ annualRate: '36.5', startDate: '2026-01-01', endDate: '2026-02-01', basis: 'monthly-min', events: [{ date: '2026-01-16', amount: '-50000' }], rateChanges: [{ date: '2026-01-16', annualRate: '73' }] })).earnedInterest).toBe('2350.00');
  });

  it('determines minimum before the month-end capitalized payout', () => {
    const result = calculateSavings(input({ annualRate: '36.5', startDate: '2026-01-01', endDate: '2026-02-02', basis: 'monthly-min', capitalize: true, events: [{ date: '2026-01-31', amount: '-50000' }] }));
    expect(result).toMatchObject({ earnedInterest: '1601.55', paidInterest: '1550.00', pendingInterest: '51.55', closingBalance: '51550.00' });
    expect(result.months.map(row => row.minimumBalance)).toEqual(['50000.00', '51550.00']);
    expectInvariants(result, '100000');
  });

  it('aggregates same-date cash before checking solvency and pays after that day accrues', () => {
    expect(calculateSavings(input({ annualRate: '36.5', startDate: '2026-01-30', endDate: '2026-02-01', capitalize: true, events: [{ date: '2026-01-31', amount: '-200000' }, { date: '2026-01-31', amount: '150000' }] }))).toMatchObject({ earnedInterest: '150.00', closingBalance: '50150.00', netContributions: '50000.00' });
  });

  it('earns no interest on a day with a withdrawal to zero', () => {
    expect(calculateSavings(input({ annualRate: '36.5', startDate: '2026-01-01', endDate: '2026-01-03', events: [{ date: '2026-01-02', amount: '-100000' }] }))).toMatchObject({ earnedInterest: '100.00', closingBalance: '0.00', pendingInterest: '100.00' });
  });

  it('reports the exact cash deficit without funding it from pending interest', () => {
    let caught: unknown;
    try { calculateSavings(input({ annualRate: '36.5', startDate: '2026-01-30', endDate: '2026-02-01', events: [{ date: '2026-01-31', amount: '-100000.01' }] })); } catch (error) { caught = error; }
    expect(caught).toBeInstanceOf(CalculationError);
    expect(caught).toMatchObject({ date: '2026-01-31', deficit: '0.01' });
  });

  it('uses each year denominator across New Year', () => {
    expect(calculateSavings(input({ openingBalance: '36600', annualRate: '1', startDate: '2024-12-31', endDate: '2025-01-02' })).earnedInterest).toBe('2.00');
  });

  it('rounds each actual payout half-up before the next day accrues', () => {
    expect(calculateSavings(input({ openingBalance: '5', annualRate: '36.5', startDate: '2026-01-01', endDate: '2026-01-03', payout: 'daily', capitalize: false }))).toMatchObject({ earnedInterest: '0.02', paidExternally: '0.02' });
  });

  it('keeps monthly rows and monetary invariants reconciled across pending carry', () => {
    const result = calculateSavings(input({ openingBalance: '3', annualRate: '36.5', startDate: '2026-01-31', endDate: '2026-03-02', capitalize: true, events: [{ date: '2026-02-10', amount: '7' }, { date: '2026-03-01', amount: '-2' }] }));
    expectInvariants(result, '3');
    expect(result).toMatchObject({ paidInterest: '0.22', pendingInterest: '0.01', closingBalance: '8.22', capital: '8.23' });
  });

  it('preserves cents at the allowed maximum daily-compounding growth', () => {
    // Independent Python Decimal(prec=100), daily HALF_UP payouts, actual year days.
    expect(calculateSavings(input({ openingBalance: '1000000000000', annualRate: '1000', startDate: '2026-01-01', endDate: '2036-01-01', payout: 'daily', capitalize: true })).closingBalance).toBe('7006248393739101970370969902806684135984536978649639598.30');
  });

  it('returns zero income at zero rate and ignores external Decimal configuration', () => {
    const original = { precision: Decimal.precision, rounding: Decimal.rounding };
    try {
      Decimal.set({ precision: 2, rounding: Decimal.ROUND_DOWN });
      expect(calculateSavings(input()).earnedInterest).toBe('986.30');
      expect(calculateSavings(input({ annualRate: '0', payout: 'daily', capitalize: true })).earnedInterest).toBe('0.00');
    } finally { Decimal.set(original); }
  });
});
