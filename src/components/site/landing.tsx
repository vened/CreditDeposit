import Link from 'next/link';
import { calculatorContent } from '@/content/calculators';
import type { CalculatorKind, SavingsInput } from '@/lib/finance/types';
import { calculateSavings } from '@/lib/finance/savings';
import { formatMoney } from '@/lib/format';
import styles from './site.module.css';

const example: SavingsInput = { openingBalance: '100000', annualRate: '12', startDate: '2026-10-01', endDate: '2026-11-01', basis: 'daily', payout: 'monthly', capitalize: true, partialMonths: 'actual', events: [], rateChanges: [] };
const faq = [
  ['Откуда берутся ставки?', 'Вы вводите ставку и условия вручную из своего договора или тарифа. Мы не загружаем банковские предложения и не подбираем продукты.'],
  ['Почему результат может отличаться от банковского?', 'Банки по-разному определяют расчётные периоды, базу начисления и даты выплаты. Сверьте выбранные настройки и методику с вашим договором.'],
  ['Учитывается ли налог на проценты?', 'Доход показан до НДФЛ. Налог зависит от совокупного процентного дохода и других условий, поэтому автоматически не рассчитывается.'],
  ['Где сохраняются мои расчёты?', 'Последние параметры каждого калькулятора сохраняются в этом браузере. Их можно сбросить в форме. Вычисления выполняются на устройстве, финансовые параметры не передаются на сервер и не попадают в адрес страницы.'],
];
export function Landing() {
  const result = calculateSavings(example);
  return <main id="main-content" className={styles.landing}>
    <section className={styles.hero} aria-labelledby="hero-title"><div className={styles.heroCopy}><p className="eyebrow">Финансовые калькуляторы · ₽</p><h1 id="hero-title">Сначала посчитайте.<br />Потом решайте.</h1><p className={styles.description}>Понятные расчёты для ваших денег: сколько принесут сбережения, во сколько обойдётся кредит и есть ли выгода от карты.</p><div className={styles.actions}><Link className={styles.button} href="#calculators">Выбрать калькулятор <span aria-hidden="true">↗</span></Link><span>Без регистрации.<br />На ваших условиях.</span></div></div>
    <aside className={styles.example} aria-label="Пример расчёта накопительного счёта"><div className={styles.exampleHead}><span>◉ Накопительный счёт</span><span>Пример</span></div><p className={styles.caption}>Капитал к концу периода</p><p className={styles.exampleNumber}>{formatMoney(result.capital)}</p><p className={styles.gain}>+{formatMoney(result.earnedInterest)} дохода до НДФЛ</p><div className={styles.exampleBars} aria-hidden="true">{[18, 31, 44, 57, 70, 83, 100].map(height => <span key={height} style={{ height: `${height}%` }} />)}</div><div className={styles.chartDates}><span>1 октября</span><span>31 октября 2026</span></div><dl className={styles.exampleTerms}><div><dt>Начальная сумма</dt><dd>{formatMoney(example.openingBalance)}</dd></div><div><dt>Ставка</dt><dd>12% годовых</dd></div><div><dt>Срок</dt><dd>31 день</dd></div></dl><p className={styles.exampleNote}>Ежедневный остаток, выплата и капитализация 31 октября. Без операций. Дата окончания 1 ноября не включена. Столбики иллюстрируют рост.</p></aside></section>
    <section id="calculators" className={styles.products}><div className={styles.sectionHeading}><h2>Четыре способа<br />посчитать заранее</h2><p>Выберите задачу.<br />Условия задаёте вы.</p></div><div className={styles.productGrid}>{(Object.keys(calculatorContent) as CalculatorKind[]).map((kind, index) => <Link key={kind} href={`/calculators/${kind}`} className={styles.productCard}><span className={styles.productIcon} aria-hidden="true">{['↗', '≈', '÷', '⇄'][index]}</span><h3>{calculatorContent[kind].short}</h3><p>{calculatorContent[kind].description}</p><span className={styles.cardAction}>Рассчитать <span aria-hidden="true">↗</span></span></Link>)}</div></section>
    <section className={styles.principles}><h2>Цифры, за которыми<br /><em>всё понятно.</em></h2><div>{[['Ваши условия', 'Ставки, даты и операции вводятся вручную. Можно проверить именно свой сценарий.'], ['Видно, из чего сложился итог', 'Проценты, взносы, комиссии, график и полная таблица остаются перед глазами.'], ['Данные остаются у вас', 'Расчёт происходит в браузере. Без регистрации, банковских подключений и сторонней аналитики.']].map(([title, text], index) => <div className={styles.principle} key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div></div>)}</div></section>
    <section id="faq" className={styles.faq}><div><p className="eyebrow">Перед расчётом</p><h2>Частые вопросы</h2><Link href="/methodology">Подробнее о методике ↗</Link></div><div>{faq.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Процент', description: 'Финансовые калькуляторы вклада, накопительного счёта, кредита и карты со счётом.', inLanguage: 'ru' }) }} />
  </main>;
}
