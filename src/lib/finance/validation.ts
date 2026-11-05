import { addDays, addMonthsClamped, isISODate } from './dates';
import { buildCardPlanningFlows, CardRepaymentError } from './card-planning-flows';
import { FinanceDecimal, parseDecimalInput } from './money';
import { expandRecurringTopUps } from './recurring-top-ups';
import type { CalculatorKind, CardPlanningInput, CashEvent, FieldIssue, Inputs, RateChange, RecurringTopUp, SavingsTerms, Validation } from './types';

type ObjectValue = Record<string, unknown>;
const MAX_AMOUNT = '1000000000000';
const MAX_EVENTS = 500;

function isObject(value: unknown): value is ObjectValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

class InputCheck {
  readonly issues: FieldIssue[] = [];

  issue(path: string, message: string): void { this.issues.push({ path, message }); }

  object(value: unknown, path: string): ObjectValue {
    if (isObject(value)) return value;
    this.issue(path, 'Ожидается набор параметров расчёта');
    return {};
  }

  decimal(value: unknown, path: string, options: { rate?: boolean; signed?: boolean; positive?: boolean } = {}): string {
    const normalized = typeof value === 'string' ? parseDecimalInput(value) : null;
    if (normalized === null) {
      this.issue(path, 'Введите число, например 100 000,50');
      return '0';
    }
    const precision = options.rate ? 6 : 2;
    if ((normalized.split('.')[1]?.length ?? 0) > precision) {
      this.issue(path, `Допустимо не более ${precision} знаков после запятой`);
    }
    const number = new FinanceDecimal(normalized);
    const maximum = options.rate ? '1000' : MAX_AMOUNT;
    if (!number.isFinite() || number.abs().gt(maximum) || (!options.signed && number.lt(0)) || (options.positive && number.lte(0))) {
      this.issue(path, options.rate ? 'Ставка должна быть от 0 до 1000%' : `Сумма должна быть ${options.positive ? 'больше нуля и ' : 'от 0 '}до 1 000 000 000 000 ₽`);
    }
    return normalized;
  }

  date(value: unknown, path: string): string {
    if (isISODate(value)) return value;
    this.issue(path, 'Укажите существующую дату в формате ГГГГ-ММ-ДД');
    return '';
  }

  choice<T extends string>(value: unknown, path: string, allowed: readonly T[]): T {
    if (typeof value === 'string' && allowed.includes(value as T)) return value as T;
    this.issue(path, 'Выберите допустимый вариант');
    return allowed[0];
  }

  boolean(value: unknown, path: string): boolean {
    if (typeof value === 'boolean') return value;
    this.issue(path, 'Выберите, включена ли капитализация');
    return false;
  }

  list(value: unknown, path: string): unknown[] {
    if (Array.isArray(value)) return value;
    this.issue(path, 'Ожидается список операций');
    return [];
  }

  period(start: string, end: string, endPath: string, message = 'Период должен быть больше нуля и не превышать 10 календарных лет'): void {
    if (!start || !end) return;
    // A valid date near the end of the ISO calendar has less than ten years available.
    let maximum = '9999-12-31';
    try { maximum = addMonthsClamped(start, 120); } catch { /* bounded by supported calendar */ }
    if (end <= start || end > maximum) this.issue(endPath, message);
  }

  within(date: string, start: string, end: string, inclusiveEnd: boolean, path: string): void {
    if (date && start && end && (date < start || (inclusiveEnd ? date > end : date >= end))) {
      this.issue(path, 'Дата операции должна находиться в пределах расчётного периода');
    }
  }

  count(cash: unknown[], rates: unknown[], path: string): void {
    if (cash.length + rates.length > MAX_EVENTS) this.issue(path, 'Допустимо не более 500 датированных событий суммарно');
  }

  cashEvents(values: unknown[], path: string, start: string, end: string, inclusiveEnd: boolean, positive: boolean): CashEvent[] {
    return values.slice(0, MAX_EVENTS).map((value, index) => {
      const prefix = `${path}.${index}`;
      const row = this.object(value, prefix);
      const date = this.date(row.date, `${prefix}.date`);
      this.within(date, start, end, inclusiveEnd, `${prefix}.date`);
      return { date, amount: this.decimal(row.amount, `${prefix}.amount`, { positive, signed: !positive }) };
    });
  }

