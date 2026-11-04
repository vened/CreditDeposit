# Financial Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Рабочее русскоязычное приложение «Процент» на Next.js: четыре финансовых калькулятора, понятный SEO-лендинг, графики и таблицы; без регистрации и экспорта.

**Architecture:** Серверные страницы Next.js App Router содержат индексируемые тексты. Формы в клиентских компонентах вызывают чистые TypeScript-модули с десятичной арифметикой. Параметры сохраняются только в браузере; один результат ядра питает все итоговые числа, графики и таблицы.

**Tech Stack:** Node.js 22 LTS, Next.js 16 / совместимые React 19 и React DOM, TypeScript 5, CSS Modules и глобальные токены, decimal.js, Vitest. SVG-графики без библиотеки. Точные совместимые версии закрепить lock-файлом после проверки реестра перед установкой; не использовать предварительные релизы. В окружении Node доступен в `/Users/max/.local/share/mise/installs/node/22.23.3/bin`, хотя отсутствует в исходном PATH.

**Spec:** `docs/superpowers/specs/2026-11-04-financial-calculator-design.md` — читать вместе с этим планом. Последнее прямое указание пользователя: экспорт исключён. Визуальный ориентир: `.superpowers/brainstorm/36598-1793797626/content/financial-calculator-concept-v3.html`; это макет, его фиксированные результаты не переносить в рабочий калькулятор.

## Global Constraints

- «Россия, русский язык, суммы в рублях»; «Ставки и условия вводятся вручную».
- «Первая версия без регистрации и личного кабинета»; данные не отправляются для вычисления на сервер.
- «Экспорт результатов не нужен — исключён по последнему прямому указанию пользователя»; никаких PDF-зависимостей, кнопок скачивания и обещаний экспорта.
- «Основной текст — 18 px, подписи полей и кнопки — 16–18 px, пояснения — 13–14 px без уменьшения на телефоне».
- «Базис — фактические дни и 365/366 дней соответствующего года» для накоплений; кредит использует явно обозначенную месячную модель `годовая / 12`.
- «Доход выводится до НДФЛ»; автоматического налога и регулируемой ПСК нет.
- «Период накоплений до 10 лет, кредит до 50 лет, не более 500 датированных событий».
- «Финансовые параметры не попадают в URL, аналитику или серверные логи приложения».
- «Первичная сдача — рабочий локальный Next.js-проект, инструкция запуска и проверенный production build»; публичное размещение не входит в эту сдачу.
- Реальный домен не задан: без `NEXT_PUBLIC_SITE_URL` не генерировать выдуманные canonical/sitemap URL; robots запрещает индексацию неподготовленного окружения.

## Review Focus

1. Русский ввод `100 000,50`, неразрывные пробелы, пустое поле и нечисловые значения: корректная нормализация или ошибка, никогда не молчаливый ноль (Task 1).
2. Выплата процентов одновременно с пополнением/снятием: нет процентов на собственную выплату в тот же день; минимальный остаток определяется до выплаты процентов (Task 2).
3. Очень малая сумма кредита и большой срок: нет отрицательного долга, переплаты основного долга или отрицательного последнего платежа (Task 3).
4. Карта: средств хватает на долг, но не на комиссию; невыплаченные проценты не могут закрыть дефицит (Task 4).
5. Повреждённые/устаревшие сохранённые данные и недоступное localStorage: приложение остаётся работоспособным; невалидный новый ввод не оставляет старую прибыль как актуальный результат (Task 5).

## File Structure and Interfaces

Структура создаётся в текущем проекте; существующие `docs/` и макеты сохраняются. Изоляцию и Git-контекст проверить при начале исполнения по соответствующему навыку. Сейчас репозиторий не инициализирован; отсутствие remote не является препятствием для локальной реализации.

