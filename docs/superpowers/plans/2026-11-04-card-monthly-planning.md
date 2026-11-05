# Card Monthly Planning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace one-purchase card comparison with monthly spending budgets, editable months, recurring full repayment, and an inclusive final-date snapshot net of debt.

**Architecture:** Expand monthly budgets into dated expenses, then build the debt/credit-limit schedule and cash flows for both scenarios. Run each flow list independently through the unchanged savings engine; merge its month rows with debt snapshots to calculate net capital. Store a base monthly budget plus overrides rather than generated daily rows. Develop the new model alongside the live one, then connect it in Task 5.

**Tech Stack:** Next.js 16.4.5, React 19.3.1, TypeScript, decimal.js 10.6.0, Vitest 5.1.0. No additional dependencies.

**Spec:** `docs/superpowers/specs/2026-11-04-card-monthly-planning-design.md` — approved 2026-11-04.

## Global Constraints

- Preserve existing uncommitted top-up work; do not reset, overwrite unrelated edits, create a worktree, commit, push, or deploy without a separate request.
- Card calculator only; preserve all other calculators' financial rules, storage versions, and default chart labels.
- Inclusive start/end dates; one-day plans allowed; maximum duration is 10 calendar years, measured against the exclusive next-day boundary. Reject a terminal date with no representable following day.
- Amounts retain existing input bounds: 0 through 1,000,000,000,000 ₽, at most two decimal places; rates 0–1000%, at most six decimal places. Manual payments/top-ups remain strictly positive.
- Calendar-month budgets, uniform daily spending via rounded cumulative fractions; retain overrides even when equal to the base budget or outside the currently visible horizon. Maximum 500 saved overrides.
- Repayment day is an integer 1–31, default 31; clamp missing dates to the month's last day. Initial debt is zero. No grace-period verification, card interest, cashback, initial-debt field, bank integration, or export.
- Daily order: top-ups → expenses → manual repayments → automatic full repayment → final-date fees → account interest/payout. Overspending the available limit uses own funds; a shortage is reported, never financed externally.
- A 500-event limit applies to manual top-ups, generated recurring top-ups, manual repayments and rate changes combined. Generated spending and automatic repayments do not consume that budget. Reject overflow without truncation.
- Final snapshot includes the chosen date and deducts outstanding debt; do not extend to month end or force settlement. Pending/externally paid interest is capital, not cash available for repayment.
- Keep `procent:v1:credit-card` untouched on load/save; new card data uses `procent:v2:credit-card`, envelope version 2. Explicit card reset removes both. Other calculators keep version 1.
- Before any product code, read installed Next guides listed in Task 4, as required by `AGENTS.md`; this applies before Task 1 as well as later UI work.

## Review Focus

- A temporary date-range change or base-budget edit must not erase a customized month, including an explicit override equal to the former base amount — Task 1 assertions and Task 5 browser roundtrip.
- An invalid intermediate form value must preserve typed text, suppress stale results, and never crash a generated monthly preview — Task 4 render cases and Task 5 browser editing.
- A same-day interest payout cannot rescue an unaffordable payment; a previous month's capitalized payout can — Task 2 exact failure/success assertions.
- One scenario running out of cash must not suppress the other scenario's valid end state or produce a comparative profit — Task 2 independent failures and Task 4 result rendering.
- A long plan's generated daily spending may exceed 500 while external events retain their shared 500 cap; late-calendar bounds must fail without loops/throws — Tasks 1 and 3 boundary cases.

## File map and staging

- `src/lib/finance/types.ts`: add `CardPlanning*` types alongside the existing card types in Tasks 1–2; switch public `CardInput`/`CardResult` aliases only in Task 5.
- New `src/lib/finance/monthly-expenses.ts` and tests: calendar periods, budget overrides and exact daily expense expansion.
- New `src/lib/finance/card-planning-flows.ts` and tests: chronological debt, available credit, scheduled payments and account flows.
- New `src/lib/finance/card-planning.ts` and tests: reuse savings, return independent scenario outcomes and debt-adjusted month rows.
- `src/lib/finance/validation.ts` and new `card-planning-validation.test.ts`: add a standalone new-model validator without switching `validateInput` until Task 5.
- `src/lib/storage.ts` and new `storage-card-planning.test.ts`: isolated v2 card helpers; connect generic storage in Task 5.
- New `monthly-expense-editor.tsx`, `card-planning-fields.tsx`, `card-planning-result.tsx`, `card-schedule-table.tsx` under `src/components/calculators/`, plus focused render tests: new fields/results before live cutover.
- New `account-details.tsx`: share existing money/account/partial-month presentation without a circular import. `balance-chart.tsx`: optional capital labels, keeping balance defaults.
- Task 5 connects `calculator-form.tsx`, `result-panel.tsx`, `credit-card.ts`, `use-calculator.ts`, defaults, existing tests and page/methodology/README copy. Existing savings calculation code stays unchanged.

