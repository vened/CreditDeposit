import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { calculateSavings } from '../../lib/finance/savings';
import { calculateCreditCard } from '../../lib/finance/credit-card';
import type { CardInput, SavingsInput } from '../../lib/finance/types';
import { ResultPanel } from './result-panel';
const savings: SavingsInput = { openingBalance: '100000', annualRate: '12', startDate: '2026-10-10', endDate: '2026-10-20', basis: 'monthly-min', payout: 'monthly', capitalize: false, partialMonths: 'actual', events: [], rateChanges: [] };
const card: CardInput = { ownFunds: '200000', purchaseAmount: '100000', creditLimit: '100000', purchaseDate: '2026-01-01', repaymentDate: '2026-01-11', fees: '0', repayments: [], savings: { annualRate: '12', basis: 'monthly-min', payout: 'monthly', capitalize: false, partialMonths: 'actual', rateChanges: [] } };
describe('result calculation context', () => {
  it.each(['actual', 'exclude'] as const)('shows the selected savings partial-month rule: %s', partialMonths => {
    const input = { ...savings, partialMonths };
    const html = renderToStaticMarkup(createElement(ResultPanel, { kind: 'savings', input, result: calculateSavings(input) }));
    expect(html).toContain(partialMonths === 'actual' ? 'Неполные месяцы: начислять за фактические дни' : 'Неполные месяцы: не начислять проценты');
  });
  it.each(['actual', 'exclude'] as const)('shows the selected card partial-month rule: %s', partialMonths => {
    const input = { ...card, savings: { ...card.savings, partialMonths } };
    const html = renderToStaticMarkup(createElement(ResultPanel, { kind: 'credit-card', input, result: calculateCreditCard(input) }));
    expect(html).toContain(partialMonths === 'actual' ? 'Неполные месяцы: начислять за фактические дни' : 'Неполные месяцы: не начислять проценты');
  });
  it('shows card repayment independently of comparison end and updates its selected rule', () => {
    const input = { ...card, repaymentDate: '2026-01-21', savings: { ...card.savings, partialMonths: 'exclude' as const } };
    const html = renderToStaticMarkup(createElement(ResultPanel, { kind: 'credit-card', input, result: calculateCreditCard(input) }));
    expect(html).toContain('21.01.2026');
    expect(html).toContain('01.02.2026');
    expect(html).toContain('Неполные месяцы: не начислять проценты');
    expect(html).not.toContain('11.01.2026');
  });
  it('does not present old calculation context when a raw field invalidates the result', () => {
    const html = renderToStaticMarkup(createElement(ResultPanel, { kind: 'credit-card', input: card, result: null }));
    expect(html).not.toContain('11.01.2026');
    expect(html).not.toContain('Неполные месяцы:');
    expect(html).not.toContain('<svg');
  });
});
