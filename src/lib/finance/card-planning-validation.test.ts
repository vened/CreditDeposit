import { describe, expect, it } from 'vitest';
import { validateCardPlanningInput } from './validation';
import type { CardPlanningInput } from './types';
const base: CardPlanningInput = { ownFunds: '1000', creditLimit: '1000', startDate: '2026-01-01', endDate: '2026-01-31', monthlySpending: '310', spendingOverrides: {}, repaymentDay: 31, fees: '0', topUps: [], recurringTopUps: [], repayments: [], savings: { annualRate: '0', basis: 'daily', payout: 'monthly', capitalize: false, partialMonths: 'actual', rateChanges: [] } };
const paths = (input: unknown) => { const result = validateCardPlanningInput(input); return result.ok ? [] : result.issues.map(issue => issue.path); };
describe('card monthly planning validation', () => {
  it('normalizes budgets and keeps hidden/equal-valued overrides', () => {
    const result = validateCardPlanningInput({ ...base, monthlySpending: '60 000,50', spendingOverrides: { '2025-11': '60 000,50', '2026-01': '0' } });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toMatchObject({ monthlySpending: '60000.50', spendingOverrides: { '2025-11': '60000.50', '2026-01': '0' } });
  });
  it.each([0, 32, 1.5, '31', NaN])('rejects invalid repayment day %s', repaymentDay => {
    expect(paths({ ...base, repaymentDay })).toContain('repaymentDay');
  });
  it.each([
    [{ monthlySpending: '-1' }, 'monthlySpending'], [{ monthlySpending: '0.001' }, 'monthlySpending'],
    [{ monthlySpending: '1000000000001' }, 'monthlySpending'], [{ spendingOverrides: [] }, 'spendingOverrides'],
    [{ spendingOverrides: { '2026-13': '10' } }, 'spendingOverrides.2026-13'],
    [{ spendingOverrides: { '2026-01': 'abc' } }, 'spendingOverrides.2026-01'],
    [{ endDate: '2026-02-30' }, 'endDate'], [{ endDate: '2025-12-31' }, 'endDate'],
    [{ endDate: '9999-12-31' }, 'endDate'], [{ startDate: 'bad' }, 'startDate'],
  ])('reports invalid input at its own field', (patch, path) => { expect(paths({ ...base, ...patch })).toContain(path); });
  it('allows a single day and exactly ten calendar years, not an extra day', () => {
    expect(validateCardPlanningInput({ ...base, endDate: base.startDate }).ok).toBe(true);
    expect(validateCardPlanningInput({ ...base, endDate: '2035-12-31' }).ok).toBe(true);
    expect(paths({ ...base, endDate: '2036-01-01' })).toContain('endDate');
    expect(validateCardPlanningInput({ ...base, startDate: '9999-12-01', endDate: '9999-12-30' }).ok).toBe(true);
  });
  it('does not require the whole spending budget to fit opening funds', () => {
    expect(validateCardPlanningInput({ ...base, ownFunds: '0', monthlySpending: '60000' }).ok).toBe(true);
  });
  it('validates manual repayments against chronological revolving debt', () => {
    expect(paths({ ...base, creditLimit: '25', endDate: '2026-01-03', repaymentDay: 3, repayments: [{ date: '2026-01-03', amount: '26' }] })).toContain('repayments.0.amount');
  });
  it('includes end-date topups, repayments and rate changes and excludes later events', () => {
    const valid = { ...base, topUps: [{ date: base.endDate, amount: '1' }], repayments: [{ date: base.endDate, amount: '1' }], savings: { ...base.savings, rateChanges: [{ date: base.endDate, annualRate: '10' }] } };
    expect(validateCardPlanningInput(valid).ok).toBe(true);
    expect(paths({ ...valid, topUps: [{ date: '2026-02-01', amount: '1' }] })).toContain('topUps.0.date');
  });
  it('counts manual and expanded external events together, but not generated spending', () => {
    const topUps = Array.from({ length: 499 }, () => ({ date: '2026-01-01', amount: '1' }));
    const input = { ...base, endDate: '2035-12-31', topUps, recurringTopUps: [{ amount: '1', startDate: '2026-01-01', endDate: '2026-01-01', frequency: 'daily' }] };
    expect(validateCardPlanningInput(input).ok).toBe(true);
    expect(paths({ ...input, topUps: [...topUps, { date: '2026-01-01', amount: '1' }] })).toContain('recurringTopUps');
    expect(paths({ ...base, endDate: '2035-12-31', recurringTopUps: [{ amount: '1', startDate: base.startDate, endDate: '', frequency: 'daily' }] })).toContain('recurringTopUps');
  });
  it('limits hidden overrides without silently dropping them', () => {
    const overrides = Object.fromEntries(Array.from({ length: 501 }, (_, i) => [`${String(2000 + Math.floor(i / 12)).padStart(4, '0')}-${String(i % 12 + 1).padStart(2, '0')}`, '1']));
    expect(paths({ ...base, spendingOverrides: overrides })).toContain('spendingOverrides');
  });
  it('does not expand invalid recurrence dates or frequencies', () => {
    expect(paths({ ...base, recurringTopUps: [{ amount: '1', startDate: 'bad', endDate: '', frequency: 'forever' }] }))
      .toEqual(expect.arrayContaining(['recurringTopUps.0.startDate', 'recurringTopUps.0.frequency']));
  });
});
