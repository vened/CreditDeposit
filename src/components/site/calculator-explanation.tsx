import Link from 'next/link';
import { calculatorExplanations } from '@/content/methodology';
import type { CalculatorKind } from '@/lib/finance/types';
import styles from './site.module.css';
export function CalculatorExplanation({ kind }: { kind: CalculatorKind }) {
  const content = calculatorExplanations[kind];
  return <section className={styles.explanation} aria-labelledby={`${kind}-method`}><h2 id={`${kind}-method`}>{content.heading}</h2>{content.paragraphs.map(text => <p key={text}>{text}</p>)}<p><Link href={`/methodology#${kind === 'credit-card' ? 'card' : kind}`}>Методика расчёта и источники ↗</Link></p></section>;
}