  rateChanges(values: unknown[], path: string, start: string, end: string, inclusiveEnd: boolean): RateChange[] {
    const seen = new Set<string>();
    return values.slice(0, MAX_EVENTS).map((value, index) => {
      const prefix = `${path}.${index}`;
      const row = this.object(value, prefix);
      const date = this.date(row.date, `${prefix}.date`);
      this.within(date, start, end, inclusiveEnd, `${prefix}.date`);
      if (date && seen.has(date)) this.issue(`${prefix}.date`, 'На одну дату допустимо только одно изменение ставки');
      seen.add(date);
      return { date, annualRate: this.decimal(row.annualRate, `${prefix}.annualRate`, { rate: true }) };
    });
  }

  recurringTopUps(values: unknown[], start: string, end: string): RecurringTopUp[] {
    return values.slice(0, MAX_EVENTS).map((value, index) => {
      const path = `recurringTopUps.${index}`;
      const row = this.object(value, path);
      const startDate = this.date(row.startDate, `${path}.startDate`);
      const endDate = row.endDate === '' ? '' : this.date(row.endDate, `${path}.endDate`);
      this.within(startDate, start, end, false, `${path}.startDate`);
      this.within(endDate, start, end, false, `${path}.endDate`);
      if (startDate && endDate && endDate < startDate) {
        this.issue(`${path}.endDate`, 'Последнее пополнение не может быть раньше первого');
      }
      return {
        amount: this.decimal(row.amount, `${path}.amount`, { positive: true }),
        startDate, endDate,
        frequency: this.choice(row.frequency, `${path}.frequency`, ['daily', 'weekly', 'monthly']),
      };
    });
  }

  savingsTerms(row: ObjectValue, prefix: string, start: string, end: string, rates: unknown[]): SavingsTerms {
    const path = (key: string) => `${prefix}${key}`;
    const basis = this.choice(row.basis, path('basis'), ['daily', 'monthly-min']);
    const payout = this.choice(row.payout, path('payout'), ['daily', 'monthly']);
    if (basis === 'monthly-min' && payout === 'daily') this.issue(path('payout'), 'Для минимального остатка доступна только ежемесячная выплата');
    return {
      annualRate: this.decimal(row.annualRate, path('annualRate'), { rate: true }), basis, payout,
      capitalize: this.boolean(row.capitalize, path('capitalize')),
      partialMonths: this.choice(row.partialMonths, path('partialMonths'), ['actual', 'exclude']),
      rateChanges: this.rateChanges(rates, path('rateChanges'), start, end, false),
    };
  }
}

