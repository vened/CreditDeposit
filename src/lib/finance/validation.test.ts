import { describe, expect, it } from 'vitest';
import { validateInput } from './validation';
import type { CardPlanningInput, DepositInput, LoanInput, SavingsInput } from './types';

const savings: SavingsInput = {
  openingBalance: '100000.00', annualRate: '12', startDate: '2026-01-01', endDate: '2027-01-01',
  basis: 'daily', payout: 'monthly', capitalize: false, partialMonths: 'actual', events: [], rateChanges: [],
};
const deposit: DepositInput = { openingBalance: '100000.00', annualRate: '12', startDate: '2026-01-01', endDate: '2027-01-01', payout: 'maturity', capitalize: true, events: [], rateChanges: [] };
const loan: LoanInput = { principal: '100000', annualRate: '12', months: 12, issuedOn: '2026-01-31', scheme: 'annuity', upfrontFee: '0', monthlyFee: '0' };
const card: CardPlanningInput = { ownFunds: '100000', monthlySpending: '50000', spendingOverrides: {}, creditLimit: '80000', startDate: '2026-01-01', endDate: '2026-02-28', repaymentDay: 31, fees: '0', topUps: [], recurringTopUps: [], repayments: [], savings: { annualRate: '12', basis: 'daily', payout: 'monthly', capitalize: true, partialMonths: 'actual', rateChanges: [] } };
const recurring = { amount: '1000', startDate: '2026-01-01', endDate: '', frequency: 'monthly' as const };
function paths(result: ReturnType<typeof validateInput>) {
  return result.ok ? [] : result.issues.map(issue => issue.path);
}

