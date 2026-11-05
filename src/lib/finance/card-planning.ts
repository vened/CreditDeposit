import { CalculationError } from './calculation-error';
import { buildCardPlanningFlows } from './card-planning-flows';
import { addDays } from './dates';
import { FinanceDecimal, money } from './money';
import { calculateSavings } from './savings';
import type { CardPlanningInput, CardPlanningResult, CardPlanningScenario, CashEvent } from './types';

/** Compare identical daily spending, including debt in the chosen date's capital. */
export function calculateCardPlanning(input: CardPlanningInput): CardPlanningResult {
  const flows = buildCardPlanningFlows(input);
  function scenario(events: CashEvent[], withCard: boolean): CardPlanningScenario {
    try {
      const account = calculateSavings({ ...input.savings, openingBalance: input.ownFunds, startDate: input.startDate, endDate: addDays(input.endDate, 1), events });
      let external = new FinanceDecimal(0);
      const rows = account.months.map((month, index) => {
        if (!input.savings.capitalize) external = external.plus(month.paidInterest);
        const flow = flows.months[index];
        const row = withCard ? flow : { ...flow, cardSpending: '0.00', ownFundsSpending: flow.spending, manualRepayments: '0.00', automaticRepayments: '0.00', fees: '0.00', closingDebt: '0.00' };
        return { ...month, ...row, capital: money(new FinanceDecimal(month.closingBalance).plus(external).plus(month.pendingInterest).minus(row.closingDebt)) };
      });
      const debt = rows.at(-1)!.closingDebt;
      return { ok: true, account, rows, debt, capital: money(new FinanceDecimal(account.capital).minus(debt)) };
    } catch (error) {
      if (!(error instanceof CalculationError)) throw error;
      return { ok: false, failure: { kind: 'insufficient-funds', date: error.date, deficit: error.deficit } };
    }
  }
  const baseline = scenario(flows.baseline, false);
  const strategy = scenario(flows.strategy, true);
  return {
    baseline, strategy,
    extraInterest: baseline.ok && strategy.ok ? money(new FinanceDecimal(strategy.account.earnedInterest).minus(baseline.account.earnedInterest)) : null,
    netBenefit: baseline.ok && strategy.ok ? money(new FinanceDecimal(strategy.capital).minus(baseline.capital)) : null,
  };
}