- `src/lib/finance/{types,dates,money,validation}.ts` — типы, календарь, десятичные суммы и проверка параметров.
- `src/lib/finance/{savings,deposit,loan,credit-card}.ts` — независимые от React модели.
- `src/lib/finance/*.test.ts` — контрольные примеры и инварианты денежных потоков.
- `src/lib/{format,storage,site}.ts` — форматирование, проверяемое локальное хранение, URL сайта.
- `src/components/site/` — шапка, навигация, подвал, лендинг.
- `src/components/calculators/` — оболочка, четыре формы, строки операций, результаты, SVG-график, таблица.
- `src/hooks/use-calculator.ts` — восстановление/сохранение, валидация и пересчёт без устаревшего результата.
- `src/content/{calculators,methodology}.ts` — видимые объяснения, начальные параметры, SEO-тексты и методика.
- `src/app/` — layout, global styles, лендинг, четыре конкретных маршрута калькуляторов, методика, robots/sitemap и OG-изображение.

Все суммы и ставки передаются в ядро нормализованными десятичными строками с точкой. `Money` в результатах имеет ровно 2 знака; внутренние начисления — Decimal повышенной точности. Все календарные операции работают через проверенный ISO `YYYY-MM-DD`, не через локальный часовой пояс.

```ts
type ISODate = string;
type Money = string;
type CalculatorKind = 'deposit' | 'savings' | 'loan' | 'credit-card';
type CashEvent = { date: ISODate; amount: Money }; // signed; вклад допускает только > 0
type RateChange = { date: ISODate; annualRate: string };
type SavingsTerms = {
  annualRate: string; basis: 'daily' | 'monthly-min';
  payout: 'daily' | 'monthly'; capitalize: boolean;
  partialMonths: 'actual' | 'exclude'; rateChanges: RateChange[];
};
type SavingsInput = SavingsTerms & {
  openingBalance: Money; startDate: ISODate; endDate: ISODate; events: CashEvent[];
};
type DepositInput = {
  openingBalance: Money; annualRate: string; startDate: ISODate; endDate: ISODate;
  payout: 'monthly' | 'maturity'; capitalize: boolean;
  events: CashEvent[]; rateChanges: RateChange[];
};
type LoanInput = {
  principal: Money; annualRate: string; months: number; issuedOn: ISODate;
  scheme: 'annuity' | 'differentiated'; upfrontFee: Money; monthlyFee: Money;
};
type CardInput = {
  ownFunds: Money; purchaseAmount: Money; creditLimit: Money;
  purchaseDate: ISODate; repaymentDate: ISODate; fees: Money;
  repayments: { date: ISODate; amount: Money }[]; savings: SavingsTerms;
};
type MonthRow = {
  month: string; days: number; openingBalance: Money; netFlow: Money;
  minimumBalance: Money; earnedInterest: Money; paidInterest: Money;
  pendingInterest: Money; closingBalance: Money;
};
type AccountResult = {
  earnedInterest: Money; paidInterest: Money; pendingInterest: Money;
  paidExternally: Money; closingBalance: Money; netContributions: Money;
  capital: Money; months: MonthRow[];
};
type LoanRow = {
  date: ISODate; principal: Money; interest: Money; fee: Money;
  payment: Money; balance: Money;
};
type LoanResult = {
  firstPayment: Money; lastPayment: Money; totalInterest: Money;
  totalFees: Money; overpayment: Money; totalPaid: Money; rows: LoanRow[];
};
type CardResult = {
  viable: boolean; deficit: Money; cardFunded: Money; debtAtRepayment: Money;
  comparisonEndDate: ISODate; availableAtRepayment: Money;
  baseline: AccountResult; strategy: AccountResult | null;
  extraInterest: Money | null; netBenefit: Money | null;
};
type Inputs = { deposit: DepositInput; savings: SavingsInput; loan: LoanInput; 'credit-card': CardInput };
type Results = { deposit: AccountResult; savings: AccountResult; loan: LoanResult; 'credit-card': CardResult };
type FieldIssue = { path: string; message: string };
type Validation<T> = { ok: true; value: T } | { ok: false; issues: FieldIssue[] };
```

