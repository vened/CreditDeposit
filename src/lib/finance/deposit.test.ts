import { describe, expect, it } from 'vitest';
import { calculateDeposit } from './deposit';
import type { DepositInput } from './types';

function input(overrides: Partial<DepositInput> = {}): DepositInput {
  return { openingBalance: '100000', annualRate: '12', startDate: '2026-10-01', endDate: '2026-10-31', payout: 'maturity', capitalize: false, events: [], rateChanges: [], ...overrides };
}

describe('calculateDeposit', () => {
  it('earns from the day after opening through maturity and pays the remainder', () => {
    expect(calculateDeposit(input())).toMatchObject({ earnedInterest: '986.30', paidInterest: '986.30', pendingInterest: '0.00', paidExternally: '986.30', closingBalance: '100000.00', capital: '100986.30', netContributions: '100000.00' });
  });

  it('uses 366 days for the single leap-day interest period', () => {
    expect(calculateDeposit(input({ openingBalance: '36600', annualRate: '1', startDate: '2024-02-28', endDate: '2024-02-29' })).earnedInterest).toBe('1.00');
  });

  it('starts replenishment interest the following day', () => {
    expect(calculateDeposit(input({ annualRate: '36.5', startDate: '2026-01-01', endDate: '2026-01-03', events: [{ date: '2026-01-02', amount: '100000' }] }))).toMatchObject({ earnedInterest: '300.00', closingBalance: '200000.00', netContributions: '200000.00' });
  });

  it('accepts opening-day and maturity-day deposits but accrues only eligible balances', () => {
    expect(calculateDeposit(input({ annualRate: '36.5', startDate: '2026-01-01', endDate: '2026-01-03', events: [{ date: '2026-01-01', amount: '100000' }, { date: '2026-01-03', amount: '50000' }] }))).toMatchObject({ earnedInterest: '400.00', closingBalance: '250000.00' });
  });

  it.each([[true, '6092.79', '106092.79', '0.00'], [false, '6000.00', '100000.00', '6000.00']] as const)('pays on clamped opening anniversaries and capitalizes=%s from the following day', (capitalize, earnedInterest, closingBalance, paidExternally) => {
    const result = calculateDeposit(input({ annualRate: '36.5', startDate: '2026-01-31', endDate: '2026-04-01', payout: 'monthly', capitalize }));
    expect(result).toMatchObject({ earnedInterest, closingBalance, paidExternally, pendingInterest: '0.00' });
    expect(result.months.map(row => row.paidInterest)).toEqual(capitalize ? ['0.00', '2800.00', '3186.80', '105.99'] : ['0.00', '2800.00', '3100.00', '100.00']);
  });

  it('applies the dated rate on its date without rewriting prior accrual', () => {
    expect(calculateDeposit(input({ annualRate: '36.5', startDate: '2026-01-01', endDate: '2026-01-03', rateChanges: [{ date: '2026-01-03', annualRate: '73' }] })).earnedInterest).toBe('300.00');
  });

  it('keeps replenishment out of the payout-day interest base', () => {
    const result = calculateDeposit(input({ annualRate: '36.5', startDate: '2026-01-01', endDate: '2026-02-02', payout: 'monthly', capitalize: true, events: [{ date: '2026-02-01', amount: '100000' }] }));
    expect(result).toMatchObject({ earnedInterest: '3303.10', closingBalance: '203303.10', paidInterest: '3303.10' });
    expect(result.months.map(row => row.paidInterest)).toEqual(['0.00', '3303.10']);
  });

  it('uses a new year denominator, and reconciles month rows with final totals', () => {
    const result = calculateDeposit(input({ openingBalance: '36600', annualRate: '1', startDate: '2024-12-30', endDate: '2025-01-02', capitalize: true }));
    expect(result).toMatchObject({ earnedInterest: '3.01', closingBalance: '36603.01', capital: '36603.01' });
    expect(result.months.map(row => row.earnedInterest)).toEqual(['1.00', '2.01']);
    expect(result.months.map(row => row.pendingInterest)).toEqual(['1.00', '0.00']);
  });

  it('produces zero income for zero rate while preserving flows', () => {
    expect(calculateDeposit(input({ annualRate: '0', events: [{ date: '2026-10-15', amount: '3.25' }] }))).toMatchObject({ earnedInterest: '0.00', closingBalance: '100003.25', capital: '100003.25' });
  });
});
