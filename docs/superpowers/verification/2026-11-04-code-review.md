# Final whole-branch review

Range: `95f8f57..13c4467`. Reviewer: `/root/final_review`. Read-only review of the supplied full-context package `review-95f8f57..13c4467.diff`, in passes, against the approved design, implementation plan and binding rulings in `progress.md`. No subagents, code changes, index/HEAD changes, build, full-suite repeat, push or deployment.

## Strengths

- Financial engines are separate from React and consistently use a private 80-digit decimal constructor. Cash movements, accrual, payout, capitalization and money formatting remain separate. The account reconciliation identities are maintained, including pending interest and externally paid interest.
- Deposit opening/maturity conventions, original monthly anniversaries, savings exclusive end, month-end payout and monthly minimum all match the stated models. Same-date cash aggregation, duplicate-rate rejection and effective-date changes are coherent.
- The card comparison shares the savings engine, preserves the same initial capital and purchase, applies fees to cash and interest bases, and subtracts them once from extra income. It does not spend pending/external interest or display successful-strategy profit on a deficit. Repayment and comparison-end dates are distinct.
- Loan principal is capped to remaining debt and the final payment clears rounding residue. Fees are separate from interest; the monthly model and exclusions are disclosed.
- Form drafts preserve raw editable strings; normalization and validation precede calculation and storage. Invalid edits clear results. Exceptions remain recoverable through editing or reset. Restoration precedes saving; reset is per tool and storage exceptions are guarded.
- Financial parameters remain in local component state/localStorage, without form submission, financial URL parameters, analytics or calculation network calls. Server content and metadata are meaningful, domain-dependent, and do not invent a public canonical. The ordinary share-image route avoids automatic localhost metadata.
- Tests contain independent numerical fixtures and cash invariants, not only implementation-shaped assertions. Verification records distinguish terminal checks, controller CUA, prior-stage observations and unverified boundaries.

## Issues

### Critical

None.

### Important

None.

### Minor

1. **Chart date labels shrink to approximately 7px on a phone.**
   - Location: `src/components/calculators/balance-chart.tsx:16`, with sizing at `src/components/calculators/calculator.module.css:58`.
   - Reproduction: open the savings calculator at 360px. The chart's `viewBox` is 580 units wide, its rendered width is 286 CSS pixels, and its text remains `fontSize=14` SVG units. Its effective font size is therefore approximately `14 * 286 / 580 = 6.9px`. Focused CUA on the final production app returned SVG width 286 and label bounding-box height 7.5px for both `10.2026` labels. This affects all four charts and is also below 13–14px in the desktop two-column layout.
   - Effect: date labels are difficult to read, contrary to the approved larger typography and the requirement not to shrink explanatory text on phones. Monetary tables remain available, so this is a readability defect, not a calculation blocker.
   - Fix: render endpoint dates as ordinary HTML below the SVG at a fixed 13–14px, or otherwise preserve their rendered size while scaling the plot. Keep their relationship to the plotted first/last points and the existing accessible description.

2. **The shared muted text is too faint on the application's backgrounds.**
   - Location: `src/app/globals.css:5`; examples of affected use: `src/components/calculators/calculator.module.css:21` and `src/components/site/site.module.css:30`.
   - Reproduction/evidence: `--muted: #6e7b70` is used for normal-size text on `--paper:#f7f6ef`, `--white:#fffef8`, and `--soft:#e9ede2`. Independent sRGB relative-luminance calculation gives contrast ratios 4.10:1,4.39:1 and 3.74:1 respectively, below a 4.5:1 normal-text accessibility target. The example note is 13px on the soft background; field help is 14px on white.
   - Effect: explanatory text and limitations can be difficult to read for users with reduced contrast sensitivity. Increasing the overall typography does not remedy contrast.
   - Fix: darken the muted token until it reaches at least 4.5:1 on the darkest of those three intended text backgrounds, and visually check the existing hierarchy. This can remain a small palette change.

## Verification considered

Read the actual test assertions for money, dates, validation, deposit, savings, loan, card, storage, result context and SEO. Read `docs/superpowers/verification/2026-11-04-financial-calculator.md`, `task-7-report.md` and the actual production-HTML verification script. The reports identify 147 passing tests, successful typecheck/build, six SSR-page checks and the configured-domain fixture, plus controller CUA on four calculator flows at 360/1366. These are prior observed execution evidence, not new reviewer-run passes.

The only new focused UI investigation was the chart date-label sizing doubt above. A new hidden CUA tab was opened on the final production savings route, measured at 360px, then closed; its temporary viewport override was reset. No financial input was changed. The only new terminal computation was the contrast-ratio calculation. No unanswered arithmetic doubt justified rerunning the full suite or build.

Additional edge review: supported ISO-year overflow in a loan is caught by the hook and displays a recoverable calendar error rather than corrupting money; unusual tiny-loan rounded-zero payments are intentional and explicitly tested. Maximum savings precision, long horizons, totals/row consistency and same-date card repayments were checked against their actual assertions and source. No new issue was found in those paths.

## Recommendations

Address the two small display issues together. Verify actual rendered chart-date size at 360px and the desktop two-column layout, and recompute the muted color ratios on all three backgrounds. No financial model changes or expanded full-suite repetition are warranted by these findings.

## Declined to judge

- Matching every bank's accrual, cutoff, business-day, tier, penalty and grace-period rules: intentionally excluded by the explicit manual models and visible caveats; this review judges implementation against those models.
- Automatic NDFL, regulated PSK, early loan payoff, insurance, delinquency, cashback and repeated card cycles: explicitly outside version 1.
- Export/print/download, login, cloud history, bank integrations and live-rate selection: expressly excluded; checked that the app does not promise them.
- Public hosting, domain ownership, live indexing and ranking: no public domain/hosting has been authorized. Reviewed conditional metadata and the real fixture evidence instead.
- Full browser network capture and browser-level disabled-storage behavior: the tooling did not provide that evidence; source/clean-URL and storage exception tests support only the documented narrower claims.
- Native mobile keyboard availability of a minus sign for signed savings operations: no real mobile OS keyboard was available in the supplied or focused CUA evidence. `inputMode=decimal` alone does not establish that a specific device blocks withdrawal entry; no speculative defect is asserted.
- Independent re-verification of banking links as current legal/tariff advice and a fresh dependency-vulnerability audit: this is an implementation/integration review of explicit illustrative models, not a legal, bank-product or supply-chain audit. No claim of current tariff accuracy or security certification is made.

## Assessment

**Ready to merge? Yes, with two non-blocking readability improvements recommended.**

The completed branch follows the approved models and has credible arithmetic, dataflow, recovery, privacy and production verification evidence. No Critical or Important defect was found; the two concrete Minor findings concern rendered chart typography and muted-text contrast.

## Closure after consolidated fix wave

Both Minor findings were fixed in e8640d7; artifact-only cleanup fe77988 did not alter source. A fresh scoped reviewer accepted both fixes with no new breakage. Parent production CUA confirmed chart dates14CSSpx at360/1366 and no page overflow; contrast is5.19/5.57/4.73 on the three intended surfaces. Controller final full suite passed147/147 across11files, exit0. There are no parked or unresolved review findings. See the Russian verification and decisions records alongside this file for execution evidence and scope boundaries.
