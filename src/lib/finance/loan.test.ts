import { describe, expect, it } from 'vitest';
import { FinanceDecimal } from './money';
import type { LoanInput } from './types';
import { calculateLoan } from './loan';

const base: LoanInput = {
  principal: '120000.00', annualRate: '0', months: 12,
  issuedOn: '2025-01-31', scheme: 'annuity', upfrontFee: '0.00', monthlyFee: '0.00',
};

describe('calculateLoan', () => {
  it('repays a zero-rate loan in twelve equal principal payments', () => {
    const result = calculateLoan(base);
    expect(result.rows).toHaveLength(12);
    expect(result.rows.every(row => row.payment === '10000.00' && row.interest === '0.00')).toBe(true);
    expect(result.overpayment).toBe('0.00');
    expect(result.totalPaid).toBe('120000.00');
    expect(result.rows.at(-1)?.balance).toBe('0.00');
  });

  it('uses annual rate divided by twelve for annuity installments', () => {
    const result = calculateLoan({ ...base, principal: '100000.00', annualRate: '12' });
    expect(result.firstPayment).toBe('8884.88');
    expect(result.rows[0]).toMatchObject({ principal: '7884.88', interest: '1000.00', balance: '92115.12' });
    expect(result.rows.at(-1)?.balance).toBe('0.00');
  });

  it('charges decreasing interest on the outstanding differentiated balance', () => {
    const result = calculateLoan({ ...base, annualRate: '12', scheme: 'differentiated' });
    expect(result.firstPayment).toBe('11200.00');
    expect(result.lastPayment).toBe('10100.00');
    expect(result.totalInterest).toBe('7800.00');
    expect(result.totalPaid).toBe('127800.00');
    expect(result.rows.at(-1)?.balance).toBe('0.00');
  });

  it('counts issuance and monthly fees without adding issuance fees to regular payments or debt', () => {
    const result = calculateLoan({ ...base, upfrontFee: '1000.00', monthlyFee: '100.00' });
    expect(result.firstPayment).toBe('10100.00');
    expect(result.lastPayment).toBe('10100.00');
    expect(result.rows[0]).toMatchObject({ principal: '10000.00', fee: '100.00', balance: '110000.00' });
    expect(result.totalFees).toBe('2200.00');
    expect(result.overpayment).toBe('2200.00');
    expect(result.totalPaid).toBe('122200.00');
  });

  it('keeps each payment anniversary anchored to the original issue date', () => {
    const result = calculateLoan(base);
    expect(result.rows.slice(0, 3).map(row => row.date)).toEqual(['2025-02-28', '2025-03-31', '2025-04-30']);
  });

  it.each(['annuity', 'differentiated'] as const)('safely closes a one-kopeck %s loan over 600 months', scheme => {
    const result = calculateLoan({ ...base, principal: '0.01', months: 600, scheme });
    expect(result.rows).toHaveLength(600);
    for (const row of result.rows) {
      for (const field of ['principal', 'interest', 'fee', 'payment', 'balance'] as const) {
        expect(new FinanceDecimal(row[field]).gte(0)).toBe(true);
      }
    }
    const principalSum = result.rows.reduce((sum, row) => sum.plus(row.principal), new FinanceDecimal(0));
    expect(principalSum.toFixed(2)).toBe('0.01');
    expect(result.rows.at(-1)).toMatchObject({ principal: '0.01', payment: '0.01', balance: '0.00' });
    expect(result.totalPaid).toBe('0.01');
    expect(result.overpayment).toBe('0.00');
  });

  it.each(['annuity', 'differentiated'] as const)('adjusts the final %s payment to repay rounding residue', scheme => {
    const result = calculateLoan({ ...base, principal: '100.00', months: 3, scheme });
    expect(result.rows.map(row => row.principal)).toEqual(['33.33', '33.33', '33.34']);
    expect(result.lastPayment).toBe('33.34');
    expect(result.totalPaid).toBe('100.00');
    expect(result.rows.at(-1)?.balance).toBe('0.00');
  });

  it('caps rounded principal repayments when the balance is less than the installment', () => {
    const result = calculateLoan({ ...base, principal: '0.04', months: 6 });
    expect(result.rows.map(row => row.principal)).toEqual(['0.01', '0.01', '0.01', '0.01', '0.00', '0.00']);
    expect(result.rows.map(row => row.balance)).toEqual(['0.03', '0.02', '0.01', '0.00', '0.00', '0.00']);
    expect(result.totalPaid).toBe('0.04');
  });

  it('sums rounded interest and fees consistently through the final annuity correction', () => {
    const result = calculateLoan({ ...base, principal: '100.01', annualRate: '12', months: 2, upfrontFee: '10.00', monthlyFee: '0.10' });
    expect(result.rows).toEqual([
      { date: '2025-02-28', principal: '49.76', interest: '1.00', fee: '0.10', payment: '50.86', balance: '50.25' },
      { date: '2025-03-31', principal: '50.25', interest: '0.50', fee: '0.10', payment: '50.85', balance: '0.00' },
    ]);
    expect(result).toMatchObject({ firstPayment: '50.86', lastPayment: '50.85', totalInterest: '1.50', totalFees: '10.20', overpayment: '11.70', totalPaid: '111.71' });
  });
});
