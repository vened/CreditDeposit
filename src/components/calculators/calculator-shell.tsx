import Link from 'next/link';
import type { ReactNode } from 'react';
import type { CalculatorKind } from '@/lib/finance/types';
import { calculatorContent } from '@/content/calculators';
import styles from './calculator.module.css';
export function CalculatorShell({ kind, children }: { kind: CalculatorKind; children: ReactNode }) {
  const content = calculatorContent[kind];
  return <main className={styles.shell}><header className={styles.heading}><p className={styles.eyebrow}>Финансовые калькуляторы · ₽</p><h1>{content.title}</h1><p>{content.description}</p></header><nav className={styles.navigation} aria-label="Выбор калькулятора">{(Object.keys(calculatorContent) as CalculatorKind[]).map(key => <Link key={key} href={`/calculators/${key}`} aria-current={key === kind ? 'page' : undefined}>{calculatorContent[key].short}</Link>)}</nav>{children}<p className={styles.bottomNote}>Расчёт по вашим условиям. Все суммы в рублях. Данные обрабатываются в браузере.</p></main>;
}