export function validateCardPlanningInput(value: unknown): Validation<CardPlanningInput> {
  const check = new InputCheck();
  const row = check.object(value, '');
  const startDate = check.date(row.startDate, 'startDate');
  const endDate = check.date(row.endDate, 'endDate');
  let exclusiveEnd = '';
  if (endDate) {
    try { exclusiveEnd = addDays(endDate, 1); }
    catch { check.issue('endDate', 'Дата окончания выходит за пределы календаря'); }
  }
  check.period(startDate, exclusiveEnd, 'endDate', 'Период — от одного дня до 10 календарных лет');
  if (typeof row.repaymentDay !== 'number' || !Number.isInteger(row.repaymentDay) || row.repaymentDay < 1 || row.repaymentDay > 31) {
    check.issue('repaymentDay', 'Укажите целое число от 1 до 31');
  }
  const overrides = check.object(row.spendingOverrides, 'spendingOverrides');
  const entries = Object.entries(overrides);
  if (entries.length > MAX_EVENTS) check.issue('spendingOverrides', 'Допустимо не более 500 исправленных месяцев');
  const spendingOverrides = Object.fromEntries(entries.slice(0, MAX_EVENTS).map(([month, amount]) => {
    const path = `spendingOverrides.${month}`;
    if (!/^\d{4}-\d{2}$/.test(month) || !isISODate(`${month}-01`)) check.issue(path, 'Укажите существующий месяц в формате ГГГГ-ММ');
    return [month, check.decimal(amount, path)];
  }));
  const terms = check.object(row.savings, 'savings');
  const topUps = check.list(row.topUps, 'topUps');
  const recurringRows = check.list(row.recurringTopUps, 'recurringTopUps');
  const repayments = check.list(row.repayments, 'repayments');
  const rates = check.list(terms.rateChanges, 'savings.rateChanges');
  check.count(repayments, rates, 'repayments');
  check.count(topUps, [...repayments, ...rates], 'topUps');
  check.count(recurringRows, [], 'recurringTopUps');
  const normalized: CardPlanningInput = {
    ownFunds: check.decimal(row.ownFunds, 'ownFunds'), creditLimit: check.decimal(row.creditLimit, 'creditLimit'),
    startDate, endDate, monthlySpending: check.decimal(row.monthlySpending, 'monthlySpending'), spendingOverrides,
    repaymentDay: typeof row.repaymentDay === 'number' ? row.repaymentDay : 0, fees: check.decimal(row.fees, 'fees'),
    topUps: check.cashEvents(topUps, 'topUps', startDate, exclusiveEnd, false, true),
    repayments: check.cashEvents(repayments, 'repayments', startDate, exclusiveEnd, false, true),
    recurringTopUps: check.recurringTopUps(recurringRows, startDate, exclusiveEnd),
    savings: check.savingsTerms(terms, 'savings.', startDate, exclusiveEnd, rates),
  };
  if (!check.issues.length) {
    try {
      const generated = expandRecurringTopUps(normalized.recurringTopUps, exclusiveEnd);
      check.count([...topUps, ...generated], [...repayments, ...rates], 'recurringTopUps');
    } catch { check.issue('recurringTopUps', 'С учётом повторов допустимо не более 500 датированных событий суммарно'); }
  }
  if (!check.issues.length) {
    try { buildCardPlanningFlows(normalized); }
    catch (error) {
      if (!(error instanceof CardRepaymentError)) throw error;
      check.issue(`repayments.${error.index}.amount`, error.message);
    }
  }
  return check.issues.length ? { ok: false, issues: check.issues } : { ok: true, value: normalized };
}

export function validateInput<K extends CalculatorKind>(kind: K, value: unknown): Validation<Inputs[K]> {
  if (kind === 'credit-card') return validateCardPlanningInput(value) as Validation<Inputs[K]>;
  const check = new InputCheck();
  const row = check.object(value, '');
  let normalized: Inputs[CalculatorKind];

  if (kind === 'loan') {
    if (typeof row.months !== 'number' || !Number.isInteger(row.months) || row.months < 1 || row.months > 600) {
      check.issue('months', 'Срок кредита должен быть целым числом от 1 до 600 месяцев');
    }
    normalized = {
      principal: check.decimal(row.principal, 'principal', { positive: true }),
      annualRate: check.decimal(row.annualRate, 'annualRate', { rate: true }),
      months: typeof row.months === 'number' ? row.months : 0,
      issuedOn: check.date(row.issuedOn, 'issuedOn'),
      scheme: check.choice(row.scheme, 'scheme', ['annuity', 'differentiated']),
      upfrontFee: check.decimal(row.upfrontFee, 'upfrontFee'), monthlyFee: check.decimal(row.monthlyFee, 'monthlyFee'),
    };
  } else {
    const startDate = check.date(row.startDate, 'startDate');
    const endDate = check.date(row.endDate, 'endDate');
    check.period(startDate, endDate, 'endDate');
    const events = check.list(row.events, 'events');
    const rates = check.list(row.rateChanges, 'rateChanges');
    check.count(events, rates, 'events');
    const shared = {
      openingBalance: check.decimal(row.openingBalance, 'openingBalance'), startDate, endDate,
      events: check.cashEvents(events, 'events', startDate, endDate, kind === 'deposit', kind === 'deposit'),
    };
    normalized = kind === 'deposit' ? {
      ...shared, annualRate: check.decimal(row.annualRate, 'annualRate', { rate: true }),
      payout: check.choice(row.payout, 'payout', ['monthly', 'maturity']),
      capitalize: check.boolean(row.capitalize, 'capitalize'),
      rateChanges: check.rateChanges(rates, 'rateChanges', startDate, endDate, true),
    } : { ...shared, ...check.savingsTerms(row, '', startDate, endDate, rates) };
  }

  // Each branch builds only its declared calculator shape; the cast preserves the generic API.
  return check.issues.length ? { ok: false, issues: check.issues } : { ok: true, value: normalized as Inputs[K] };
}
