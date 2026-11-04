import { firstOfNextMonth } from './dates';
import { FinanceDecimal, money } from './money';
import { calculateSavings } from './savings';
import type { CardInput, CardResult, CashEvent, SavingsInput } from './types';

/** One purchase cycle; inputs must already be validated and normalized. */
export function calculateCreditCard(input: CardInput): CardResult {
  const cardFunded = FinanceDecimal.min(input.purchaseAmount, input.creditLimit);
  let debt = cardFunded;
  let repaymentDayPayments = new FinanceDecimal(0);
  const events: CashEvent[] = [{
    date: input.purchaseDate,
    amount: money(new FinanceDecimal(input.purchaseAmount).minus(cardFunded).negated()),
  }];
  for (const payment of [...input.repayments].sort((a, b) => a.date.localeCompare(b.date))) {
    if (new FinanceDecimal(payment.amount).gt(debt)) {
      throw new RangeError(`Платёж ${payment.date} превышает остаток долга ${money(debt)} ₽`);
    }
    debt = debt.minus(payment.amount);
    events.push({ date: payment.date, amount: money(new FinanceDecimal(payment.amount).negated()) });
    if (payment.date === input.repaymentDate) repaymentDayPayments = repaymentDayPayments.plus(payment.amount);
  }

  // The exclusive boundary includes the final month's last day and its payout.
  const comparisonEndDate = firstOfNextMonth(input.repaymentDate);
  const account: SavingsInput = {
    ...input.savings, openingBalance: input.ownFunds,
    startDate: input.purchaseDate, endDate: comparisonEndDate, events,
  };
  const baseline = calculateSavings({
    ...account, events: [{ date: input.purchaseDate, amount: money(new FinanceDecimal(input.purchaseAmount).negated()) }],
  });

  // Stop before repayment-day interest/payout. Explicit payments that morning
  // precede settlement; neither pending nor externally paid interest is cash here.
  const beforeRepayment = calculateSavings({ ...account, endDate: input.repaymentDate });
  const available = new FinanceDecimal(beforeRepayment.closingBalance).minus(repaymentDayPayments);
  const settlement = debt.plus(input.fees);
  const deficit = FinanceDecimal.max(0, settlement.minus(available));
  const common = {
    cardFunded: money(cardFunded), debtAtRepayment: money(debt), comparisonEndDate,
    availableAtRepayment: money(available), baseline, deficit: money(deficit),
  };

  if (deficit.gt(0)) {
    return { ...common, viable: false, strategy: null, extraInterest: null, netBenefit: null };
  }

  const strategy = calculateSavings({
    ...account, events: [...events, { date: input.repaymentDate, amount: money(settlement.negated()) }],
  });
  const extraInterest = new FinanceDecimal(strategy.earnedInterest).minus(baseline.earnedInterest);
  return {
    ...common, viable: true, strategy, extraInterest: money(extraInterest),
    netBenefit: money(extraInterest.minus(input.fees)),
  };
}
