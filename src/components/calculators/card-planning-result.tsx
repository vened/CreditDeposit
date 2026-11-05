import type { CardPlanningInput, CardPlanningResult } from '@/lib/finance/types';
import { formatDate, formatMoney } from '@/lib/format';
import { AccountDetails, MoneyRow, PartialMonthContext } from './account-details';
import { BalanceChart } from './balance-chart';
import { CardScheduleTable } from './card-schedule-table';
import styles from './calculator.module.css';

export function CardPlanningResultPanel({ input, result }: { input: CardPlanningInput; result: CardPlanningResult }) {
  const scenarios = [{ label: 'Без карты', value: result.baseline }, { label: 'Карта + счёт', value: result.strategy }];
  const comparable = result.netBenefit !== null;
  return <section className={styles.results} aria-label="Результат сравнения">
    <div className={styles.resultCard} aria-live="polite">
      <p className={styles.resultLabel}>{!comparable ? 'Сравнение недоступно' : result.netBenefit!.startsWith('-') ? 'Убыток стратегии после комиссий' : 'Чистая выгода стратегии'}</p>
      {comparable && <div className={`${styles.bigMoney} ${styles.money}`}>{formatMoney(result.netBenefit!)}</div>}
      <p className={styles.gain}>Состояние на {formatDate(input.endDate)} включительно</p>
      {scenarios.map(({ label, value }) => !value.ok && <p className={styles.warning} key={label}>Недостаточно средств в сценарии «{label}» {formatDate(value.failure.date)}. Дефицит: {formatMoney(value.failure.deficit)}. Сравнительная выгода не рассчитывается.</p>)}
      {result.strategy.ok && <dl className={styles.metrics}><MoneyRow label="Деньги на счёте" value={result.strategy.account.closingBalance} /><MoneyRow label="Задолженность по карте" value={result.strategy.debt} /><MoneyRow label="Капитал за вычетом долга" value={result.strategy.capital} /></dl>}
      {result.baseline.ok && <dl className={styles.metrics}><MoneyRow label="Капитал без карты" value={result.baseline.capital} /></dl>}
      {result.extraInterest !== null && <dl className={styles.metrics}><MoneyRow label="Дополнительные проценты до комиссий" value={result.extraInterest} /></dl>}
      <PartialMonthContext terms={input.savings} />
      <p className={styles.resultNote}>Капитал = деньги на счёте + выведенные проценты + ещё не выплаченные проценты − долг. Выведенные и невыплаченные проценты недоступны для погашения. В конце расчёта долг автоматически не закрывается.</p>
      <p className={styles.resultNote}>Предполагается использование карты без процентов и полное погашение по выбранному расписанию. Условия льготного периода банка автоматически не проверяются.</p>
    </div>
    <BalanceChart metric="capital" series={scenarios.flatMap(({ label, value }) => value.ok ? [{ label, values: value.rows.map(row => ({ date: row.endDate, value: row.capital })) }] : [])} />
    <div className={styles.comparison}>{scenarios.map(({ label, value }) => value.ok && <div key={label}><h3>{label}</h3><AccountDetails result={value.account} /><CardScheduleTable rows={value.rows} title={`Таблица: ${label.toLowerCase()}`} /></div>)}</div>
    <p className={styles.helper}>Доход до НДФЛ. Все расходы одинаковы в обоих сценариях; пополнения не считаются доходом.</p>
  </section>;
}
