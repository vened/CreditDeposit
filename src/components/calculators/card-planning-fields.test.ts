import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CardPlanningFields, type CardPlanningDraft } from './card-planning-fields';
const base: CardPlanningDraft = { ownFunds: '300000', creditLimit: '100000', startDate: '2026-11-01', endDate: '2027-01-31', monthlySpending: '60000', spendingOverrides: { '2026-12': '75000' }, repaymentDay: '31', fees: '0', topUps: [], recurringTopUps: [], repayments: [], savings: { annualRate: '12', basis: 'daily', payout: 'monthly', capitalize: false, partialMonths: 'actual', rateChanges: [] } };
const render = (value = base, issues: { path: string; message: string }[] = []) => renderToStaticMarkup(createElement(CardPlanningFields, { value, issues, onChange() {} }));
describe('monthly card planning fields', () => {
  it('offers a horizon, base budget, editable months and monthly repayment day', () => {
    const html = render();
    for (const text of ['Дата начала', 'Дата окончания расчёта включительно', 'Средние траты в месяц, ₽', 'Число полного погашения', 'ноябрь', 'декабрь', 'январь']) expect(html).toContain(text);
    expect(html.match(/Вернуть к средней/g)).toHaveLength(1);
  });
  it('keeps a customized month when the base amount changes', () => {
    const html = render({ ...base, monthlySpending: '65000' });
    expect(html).toContain('value="75000"');
    expect(html.match(/value="65000"/g)).toHaveLength(3);
  });
  it('explains the actual spending for partial calendar months', () => {
    const html = render({ ...base, startDate: '2026-11-16', endDate: '2026-11-30' });
    expect(html).toContain('30 000,00 ₽');
    expect(html).toContain('15 из 30');
  });
  it.each([{ startDate: 'bad' }, { monthlySpending: '' }, { spendingOverrides: { '2026-12': 'abc' } }, { repaymentDay: '' }])('preserves invalid draft text without crashing previews', patch => {
    const html = render({ ...base, ...patch }, [{ path: 'spendingOverrides.2026-12', message: 'Введите число' }]);
    if ('spendingOverrides' in patch) { expect(html).toContain('value="abc"'); expect(html).toContain('Введите число'); }
    expect(html).toContain('Средние траты в месяц');
  });
});
