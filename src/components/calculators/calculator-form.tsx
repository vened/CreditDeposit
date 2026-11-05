'use client';
import { useEffect, useState } from 'react';
import type { CalculatorKind, Inputs, SavingsTerms } from '@/lib/finance/types';
import { defaults } from '@/content/calculators';
import { validateInput } from '@/lib/finance/validation';
import { useCalculator } from '@/hooks/use-calculator';
import { FormField, FormSection } from './form-field';
import { EventEditor } from './event-editor';
import { RecurringTopUpEditor } from './recurring-top-up-editor';
import { CardPlanningFields, type CardPlanningDraft } from './card-planning-fields';
import { RateEditor } from './rate-editor';
import { ResultPanel } from './result-panel';
import styles from './calculator.module.css';
type Draft = Inputs['deposit'] | Inputs['savings'] | CardPlanningDraft | (Omit<Inputs['loan'], 'months'> & { months: string });
const toDraft = (input: Inputs[CalculatorKind]): Draft => 'months' in input ? { ...input, months: String(input.months) } : 'repaymentDay' in input ? { ...input, repaymentDay: String(input.repaymentDay) } : input;
export function CalculatorForm({ kind }: { kind: CalculatorKind }) {
  const calculator = useCalculator(kind, defaults[kind]);
  const [draft, setDraft] = useState<Draft>(() => toDraft(defaults[kind]));
  useEffect(() => { if (calculator.restored) setDraft(toDraft(calculator.input)); }, [calculator.restored]);
  function change(next: Draft) {
    setDraft(next);
    const raw = 'months' in next ? { ...next, months: /^\d+$/.test(next.months) ? Number(next.months) : NaN } : 'repaymentDay' in next ? { ...next, repaymentDay: /^\d+$/.test(next.repaymentDay) ? Number(next.repaymentDay) : NaN } : next;
    const checked = validateInput(kind, raw);
    if (checked.ok) calculator.setInput(checked.value); else calculator.invalidate(checked.issues);
  }
  function field(label: string, path: string, value: string, onChange: (value: string) => void, extra: Partial<React.ComponentProps<typeof FormField>> = {}) {
    return <FormField label={label} path={path} value={value} onChange={onChange} issues={calculator.issues} {...extra} />;
  }
  function termsFields(terms: SavingsTerms, update: (value: SavingsTerms) => void, prefix = '') {
    return <>
      {field('Годовая ставка, %', `${prefix}annualRate`, terms.annualRate, annualRate => update({ ...terms, annualRate }), { hint: 'От 0 до 1000%, до 6 знаков после запятой.' })}
      {field('Начислять проценты', `${prefix}basis`, terms.basis, basis => update({ ...terms, basis: basis as SavingsTerms['basis'], payout: basis === 'monthly-min' ? 'monthly' : terms.payout }), { options: [{ value: 'daily', label: 'На ежедневный остаток' }, { value: 'monthly-min', label: 'На минимальный остаток за месяц' }] })}
      {field('Выплата процентов', `${prefix}payout`, terms.payout, payout => update({ ...terms, payout: payout as SavingsTerms['payout'] }), { hint: terms.basis === 'monthly-min' ? 'Для минимального остатка — только раз в месяц.' : 'В конце каждого дня или календарного месяца.', options: [{ value: 'monthly', label: 'Ежемесячно' }, { value: 'daily', label: 'Ежедневно', disabled: terms.basis === 'monthly-min' }] })}
      {terms.basis === 'monthly-min' && field('Неполные месяцы', `${prefix}partialMonths`, terms.partialMonths, partialMonths => update({ ...terms, partialMonths: partialMonths as SavingsTerms['partialMonths'] }), { options: [{ value: 'actual', label: 'Учитывать фактические дни' }, { value: 'exclude', label: 'Не начислять проценты' }] })}
      <label className={styles.checkbox}><input type="checkbox" checked={terms.capitalize} onChange={event => update({ ...terms, capitalize: event.target.checked })} /> Капитализация процентов</label><p className={styles.helper}>Выплаченные проценты {terms.capitalize ? 'остаются на счёте и участвуют в начислении.' : 'выводятся отдельно и не участвуют в начислении.'}</p>
    </>;
  }
  const account = 'openingBalance' in draft ? draft : null;
  const loan = 'principal' in draft ? draft : null;
  const card = 'ownFunds' in draft ? draft : null;
  return <div className={styles.layout}>
    <form className={styles.form} onSubmit={event => event.preventDefault()} noValidate>
      <div className={styles.formTitle}><h2>Ваши условия</h2><span>₽ · Россия</span></div>
      <fieldset className={styles.fields} disabled={!calculator.restored}>
        {account && <>
          {field('Начальная сумма, ₽', 'openingBalance', account.openingBalance, openingBalance => change({ ...account, openingBalance }), { hint: 'До 1 трлн ₽. Можно вводить пробелы и запятую.' })}
          <div className={styles.row}>{field('Дата начала', 'startDate', account.startDate, startDate => change({ ...account, startDate }), { type: 'date' })}{field(kind === 'deposit' ? 'Дата окончания включительно' : 'Дата окончания, не включая', 'endDate', account.endDate, endDate => change({ ...account, endDate }), { type: 'date' })}</div>
          {'basis' in account ? termsFields(account, terms => change({ ...account, ...terms })) : <>
            {field('Годовая ставка, %', 'annualRate', account.annualRate, annualRate => change({ ...account, annualRate }), { hint: 'От 0 до 1000%, до 6 знаков после запятой.' })}
            {field('Выплата процентов', 'payout', account.payout, payout => change({ ...account, payout: payout as 'monthly' | 'maturity' }), { options: [{ value: 'maturity', label: 'В конце срока' }, { value: 'monthly', label: 'Ежемесячно' }] })}
            <label className={styles.checkbox}><input type="checkbox" checked={account.capitalize} onChange={event => change({ ...account, capitalize: event.target.checked })} /> Капитализация процентов</label><p className={styles.helper}>Выплаченные проценты {account.capitalize ? 'прибавляются к остатку.' : 'выводятся отдельно.'}</p>
          </>}
          <FormSection title="Пополнения, снятия и изменения ставок"><EventEditor rows={account.events} onChange={events => change({ ...account, events })} startDate={account.startDate} issues={calculator.issues} positive={kind === 'deposit'} /><RateEditor rows={account.rateChanges} onChange={rateChanges => change({ ...account, rateChanges })} startDate={account.startDate} issues={calculator.issues} /></FormSection>
          <p className={styles.helper}>До 10 лет. Фактические дни и 365/366 дней в году. {kind === 'deposit' ? 'Вклад допускает только пополнения.' : 'Снятия не могут делать остаток отрицательным.'}</p>
        </>}
        {loan && <>
          {field('Сумма кредита, ₽', 'principal', loan.principal, principal => change({ ...loan, principal }), { hint: 'Больше нуля, до 1 трлн ₽.' })}
          <div className={styles.row}>{field('Годовая ставка, %', 'annualRate', loan.annualRate, annualRate => change({ ...loan, annualRate }))}{field('Срок, месяцев', 'months', loan.months, months => change({ ...loan, months }), { hint: 'Целое число от 1 до 600.' })}</div>
          {field('Дата выдачи', 'issuedOn', loan.issuedOn, issuedOn => change({ ...loan, issuedOn }), { type: 'date' })}
          {field('Схема погашения', 'scheme', loan.scheme, scheme => change({ ...loan, scheme: scheme as 'annuity' | 'differentiated' }), { options: [{ value: 'annuity', label: 'Аннуитетная — равные платежи' }, { value: 'differentiated', label: 'Дифференцированная — равный основной долг' }] })}
          <FormSection title="Комиссии">{field('Разовая комиссия, ₽', 'upfrontFee', loan.upfrontFee, upfrontFee => change({ ...loan, upfrontFee }))}{field('Ежемесячная комиссия, ₽', 'monthlyFee', loan.monthlyFee, monthlyFee => change({ ...loan, monthlyFee }))}</FormSection>
          <p className={styles.helper}>Месячная модель: годовая ставка / 12. Первая выплата через месяц после выдачи. Регулируемая ПСК не рассчитывается.</p>
        </>}
        {card && <>
          {calculator.legacyCardInput && <p className={styles.resultNote} role="status">Модель расчёта обновилась: теперь расходы задаются по месяцам. Новые поля заполнены примером. Данные прежнего расчёта сохранены в этом браузере и не переносились автоматически.</p>}
          <CardPlanningFields value={card} onChange={change} issues={calculator.issues} />
          <h3 className={styles.subheading}>Условия накопительного счёта</h3>{termsFields(card.savings, savings => change({ ...card, savings }), 'savings.')}
          <FormSection title="Пополнения, комиссии, погашения и изменения ставок">
            <EventEditor rows={card.topUps} onChange={topUps => change({ ...card, topUps })} path="topUps" startDate={card.startDate} issues={calculator.issues} positive topUps />
            <RecurringTopUpEditor rows={card.recurringTopUps} onChange={recurringTopUps => change({ ...card, recurringTopUps })} startDate={card.startDate} issues={calculator.issues} />
            {field('Комиссии карты за весь период, ₽', 'fees', card.fees, fees => change({ ...card, fees }), { hint: 'Общая сумма за весь горизонт. Списывается один раз в конечную дату до начисления процентов.' })}
            <EventEditor rows={card.repayments} onChange={repayments => change({ ...card, repayments })} path="repayments" startDate={card.startDate} issues={calculator.issues} positive repayments />
            <RateEditor rows={card.savings.rateChanges} onChange={rateChanges => change({ ...card, savings: { ...card.savings, rateChanges } })} path="savings.rateChanges" startDate={card.startDate} issues={calculator.issues} />
          </FormSection>
          <p className={styles.helper}>Расчёт — по выбранную дату включительно, максимум 10 лет. Долг на эту дату вычитается из капитала. Предполагается использование карты без процентов; условия льготного периода проверьте по договору.</p>
        </>}
      </fieldset>
      {calculator.issues.length > 0 && <div className={styles.issueSummary} role="alert"><strong>Проверьте условия расчёта</strong><ul>{calculator.issues.map((issue, index) => <li key={`${issue.path}-${index}`}>{issue.message}</li>)}</ul></div>}
      <div className={styles.actions}><span className={styles.helper}>Пересчёт автоматически</span><button type="button" className={styles.secondary} onClick={() => { calculator.reset(); setDraft(toDraft(defaults[kind])); }}>Сбросить данные</button></div>
      <p className={styles.helper}>Начальные значения — пример, не предложение банка. Параметры сохраняются только в этом браузере, если хранилище доступно.</p>
    </form>
    <ResultPanel kind={kind} input={calculator.input} result={calculator.result} />
  </div>;
}
