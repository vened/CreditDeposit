import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CalculatorForm } from './calculator-form';

describe('card account operations', () => {
  it('uses monthly planning fields instead of one purchase', () => {
    const html = renderToStaticMarkup(createElement(CalculatorForm, { kind: 'credit-card' }));
    for (const text of ['Средние траты в месяц', 'Расходы по месяцам', 'Дата окончания расчёта включительно', 'Число полного погашения']) expect(html).toContain(text);
    for (const text of ['Стоимость покупки', 'Дата покупки', 'Дата погашения']) expect(html).not.toContain(text);
  });
  it('offers account top-ups separately from card repayments', () => {
    const html = renderToStaticMarkup(createElement(CalculatorForm, { kind: 'credit-card' }));
    expect(html).toContain('Пополнения накопительного счёта');
    expect(html).toContain('Добавить пополнение');
    expect(html).toContain('Добавить погашение');
  });
  it('offers recurring top-ups next to the one-off top-ups', () => {
    const html = renderToStaticMarkup(createElement(CalculatorForm, { kind: 'credit-card' }));
    expect(html).toContain('Периодические пополнения');
    expect(html).toContain('Добавить периодическое пополнение');
  });
});
