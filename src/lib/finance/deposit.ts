import { addDays, addMonthsClamped, daysInYear } from './dates';
import { FinanceDecimal, money } from './money';
import type { AccountResult, DepositInput } from './types';

/** Interest runs from the day after opening through maturity, inclusive. */
export function calculateDeposit(input: DepositInput): AccountResult {
  const flows = new Map<string, InstanceType<typeof FinanceDecimal>>();
  for (const event of input.events) {
    flows.set(event.date, (flows.get(event.date) ?? new FinanceDecimal(0)).plus(event.amount));
  }
  const rates = new Map(input.rateChanges.map(change => [change.date, change.annualRate]));
  const payoutDates = new Set([input.endDate]);
  if (input.payout === 'monthly') {
    // Reuse the original opening day: February's clamp must not shift March's payout.
    for (let offset = 1; offset <= 120; offset += 1) {
      let anniversary: string;
      try { anniversary = addMonthsClamped(input.startDate, offset); }
      catch { break; } // No further anniversary exists in the supported ISO calendar.
      if (anniversary > input.endDate) break;
      payoutDates.add(anniversary);
    }
  }

  let balance = new FinanceDecimal(input.openingBalance);
  let contributions = balance;
  let rate = new FinanceDecimal(input.annualRate);
  let pending = new FinanceDecimal(0);
  let paid = new FinanceDecimal(0);
  let date = input.startDate;
  const months: AccountResult['months'] = [];

  while (date <= input.endDate) {
    const month = date.slice(0, 7);
    const opening = balance;
    const pendingAtStart = new FinanceDecimal(money(pending));
    let minimum = balance;
    let firstDay = true;
    let netFlow = new FinanceDecimal(0);
    let paidInMonth = new FinanceDecimal(0);
    let days = 0;

    while (date.startsWith(month)) {
      // A replenishment today changes the account, but only tomorrow's interest base.
      const interestBase = balance;
      const flow = flows.get(date) ?? new FinanceDecimal(0);
      balance = balance.plus(flow);
      contributions = contributions.plus(flow);
      netFlow = netFlow.plus(flow);
      minimum = firstDay ? balance : FinanceDecimal.min(minimum, balance);
      firstDay = false;
      const changedRate = rates.get(date);
      if (changedRate !== undefined) rate = new FinanceDecimal(changedRate);
      if (date > input.startDate) {
        pending = pending.plus(interestBase.times(rate).div(100).div(daysInYear(date)));
        days += 1;
      }
      if (payoutDates.has(date)) {
        const payout = new FinanceDecimal(money(pending));
        paid = paid.plus(payout);
        paidInMonth = paidInMonth.plus(payout);
        if (input.capitalize) balance = balance.plus(payout);
        pending = new FinanceDecimal(0);
      }
      if (date === input.endDate) break;
      date = addDays(date, 1);
    }

    const pendingAtEnd = new FinanceDecimal(money(pending));
    months.push({
      month, days, openingBalance: money(opening), netFlow: money(netFlow), minimumBalance: money(minimum),
      earnedInterest: money(paidInMonth.plus(pendingAtEnd).minus(pendingAtStart)),
      paidInterest: money(paidInMonth), pendingInterest: money(pendingAtEnd), closingBalance: money(balance),
    });
    if (month === input.endDate.slice(0, 7) && date === input.endDate) break;
  }

  const paidExternally = input.capitalize ? new FinanceDecimal(0) : paid;
  return {
    earnedInterest: money(paid), paidInterest: money(paid), pendingInterest: '0.00',
    paidExternally: money(paidExternally), closingBalance: money(balance), netContributions: money(contributions),
    capital: money(balance.plus(paidExternally)), months,
  };
}
