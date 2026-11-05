import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { calculateCardPlanning } from '../../lib/finance/card-planning';
import type { CardPlanningInput } from '../../lib/finance/types';
import { CardPlanningResultPanel } from './card-planning-result';
const base: CardPlanningInput = { ownFunds: '1000', creditLimit: '1000', startDate: '2026-01-01', endDate: '2026-01-15', monthlySpending: '310', spendingOverrides: {}, repaymentDay: 31, fees: '0', topUps: [], recurringTopUps: [], repayments: [], savings: { annualRate: '0', basis: 'daily', payout: 'monthly', capitalize: false, partialMonths: 'actual', rateChanges: [] } };
const render = (input = base) => renderToStaticMarkup(createElement(CardPlanningResultPanel, { input, result: calculateCardPlanning(input) }));
describe('card final-date state', () => {
  it('shows cash, debt and net capital on the selected inclusive date', () => {
    const html = render();
    for (const text of ['15.01.2026', 'Деньги на счёте', 'Задолженность по карте', 'Капитал за вычетом долга', '1 000,00 ₽', '150,00 ₽', '850,00 ₽']) expect(html).toContain(text);
    expect(html).not.toContain('Дата полного погашения');
    expect(html).not.toContain('Покупка за счёт карты');
  });
  it('charts net capital instead of showing borrowed money as capital', () => {
    const html = render();
    const description = html.match(/<desc[^>]*>(.*?)<\/desc>/)?.[1];
    expect(description).toContain('850,00 ₽');
    expect(description).not.toContain('1 000,00 ₽');
    expect(html).toContain('Капитал во времени');
  });
  it('shows a surviving strategy and baseline deficit without comparative profit', () => {
    const html = render({ ...base, endDate: '2026-02-01', ownFunds: '310.70', repaymentDay: 1, spendingOverrides: { '2026-02': '280' }, savings: { ...base.savings, annualRate: '36.5', capitalize: true } });
    expect(html).toContain('Сравнение недоступно');
    expect(html).toContain('01.02.2026'); expect(html).toContain('4,63 ₽'); expect(html).toContain('0,02 ₽');
    expect(html).not.toContain('Чистая выгода стратегии');
  });
  it.each(['actual', 'exclude'] as const)('retains the monthly-min partial-month context (%s)', partialMonths => {
    const html = render({ ...base, savings: { ...base.savings, basis: 'monthly-min', partialMonths } });
    expect(html).toContain(partialMonths === 'actual' ? 'Неполные месяцы: начислять за фактические дни' : 'Неполные месяцы: не начислять проценты');
  });
});
