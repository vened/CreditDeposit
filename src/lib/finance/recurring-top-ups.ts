import { addDays, addMonthsClamped, daysBetween } from './dates';
import type { CashEvent, ISODate, RecurringTopUp } from './types';

/** Expand validated rules; comparisonEnd is exclusive and rule endDate inclusive. */
export function expandRecurringTopUps(rules: RecurringTopUp[], comparisonEnd: ISODate): CashEvent[] {
  const events: CashEvent[] = [];
  for (const rule of rules) {
    let date = rule.startDate;
    let monthOffset = 0;
    while (date < comparisonEnd && (!rule.endDate || date <= rule.endDate)) {
      if (events.length === 500) throw new RangeError('Допускается не более 500 датированных операций');
      events.push({ date, amount: rule.amount });
      if (rule.endDate && date === rule.endDate) break;

      if (rule.frequency === 'monthly') {
        // No later month can contribute. Also prevents advancing past year 9999.
        if (date.slice(0, 7) >= comparisonEnd.slice(0, 7)) break;
        date = addMonthsClamped(rule.startDate, ++monthOffset);
      } else {
        const step = rule.frequency === 'daily' ? 1 : 7;
        if (daysBetween(date, comparisonEnd) <= step) break;
        date = addDays(date, step);
      }
    }
  }
  return events;
}
