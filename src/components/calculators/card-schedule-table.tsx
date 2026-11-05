import type { CardPlanningMonthRow } from '@/lib/finance/types';
import { formatDate, formatMoney } from '@/lib/format';
import styles from './calculator.module.css';
export function CardScheduleTable({ rows, title }: { rows: CardPlanningMonthRow[]; title: string }) {
  return <details className={styles.schedule}><summary>{title} · {rows.length} мес.</summary><div className={styles.tableWrap} tabIndex={0} role="region" aria-label={title}>
    <table><caption>Состояние на последнюю учтённую дату каждого месяца. Суммы в рублях.</caption>
      <thead><tr>{['На дату', 'Расходы', 'Пополнения', 'Ручные погашения', 'Полное погашение', 'Комиссии', 'Проценты за месяц', 'Деньги на счёте', 'Долг', 'Капитал за вычетом долга'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
      <tbody>{rows.map(row => <tr key={row.month}><th scope="row">{formatDate(row.endDate)}</th>{[row.spending, row.topUps, row.manualRepayments, row.automaticRepayments, row.fees, row.earnedInterest, row.closingBalance, row.closingDebt, row.capital].map((amount, i) => <td key={i}>{formatMoney(amount)}</td>)}</tr>)}</tbody>
    </table>
  </div></details>;
}
