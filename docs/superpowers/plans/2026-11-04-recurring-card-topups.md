# Recurring card top-ups implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Allow recurring account deposits in the card comparison without entering every date manually.

**Architecture:** Persist recurrence rules, expand into dated CashEvents at calculation time, and merge with manual top-ups before all existing cash-flow calculations. Reuse existing form fields, editor layout and date helpers.

**Tech Stack:** Next.js 16.4.5, React 19, TypeScript, decimal.js, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-04-recurring-card-topups-design.md`

## Global Constraints

- Card calculator only; preserve existing uncommitted one-off top-up changes.
- Daily / weekly / monthly repetition; optional inclusive end date stored as empty string when absent.
- Keep 500 dated-event cap and 10-year period; reject rather than truncate.
- No new dependencies; read installed Next docs before UI code; no unsolicited commits or worktree moves.

## Review Focus

- January 31 → February 28 → March 31 and leap February 29.
- Same-day recurring and manual deposits add; repayment morning includes both.
- Last specified recurrence day included; comparison end excluded.
- Generated event count, not rule count, consumes the 500-event budget.
- Invalid/old saved input never throws or loses legitimate conditions.

### Task 1: Calendar expansion and engine

**Files:** `src/lib/finance/types.ts`, new `recurring-top-ups.ts` and `recurring-top-ups.test.ts`, `credit-card.ts`, `credit-card.test.ts`.

**Interfaces:** Export `RecurringTopUp = { amount: Money; startDate: ISODate; endDate: ISODate; frequency: 'daily' | 'weekly' | 'monthly' }`. Add `CardInput.recurringTopUps: RecurringTopUp[]`. Export `expandRecurringTopUps(rules: RecurringTopUp[], comparisonEnd: ISODate): CashEvent[]` with maximum 500 generated rows, throwing RangeError if exceeded. Input is already validated; each rule stays bounded by its end date and comparisonEnd.

- [x] Write and run failing tests for daily dates (Jan 1/2/3), weekly dates (Jan 1/8/15), monthly dates (Jan31/Feb28/Mar31; Jan31/Feb29/Mar31 in leap year), explicit inclusive end, comparison exclusive end, 501 generated rows, and engine cash availability/shared deposits.
- [x] Implement helper with original-date month offsets, integrate once into merged topUps array used by both scenarios and repayment cash check.
- [x] Run helper and engine tests; confirm no mutation and no old regression.

### Task 2: Validation, persistence and form

**Files:** `validation.ts` / tests, `storage.test.ts`, defaults and typed test fixtures, new `recurring-top-up-editor.tsx`, `calculator-form.tsx` / test, `methodology.ts`.

**Interfaces:** Consume Task 1 helper/type. Normalize absent rules to []; validate positive amounts, existing dates, supported frequency, start/end bounds and end >= start. Only expand validated rules; count generated occurrences together with manual topups, repayments and rate changes. Render field errors with paths `recurringTopUps.<index>.<field>` and cap error on `recurringTopUps`.

- [x] Write failing validation/persistence/form tests: normalized Russian amount, unsupported repeat, bad dates/amounts, end before start, combined 500/501 boundary, legacy restoration and save/reload without duplicate expansion.
- [x] Implement validation, defaults and separate editor with add/remove, monthly default, optional last date. Integrate after manual topups; update methodology to describe repeats and short months.
- [x] Run full `npm test`, `npm run typecheck`, `npm run build`; get independent code review; check refreshed browser form and rule fields. Saving and repeated restoration verified by storage tests.

## Verification

- 197/197 tests pass; TypeScript and production build pass.
- Independent review found no actionable issues.
- Local preview rebuilt and restarted at `http://127.0.0.1:3002/calculators/credit-card`.
- Firefox shows the recurring editor with amount, frequency, first/last dates, add/remove controls and field validation. Full interactive reload roundtrip was not repeated in the browser; storage tests cover saving/restoring rules without expansion or duplication.
- Existing branch and prior uncommitted changes retained. No commits or remote writes performed.