### Task 1: Monthly budgets and daily spending

**Files:** Modify `src/lib/finance/types.ts`; create `src/lib/finance/monthly-expenses.ts` and `monthly-expenses.test.ts`.

**Interfaces:** Add `CardPlanningInput = { ownFunds: Money; creditLimit: Money; startDate: ISODate; endDate: ISODate; monthlySpending: Money; spendingOverrides: Record<string, Money>; repaymentDay: number; fees: Money; repayments: CashEvent[]; topUps: CashEvent[]; recurringTopUps: RecurringTopUp[]; savings: SavingsTerms }`. Keep existing `Inputs` unchanged for now. Export from `monthly-expenses.ts`:

- `type MonthlyExpensePlan = Pick<CardPlanningInput, 'startDate' | 'endDate' | 'monthlySpending' | 'spendingOverrides'>`.
- `type PlanningMonth = { month: string; firstDate: ISODate; lastDate: ISODate; days: number; daysInMonth: number }`.
- `type MonthlyExpensePeriod = PlanningMonth & { budget: Money; spending: Money; overridden: boolean }`.
- `getPlanningMonths(startDate: ISODate, endDate: ISODate): PlanningMonth[]` for validated inclusive dates.
- `getMonthlyExpensePeriods(input: MonthlyExpensePlan): MonthlyExpensePeriod[]`.
- `expandMonthlyExpenses(input: MonthlyExpensePlan): CashEvent[]`, one nonnegative expense amount per included day, including zero amounts. No input mutation.

- [x] **Preflight: Read the installed Next guides listed in Task 4 before writing any code, unless already read in this execution context.** Confirm the existing dirty working tree so unrelated work remains intact.
- [x] **Step 1: Write failing tests for periods, overrides and exact cents.** Use complete input objects or a local typed fixture; the representative assertions are:

```ts
expect(expandMonthlyExpenses({ startDate: '2026-01-01', endDate: '2026-01-31', monthlySpending: '310', spendingOverrides: {} }))
  .toEqual(Array.from({ length: 31 }, (_, i) => ({ date: `2026-01-${String(i + 1).padStart(2, '0')}`, amount: '10.00' })));
expect(getMonthlyExpensePeriods({ startDate: '2026-11-16', endDate: '2026-11-30', monthlySpending: '60000', spendingOverrides: {} })[0])
  .toMatchObject({ month: '2026-11', days: 15, daysInMonth: 30, budget: '60000.00', spending: '30000.00', overridden: false });
expect(expandMonthlyExpenses({ startDate: '2026-01-16', endDate: '2026-01-16', monthlySpending: '0.01', spendingOverrides: {} }))
  .toEqual([{ date: '2026-01-16', amount: '0.01' }]);
```

Also assert: a full 0.01 ₽ month sums to 0.01 exactly; February 2028 has 29 days; a December/January range produces distinct year keys; changing base 310→620 preserves explicit `2026-01: '310'`; hiding/revealing that month preserves the original input map; zero budget works; a valid ten-year expansion exceeds 500 days without truncation.

- [x] **Step 2: Run `npm test -- src/lib/finance/monthly-expenses.test.ts`.** Expect failure because the module/interfaces do not exist.
- [x] **Step 3: Implement the exported helpers.** Use UTC date helpers and decimal.js. Daily cents are `round(A*d/D) - round(A*(d-1)/D)` with half-up rounding; use calendar day positions even when the first observed day is mid-month. Detect an override by own-property presence, not by whether its value differs from the base.
- [x] **Step 4: Run the new test file and existing date tests.** Command: `npm test -- src/lib/finance/monthly-expenses.test.ts src/lib/finance/dates.test.ts`. Expect all pass; no live calculator behavior changes yet.

