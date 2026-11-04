import type { CalculatorKind, Inputs } from '@/lib/finance/types';
export const calculatorContent: Record<CalculatorKind, { title: string; short: string; description: string }> = {
  deposit: { title: 'Калькулятор вклада', short: 'Вклад', description: 'Доход, пополнения и капитализация — на ваших условиях.' },
  savings: { title: 'Накопительный счёт', short: 'Накопительный счёт', description: 'Посчитайте доход на ежедневный или минимальный остаток.' },
  loan: { title: 'Калькулятор кредита', short: 'Кредит', description: 'Платежи, проценты и комиссии в одном расчёте.' },
  'credit-card': { title: 'Карта + накопительный счёт', short: 'Карта + счёт', description: 'Сравните покупку за свои деньги и покупку с кредитной картой.' },
};
export const defaults: Inputs = {
  deposit: { openingBalance: '100000', annualRate: '12', startDate: '2026-10-01', endDate: '2026-10-31', payout: 'maturity', capitalize: false, events: [], rateChanges: [] },
  savings: { openingBalance: '100000', annualRate: '12', startDate: '2026-10-01', endDate: '2026-11-01', basis: 'daily', payout: 'monthly', capitalize: false, partialMonths: 'actual', events: [], rateChanges: [] },
  loan: { principal: '120000', annualRate: '12', months: 12, issuedOn: '2026-10-01', scheme: 'annuity', upfrontFee: '0', monthlyFee: '0' },
  'credit-card': { ownFunds: '100000', purchaseAmount: '100000', creditLimit: '100000', purchaseDate: '2026-01-01', repaymentDate: '2026-01-11', fees: '0', repayments: [], savings: { annualRate: '12', basis: 'daily', payout: 'monthly', capitalize: false, partialMonths: 'actual', rateChanges: [] } },
};
