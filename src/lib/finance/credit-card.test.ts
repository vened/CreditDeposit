import { describe, expect, it } from 'vitest';
import { calculateCreditCard } from './credit-card';
import type { CardPlanningInput } from './types';
const base: CardPlanningInput = { ownFunds: '1000', creditLimit: '1000', startDate: '2026-01-01', endDate: '2026-01-15', monthlySpending: '310', spendingOverrides: {}, repaymentDay: 31, fees: '0', topUps: [], recurringTopUps: [], repayments: [], savings: { annualRate: '36.5', basis: 'daily', payout: 'monthly', capitalize: false, partialMonths: 'actual', rateChanges: [] } };
describe('live credit card calculator', () => {
  it('includes shared deposits in both accounts without treating them as profit', () => {
    const result = calculateCreditCard({ ...base, topUps: [{ date: '2026-01-05', amount: '100' }] });
    expect(result).toMatchObject({ baseline: { ok: true, account: { closingBalance: '950.00', earnedInterest: '14.90' } }, strategy: { ok: true, account: { closingBalance: '1100.00', earnedInterest: '16.10' } }, netBenefit: '1.20' });
  });
  it('adds manual and recurring repayment-day deposits before payments and fees', () => {
    const result = calculateCreditCard({ ...base, ownFunds: '30', endDate: '2026-01-03', repaymentDay: 3, fees: '2', topUps: [{ date: '2026-01-03', amount: '1' }], recurringTopUps: [{ amount: '1', startDate: '2026-01-03', endDate: '2026-01-03', frequency: 'monthly' }], repayments: [{ date: '2026-01-03', amount: '15' }] });
    expect(result.strategy).toMatchObject({ ok: true, account: { closingBalance: '0.00' }, debt: '0.00', rows: [{ manualRepayments: '15.00', automaticRepayments: '15.00', topUps: '2.00' }] });
  });
  it('retains recurring rules and final-date debt without mutating the input', () => {
    const input = { ...base, recurringTopUps: [{ amount: '10', startDate: '2026-01-01', endDate: '', frequency: 'weekly' as const }] };
    const original = structuredClone(input);
    expect(calculateCreditCard(input)).toMatchObject({ strategy: { ok: true, debt: '150.00', account: { closingBalance: '1030.00' } }, netBenefit: '1.20' });
    expect(input).toEqual(original);
  });
  it('does not use later deposits to cover an earlier shortage', () => {
    expect(calculateCreditCard({ ...base, ownFunds: '20', endDate: '2026-01-04', repaymentDay: 3, topUps: [{ date: '2026-01-04', amount: '100' }] }).strategy)
      .toMatchObject({ ok: false, failure: { date: '2026-01-03', deficit: '10.00' } });
  });
  it('models zero credit as paying the same expenses with own funds', () => {
    expect(calculateCreditCard({ ...base, creditLimit: '0' }).netBenefit).toBe('0.00');
  });
});