### Task 2: Revolving debt, cash flows and comparable net capital

**Files:** Modify `types.ts`; create `card-planning-flows.ts`, `card-planning-flows.test.ts`, `card-planning.ts`, `card-planning.test.ts` in `src/lib/finance/`. Consume Task 1, existing `calculateSavings`, `CalculationError`, and `expandRecurringTopUps`.

**Interfaces:** Add the following types to `types.ts`:

- `CardPlanningMonthRow = MonthRow & { endDate: ISODate; spending: Money; topUps: Money; cardSpending: Money; ownFundsSpending: Money; manualRepayments: Money; automaticRepayments: Money; fees: Money; closingDebt: Money; capital: Money }`.
- `CardPlanningScenario = { ok: true; account: AccountResult; rows: CardPlanningMonthRow[]; debt: Money; capital: Money } | { ok: false; failure: { kind: 'insufficient-funds'; date: ISODate; deficit: Money } }`.
- `CardPlanningResult = { baseline: CardPlanningScenario; strategy: CardPlanningScenario; extraInterest: Money | null; netBenefit: Money | null }`.

Export `buildCardPlanningFlows(input: CardPlanningInput): CardPlanningFlows` from the flows module, with `CardPlanningFlows = { baseline: CashEvent[]; strategy: CashEvent[]; months: CardMonthFlows[] }` and `CardMonthFlows = Pick<CardPlanningMonthRow, 'month' | 'endDate' | 'spending' | 'topUps' | 'cardSpending' | 'ownFundsSpending' | 'manualRepayments' | 'automaticRepayments' | 'fees' | 'closingDebt'>`. Also export `CardRepaymentError extends Error` with constructor `(date: ISODate, index: number, requested: Money, debt: Money)` and corresponding public fields; `index` is the original manual-payment index. Export `calculateCardPlanning(input: CardPlanningInput): CardPlanningResult` from `card-planning.ts`; input is already validated.

- [x] **Step 1: Write failing flow tests.** Base fixture: own funds 1000, limit 1000, start `2026-01-01`, end `2026-01-31`, monthly spending 310, repayment day 31, fees 0, all event lists/maps empty, annual rate 0, daily basis/monthly payout/no capitalization/actual partial months. Pin these cases:

```ts
// End Jan 5, limit 25, repayment day 3: spend 10/day; Jan 3 uses 5 own funds then repays 25.
expect(buildCardPlanningFlows({ ...base, endDate: '2026-01-05', creditLimit: '25', repaymentDay: 3 }).months[0])
  .toMatchObject({ spending: '50.00', cardSpending: '45.00', ownFundsSpending: '5.00', automaticRepayments: '25.00', closingDebt: '20.00' });
// A manual 15 payment on Jan 3 leaves only 10 for the automatic payment.
expect(buildCardPlanningFlows({ ...base, endDate: '2026-01-03', creditLimit: '25', repaymentDay: 3, repayments: [{ date: '2026-01-03', amount: '15' }] }).months[0])
  .toMatchObject({ manualRepayments: '15.00', automaticRepayments: '10.00', closingDebt: '0.00' });
```

Assert a 26 payment in the latter scenario raises `CardRepaymentError` with index 0 and debt 25; unsorted manual rows retain the source index. A Jan–Mar plan with budgets 310/280/310 and day 31 has payments 310/280/310 on Jan31/Feb28/Mar31. Repeat in leap year. Manual and recurring same-day top-ups add in both flow lists. Fees appear exactly once on the inclusive final date; no automatic payment is appended beyond it. Zero limit uses only own funds; zero spending produces zero debt.

- [x] **Step 2: Run `npm test -- src/lib/finance/card-planning-flows.test.ts`.** Expect missing-module/type failure.
- [x] **Step 3: Implement `buildCardPlanningFlows`.** Walk dates chronologically, allocate daily expense against free credit, preserve original manual indices, and apply the spec's day order. Expand shared top-ups once through `addDays(endDate, 1)`. Output account events and month totals without calculating interest or imposing a limit on generated expense/payment rows.
- [x] **Step 4: Write failing scenario tests against `calculateCardPlanning`.** Using the base above with end Jan15 and rate 0:

```ts
expect(calculateCardPlanning({ ...base, endDate: '2026-01-15' })).toMatchObject({
  baseline: { ok: true, capital: '850.00' },
  strategy: { ok: true, debt: '150.00', capital: '850.00', account: { closingBalance: '1000.00' } },
  extraInterest: '0.00', netBenefit: '0.00',
});
// Daily basis, monthly payout, annual rate 36.5, fee 1 on Jan15.
expect(calculateCardPlanning({ ...base, endDate: '2026-01-15', fees: '1', savings: { ...base.savings, annualRate: '36.5' } }))
  .toMatchObject({ baseline: { capital: '863.80' }, strategy: { capital: '864.00' }, extraInterest: '1.20', netBenefit: '0.20' });
```

Add exact checks for the following:

- Jan1–Jan31, own funds 309.99, spending 310, day31, rate36.5/monthly payout/capitalization: strategy fails Jan31 by 0.01 although a payout was due later that day.
- Jan1–Feb1, budgets310/280, own funds310.70, day1, rate36.5/monthly/capitalization: strategy succeeds with closing balance0.02; baseline fails Feb1 by4.63. With capitalization off, strategy fails Feb1 by9.30. Profit stays null whenever either scenario fails.
- With own funds20, endJan3, spending10/day, day3, a Jan3 top-up10 allows both scenarios; moving it to Jan4 while extending end toJan4 cannot rescue the Jan3 deficit10.
- Own funds30.50, Jan1–Jan3, monthly310, day3, final fee1, rate0: baseline succeeds at0.50 and strategy fails Jan3 by0.50, with no comparative profit.
- For monthly-min/actual, Jan1–15, rate36.5, fee0: benefit2.25; monthly-min/exclude: benefit0. Test daily/monthly payouts and capitalization across a month boundary, existing rate-change timing, recurring top-ups, negative benefit, one-day horizons, and no mutation.
- Every successful row's capital equals closing balance plus cumulative external payouts plus pending interest minus debt. Final row equals scenario capital. When both succeed, capital difference equals `netBenefit` and earned-interest difference minus fees, to the cent.

- [x] **Step 5: Run both new engine test files.** Expect scenario tests to fail until the new calculation entry point exists.
- [x] **Step 6: Implement `calculateCardPlanning`.** Pass each flow list to unchanged `calculateSavings` with inclusive end converted to next day. Catch only `CalculationError` independently for each scenario; propagate programmer/invalid-repayment errors. Merge month totals with savings rows; baseline has zero card debt, payments and fees, and owns all spending. Compute cumulative externally paid interest only when capitalization is off. Comparative metrics are null unless both scenarios succeed.
- [x] **Step 7: Run the new engine suites and existing savings/recurrence suites.** Command: `npm test -- src/lib/finance/card-planning-flows.test.ts src/lib/finance/card-planning.test.ts src/lib/finance/savings.test.ts src/lib/finance/recurring-top-ups.test.ts`. Expect all pass without changing savings behavior.

### Task 3: New-model validation and lossless storage separation

**Files:** Modify `src/lib/finance/validation.ts` and `src/lib/storage.ts`; create `src/lib/finance/card-planning-validation.test.ts` and `src/lib/storage-card-planning.test.ts`.

**Interfaces:** Export `validateCardPlanningInput(value: unknown): Validation<CardPlanningInput>` alongside existing `validateInput`. Reuse `InputCheck`, Task 1 helpers and Task 2's `buildCardPlanningFlows`/`CardRepaymentError`; no validation/engine circular dependency. Add `loadCardPlanningInput(storage: StorageLike): CardPlanningInput | null`, `saveCardPlanningInput(input: CardPlanningInput, storage: StorageLike): boolean`, `clearCardPlanningInput(storage: StorageLike): boolean`, and `hasLegacyCardInput(storage: StorageLike): boolean` to `storage.ts`. Existing generic card storage remains unchanged until Task 5.

- [x] **Step 1: Write failing validation cases.** Assert normalization of `'60 000,50'`; zero amounts; explicit/historical hidden month overrides; source field paths `monthlySpending`, `spendingOverrides.2026-11`, `repaymentDay`, `endDate`, and `repayments.0.amount`. Reject invalid month keys, nonobject/array overrides, negatives, excessive precision/amount, more than500 overrides, noninteger/out-of-range payment days, invalid dates, reverse dates and a final `9999-12-31`. Accept same-day start/end and exactly ten calendar years using an exclusive next-day boundary; reject one additional day.