Имена из этого блока — экспортируемые контракты `types.ts`; тестовые fixtures создаются явно в соответствующих тестах, не зависят от UI defaults. `capital = closingBalance + paidExternally + pendingInterest`; `earnedInterest = paidInterest + pendingInterest`. Остатки и потоки не суммировать второй раз при показе капитала.

## Task 1: Рабочий Next.js-каркас и надёжные денежные/календарные примитивы

**Files:** Create `package.json`, lockfile, `tsconfig.json`, `next-env.d.ts`, `next.config.ts`, `vitest.config.ts`, `.gitignore`, `.env.example`, `src/app/{layout.tsx,page.tsx,globals.css}`, `src/lib/finance/{types,dates,money,validation}.ts`, `src/lib/finance/{dates,money,validation}.test.ts`, `src/lib/format.ts`.

**Consumes:** описанные выше контракты и пустой проект. **Produces:** запускаемое Next.js-приложение; `parseDecimalInput(raw:string):string|null`, `money(value:Decimal.Value):Money`, `addDays(date:ISODate,n:number):ISODate`, `addMonthsClamped(date:ISODate,n:number):ISODate`, `daysBetween(a:ISODate,b:ISODate):number`, `daysInYear(date:ISODate):365|366`, `firstOfNextMonth(date:ISODate):ISODate`, `validateInput<K extends CalculatorKind>(kind:K,value:unknown):Validation<Inputs[K]>`.

- [ ] Создать минимальные конфиги Next.js/TypeScript/Vitest и установить только runtime `next`, `react`, `react-dom`, `decimal.js`, dev `typescript`, соответствующие `@types/*`, `vitest`. Проверить registry-версии на совместимость и отсутствие prerelease; записать точные версии и lockfile. Скрипты: `dev`, `build`, `start`, `test` (`vitest run`), `typecheck` (`tsc --noEmit`). Базовый layout с `lang="ru"`; `.gitignore` исключает `.next/`, `node_modules/`, `.superpowers/`, реальные `.env*`, оставляет `.env.example`.
- [ ] Добавить failing tests: `parseDecimalInput('100\u00a0000,50') === '100000.50'`, `parseDecimalInput('') === null`, `parseDecimalInput('12abc') === null`, `parseDecimalInput('Infinity') === null`; `daysBetween('2024-02-28','2024-03-01') === 2`; прибавление 1 и 2 месяцев к 31 января даёт 28 февраля и 31 марта 2026 года. Не накапливать сдвиг даты от укороченного февраля.
- [ ] Запустить `npm test -- src/lib/finance/dates.test.ts src/lib/finance/money.test.ts src/lib/finance/validation.test.ts` и получить падение из-за отсутствующих функций.
- [ ] Реализовать примитивы и валидацию: денежный диапазон 0…1 000 000 000 000 RUB, ставка 0…1000%, максимум два знака у входной суммы и шесть у ставки; кредит principal >= 0.01, months 1…600; период накоплений >0 и <=10 календарных лет. Не принимать неверные даты, дубликаты изменений ставки, события вне периода и >500 событий суммарно. Запретить `monthly-min` + `daily`; пополнения вклада только положительные; параметры карты ограничить теми же сроком/суммами, покупка <= собственных средств. Сообщения на русском, пути ошибок стабильны.
- [ ] Повторить целевые тесты; затем `npm run typecheck` и `npm run build`. Настроить визуальные токены из одобренного макета и размеры 18/16–18/13–14 px без тестов, дублирующих CSS. Сохранить этап в Git, если контекст позволяет коммит.

## Task 2: Вклад и накопительный счёт с календарными выплатами

**Files:** Create `src/lib/finance/{savings,deposit,calculation-error}.ts`, `src/lib/finance/{savings,deposit}.test.ts`.

**Consumes:** Task 1 contracts and utilities. **Produces:** `calculateSavings(input:SavingsInput):AccountResult`, `calculateDeposit(input:DepositInput):AccountResult`; ошибки отрицательного остатка — типизированная `CalculationError extends Error` из `calculation-error.ts` с публичными `date:ISODate`, `deficit:Money` и конструктором `(date:ISODate,deficit:Money)`, не NaN.

