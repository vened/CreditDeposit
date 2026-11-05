import { addDays, addMonthsClamped, daysBetween, daysInYear, isISODate } from './dates';
import { FinanceDecimal, money } from './money';
import type { CardPlanningInput, CashEvent, ISODate, Money } from './types';

export type MonthlyExpensePlan = Pick<CardPlanningInput, 'startDate' | 'endDate' | 'monthlySpending' | 'spendingOverrides'>;
export type PlanningMonth = { month: string; firstDate: ISODate; lastDate: ISODate; days: number; daysInMonth: number };
export type MonthlyExpensePeriod = PlanningMonth & { budget: Money; spending: Money; overridden: boolean };

export function getPlanningMonths(startDate: ISODate, endDate: ISODate): PlanningMonth[] {
  if (!isISODate(startDate) || !isISODate(endDate)) throw new RangeError('Укажите существующие даты');
  const exclusiveEnd = addDays(endDate, 1);
  let maximum = '9999-12-31';
  try { maximum = addMonthsClamped(startDate, 120); } catch { /* bounded by calendar */ }
  if (endDate < startDate || exclusiveEnd > maximum) throw new RangeError('Период — от одного дня до 10 лет');
  const months: PlanningMonth[] = [];
  let firstDate = startDate;
  while (firstDate <= endDate) {
    const month = firstDate.slice(0, 7);
    const number = Number(firstDate.slice(5, 7));
    const daysInMonth = [31, daysInYear(firstDate) === 366 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][number - 1];
    const calendarLast = `${month}-${daysInMonth}`;
    const lastDate = endDate < calendarLast ? endDate : calendarLast;
    months.push({ month, firstDate, lastDate, days: daysBetween(firstDate, lastDate) + 1, daysInMonth });
    if (lastDate === endDate) break;
    firstDate = addDays(lastDate, 1);
  }
  return months;
}

function cumulative(budget: Money, day: number, days: number) {
  return new FinanceDecimal(budget).times(day).div(days).toDecimalPlaces(2);
}

export function getMonthlyExpensePeriods(input: MonthlyExpensePlan): MonthlyExpensePeriod[] {
  return getPlanningMonths(input.startDate, input.endDate).map(period => {
    const overridden = Object.hasOwn(input.spendingOverrides, period.month);
    const budget = money(overridden ? input.spendingOverrides[period.month] : input.monthlySpending);
    const firstDay = Number(period.firstDate.slice(8));
    const lastDay = Number(period.lastDate.slice(8));
    return { ...period, budget, overridden, spending: money(cumulative(budget, lastDay, period.daysInMonth).minus(cumulative(budget, firstDay - 1, period.daysInMonth))) };
  });
}

/** Positive expenses, not signed account events. Inputs are validated. */
export function expandMonthlyExpenses(input: MonthlyExpensePlan): CashEvent[] {
  const events: CashEvent[] = [];
  for (const period of getMonthlyExpensePeriods(input)) {
    let date = period.firstDate;
    while (date <= period.lastDate) {
      const day = Number(date.slice(8));
      events.push({ date, amount: money(cumulative(period.budget, day, period.daysInMonth).minus(cumulative(period.budget, day - 1, period.daysInMonth))) });
      if (date === period.lastDate) break;
      date = addDays(date, 1);
    }
  }
  return events;
}
