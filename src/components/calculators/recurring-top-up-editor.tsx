import type { FieldIssue, RecurringTopUp } from '@/lib/finance/types';
import { FormField } from './form-field';
import styles from './calculator.module.css';

export function RecurringTopUpEditor({ rows, onChange, startDate, issues }: {
  rows: RecurringTopUp[];
  onChange: (rows: RecurringTopUp[]) => void;
  startDate: string;
  issues: FieldIssue[];
}) {
  function update(index: number, change: Partial<RecurringTopUp>) {
    onChange(rows.map((row, i) => i === index ? { ...row, ...change } : row));
  }
  const error = issues.find(issue => issue.path === 'recurringTopUps')?.message;
  return <fieldset className={styles.editor}>
    <legend>Периодические пополнения</legend>
    <p className={styles.helper}>Повтор с первой даты: каждый день, каждые 7 дней или в то же число месяца. В коротком месяце — в последний день. Разовые пополнения добавляются отдельно. С учётом повторов — до 500 операций и изменений ставок суммарно.</p>
    {rows.map((row, index) => {
      const path = `recurringTopUps.${index}`;
      return <div className={styles.editorRow} key={index}>
        <FormField label={`Сумма пополнения ${index + 1}, ₽`} value={row.amount} onChange={amount => update(index, { amount })} path={`${path}.amount`} issues={issues} />
        <FormField label={`Повторять ${index + 1}`} value={row.frequency} onChange={frequency => update(index, { frequency: frequency as RecurringTopUp['frequency'] })} path={`${path}.frequency`} issues={issues} options={[
          { value: 'daily', label: 'Ежедневно' },
          { value: 'weekly', label: 'Еженедельно' },
          { value: 'monthly', label: 'Ежемесячно' },
        ]} />
        <FormField label={`Первое пополнение ${index + 1}`} type="date" value={row.startDate} onChange={startDate => update(index, { startDate })} path={`${path}.startDate`} issues={issues} />
        <FormField label={`Последнее пополнение ${index + 1} (включительно)`} type="date" value={row.endDate} onChange={endDate => update(index, { endDate })} path={`${path}.endDate`} issues={issues} hint="Необязательно. Пусто — по конечную дату расчёта включительно." />
        <button type="button" className={styles.remove} onClick={() => onChange(rows.filter((_, i) => i !== index))} aria-label={`Удалить периодическое пополнение ${index + 1}`}>Удалить</button>
      </div>;
    })}
    {error && <p className={styles.error}>{error}</p>}
    <button type="button" className={styles.secondary} disabled={rows.length >= 500} onClick={() => onChange([...rows, { amount: '', startDate, endDate: '', frequency: 'monthly' }])}>+ Добавить периодическое пополнение</button>
  </fieldset>;
}