- [ ] Записать failing tests с независимыми константами: 100000 RUB, 12%, накопления `[2026-10-01,2026-10-31)` без капитализации дают `earnedInterest='986.30'`, `paidInterest='0.00'`, `pendingInterest='986.30'`, `closingBalance='100000.00'`; окончание `2026-11-01` включает выплату за 31 октября. Вклад `2026-10-01`…`2026-10-31` даёт `986.30` с выплатой в конце.
- [ ] Добавить тесты: 36600 под 1% на один день февраля 2024 даёт `1.00`; 100000 под синтетические 36.5% за два дня января при ежедневной выплате/капитализации даёт `200.10`, при месячной — `200.00` невыплаченного дохода. Пополнение вклада 100000 в первый из двух процентных дней даёт `300.00`, а не `400.00`, при исходных 100000 и 36.5%.
- [ ] Добавить тесты минимального остатка: январь 2026, 100000, 36.5%, снятие 50000 16 января, окончание 1 февраля: daily доход `2300.00`, monthly-min `1550.00`; в `partialMonths='exclude'` неполный месяц даёт `0.00`. Смена ставки, смена года, операция в дату выплаты, отсутствие капитализации и снятие до нуля проверяются отдельно. Для monthly-min доход вычисляется как минимум до выплаты × сумма дневных ставок за учитываемые дни.
- [ ] Запустить `npm test -- src/lib/finance/savings.test.ts src/lib/finance/deposit.test.ts` и зафиксировать ожидаемые падения.
- [ ] Реализовать ядро: обход календарных дней, независимые даты выплаты, месячный minimum по остаткам после пользовательских операций до процентной выплаты; выплаты увеличивают базу со следующего дня. Для partialMonths проверять полноту календарного месяца, а не условные 30 дней. У вклада выплатить накопленный остаток процентов в maturity, у счёта не выплачивать досрочно. При выплате округлять half-up до копеек и обнулять выплаченное начисление.
- [ ] Довести тесты до PASS, проверить денежные инварианты `capital` и `earnedInterest` из контракта, выполнить `npm test`; сохранить этап при доступном Git.

## Task 3: Кредитный график без остаточного долга

**Files:** Create `src/lib/finance/loan.ts`, `src/lib/finance/loan.test.ts`.

**Consumes:** `LoanInput`, money/dates. **Produces:** `calculateLoan(input:LoanInput):LoanResult`.

- [ ] Записать failing tests: 120000, 0%, 12 месяцев без комиссий — 12 платежей по `10000.00`, переплата `0.00`, конечный долг `0.00`; 100000, 12%, 12 месяцев annuity — первый платёж `8884.88`; 120000, 12%, 12 месяцев differentiated — первый `11200.00`, последний `10100.00`, проценты всего `7800.00`.
- [ ] Дополнить проверки: разовая комиссия1000 + ежемесячная100 за12месяцев = `totalFees='2200.00'`; комиссия выдачи входит в `totalPaid`, но не в тело долга и не искажает первый регулярный платёж. Для principal0.01 /600months/0% график не содержит отрицательных значений, сумма principal ровно0.01, финальный balance0.00. Даты 31января →28февраля →31марта.
- [ ] Запустить `npm test -- src/lib/finance/loan.test.ts`, получить RED.
- [ ] Реализовать месячные annuity/differentiated, округление платежей и процентов до копеек, ограничение компонента principal оставшимся долгом, финальную корректировку. Нулевые платежи при экстремально малом долге допустимы до финального закрытия. Не называть расчёт ПСК.
- [ ] Повторить целевой тест до PASS и `npm test`; сохранить этап при доступном Git.

## Task 4: Честное сравнение кредитной карты и оплаты своими деньгами

**Files:** Create `src/lib/finance/credit-card.ts`, `src/lib/finance/credit-card.test.ts`.