describe('financial input validation', () => {
  it('accepts all calculator contracts and normalizes Russian decimal input', () => {
    expect(validateInput('savings', savings).ok).toBe(true);
    expect(validateInput('deposit', deposit).ok).toBe(true);
    expect(validateInput('loan', loan).ok).toBe(true);
    expect(validateInput('credit-card', card).ok).toBe(true);
    const result = validateInput('savings', { ...savings, openingBalance: '100\u00a0000,50', annualRate: '12,500000' });
    expect(result.ok && result.value.openingBalance).toBe('100000.50');
    expect(result.ok && result.value.annualRate).toBe('12.500000');
  });
  it.each(['', '12abc', 'Infinity', '-0.01', '1000000000000.01', '0.001', 12, null])('rejects invalid amount %j on a stable path', value => {
    expect(paths(validateInput('savings', { ...savings, openingBalance: value }))).toContain('openingBalance');
  });
  it.each(['-1', '1000.000001', '1.0000001', '', 'NaN'])('rejects invalid annual rate %j', annualRate => {
    expect(paths(validateInput('savings', { ...savings, annualRate }))).toContain('annualRate');
  });
  it('accepts maximum amounts and rates', () => {
    expect(validateInput('savings', { ...savings, openingBalance: '1000000000000', annualRate: '1000' }).ok).toBe(true);
  });
  it('validates dates and a positive period of at most ten calendar years', () => {
    expect(paths(validateInput('savings', { ...savings, startDate: '2026-02-29' }))).toContain('startDate');
    for (const endDate of ['2026-01-01', '2025-12-31', '2036-01-02']) {
      expect(paths(validateInput('savings', { ...savings, endDate }))).toContain('endDate');
    }
    expect(validateInput('savings', { ...savings, startDate: '2024-02-29', endDate: '2034-02-28' }).ok).toBe(true);
    expect(paths(validateInput('savings', { ...savings, startDate: '2024-02-29', endDate: '2034-03-01' }))).toContain('endDate');
  });
  it('checks event dates, signed cash precision, and duplicate rate changes', () => {
    expect(validateInput('savings', { ...savings, events: [{ date: '2026-01-01', amount: '-0.01' }] }).ok).toBe(true);
    expect(paths(validateInput('savings', { ...savings, events: [{ date: '2027-01-01', amount: '10' }] }))).toContain('events.0.date');
    expect(paths(validateInput('savings', { ...savings, events: [{ date: '2026-01-02', amount: '10.001' }] }))).toContain('events.0.amount');
    expect(paths(validateInput('savings', { ...savings, rateChanges: [{ date: '2026-02-01', annualRate: '10' }, { date: '2026-02-01', annualRate: '11' }] }))).toContain('rateChanges.1.date');
    expect(paths(validateInput('savings', { ...savings, rateChanges: [{ date: '2025-12-31', annualRate: '10' }] }))).toContain('rateChanges.0.date');
  });
  it('allows 500 total events and rejects 501 across both event lists', () => {
    const events = Array.from({ length: 500 }, () => ({ date: '2026-01-02', amount: '1' }));
    expect(validateInput('savings', { ...savings, events }).ok).toBe(true);
    expect(paths(validateInput('savings', { ...savings, events, rateChanges: [{ date: '2026-02-01', annualRate: '10' }] }))).toContain('events');
  });
  it('rejects unsupported savings terms and wrongly typed fields', () => {
    expect(paths(validateInput('savings', { ...savings, basis: 'monthly-min', payout: 'daily' }))).toContain('payout');
    expect(paths(validateInput('savings', { ...savings, capitalize: 'false', partialMonths: 'other', events: {} }))).toEqual(expect.arrayContaining(['capitalize', 'partialMonths', 'events']));
    expect(validateInput('savings', null).ok).toBe(false);
    expect(validateInput('savings', []).ok).toBe(false);
  });
  it('only allows positive deposit contributions and allows its maturity date', () => {
    for (const amount of ['0', '-1']) expect(paths(validateInput('deposit', { ...deposit, events: [{ date: '2026-01-02', amount }] }))).toContain('events.0.amount');
    expect(validateInput('deposit', { ...deposit, events: [{ date: '2027-01-01', amount: '1' }] }).ok).toBe(true);
  });
  it('bounds loan principal, months, fees, scheme and issue date', () => {
    expect(validateInput('loan', { ...loan, principal: '0.01', months: 600 }).ok).toBe(true);
    for (const months of [0, 601, 1.5, '12']) expect(paths(validateInput('loan', { ...loan, months }))).toContain('months');
    expect(paths(validateInput('loan', { ...loan, principal: '0', upfrontFee: '-1', monthlyFee: '0.001', scheme: 'other', issuedOn: 'bad' }))).toEqual(expect.arrayContaining(['principal', 'upfrontFee', 'monthlyFee', 'scheme', 'issuedOn']));
  });
  it('bounds card funds, dates, budgets, repayments and nested savings', () => {
    expect(paths(validateInput('credit-card', { ...card, monthlySpending: '-1' }))).toContain('monthlySpending');
    expect(paths(validateInput('credit-card', { ...card, endDate: '2036-01-02' }))).toContain('endDate');
    expect(paths(validateInput('credit-card', { ...card, fees: '-1', creditLimit: '1000000000001' }))).toEqual(expect.arrayContaining(['fees', 'creditLimit']));
    expect(paths(validateInput('credit-card', { ...card, repayments: [{ date: '2026-03-01', amount: '1' }] }))).toContain('repayments.0.date');
    expect(paths(validateInput('credit-card', { ...card, repayments: [{ date: '2026-01-02', amount: '0' }] }))).toContain('repayments.0.amount');
    expect(paths(validateInput('credit-card', { ...card, savings: { ...card.savings, basis: 'monthly-min', payout: 'daily' } }))).toContain('savings.payout');
  });
  it('normalizes card top-ups through the inclusive planning end', () => {
    const result = validateInput('credit-card', { ...card, topUps: [
      { date: '2026-01-01', amount: '1 000,50' },
      { date: '2026-02-01', amount: '2000' },
      { date: '2026-02-28', amount: '3000' },
    ] });
    expect(result.ok && result.value.topUps).toEqual([
      { date: '2026-01-01', amount: '1000.50' },
      { date: '2026-02-01', amount: '2000' },
      { date: '2026-02-28', amount: '3000' },
    ]);
    for (const date of ['2025-12-31', '2026-03-01']) {
      expect(paths(validateInput('credit-card', { ...card, topUps: [{ date, amount: '1' }] }))).toContain('topUps.0.date');
    }
  });
  it.each(['', '0', '-1', '0.001', '1000000000000.01'])('rejects invalid card top-up amount %j', amount => {
    expect(paths(validateInput('credit-card', { ...card, topUps: [{ date: '2026-01-02', amount }] }))).toContain('topUps.0.amount');
  });
  it('rejects malformed card top-up lists and rows', () => {
    expect(paths(validateInput('credit-card', { ...card, topUps: null }))).toContain('topUps');
    expect(paths(validateInput('credit-card', { ...card, topUps: [null] }))).toContain('topUps.0');
  });
  it('counts top-ups, repayments and rate changes toward the same card event limit', () => {
    const topUps = Array.from({ length: 498 }, () => ({ date: '2026-01-02', amount: '1' }));
    const input = { ...card, topUps, repayments: [{ date: '2026-01-03', amount: '1' }], savings: { ...card.savings, rateChanges: [{ date: '2026-01-04', annualRate: '13' }] } };
    expect(validateInput('credit-card', input).ok).toBe(true);
    expect(paths(validateInput('credit-card', { ...input, topUps: [...topUps, topUps[0]] }))).toContain('topUps');
  });
  it('normalizes recurring card top-up rules without replacing them with cash events', () => {
    const result = validateInput('credit-card', { ...card, recurringTopUps: [{ ...recurring, amount: '1 000,50' }] });
    expect(result.ok && result.value.recurringTopUps).toEqual([{ ...recurring, amount: '1000.50' }]);
    expect(result.ok && result.value.topUps).toEqual([]);
    for (const frequency of ['daily', 'weekly', 'monthly']) {
      expect(validateInput('credit-card', { ...card, recurringTopUps: [{ ...recurring, endDate: '2026-01-01', frequency }] }).ok).toBe(true);
    }
  });
  it.each([
    ['amount', '0'], ['amount', '-1'], ['amount', '0.001'], ['amount', ''],
    ['frequency', 'yearly'], ['startDate', '2025-12-31'], ['startDate', '2026-03-01'],
    ['startDate', '2026-02-29'], ['endDate', '2026-03-01'], ['endDate', '2025-12-31'],
    ['endDate', '2026-02-29'],
  ])('rejects invalid recurring top-up %s: %s', (key, value) => {
    expect(paths(validateInput('credit-card', { ...card, recurringTopUps: [{ ...recurring, [key]: value }] }))).toContain(`recurringTopUps.0.${key}`);
  });
  it('rejects a recurrence end before its first date and malformed rule lists', () => {
    expect(paths(validateInput('credit-card', { ...card, recurringTopUps: [{ ...recurring, startDate: '2026-01-10', endDate: '2026-01-09' }] }))).toContain('recurringTopUps.0.endDate');
    expect(paths(validateInput('credit-card', { ...card, recurringTopUps: null }))).toContain('recurringTopUps');
    expect(paths(validateInput('credit-card', { ...card, recurringTopUps: [null] }))).toContain('recurringTopUps.0');
  });
  it('counts generated occurrences with manual top-ups, repayments and rate changes', () => {
    // Two monthly occurrences + 496 manual deposits + one payment + one rate = 500.
    const topUps = Array.from({ length: 496 }, () => ({ date: '2026-01-02', amount: '1' }));
    const input = { ...card, topUps, recurringTopUps: [recurring], repayments: [{ date: '2026-01-03', amount: '1' }], savings: { ...card.savings, rateChanges: [{ date: '2026-01-04', annualRate: '13' }] } };
    expect(validateInput('credit-card', input).ok).toBe(true);
    expect(paths(validateInput('credit-card', { ...input, topUps: [...topUps, topUps[0]] }))).toContain('recurringTopUps');
  });
  it('rejects excessive generated occurrences without throwing or silently truncating', () => {
    expect(paths(validateInput('credit-card', { ...card, endDate: '2035-12-31', recurringTopUps: [{ ...recurring, frequency: 'weekly' }] }))).toContain('recurringTopUps');
  });
  it('returns Russian issues for malformed nested data instead of throwing', () => {
    for (const value of [{}, { ...card, savings: null, repayments: [null] }, { ...savings, rateChanges: [null], events: [null] }]) {
      const result = validateInput('credit-card', value);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.issues.every(issue => /[А-Яа-я]/u.test(issue.message))).toBe(true);
    }
  });
  it('bounds the inclusive card planning horizon to ten calendar years', () => {
    expect(validateInput('credit-card', { ...card, endDate: '2035-12-31' }).ok).toBe(true);
    expect(paths(validateInput('credit-card', { ...card, endDate: '2036-01-01' }))).toContain('endDate');
  });
  it('validates card rate changes through the inclusive final date and counts all events', () => {
    expect(validateInput('credit-card', { ...card, savings: { ...card.savings, rateChanges: [{ date: '2026-02-28', annualRate: '13' }] } }).ok).toBe(true);
    expect(paths(validateInput('credit-card', { ...card, savings: { ...card.savings, rateChanges: [{ date: '2026-03-01', annualRate: '13' }] } }))).toContain('savings.rateChanges.0.date');
    const repayments = Array.from({ length: 500 }, () => ({ date: '2026-01-02', amount: '0.01' }));
    expect(paths(validateInput('credit-card', { ...card, repayments, savings: { ...card.savings, rateChanges: [{ date: '2026-01-03', annualRate: '13' }] } }))).toContain('repayments');
  });
  it('reports malformed account rows and bounded signed withdrawals without throwing', () => {
    const result = validateInput('savings', { ...savings, events: [null, { date: '2026-01-02', amount: '-1000000000000.01' }], rateChanges: [null] });
    expect(paths(result)).toEqual(expect.arrayContaining(['events.0', 'events.1.amount', 'rateChanges.0']));
  });
});
