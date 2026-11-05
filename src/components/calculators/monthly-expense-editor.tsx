'use client';
import { getPlanningMonths, getMonthlyExpensePeriods, type MonthlyExpensePlan, type PlanningMonth } from '@/lib/finance/monthly-expenses';
import { FinanceDecimal, parseDecimalInput } from '@/lib/finance/money';
import type { FieldIssue, Money } from '@/lib/finance/types';
import { formatMoney } from '@/lib/format';
import { FormField } from './form-field';
import styles from './calculator.module.css';

const monthFormat = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' });
export function MonthlyExpenseEditor({ value, onChange, issues }: { value: MonthlyExpensePlan; onChange: (overrides: Record<string, Money>) => void; issues: FieldIssue[] }) {
  let months: PlanningMonth[] = [];
  try { months = getPlanningMonths(value.startDate, value.endDate); } catch { /* raw dates can be temporarily incomplete */ }
  return <fieldset className={styles.editor}><legend>Расходы по месяцам</legend>
    <p className={styles.helper}>Сумма относится к полному месяцу и распределяется поровну по дням. Исправленные месяцы сохраняются при изменении средней суммы и дат.</p>
    {issues.find(issue => issue.path === 'spendingOverrides') && <p className={styles.error}>{issues.find(issue => issue.path === 'spendingOverrides')!.message}</p>}
    {!months.length && <p className={styles.helper}>Укажите корректные даты: от одного дня до 10 лет.</p>}
    {months.map(month => {
      const custom = Object.hasOwn(value.spendingOverrides, month.month);
      const amount = custom ? value.spendingOverrides[month.month] : value.monthlySpending;
      const normalized = parseDecimalInput(amount);
      const number = normalized === null ? null : new FinanceDecimal(normalized);
      const valid = number && number.gte(0) && number.lte('1000000000000') && (normalized!.split('.')[1]?.length ?? 0) <= 2;
      const actual = valid ? getMonthlyExpensePeriods({ startDate: month.firstDate, endDate: month.lastDate, monthlySpending: normalized!, spendingOverrides: {} })[0].spending : null;
      const label = monthFormat.format(new Date(`${month.month}-01T00:00:00Z`));
      return <div className={styles.monthRow} key={month.month}>
        <FormField label={`Расходы за ${label}, ₽`} path={`spendingOverrides.${month.month}`} value={amount} issues={issues}
          onChange={amount => onChange({ ...value.spendingOverrides, [month.month]: amount })}
          hint={actual === null ? 'Введите сумму полного месяца.' : `В расчёте ${month.days} из ${month.daysInMonth} дней: ${formatMoney(actual)}${custom ? ' · своя сумма' : ' · по средней'}`} />
        {custom && <button type="button" className={styles.remove} onClick={() => {
          const next = { ...value.spendingOverrides }; delete next[month.month]; onChange(next);
        }}>Вернуть к средней<span className={styles.srOnly}>: {label}</span></button>}
      </div>;
    })}
  </fieldset>;
}