**Consumes:** Task 2 `calculateSavings`, `CardInput`. **Produces:** `calculateCreditCard(input:CardInput):CardResult`.

- [ ] Записать failing tests на синтетических 36.5% без капитализации: ownFunds100000, purchase100000, limit100000, purchaseDate2026-01-01, repaymentDate2026-01-11, fees0, daily/monthly — baseline доход0, strategy доход1000, netBenefit1000, горизонт `comparisonEndDate='2026-02-01'`. При limit0 чистая выгода0; при monthly-min с теми же датами выгода0, потому что остаток января падает до0.
- [ ] Добавить тест: промежуточное погашение50000 6января уменьшает доход стратегии до750; ownFunds100100, purchase100000, fees100 даёт baseline доход3.10, strategy доход1001.00, разницу доходов997.90 и чистую выгоду897.90. Комиссия уменьшает базу начиная с даты погашения: в baseline оставшиеся100 зарабатывают ещё21день после10дней использования карты, в strategy эти деньги списаны как комиссия. Отдельно fees2000 при ownFunds100000, purchase100000, месячной выплате даёт `viable=false`, `deficit='2000.00'`, `netBenefit=null`: невыплаченные1000 не доступны для погашения.
- [ ] Дополнить проверки частичного лимита, отрицательной выгоды, запрета платежей сверх долга, одинаковой даты нескольких платежей, полного досрочного закрытия через список платежей и выплаты процентов в последний день месяца горизонта. График задолженности не уходит в минус; полный расчётный горизонт не теряет последний день.
- [ ] Запустить `npm test -- src/lib/finance/credit-card.test.ts`, получить RED.
- [ ] Построить два `SavingsInput` с одним начальным капиталом и одинаковой покупкой. В strategy учитывать непокрытую лимитом часть покупки, все промежуточные платежи, окончательный остаток долга и комиссию утром даты погашения. Даты/операции прослеживаются до исходного ввода. При дефиците вернуть честный неуспешный результат со strategy/null и без прибыли успешной стратегии; отрицательный остаток не передавать в savings как допустимый. При успехе сверить `netBenefit = strategy.earnedInterest - baseline.earnedInterest - fees = strategy.capital - baseline.capital`.
- [ ] Довести тесты до PASS, выполнить весь `npm test`; сохранить этап при доступном Git.

## Task 5: Четыре работающие формы, результаты и локальное восстановление

**Files:** Create `src/lib/storage.ts`, `src/lib/storage.test.ts`, `src/hooks/use-calculator.ts`, `src/content/calculators.ts`, `src/components/calculators/{calculator-shell,deposit-form,savings-form,loan-form,credit-card-form,event-editor,rate-editor,result-panel,balance-chart,schedule-table,form-field}.tsx`, CSS Modules рядом с компонентами; `src/app/calculators/{deposit,savings,loan,credit-card}/page.tsx`.

**Consumes:** exports Tasks 1–4. **Produces:** рабочие маршруты и `useCalculator<K extends CalculatorKind>(kind:K,defaults:Inputs[K]): { input:Inputs[K]; setInput:(value:Inputs[K])=>void; invalidate:(issues:FieldIssue[])=>void; result:Results[K]|null; issues:FieldIssue[]; reset:()=>void; restored:boolean }`. Сырые строки редактируемых полей хранятся в формах; ядро получает нормализованные значения только после проверки. Для невалидных сырых полей форма вызывает `invalidate`, который явно обнуляет актуальный result. Сохранение разрешено только после завершения восстановления и для валидных параметров; начальные defaults не перезаписывают сохранённый ввод до его чтения.