Include these boundary assertions:

```ts
expect(validateCardPlanningInput({ ...base, startDate: '2026-01-01', endDate: '2035-12-31' }).ok).toBe(true);
expect(paths(validateCardPlanningInput({ ...base, startDate: '2026-01-01', endDate: '2036-01-01' }))).toContain('endDate');
expect(paths(validateCardPlanningInput({ ...base, creditLimit: '25', endDate: '2026-01-03', repaymentDay: 3, repayments: [{ date: '2026-01-03', amount: '26' }] })))
  .toContain('repayments.0.amount');
```

Also assert: expenses may exceed opening own funds; events/rates on the inclusive final date are accepted and next-day ones rejected; recurring explicit end stays inclusive. Exactly500 external occurrences succeeds and501 fails with a field error. A ten-year plan without external events succeeds despite thousands of generated expenses/payments. Do not run expansion on invalid dates/recurrence rows.

- [x] **Step 2: Run `npm test -- src/lib/finance/card-planning-validation.test.ts`.** Expect new validator unavailable.
- [x] **Step 3: Implement `validateCardPlanningInput`.** Normalize declared fields, validate override keys using a real calendar month, bound hidden overrides, derive exclusive end safely, share the 500-event count, and validate manual overpayments against the chronological debt schedule only after structural validation succeeds. Map `CardRepaymentError.index` to the original payment amount field. Do not add a purchase-vs-opening-funds restriction.
- [x] **Step 4: Write failing storage tests.** Save/restore complete new conditions including hidden/equal-valued overrides and both kinds of top-up; saving repeatedly never stores expanded events. Assert v2 envelope version2 at `procent:v2:credit-card`; a v1-only record causes new load to return null and legacy detection true; v2 saving preserves v1 byte-for-byte. Malformed v2 and storage exceptions return null/false safely. Clearing card planning removes both card keys and preserves loan/deposit keys. Existing loan v1 behavior remains unchanged.
- [x] **Step 5: Run `npm test -- src/lib/storage-card-planning.test.ts`.** Expect missing helpers or wrong version behavior.
- [x] **Step 6: Implement the four new storage helpers.** Validate before save and after parse; avoid automatic legacy conversion, persistence of generated rows, or writes during load/legacy detection.
- [x] **Step 7: Run both new suites plus existing validation/storage tests.** Command: `npm test -- src/lib/finance/card-planning-validation.test.ts src/lib/storage-card-planning.test.ts src/lib/finance/validation.test.ts src/lib/storage.test.ts`. Expect all pass while live wiring still uses the old model.

### Task 4: Editable month fields and debt-adjusted results

**Files:** Create `src/components/calculators/monthly-expense-editor.tsx`, `card-planning-fields.tsx`, `card-planning-fields.test.ts`, `card-planning-result.tsx`, `card-planning-result.test.ts`, `card-schedule-table.tsx`, `account-details.tsx`; modify `result-panel.tsx` only to reuse extracted presentation helpers, and `balance-chart.tsx`/`calculator.module.css` as needed.

**Interfaces:** Export `type CardPlanningDraft = Omit<CardPlanningInput, 'repaymentDay'> & { repaymentDay: string }` and `CardPlanningFields({ value, onChange, issues }: { value: CardPlanningDraft; onChange: (value: CardPlanningDraft) => void; issues: FieldIssue[] })`. It renders own funds, limit, horizon, base monthly budget, month editor and repayment day; savings/events/fees remain in the parent form for Task5. Export `MonthlyExpenseEditor({ value, onChange, issues }: { value: MonthlyExpensePlan; onChange: (overrides: Record<string, Money>) => void; issues: FieldIssue[] })`, `CardPlanningResultPanel({ input, result }: { input: CardPlanningInput; result: CardPlanningResult })`, and `CardScheduleTable({ rows, title }: { rows: CardPlanningMonthRow[]; title: string })`. Extend `BalanceChart` with optional `metric?: 'balance' | 'capital'`, default `'balance'`.

