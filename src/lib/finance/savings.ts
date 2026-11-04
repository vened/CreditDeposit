import { CalculationError } from './calculation-error';
import { addDays, daysInYear } from './dates';
import { FinanceDecimal, money } from './money';
import type { AccountResult, SavingsInput } from './types';

/** Uses validated, normalized inputs; the end date is exclusive. */
export function calculateSavings(input: SavingsInput): AccountResult {
  const flows = new Map<string, InstanceType<typeof FinanceDecimal>>();
  for (const event of input.events) {
    flows.set(event.date, (flows.get(event.date) ?? new FinanceDecimal(0)).plus(event.amount));
  }
  const rates = new Map(input.rateChanges.map(change => [change.date, change.annualRate]));
  let balance = new FinanceDecimal(input.openingBalance);
  let contributions = balance;
  let rate = new FinanceDecimal(input.annualRate);
  let pending = new FinanceDecimal(0);
  let paid = new FinanceDecimal(0);
  let date = input.startDate;
  const months: AccountResult['months'] = [];

  while (date < input.endDate) {
    const month = date.slice(0, 7);
    const startsOnFirst = date.endsWith('-01');
    const opening = balance;
    const pendingAtStart = new FinanceDecimal(money(pending));
    let minimum = balance;
    let firstDay = true;
    let netFlow = new FinanceDecimal(0);
    let paidInMonth = new FinanceDecimal(0);
    let rateFactors = new FinanceDecimal(0);
    let days = 0;

    while (date < input.endDate && date.startsWith(month)) {
      const flow = flows.get(date) ?? new FinanceDecimal(0);
      balance = balance.plus(flow);
      if (balance.isNegative()) throw new CalculationError(date, money(balance.negated()));
      contributions = contributions.plus(flow);
      netFlow = netFlow.plus(flow);
      // The opening balance is not a daily observation until user operations apply.
      minimum = firstDay ? balance : FinanceDecimal.min(minimum, balance);
      firstDay = false;
      const changedRate = rates.get(date);
      if (changedRate !== undefined) rate = new FinanceDecimal(changedRate);
      const factor = rate.div(100).div(daysInYear(date));
      rateFactors = rateFactors.plus(factor);
      if (input.basis === 'daily') pending = pending.plus(balance.times(factor));
      days += 1;

      const next = addDays(date, 1);
      const monthEnd = !next.startsWith(month);
      const lastObservedDay = monthEnd || next === input.endDate;
      if (input.basis === 'monthly-min' && lastObservedDay) {
        if (input.partialMonths === 'actual' || (startsOnFirst && monthEnd)) {
          pending = pending.plus(minimum.times(rateFactors));
        }
      }
      // Both monthly minimum and daily base are fixed before this day's payout.
      if (input.payout === 'daily' || monthEnd) {
        const payout = new FinanceDecimal(money(pending));
        paid = paid.plus(payout);
        paidInMonth = paidInMonth.plus(payout);
        if (input.capitalize) balance = balance.plus(payout);
        pending = new FinanceDecimal(0);
      }
      date = next;
    }

    const pendingAtEnd = new FinanceDecimal(money(pending));
    months.push({
      month, days, openingBalance: money(opening), netFlow: money(netFlow), minimumBalance: money(minimum),
      // Rounded cumulative deltas keep the visible rows equal to the visible totals.
      earnedInterest: money(paidInMonth.plus(pendingAtEnd).minus(pendingAtStart)),
      paidInterest: money(paidInMonth), pendingInterest: money(pendingAtEnd), closingBalance: money(balance),
    });
  }

  const pendingInterest = money(pending);
  const paidExternally = input.capitalize ? new FinanceDecimal(0) : paid;
  return {
    earnedInterest: money(paid.plus(pendingInterest)), paidInterest: money(paid), pendingInterest,
    paidExternally: money(paidExternally), closingBalance: money(balance), netContributions: money(contributions),
    capital: money(balance.plus(paidExternally).plus(pendingInterest)), months,
  };
}
