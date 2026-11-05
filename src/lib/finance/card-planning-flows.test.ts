import { describe, expect, it } from 'vitest';
import { buildCardPlanningFlows, CardRepaymentError } from './card-planning-flows';
import type { CardPlanningInput } from './types';

const base: CardPlanningInput = { ownFunds: '1000', creditLimit: '1000', startDate: '2026-01-01', endDate: '2026-01-31', monthlySpending: '310', spendingOverrides: {}, repaymentDay: 31, fees: '0', topUps: [], recurringTopUps: [], repayments: [], savings: { annualRate: '0', basis: 'daily', payout: 'monthly', capitalize: false, partialMonths: 'actual', rateChanges: [] } };
describe('revolving card cash flows', () => {
  it('uses own funds above the available limit and reuses repaid credit the next day', () => {
    expect(buildCardPlanningFlows({ ...base, endDate: '2026-01-05', creditLimit: '25', repaymentDay: 3 }).months[0])
      .toMatchObject({ spending: '50.00', cardSpending: '45.00', ownFundsSpending: '5.00', automaticRepayments: '25.00', closingDebt: '20.00' });
  });
  it('spends before manual and automatic payments without double repayment', () => {
    expect(buildCardPlanningFlows({ ...base, endDate: '2026-01-03', creditLimit: '25', repaymentDay: 3, repayments: [{ date: '2026-01-03', amount: '15' }] }).months[0])
      .toMatchObject({ manualRepayments: '15.00', automaticRepayments: '10.00', closingDebt: '0.00' });
  });
  it('reports the original index of an unsorted payment exceeding current debt', () => {
    try {
      buildCardPlanningFlows({ ...base, endDate: '2026-01-03', creditLimit: '25', repayments: [{ date: '2026-01-03', amount: '26' }, { date: '2026-01-02', amount: '1' }] });
      expect.unreachable('must reject overpayment');
    } catch (error) {
      expect(error).toBeInstanceOf(CardRepaymentError);
      expect(error).toMatchObject({ date: '2026-01-03', index: 0, requested: '26.00', debt: '25.00' });
    }
  });
  it.each([['2026', '280'], ['2028', '290']])('clamps day31 in February without drifting in March (%s)', (year, february) => {
    const result = buildCardPlanningFlows({ ...base, startDate: `${year}-01-01`, endDate: `${year}-03-31`, spendingOverrides: { [`${year}-02`]: february } });
    expect(result.months.map(row => row.automaticRepayments)).toEqual(['310.00', `${february}.00`, '310.00']);
    expect(result.months.map(row => row.closingDebt)).toEqual(['0.00', '0.00', '0.00']);
  });
  it('adds manual and recurring same-day topups identically without mutation', () => {
    const input = { ...base, topUps: [{ date: '2026-01-01', amount: '7' }], recurringTopUps: [{ amount: '3', startDate: '2026-01-01', endDate: '2026-01-01', frequency: 'monthly' as const }] };
    const original = structuredClone(input);
    const result = buildCardPlanningFlows(input);
    expect(result.months[0].topUps).toBe('10.00');
    for (const events of [result.baseline, result.strategy]) expect(events.filter(row => Number(row.amount) > 0)).toEqual(expect.arrayContaining([{ date: '2026-01-01', amount: '7' }, { date: '2026-01-01', amount: '3' }]));
    expect(input).toEqual(original);
  });
  it('charges a single fee on the chosen date and does not force a later repayment', () => {
    const result = buildCardPlanningFlows({ ...base, endDate: '2026-01-15', fees: '2' });
    expect(result.months[0]).toMatchObject({ endDate: '2026-01-15', fees: '2.00', automaticRepayments: '0.00', closingDebt: '150.00' });
    expect(result.strategy.filter(row => row.amount === '-2.00')).toEqual([{ date: '2026-01-15', amount: '-2.00' }]);
    expect(result.strategy.every(row => row.date <= '2026-01-15')).toBe(true);
  });
  it('supports zero credit and zero spending', () => {
    expect(buildCardPlanningFlows({ ...base, creditLimit: '0' }).months[0]).toMatchObject({ cardSpending: '0.00', ownFundsSpending: '310.00', closingDebt: '0.00' });
    expect(buildCardPlanningFlows({ ...base, monthlySpending: '0' }).months[0]).toMatchObject({ spending: '0.00', automaticRepayments: '0.00', closingDebt: '0.00' });
  });
});