- [x] **Step 1: Confirm installed documentation was read before implementation (read it now in a fresh execution context):** `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md`, `01-app/01-getting-started/05-server-and-client-components.md`, `01-app/02-guides/forms.md`, and `01-app/02-guides/testing/vitest.md` (all under the same docs root). Use client components for callbacks; retain the current browser-local calculation model.
- [x] **Step 2: Write failing render tests using existing `renderToStaticMarkup`/Vitest tooling.** The fields must show labels `Дата начала`, `Дата окончания расчёта включительно`, `Средние траты в месяц, ₽`, `Число полного погашения` and a row for every observed month, with `Вернуть к средней` only for explicit overrides. A custom month remains visible at its own amount when base changes; a partial month's actual spending/days are explained. Invalid raw dates, an empty budget, `'abc'` in an override and an empty payment day render without throwing; typed values and matching field errors remain visible. Never use a bogus numeric preview in place of invalid text.
- [x] **Step 3: Run `npm test -- src/components/calculators/card-planning-fields.test.ts`.** Expect missing component failure.
- [x] **Step 4: Implement the fields/editor in existing form styles.** Use validated dates for month skeletons and guarded numeric previews; keep raw editable strings. Updating base changes only base; editing a month creates an explicit map entry; reset-to-average deletes only that entry. Do not prune hidden overrides. Explain monthly rather than whole-horizon budget and the 31st-day clamp.
- [x] **Step 5: Write failing result tests from Task2 engine outputs.** Assert inclusive chosen-date label, debt150 and capital850 for the zero-rate Jan15 fixture; no mandatory final-settlement date or one-purchase labels. Verify the SVG description uses month-row net capital rather than the raw savings balance. Show scenario/date/deficit and the surviving scenario when the other fails, without a comparative profit. Retain partial-month savings context and distinguish pending/external interest from cash. Verify the final partial-month table's end date.
- [x] **Step 6: Run `npm test -- src/components/calculators/card-planning-result.test.ts`.** Expect missing component failure.
- [x] **Step 7: Implement results/table and shared presentation helpers.** Move existing `MoneyRow` and `AccountDetails` unchanged to `account-details.tsx`; expose `PartialMonthContext({ terms }: { terms: SavingsTerms | null })` there so both old/new result branches can use it without circular imports. New result uses capital-mode chart series from successful scenario rows. Table columns cover observed month/end date, spending, top-ups, manual/automatic repayment, fees, interest, closing account balance, debt and capital. Preserve old chart labels for other callers. Display comparative figures only when both scenarios succeed.
- [x] **Step 8: Run new component tests and existing result-panel tests.** Command: `npm test -- src/components/calculators/card-planning-fields.test.ts src/components/calculators/card-planning-result.test.ts src/components/calculators/result-panel.test.ts`. Expect all pass before live cutover.

### Task 5: Switch the live calculator, update explanations and verify the complete flow

**Files:** Modify `src/lib/finance/types.ts`, `credit-card.ts`, `credit-card.test.ts`, `validation.ts`, `validation.test.ts`, `src/lib/storage.ts`, `storage.test.ts`, `src/hooks/use-calculator.ts`, `src/components/calculators/calculator-form.tsx`, `calculator-form.test.ts`, `result-panel.tsx`, `result-panel.test.ts`, `event-editor.tsx`, `src/content/calculators.ts`, `src/content/methodology.ts`, `README.md`. Reuse Task1–4 outputs; do not retain a selectable legacy product mode.

**Interfaces:** Public `CardInput = CardPlanningInput` and `CardResult = CardPlanningResult`; `Inputs['credit-card']`/`Results['credit-card']` use them. `calculateCreditCard(input: CardInput): CardResult` delegates to `calculateCardPlanning`. Generic `validateInput('credit-card', value)` delegates to `validateCardPlanningInput`; generic storage delegates to Task3's card helpers. `useCalculator` exposes `legacyCardInput: boolean` (always false for other kinds). All other public calculator contracts stay unchanged.