- [ ] Записать failing tests storage: `loadInput(kind,storage)` возвращает null при повреждённом JSON, version!=1, неверной схеме или исключении getItem; валидный version1 roundtrip сохраняет поля; `clearInput(kind,storage)` не удаляет ключ другого калькулятора; save не бросает при quota error. Контракты `loadInput<K>(kind:K,storage:StorageLike):Inputs[K]|null`, `saveInput<K>(kind:K,input:Inputs[K],storage:StorageLike):boolean`, `clearInput(kind:CalculatorKind,storage:StorageLike):boolean`; `StorageLike` — Pick<Storage,'getItem'|'setItem'|'removeItem'>.
- [ ] Запустить `npm test -- src/lib/storage.test.ts`, получить RED, затем реализовать version1 envelope `{version:1,input}` под ключами `procent:v1:<kind>`, валидацию восстановленного ввода и перехват ошибок.
- [ ] Реализовать формы с отдельными полями и ограничениями из spec. Базовые defaults: savings100000/12%/1октября–1ноября2026/daily-basis/monthly-payout/no-capitalization; deposit100000/12%/1октября–31октября2026/maturity/no-capitalization; loan120000/12%/12месяцев/annuity/fees0; card100000/покупка100000/лимит100000/1–11января2026/ставка12%/daily-basis/monthly/no-cap/fees0. Defaults — демонстрационные, не актуальные предложения банков. Добавить операции, смены ставок и промежуточные платежи в раскрываемых настройках; сброс данных работает независимо для каждого инструмента.
- [ ] Реализовать результаты из единого Result: счёт/вклад с разделением капитала/остатка/выплаченных/невыплаченных процентов; кредит с комиссиями отдельно; карта с baseline/strategy и явным убытком/дефицитом. SVG показывает подписанные даты и RUB, две серии карты имеют легенду; полная таблица доступна через details, не исчезает за урезанным preview. Широкие таблицы прокручиваются.
- [ ] Проверить через CUA на всех четырёх маршрутах: ввод меняет результат, очистка поля скрывает старый итог и показывает ошибку; минимальный остаток не допускает ежедневной выплаты; навигация/возврат сохраняют параметры; reset очищает только текущий инструмент; недоступный storage не мешает вычислениям. На 360px и широком экране нет горизонтальной прокрутки всей страницы; основной текст18, labels16–18, helpers13–14. Получить `npm test` и `npm run typecheck` PASS; сохранить этап при доступном Git.

## Task 6: Лендинг, методика и честные SEO-метаданные

**Files:** Create `src/components/site/{header,footer,landing}.tsx` и CSS Modules; `src/content/methodology.ts`, `src/lib/site.ts`, `src/lib/site.test.ts`, `src/app/methodology/page.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/share-image/route.ts`, `src/lib/og-image.tsx`; Modify `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css` и четыре calculator/page.tsx. Уточнение при реализации: обычный маршрут share-image вместо файлового OG-соглашения, поскольку последнее автоматически добавляет localhost при отсутствии домена; изображение подключается к метаданным только после настройки публичного URL.

**Consumes:** утверждённый v3-макет, формы Task 5. **Produces:** шесть индексируемых содержательных страниц (лендинг, 4 калькулятора, методика); `getSiteUrl(envValue:string|undefined):URL|null`, `buildPageMetadata(path:string,title:string,description:string):Metadata`.

- [ ] Записать failing tests: getSiteUrl(undefined), '', javascript: URL, localhost и адрес с user/password →null; корректный HTTPS URL с завершающим `/` нормализуется; buildPageMetadata при отсутствии домена не выдаёт localhost или фиктивный canonical, при заданном корректном домене выдаёт правильный абсолютный canonical. Для локального URL допускается просмотр приложения, но не публичные SEO URL.
- [ ] Запустить `npm test -- src/lib/site.test.ts`, получить RED, реализовать site helper и метаданные. robots разрешает индексацию только при заданном публичном домене; sitemap возвращает6 актуальных маршрутов при домене и пустой список без него. Env `.env.example` документирует `NEXT_PUBLIC_SITE_URL` без фиктивного значения.
- [ ] Перенести видимый лендинг v3 в компоненты с настоящими Next Link на4 калькулятора, FAQ и описаниями ручного ввода/приватности/расшифровки. Без вкладок «Лендинг/Калькулятор» и ярлыков «Макет» из прототипа. Краткий пример на главной рассчитывается ядром, а не остаётся фиксированным независимо от условий. При этом главная не превращается в ещё одну тяжёлую форму.
- [ ] Добавить серверный текст каждой calculator page с уникальными title/description/H1, объяснением переменных и границ модели, ссылкой на методику. Методика явно описывает включение дней, момент операций, выплату/капитализацию, месячный минимум, модель кредита, карточный горизонт и допущения; доход доНДФЛ. Structured data только для видимого WebSite/SoftwareApplication без вымышленных рейтингов. OG генерируется локальными средствами Next.js, без внешнего шрифта/сетевого запроса при сборке.
- [ ] Получить PASS `npm test`, `npm run typecheck`, `npm run build`; проверить исходный серверный HTML всех6страниц: русский текст, уникальный H1/title, отсутствие обещаний скачивания. Просмотреть реальные ссылки, FAQ и клавиатурный фокус через CUA; сохранить этап при доступном Git.

