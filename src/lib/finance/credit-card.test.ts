import { describe, expect, it } from 'vitest';
import { calculateCreditCard } from './credit-card';
import { FinanceDecimal } from './money';
import type { CardInput } from './types';

const base: CardInput = {
  ownFunds: '100000.00', purchaseAmount: '100000.00', creditLimit: '100000.00',
  purchaseDate: '2026-01-01', repaymentDate: '2026-01-11', fees: '0.00', repayments: [],
  savings: {
    annualRate: '36.5', basis: 'daily', payout: 'monthly', capitalize: false,
    partialMonths: 'actual', rateChanges: [],
  },
};

describe('calculateCreditCard', () => {
  it.each(['daily', 'monthly'] as const)('compares the same purchase through January 31 with %s payouts', payout => {
    const result = calculateCreditCard({ ...base, savings: { ...base.savings, payout } });
    expect(result).toMatchObject({
      viable: true, deficit: '0.00', cardFunded: '100000.00', debtAtRepayment: '100000.00',
      comparisonEndDate: '2026-02-01', availableAtRepayment: '100000.00',
      extraInterest: '1000.00', netBenefit: '1000.00',
    });
    expect(result.baseline).toMatchObject({ earnedInterest: '0.00', capital: '0.00' });
    expect(result.strategy).toMatchObject({ earnedInterest: '1000.00', capital: '1000.00', pendingInterest: '0.00' });
    expect(result.strategy?.months[0]).toMatchObject({ days: 31, paidInterest: '1000.00', netFlow: '-100000.00', closingBalance: '0.00' });
  });

  it('has no benefit when the card cannot finance any of the purchase', () => {
    const result = calculateCreditCard({ ...base, creditLimit: '0.00' });
    expect(result).toMatchObject({ cardFunded: '0.00', debtAtRepayment: '0.00', availableAtRepayment: '0.00', netBenefit: '0.00' });
    expect(result.strategy).toEqual(result.baseline);
  });

  it('uses the actual monthly minimum after repayment rather than the retained purchase amount', () => {
    const result = calculateCreditCard({ ...base, savings: { ...base.savings, basis: 'monthly-min' } });
    expect(result).toMatchObject({ viable: true, extraInterest: '0.00', netBenefit: '0.00' });
    expect(result.strategy?.months[0]).toMatchObject({ minimumBalance: '0.00', earnedInterest: '0.00' });
  });

  it('withdraws an intermediate payment on its date and reduces the final outstanding debt', () => {
    const result = calculateCreditCard({ ...base, repayments: [{ date: '2026-01-06', amount: '50000.00' }] });
    expect(result).toMatchObject({ debtAtRepayment: '50000.00', availableAtRepayment: '50000.00', extraInterest: '750.00', netBenefit: '750.00' });
    expect(result.strategy?.closingBalance).toBe('0.00');
  });

  it('withdraws fees on the repayment morning and preserves the baseline residual through month end', () => {
    const result = calculateCreditCard({ ...base, ownFunds: '100100.00', fees: '100.00' });
    expect(result.baseline).toMatchObject({ earnedInterest: '3.10', capital: '103.10', closingBalance: '100.00' });
    expect(result.strategy).toMatchObject({ earnedInterest: '1001.00', capital: '1001.00', closingBalance: '0.00' });
    expect(result).toMatchObject({ availableAtRepayment: '100100.00', extraInterest: '997.90', netBenefit: '897.90' });
  });

  it('reports the full fee deficit without spending accrued but unpaid interest', () => {
    const result = calculateCreditCard({ ...base, fees: '2000.00' });
    expect(result).toMatchObject({ viable: false, deficit: '2000.00', availableAtRepayment: '100000.00', debtAtRepayment: '100000.00', strategy: null, extraInterest: null, netBenefit: null });
    expect(result.baseline.earnedInterest).toBe('0.00');
  });

  it('keeps externally paid interest outside the cash available for repayment', () => {
    const result = calculateCreditCard({ ...base, fees: '100.00', savings: { ...base.savings, payout: 'daily' } });
    expect(result).toMatchObject({ viable: false, deficit: '100.00', availableAtRepayment: '100000.00', strategy: null, netBenefit: null });
  });

  it('uses capitalized prior-month payouts to settle the following morning', () => {
    const result = calculateCreditCard({ ...base, repaymentDate: '2026-02-01', fees: '1000.00', savings: { ...base.savings, capitalize: true } });
    expect(result).toMatchObject({ viable: true, comparisonEndDate: '2026-03-01', availableAtRepayment: '103100.00', netBenefit: '2158.80' });
    expect(result.strategy).toMatchObject({ earnedInterest: '3158.80', paidExternally: '0.00', capital: '2158.80' });
  });

  it('finances only the credit limit and pays the uncovered portion on the purchase morning', () => {
    const result = calculateCreditCard({ ...base, creditLimit: '40000.00' });
    expect(result).toMatchObject({ cardFunded: '40000.00', debtAtRepayment: '40000.00', availableAtRepayment: '40000.00', netBenefit: '400.00' });
    expect(result.strategy?.months[0]).toMatchObject({ netFlow: '-100000.00', closingBalance: '0.00' });
  });

  it('retains a negative benefit when a viable fee exceeds the extra interest', () => {
    const result = calculateCreditCard({ ...base, ownFunds: '101000.00', fees: '1000.00' });
    expect(result).toMatchObject({ viable: true, extraInterest: '979.00', netBenefit: '-21.00' });
    expect(result.baseline.capital).toBe('1031.00');
    expect(result.strategy?.capital).toBe('1010.00');
  });

  it.each([
    [{ date: '2026-01-06', amount: '100000.01' }],
    [{ date: '2026-01-06', amount: '50000.00' }, { date: '2026-01-06', amount: '50000.01' }],
    [{ date: '2026-01-06', amount: '100000.00' }, { date: '2026-01-11', amount: '0.01' }],
  ])('rejects payments exceeding the remaining card debt: %j', (...repayments) => {
    expect(() => calculateCreditCard({ ...base, repayments })).toThrow(RangeError);
  });

  it('applies multiple same-date payments without double-counting principal', () => {
    const result = calculateCreditCard({ ...base, repayments: [{ date: '2026-01-06', amount: '20000.00' }, { date: '2026-01-06', amount: '30000.00' }] });
    expect(result).toMatchObject({ debtAtRepayment: '50000.00', availableAtRepayment: '50000.00', netBenefit: '750.00' });
  });

  it('does not repay the original principal again after full early closure', () => {
    const result = calculateCreditCard({ ...base, repayments: [{ date: '2026-01-06', amount: '100000.00' }] });
    expect(result).toMatchObject({ viable: true, debtAtRepayment: '0.00', availableAtRepayment: '0.00', netBenefit: '500.00' });
    expect(result.strategy?.closingBalance).toBe('0.00');
  });

  it('earns no extra interest when a listed payment closes the debt on the purchase day', () => {
    const result = calculateCreditCard({ ...base, repayments: [{ date: '2026-01-01', amount: '100000.00' }] });
    expect(result).toMatchObject({ viable: true, debtAtRepayment: '0.00', availableAtRepayment: '0.00', netBenefit: '0.00' });
    expect(result.strategy).toEqual(result.baseline);
  });

  it('measures the displayed available funds and debt after listed repayment-date payments', () => {
    const result = calculateCreditCard({ ...base, repayments: [{ date: '2026-01-11', amount: '50000.00' }] });
    expect(result).toMatchObject({ debtAtRepayment: '50000.00', availableAtRepayment: '50000.00', netBenefit: '1000.00' });
  });

  it('sorts dated payments without mutating their source order', () => {
    const repayments = [{ date: '2026-01-08', amount: '25000.00' }, { date: '2026-01-06', amount: '25000.00' }];
    const result = calculateCreditCard({ ...base, repayments });
    expect(result).toMatchObject({ debtAtRepayment: '50000.00', netBenefit: '800.00' });
    expect(repayments.map(payment => payment.date)).toEqual(['2026-01-08', '2026-01-06']);
  });

  it('includes a repayment on the last month day and its end-of-day interest payout', () => {
    const result = calculateCreditCard({ ...base, repaymentDate: '2026-01-31' });
    expect(result).toMatchObject({ comparisonEndDate: '2026-02-01', netBenefit: '3000.00' });
    expect(result.strategy?.months[0]).toMatchObject({ days: 31, paidInterest: '3000.00', pendingInterest: '0.00', closingBalance: '0.00' });
  });

  it('applies input rate changes to both flows through the full comparison month', () => {
    const result = calculateCreditCard({ ...base, ownFunds: '100100.00', savings: { ...base.savings, rateChanges: [{ date: '2026-01-12', annualRate: '73' }] } });
    expect(result.baseline.earnedInterest).toBe('5.10');
    expect(result.strategy?.earnedInterest).toBe('1005.10');
    expect(result.extraInterest).toBe('1000.00');
    expect(new FinanceDecimal(result.strategy!.capital).minus(result.baseline.capital).toFixed(2)).toBe(result.netBenefit);
  });
});
