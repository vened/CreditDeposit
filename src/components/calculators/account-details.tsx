import type { AccountResult, SavingsTerms } from '@/lib/finance/types';
import { formatMoney } from '@/lib/format';
import styles from './calculator.module.css';
export function MoneyRow({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd className={styles.money}>{formatMoney(value)}</dd></div>; }
export function AccountDetails({ result }: { result: AccountResult }) {
  return <dl className={styles.metrics}><MoneyRow label="Чистые взносы" value={result.netContributions} /><MoneyRow label="Остаток на счёте" value={result.closingBalance} /><MoneyRow label="Начисленные проценты" value={result.earnedInterest} /><MoneyRow label="Выплаченные проценты" value={result.paidInterest} /><MoneyRow label="Из них выведено со счёта" value={result.paidExternally} /><MoneyRow label="Ещё не выплачено" value={result.pendingInterest} /></dl>;
}
export function PartialMonthContext({ terms }: { terms: SavingsTerms | null }) {
  if (terms?.basis !== 'monthly-min') return null;
  return <p className={styles.resultNote}>{terms.partialMonths === 'actual' ? 'Неполные месяцы: начислять за фактические дни' : 'Неполные месяцы: не начислять проценты'}</p>;
}
