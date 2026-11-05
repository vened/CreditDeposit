import { addDays } from './dates';
import { expandMonthlyExpenses, getPlanningMonths } from './monthly-expenses';
import { FinanceDecimal, money } from './money';
import { expandRecurringTopUps } from './recurring-top-ups';
import type { CardPlanningInput, CardPlanningMonthRow, CashEvent, ISODate, Money } from './types';

export type CardMonthFlows = Pick<CardPlanningMonthRow, 'month' | 'endDate' | 'spending' | 'topUps' | 'cardSpending' | 'ownFundsSpending' | 'manualRepayments' | 'automaticRepayments' | 'fees' | 'closingDebt'>;
export type CardPlanningFlows = { baseline: CashEvent[]; strategy: CashEvent[]; months: CardMonthFlows[] };

export class CardRepaymentError extends Error {
  constructor(public readonly date: ISODate, public readonly index: number, public readonly requested: Money, public readonly debt: Money) {
    super(`Платёж ${date} превышает текущий долг ${debt} ₽`);
    this.name = 'CardRepaymentError';
  }
}

/** Build dated cash flows independently of account interest; inputs are validated. */
export function buildCardPlanningFlows(input: CardPlanningInput): CardPlanningFlows {
  const topUps = [...input.topUps, ...expandRecurringTopUps(input.recurringTopUps, addDays(input.endDate, 1))];
  const baseline: CashEvent[] = [...topUps];
  const strategy: CashEvent[] = [...topUps];
  const periods = getPlanningMonths(input.startDate, input.endDate);
  const months: CardMonthFlows[] = periods.map(period => ({
    month: period.month, endDate: period.lastDate, spending: '0.00', topUps: '0.00', cardSpending: '0.00', ownFundsSpending: '0.00',
    manualRepayments: '0.00', automaticRepayments: '0.00', fees: '0.00', closingDebt: '0.00',
  }));
  const monthIndex = new Map(months.map((row, index) => [row.month, index]));
  const deposits = new Map<string, InstanceType<typeof FinanceDecimal>>();
  for (const row of topUps) deposits.set(row.date, (deposits.get(row.date) ?? new FinanceDecimal(0)).plus(row.amount));
  const payments = new Map<string, { amount: Money; index: number }[]>();
  input.repayments.forEach((row, index) => payments.set(row.date, [...(payments.get(row.date) ?? []), { amount: row.amount, index }]));
  let debt = new FinanceDecimal(0);
  const debit = (events: CashEvent[], date: ISODate, amount: InstanceType<typeof FinanceDecimal>) => {
    if (amount.gt(0)) events.push({ date, amount: money(amount.negated()) });
  };
  for (const expense of expandMonthlyExpenses(input)) {
    const index = monthIndex.get(expense.date.slice(0, 7))!;
    const row = months[index];
    const spending = new FinanceDecimal(expense.amount);
    const cardSpending = FinanceDecimal.min(spending, new FinanceDecimal(input.creditLimit).minus(debt));
    const ownSpending = spending.minus(cardSpending);
    debt = debt.plus(cardSpending);
    debit(baseline, expense.date, spending);
    debit(strategy, expense.date, ownSpending);
    row.spending = money(new FinanceDecimal(row.spending).plus(spending));
    row.topUps = money(new FinanceDecimal(row.topUps).plus(deposits.get(expense.date) ?? 0));
    row.cardSpending = money(new FinanceDecimal(row.cardSpending).plus(cardSpending));
    row.ownFundsSpending = money(new FinanceDecimal(row.ownFundsSpending).plus(ownSpending));
    for (const payment of payments.get(expense.date) ?? []) {
      const amount = new FinanceDecimal(payment.amount);
      if (amount.gt(debt)) throw new CardRepaymentError(expense.date, payment.index, money(amount), money(debt));
      debt = debt.minus(amount);
      debit(strategy, expense.date, amount);
      row.manualRepayments = money(new FinanceDecimal(row.manualRepayments).plus(amount));
    }
    if (Number(expense.date.slice(8)) === Math.min(input.repaymentDay, periods[index].daysInMonth)) {
      debit(strategy, expense.date, debt);
      row.automaticRepayments = money(new FinanceDecimal(row.automaticRepayments).plus(debt));
      debt = new FinanceDecimal(0);
    }
    if (expense.date === input.endDate) {
      row.fees = money(input.fees);
      debit(strategy, expense.date, new FinanceDecimal(input.fees));
    }
    row.closingDebt = money(debt);
  }
  return { baseline, strategy, months };
}
