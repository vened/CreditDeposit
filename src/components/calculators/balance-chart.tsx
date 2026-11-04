import { useId } from 'react';
import { FinanceDecimal } from '@/lib/finance/money';
import { formatMoney } from '@/lib/format';
import styles from './calculator.module.css';
export type ChartSeries = { label: string; values: { date: string; value: string }[] };
export function BalanceChart({ series }: { series: ChartSeries[] }) {
  const id = useId(); const values = series.flatMap(item => item.values);
  if (!values.length) return null;
  const maximum = values.reduce((max, row) => FinanceDecimal.max(max, row.value), new FinanceDecimal(0));
  const minimum = values.reduce((min, row) => FinanceDecimal.min(min, row.value), new FinanceDecimal(0));
  const range = maximum.minus(minimum); const count = Math.max(...series.map(item => item.values.length));
  const x = (index: number) => count === 1 ? 290 : 24 + index / (count - 1) * 532;
  const y = (value: string) => range.isZero() ? 110 : 172 - new FinanceDecimal(value).minus(minimum).div(range).toNumber() * 142;
  const dateLabel = (value: string) => value.split('-').reverse().join('.');
  return <section className={styles.chart} aria-label="График остатка"><div className={styles.chartHead}><h3>Остаток во времени</h3><span>Рубли · ₽</span></div><p className={styles.helper}>Верхняя отметка: <span className={styles.money}>{formatMoney(maximum.toFixed(2))}</span></p>
    <svg viewBox="0 0 580 220" role="img" aria-labelledby={`${id}-title ${id}-description`}><title id={`${id}-title`}>Остаток в рублях по датам</title><desc id={`${id}-description`}>{`${series.map(item => `${item.label}: ${item.values.map(row => `${dateLabel(row.date)} — ${formatMoney(row.value)}`).join('; ')}`).join('. ')}. Все значения доступны в таблице ниже.`}</desc><path d="M24 30 V172 H556" fill="none" stroke="#c7d1c0" />{series.map((item, index) => <g key={item.label}><polyline points={item.values.map((row, i) => `${x(i)},${y(row.value)}`).join(' ')} fill="none" stroke={index === 0 ? '#1e4939' : '#a66c43'} strokeWidth="3" strokeDasharray={index === 1 ? '8 5' : undefined} />{item.values.map((row, i) => <circle key={`${row.date}-${i}`} cx={x(i)} cy={y(row.value)} r={3} fill={index === 0 ? '#1e4939' : '#a66c43'}><title>{`${item.label}, ${dateLabel(row.date)}: ${formatMoney(row.value)}`}</title></circle>)}</g>)}<text x="24" y="204" fontSize="14" fill="#536650">{dateLabel(values[0].date)}</text><text x="556" y="204" textAnchor="end" fontSize="14" fill="#536650">{dateLabel(series[0].values.at(-1)!.date)}</text></svg>
    <div className={styles.legend}>{series.map((item, index) => <span key={item.label}><i style={{ background: index === 0 ? '#1e4939' : '#a66c43' }} />{item.label}{index === 1 ? ' (пунктир)' : ''}</span>)}</div>
  </section>;
}
