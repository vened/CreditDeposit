import { describe, expect, it } from 'vitest';
import { expandRecurringTopUps } from './recurring-top-ups';
import type { RecurringTopUp } from './types';

const weekly: RecurringTopUp = { amount: '100.00', startDate: '2026-01-01', endDate: '', frequency: 'weekly' };

describe('expandRecurringTopUps', () => {
  it('repeats daily through the last comparison day', () => {
    expect(expandRecurringTopUps([{ ...weekly, frequency: 'daily' }], '2026-01-04')).toEqual([
      { date: '2026-01-01', amount: '100.00' },
      { date: '2026-01-02', amount: '100.00' },
      { date: '2026-01-03', amount: '100.00' },
    ]);
  });

  it('allows 500 daily occurrences and rejects the 501st', () => {
    const rule = { ...weekly, frequency: 'daily' as const };
    expect(expandRecurringTopUps([rule], '2027-05-16')).toHaveLength(500);
    expect(() => expandRecurringTopUps([rule], '2027-05-17')).toThrow(RangeError);
  });

  it('repeats every seven calendar days and excludes the comparison end', () => {
    expect(expandRecurringTopUps([weekly], '2026-01-22')).toEqual([
      { date: '2026-01-01', amount: '100.00' },
      { date: '2026-01-08', amount: '100.00' },
      { date: '2026-01-15', amount: '100.00' },
    ]);
  });

  it.each([
    ['2026-01-31', '2026-04-01', ['2026-01-31', '2026-02-28', '2026-03-31']],
    ['2024-01-31', '2024-04-01', ['2024-01-31', '2024-02-29', '2024-03-31']],
  ])('keeps the original month day after short months starting %s', (startDate, comparisonEnd, dates) => {
    expect(expandRecurringTopUps([{ ...weekly, startDate, frequency: 'monthly' }], comparisonEnd).map(event => event.date)).toEqual(dates);
  });

  it('includes the specified last date', () => {
    expect(expandRecurringTopUps([{ ...weekly, endDate: '2026-01-08' }], '2026-02-01')).toEqual([
      { date: '2026-01-01', amount: '100.00' },
      { date: '2026-01-08', amount: '100.00' },
    ]);
  });

  it('stops at the comparison boundary even when the specified last date is later', () => {
    expect(expandRecurringTopUps([{ ...weekly, endDate: '2026-01-15' }], '2026-01-08')).toEqual([
      { date: '2026-01-01', amount: '100.00' },
    ]);
  });

  it('counts generated occurrences across rules and accepts exactly 500', () => {
    const rules = Array.from({ length: 250 }, () => ({ ...weekly, endDate: '2026-01-08' }));
    expect(expandRecurringTopUps(rules, '2026-02-01')).toHaveLength(500);
    expect(() => expandRecurringTopUps([...rules, { ...weekly, endDate: weekly.startDate }], '2026-02-01')).toThrow(RangeError);
  });

  it('rejects one rule producing more than 500 rows without truncating it', () => {
    expect(() => expandRecurringTopUps([weekly], '2036-01-01')).toThrow(RangeError);
  });

  it.each(['daily', 'weekly', 'monthly'] as const)('stops %s expansion before exceeding the supported calendar', frequency => {
    expect(expandRecurringTopUps([{ ...weekly, frequency, startDate: '9999-12-30' }], '9999-12-31')).toEqual([
      { date: '9999-12-30', amount: '100.00' },
    ]);
  });

  it('does not mutate rules or combine independent same-day deposits', () => {
    const rules = [{ ...weekly, endDate: weekly.startDate }, { ...weekly, endDate: weekly.startDate, amount: '200.00' }];
    const original = structuredClone(rules);
    expect(expandRecurringTopUps(rules, '2026-02-01')).toEqual([
      { date: '2026-01-01', amount: '100.00' }, { date: '2026-01-01', amount: '200.00' },
    ]);
    expect(rules).toEqual(original);
  });
});
