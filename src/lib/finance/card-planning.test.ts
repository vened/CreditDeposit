import { describe, expect, it } from 'vitest';
import { calculateCardPlanning } from './card-planning';
import { FinanceDecimal, money } from './money';
import type { CardPlanningInput } from './types';
const base: CardPlanningInput = { ownFunds: '1000', creditLimit: '1000', startDate: '2026-01-01', endDate: '2026-01-31', monthlySpending: '310', spendingOverrides: {}, repaymentDay: 31, fees: '0', topUps: [], recurringTopUps: [], repayments: [], savings: { annualRate: '0', basis: 'daily', payout: 'monthly', capitalize: false, partialMonths: 'actual', rateChanges: [] } };
describe('monthly card planning comparison', () => {
  it('deducts outstanding debt at the inclusive final date without forcing repayment', () => {
    expect(calculateCardPlanning({ ...base, endDate: '2026-01-15' })).toMatchObject({ baseline: { ok: true, capital: '850.00' }, strategy: { ok: true, debt: '150.00', capital: '850.00', account: { closingBalance: '1000.00' } }, extraInterest: '0.00', netBenefit: '0.00' });
  });
  it('deducts a final-date fee exactly once including its effect on interest', () => {
    expect(calculateCardPlanning({ ...base, endDate: '2026-01-15', fees: '1', savings: { ...base.savings, annualRate: '36.5' } })).toMatchObject({ baseline: { capital: '863.80' }, strategy: { capital: '864.00' }, extraInterest: '1.20', netBenefit: '0.20' });
  });
  it('does not spend a payout due after the repayment on that same day', () => {
    expect(calculateCardPlanning({ ...base, ownFunds: '309.99', savings: { ...base.savings, annualRate: '36.5', capitalize: true } }).strategy)
      .toEqual({ ok: false, failure: { kind: 'insufficient-funds', date: '2026-01-31', deficit: '0.01' } });
  });
  it('uses prior capitalized payouts and preserves a valid strategy when baseline fails', () => {
    const input = { ...base, endDate: '2026-02-01', ownFunds: '310.70', repaymentDay: 1, spendingOverrides: { '2026-02': '280' }, savings: { ...base.savings, annualRate: '36.5', capitalize: true } };
    const result = calculateCardPlanning(input);
    expect(result.strategy).toMatchObject({ ok: true, account: { closingBalance: '0.02' }, debt: '0.00' });
    expect(result.baseline).toEqual({ ok: false, failure: { kind: 'insufficient-funds', date: '2026-02-01', deficit: '4.63' } });
    expect(result.netBenefit).toBeNull();
    expect(calculateCardPlanning({ ...input, savings: { ...input.savings, capitalize: false } }).strategy)
      .toEqual({ ok: false, failure: { kind: 'insufficient-funds', date: '2026-02-01', deficit: '9.30' } });
  });
  it('uses repayment-day topups but not later ones', () => {
    const input = { ...base, ownFunds: '20', endDate: '2026-01-03', repaymentDay: 3, topUps: [{ date: '2026-01-03', amount: '10' }] };
    expect(calculateCardPlanning(input)).toMatchObject({ baseline: { ok: true }, strategy: { ok: true, account: { closingBalance: '0.00' } } });
    expect(calculateCardPlanning({ ...input, endDate: '2026-01-04', topUps: [{ date: '2026-01-04', amount: '10' }] }).strategy)
      .toEqual({ ok: false, failure: { kind: 'insufficient-funds', date: '2026-01-03', deficit: '10.00' } });
  });
  it('preserves a valid baseline when strategy fees cause a shortage', () => {
    expect(calculateCardPlanning({ ...base, ownFunds: '30.50', endDate: '2026-01-03', repaymentDay: 3, fees: '1' }))
      .toMatchObject({ baseline: { ok: true, capital: '0.50' }, strategy: { ok: false, failure: { date: '2026-01-03', deficit: '0.50' } }, netBenefit: null, extraInterest: null });
  });
  it.each([['actual', '2.25'], ['exclude', '0.00']] as const)('preserves minimum-balance partial-month rule %s', (partialMonths, benefit) => {
    expect(calculateCardPlanning({ ...base, endDate: '2026-01-15', savings: { ...base.savings, annualRate: '36.5', basis: 'monthly-min', partialMonths } }).netBenefit).toBe(benefit);
  });
  it('applies rate changes on their date and keeps negative benefits', () => {
    expect(calculateCardPlanning({ ...base, endDate: '2026-01-15', savings: { ...base.savings, rateChanges: [{ date: '2026-01-11', annualRate: '36.5' }] } }).netBenefit).toBe('0.65');
    expect(calculateCardPlanning({ ...base, endDate: '2026-01-15', fees: '1' }).netBenefit).toBe('-1.00');
  });
  it('handles an inclusive single-day plan', () => {
    expect(calculateCardPlanning({ ...base, endDate: '2026-01-01' })).toMatchObject({ baseline: { capital: '990.00' }, strategy: { capital: '990.00', debt: '10.00' } });
  });
  it.each(['daily', 'monthly'] as const)('reconciles month capital and benefit with %s payouts and either capitalization mode', payout => {
    for (const capitalize of [true, false]) {
      const input = { ...base, ownFunds: '2000', endDate: '2026-03-15', fees: '1', topUps: [{ date: '2026-01-31', amount: '10' }], recurringTopUps: [{ amount: '2', startDate: '2026-01-01', endDate: '', frequency: 'weekly' as const }], savings: { ...base.savings, annualRate: '36.5', payout, capitalize } };
      const original = structuredClone(input);
      const result = calculateCardPlanning(input);
      expect(result.baseline.ok && result.strategy.ok).toBe(true);
      if (!result.baseline.ok || !result.strategy.ok) return;
      for (const scenario of [result.baseline, result.strategy]) {
        let external = new FinanceDecimal(0);
        for (const row of scenario.rows) {
          if (!capitalize) external = external.plus(row.paidInterest);
          expect(row.capital).toBe(money(new FinanceDecimal(row.closingBalance).plus(external).plus(row.pendingInterest).minus(row.closingDebt)));
        }
        expect(scenario.rows.at(-1)?.capital).toBe(scenario.capital);
      }
      expect(result.netBenefit).toBe(money(new FinanceDecimal(result.strategy.capital).minus(result.baseline.capital)));
      expect(result.netBenefit).toBe(money(new FinanceDecimal(result.strategy.account.earnedInterest).minus(result.baseline.account.earnedInterest).minus(input.fees)));
      expect(result.strategy.rows.at(-1)?.endDate).toBe('2026-03-15');
      expect(input).toEqual(original);
    }
  });
});
