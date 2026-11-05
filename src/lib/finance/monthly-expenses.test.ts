import { describe, expect, it } from 'vitest';
import { expandMonthlyExpenses, getMonthlyExpensePeriods, getPlanningMonths } from './monthly-expenses';
import { FinanceDecimal, money } from './money';

const base = { startDate: '2026-01-01', endDate: '2026-01-31', monthlySpending: '310', spendingOverrides: {} };
const total = (rows: { amount: string }[]) => money(rows.reduce((sum, row) => sum.plus(row.amount), new FinanceDecimal(0)));

describe('monthly expense budgets', () => {
  it('spreads a complete monthly budget over every included day', () => {
    expect(expandMonthlyExpenses(base)).toEqual(Array.from({ length: 31 }, (_, i) => ({ date: `2026-01-${String(i + 1).padStart(2, '0')}`, amount: '10.00' })));
  });
  it('prorates a partial month using its calendar days', () => {
    expect(getMonthlyExpensePeriods({ ...base, startDate: '2026-11-16', endDate: '2026-11-30', monthlySpending: '60000' })[0])
      .toMatchObject({ month: '2026-11', firstDate: '2026-11-16', lastDate: '2026-11-30', days: 15, daysInMonth: 30, budget: '60000.00', spending: '30000.00', overridden: false });
  });
  it('distributes cents by cumulative rounding and retains the same partial-month slice', () => {
    const input = { ...base, monthlySpending: '0.01' };
    const full = expandMonthlyExpenses(input);
    expect(total(full)).toBe('0.01');
    expect(full.filter(row => row.amount !== '0.00')).toEqual([{ date: '2026-01-16', amount: '0.01' }]);
    expect(expandMonthlyExpenses({ ...input, startDate: '2026-01-16', endDate: '2026-01-16' })).toEqual([{ date: '2026-01-16', amount: '0.01' }]);
  });
  it('handles leap February and year boundaries', () => {
    expect(getPlanningMonths('2028-02-01', '2028-02-29')).toEqual([{ month: '2028-02', firstDate: '2028-02-01', lastDate: '2028-02-29', days: 29, daysInMonth: 29 }]);
    expect(getPlanningMonths('2026-12-31', '2027-01-01').map(row => row.month)).toEqual(['2026-12', '2027-01']);
    expect(total(expandMonthlyExpenses({ ...base, startDate: '2028-02-01', endDate: '2028-02-29', monthlySpending: '100' }))).toBe('100.00');
  });
  it('preserves explicit equal-valued and temporarily hidden overrides without mutation', () => {
    const input = { ...base, monthlySpending: '620', spendingOverrides: { '2026-01': '310', '2026-02': '280' } };
    const original = structuredClone(input);
    expect(getMonthlyExpensePeriods(input)[0]).toMatchObject({ budget: '310.00', spending: '310.00', overridden: true });
    expect(getMonthlyExpensePeriods({ ...input, startDate: '2026-02-01', endDate: '2026-03-31' }).map(row => [row.budget, row.overridden])).toEqual([['280.00', true], ['620.00', false]]);
    expect(getMonthlyExpensePeriods({ ...input, monthlySpending: '310' })[0].overridden).toBe(true);
    expect(input).toEqual(original);
  });
  it('allows zero expenses and does not apply the external-event cap to generated spending', () => {
    expect(total(expandMonthlyExpenses({ ...base, monthlySpending: '0' }))).toBe('0.00');
    const rows = expandMonthlyExpenses({ ...base, endDate: '2035-12-31' });
    expect(rows).toHaveLength(3652);
    expect(rows.at(-1)?.date).toBe('2035-12-31');
    expect(getPlanningMonths('2026-01-01', '2035-12-31')).toHaveLength(120);
  });
});
