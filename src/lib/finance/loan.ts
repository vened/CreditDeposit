import { addMonthsClamped } from './dates';
import { FinanceDecimal, money } from './money';
import type { LoanInput, LoanResult } from './types';

/** Validated, normalized inputs; interest uses the monthly model annualRate / 12. */
export function calculateLoan(input: LoanInput): LoanResult {
  const originalPrincipal = new FinanceDecimal(input.principal);
  const monthlyRate = new FinanceDecimal(input.annualRate).div(100).div(12);
  const monthlyFee = new FinanceDecimal(input.monthlyFee);
  const fixedPrincipal = originalPrincipal.div(input.months).toDecimalPlaces(2);
  let installment = fixedPrincipal;
  if (input.scheme === 'annuity' && !monthlyRate.isZero()) {
    const growth = monthlyRate.plus(1).pow(input.months);
    installment = originalPrincipal.times(monthlyRate).times(growth).div(growth.minus(1)).toDecimalPlaces(2);
  }

  let balance = originalPrincipal;
  let totalInterest = new FinanceDecimal(0);
  let totalFees = new FinanceDecimal(input.upfrontFee);
  let totalPaid = new FinanceDecimal(input.upfrontFee);
  const rows: LoanResult['rows'] = [];

  for (let month = 1; month <= input.months; month += 1) {
    const interest = balance.times(monthlyRate).toDecimalPlaces(2);
    const regularPrincipal = input.scheme === 'annuity' ? installment.minus(interest) : fixedPrincipal;
    // Cent rounding can exhaust a tiny loan early or leave all of it until maturity.
    const principal = month === input.months
      ? balance
      : FinanceDecimal.min(balance, FinanceDecimal.max(0, regularPrincipal));
    const payment = principal.plus(interest).plus(monthlyFee);
    balance = balance.minus(principal);
    totalInterest = totalInterest.plus(interest);
    totalFees = totalFees.plus(monthlyFee);
    totalPaid = totalPaid.plus(payment);
    rows.push({
      date: addMonthsClamped(input.issuedOn, month), principal: money(principal),
      interest: money(interest), fee: money(monthlyFee), payment: money(payment), balance: money(balance),
    });
  }

  return {
    firstPayment: rows[0].payment, lastPayment: rows[rows.length - 1].payment,
    totalInterest: money(totalInterest), totalFees: money(totalFees),
    overpayment: money(totalInterest.plus(totalFees)), totalPaid: money(totalPaid), rows,
  };
}
