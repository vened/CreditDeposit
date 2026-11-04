import type { AccountResult, LoanResult } from '@/lib/finance/types';
import { formatDate, formatMoney } from '@/lib/format';
import styles from './calculator.module.css';
export function ScheduleTable({ account, loan, title = 'Полная таблица расчёта' }: { account?: AccountResult; loan?: LoanResult; title?: string }) {
  return <details className={styles.schedule}><summary>{title} · {account?.months.length ?? loan?.rows.length} {account ? 'мес.' : 'платежей'}</summary><div className={styles.tableWrap} tabIndex={0} role="region" aria-label={title}>
    {account && <table><caption>Начисления по календарным месяцам, ₽</caption><thead><tr>{['Месяц', 'Дней', 'Начальный остаток', 'Операции, нетто', 'Минимальный остаток', 'Начислено', 'Выплачено', 'Не выплачено', 'Конечный остаток'].map(text => <th scope="col" key={text}>{text}</th>)}</tr></thead><tbody>{account.months.map(row => <tr key={row.month}><th scope="row">{row.month.split('-').reverse().join('.')}</th><td>{row.days}</td>{[row.openingBalance, row.netFlow, row.minimumBalance, row.earnedInterest, row.paidInterest, row.pendingInterest, row.closingBalance].map((value, index) => <td key={index}>{formatMoney(value)}</td>)}</tr>)}</tbody></table>}
    {loan && <table><caption>Ежемесячные платежи, ₽. Разовая комиссия показана отдельно в итоге.</caption><thead><tr>{['Дата', 'Основной долг', 'Проценты', 'Комиссия', 'Платёж', 'Остаток долга'].map(text => <th scope="col" key={text}>{text}</th>)}</tr></thead><tbody>{loan.rows.map(row => <tr key={row.date}><th scope="row">{formatDate(row.date)}</th>{[row.principal, row.interest, row.fee, row.payment, row.balance].map((value, index) => <td key={index}>{formatMoney(value)}</td>)}</tr>)}</tbody></table>}
  </div></details>;
}