- [x] **Step 1: Update integration tests to the new approved behavior and observe failures.** Replace one-purchase-only expectations, preserving meaningful regression coverage for shared/manual/recurring top-ups, exact money, payment affordability, rate timing and partial-month context. Use explicit old-format objects only in legacy-storage tests. Assert generic card validation/storage produce the new model, generic loan/deposit/savings still roundtrip v1, and card reset clears both versions only. Form markup must contain monthly planning labels and both existing top-up editors, and omit `Стоимость покупки`, `Дата покупки`, `Дата погашения`.
- [x] **Step 2: Run affected integration test files.** Command: `npm test -- src/lib/finance/credit-card.test.ts src/lib/finance/validation.test.ts src/lib/storage.test.ts src/components/calculators/calculator-form.test.ts src/components/calculators/result-panel.test.ts`. Expect failures under the live old model.
- [x] **Step 3: Switch aliases and calculation/validation/storage entry points together.** Update fixtures and generic defaults. New example: ownFunds300000, limit100000, Nov1 2026 through Jan31 2027 inclusive, monthlySpending60000, no overrides/events/fees, repaymentDay31, rate12/daily basis/monthly payout/no capitalization/actual partial months. Remove obsolete one-purchase type members and computation; keep tests of the old record's preservation rather than claiming equivalent legacy calculations.
- [x] **Step 4: Integrate form drafts and result delegation.** In `CalculatorForm`, add `CardPlanningDraft` to the draft union; convert numeric payment day to string in `toDraft` and parse only digits back for validation (invalid raw text becomes NaN for validation, not a silently accepted default). Render Task4 fields, retaining existing savings, top-up, recurrence, manual payment, fee and rate editors with `startDate` as their initial date. Event/rate bounds use inclusive end. `ResultPanel` delegates the card branch to `CardPlanningResultPanel`; keep invalid-result empty state and existing noncard branches.
- [x] **Step 5: Connect legacy notice and copy.** On restoration, show `legacyCardInput` only when no valid v2 plan loads and the old key exists. Explain that the model changed, current new fields are an example and old browser data remains; never claim it was converted. Clear the notice on explicit reset or adopting new conditions. Change editor hints, calculator description, page explanation, methodology and README from a single purchase/end-of-repayment-month to budgets, daily spending, monthly full repayment and inclusive end state net of debt. State the final-date one-time fee rule and distinguish full monthly budgets from partial-month actual spending. Preserve existing recurrence and savings explanations where applicable.
- [x] **Step 6: Run the complete automated checks.** First `npm test`; then `npm run typecheck`; then `npm run build`. Every command must exit0; record actual counts/results. Fix failures before moving on and avoid changing noncard expectations to mask regressions.
- [ ] **Step 7: Verify the real browser form and persistence.** **Blocked by computer-use URL policy; not claimed as executed.** Automated rendering/storage checks and production server checks passed; details in `docs/superpowers/verification/2026-11-04-card-monthly-planning.md`. Use available browser/computer tools against a local preview, not an unsolicited deployment. Set Nov1 2026–Jan31 2027, base60000, override Dec75000; change base to65000 and confirm Nov/Jan65000, Dec75000. Hide/reveal December by date edits, reload, and confirm its override and existing one-off/recurring top-ups persist. Reset December to average. Exercise an empty/invalid amount then correct it; stale results must disappear without losing typed text. Set end mid-month and confirm proportional expenses, nonzero terminal debt and capital net of debt. Check day31 and day1, narrow/mobile layout, keyboard labels, and a legacy-key notice without overwriting that key. Re-run storage tests after any fixes.
- [x] **Step 8: Get an independent final code review of financial semantics and complete verification.** Review the final diff against the approved spec, including existing dirty top-up changes retained in the combined result. Address actionable findings and repeat only affected tests plus any required final checks after changes. Record verification in `docs/superpowers/verification/2026-11-04-card-monthly-planning.md`. Do not commit or publish without a separate request.

## Plan self-review and execution handoff

- Spec coverage: monthly editing/partial periods → Tasks1/4; debt/repayment/fees/capital/failures → Task2; limits/storage/legacy handling → Task3; live behavior/explanations/preservation of other calculators → Task5.
- Type/signature consistency: staging types stay `CardPlanning*` until Task5 public aliases switch; helpers return inclusive period dates and nonnegative expense amounts, while account cash flows are signed. Scenario failures have no invented final-date state.
- Review Focus: each of the five failure classes above has an owning task and specific tests/browser steps. No new dependency or generic savings-engine rewrite is needed.
- Recommendation: native execution in this chat, followed by an independent final review. The five tasks share model and result interfaces closely; keeping implementation in one context avoids repeated handoffs, and the financial behavior has explicit tests before cutover. User chooses the execution method after reviewing this plan.
