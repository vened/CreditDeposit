'use client';
import type { CardPlanningInput, FieldIssue } from '@/lib/finance/types';
import { FormField } from './form-field';
import { MonthlyExpenseEditor } from './monthly-expense-editor';
import styles from './calculator.module.css';
export type CardPlanningDraft = Omit<CardPlanningInput, 'repaymentDay'> & { repaymentDay: string };
export function CardPlanningFields({ value, onChange, issues }: { value: CardPlanningDraft; onChange: (value: CardPlanningDraft) => void; issues: FieldIssue[] }) {
  function field(label: string, key: 'ownFunds' | 'creditLimit' | 'startDate' | 'endDate' | 'monthlySpending' | 'repaymentDay', hint?: string, type = 'text') {
    return <FormField label={label} path={key} value={value[key]} type={type} hint={hint} issues={issues} onChange={next => onChange({ ...value, [key]: next })} />;
  }
  return <>
    {field('Собственные средства на начало, ₽', 'ownFunds', 'Деньги на накопительном счёте. На начало расчёта долг по карте равен нулю.')}
    {field('Кредитный лимит, ₽', 'creditLimit', 'Расходы сверх свободного лимита оплачиваются своими деньгами.')}
    <div className={styles.row}>{field('Дата начала', 'startDate', undefined, 'date')}{field('Дата окончания расчёта включительно', 'endDate', undefined, 'date')}</div>
    {field('Средние траты в месяц, ₽', 'monthlySpending', 'Заполняют все месяцы. Сумму любого месяца можно изменить ниже.')}
    <MonthlyExpenseEditor value={value} onChange={spendingOverrides => onChange({ ...value, spendingOverrides })} issues={issues} />
    {field('Число полного погашения', 'repaymentDay', 'Ежемесячно, от 1 до 31. Если такого числа нет — последний день месяца. Погашается весь долг после расходов этого дня.')}
  </>;
}