## Task 7: Проверка готового приложения и инструкция запуска

**Files:** Create `README.md`, `docs/superpowers/verification/2026-11-04-financial-calculator.md`; Modify только файлы с найденными дефектами.

**Consumes:** Tasks 1–6. **Produces:** воспроизводимые команды запуска, список подтверждённых проверок/ограничений и рабочий production preview.

- [ ] Выполнить `npm test`, `npm run typecheck`, `npm run build`; ожидание — все тесты PASS, TypeScript без ошибок, production build успешен. При исправлении логического дефекта сначала добавить воспроизводящий тест, затем исправить и повторить затронутые проверки.
- [ ] Запустить production `npm run start -- --hostname 127.0.0.1 --port 3000` (свободный порт выбрать один раз, если3000занят); пользоваться CUA для UI, не устанавливать отдельный браузерный драйвер. Проверить главную и4 сценария с независимыми примерами плана, валидацию, операции, капитализацию, кредитную схему и отрицательную/невозможную карточную стратегию. Проверить reload и reset. Не выводить реальные пользовательские данные в артефакты проверки.
- [ ] Проверить ширины360px и1366px, крупный текст и таблицы, keyboard tab/focus, переключение FAQ, отсутствие браузерных console errors и сетевых запросов с финансовыми параметрами. Зафиксировать скриншоты ключевых экранов; вернуть viewport к исходному после проверки.
- [ ] README: требования Node>=22, `npm ci`, `npm run dev`, `npm test`, `npm run typecheck`, `npm run build`, `npm start`, домен/индексация, локальное хранение и удаление данных, границы финансовых моделей, отсутствие экспорта и автоматического налога. В verification записать реально выполненные команды/результаты и ограничения, не отмечать непроведённые проверки как пройденные.
- [ ] Провести независимое итоговое ревью по spec и плану, исправить существенные замечания, повторить только затронутые проверки. Показать локальное приложение в текущем чате, не заменять его HTML-макетом, не публиковать сайт без выбранного хостинга.

## Self-Review

- Spec coverage: четыре модели — Tasks2–4; правила операций/округления — Tasks1–4; UI/сохранение/доступность — Task5; лендинг/SEO/методика — Task6; готовый локальный запуск — Task7. Экспорт исключён везде.
- Type consistency: схемы Inputs/Results едины для ядра, hook и форм; месячный горизонт карты использует исключающую границу первого числа следующего месяца.
- Test coverage: все5 Review Focus привязаны к конкретным тестам/наблюдаемым UI-проверкам. Контрольные числа синтетические и независимы от продуктовых ставок.
- Proportion: план фиксирует интерфейсы и проверки, не содержит реализации функций. Скриншоты и production build делаются после настоящей реализации, а не подменяются проверкой прототипа.

## Technical References

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation) — ручная установка, scripts, требования к Node/TypeScript.
- [Next.js sitemap](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap) — официальный маршрут метаданных.
- Банковские первоисточники и оговорки моделей — в разделе10 spec. Калькулятор использует явно показанные модели, а не автоматически воспроизводит договор конкретного банка.
