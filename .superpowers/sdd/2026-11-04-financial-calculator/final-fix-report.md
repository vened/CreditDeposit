# Final readability fix wave

Base: `13c4467`. Scope: both Minor findings from `final-review.md`; no financial model, calculation, storage, data, feature or dependency changes. No subagents. Source and this report are committed together under `fix: preserve chart date size and muted text contrast`; the exact resulting commit ID is returned to the controller.

## RED: established failure evidence

- The final review's production CUA at 360px measured a 286px-wide SVG and 7.5px date-label bounding-box height. Its `viewBox` width was 580 and SVG text font size was 14 units. The independently recomputed effective font was `14 * 286 / 580 = 6.903448275862069px`, below the required 13–14px explanatory text size. This affects the shared chart on all calculator routes.
- Independent Python sRGB relative-luminance computation reproduced the old `#6e7b70` muted token's contrast against paper `#f7f6ef`: **4.097866617329613:1**, white `#fffef8`: **4.393977386933703:1**, soft `#e9ede2`: **3.7370035669005706:1**. All fail the 4.5:1 normal-text target.
- Read binding constraints and AGENTS instructions, bundled Next accessibility guide, and bundled `01-app/01-getting-started/11-css.md` before writing source. (The first guessed guide path `02-guides/styling.md` did not exist; the actual bundled CSS guide was located and read.)

## Changes and self-review

- `src/components/calculators/balance-chart.tsx`: endpoint dates are ordinary HTML spans below the SVG, retaining the same first/last date expressions and full `DD.MM.YYYY` formatting. Removed only the SVG text nodes; SVG viewBox height goes from 220 to 184 to remove the old label band. Plotted x/y coordinates, paths, circles, monetary values and series remain unchanged. The role, title, description linkage, full date/value description, point titles, visible ruble units, upper amount and legend remain present.
- `src/components/calculators/calculator.module.css`: `.chartDates` fixes the labels at **14 CSS px**, line-height 1.6, with a 12px gap and 4.137931% inline padding. The padding equals `24/580 * 100%`, keeping the first label's left edge and last label's right edge aligned to the plot's x=24 and x=556 endpoints. Labels therefore do not shrink with SVG scale. The existing min-width:0 chart/layout and width:100% SVG remain in use; two 10-character dates fit the known 286px mobile chart width without requiring measurement machinery.
- `src/app/globals.css`: muted becomes **#5d6b5f**, retaining the subdued green family and remaining lighter than main ink `#173d32`. No individual text overrides or typography reductions.
- Reviewed all `var(--muted)` uses with `rg -n -- 'var\(--muted\)' src` and their surrounding classes/components. The hero descriptions/actions, product copy, principle copy, FAQ copy, footer, calculator eyebrow/bottom note inherit paper; form title/help and chart text use white; landing example caption/date/term/note uses soft. No muted use was found intended for the dark button or green active-navigation background. Existing `.error` explicitly overrides helper muted color.
- Read the complete three-file source diff after editing; `git diff --check` passed. No copied-markup or CSS-string mirror tests were added, per the scoped instruction. Existing result-context SSR tests plus actual color computation cover appropriate non-browser checks; controller owns rendered-size and visual hierarchy checks.

## GREEN: fresh worker verification

All Node commands used `export PATH=/Users/max/.local/share/mise/installs/node/22.23.3/bin:$PATH` first.

1. `npm test -- src/components/calculators/result-panel.test.ts`: exit **0**, **1 test file / 6 cases passed**. Covers savings/card partial-month context, separate repayment/comparison-end dates and invalid-state removal of old context/chart.
2. `npm run typecheck`: exit **0**, `tsc --noEmit`.
3. Independent Python contrast calculation read the actual `--muted`, `--paper`, `--white`, `--soft` values from `src/app/globals.css`, converted each sRGB channel to linear light (`v/12.92` if `v <= .04045`, else `((v+.055)/1.055)**2.4`), computed weighted luminance with `.2126, .7152, .0722`, then `(lighter+.05)/(darker+.05)`. It asserted every ratio >=4.5 and exited **0**. Results: paper **5.191434:1**, white **5.566566:1**, soft **4.734270:1**.
4. `npm run build`: exit **0**. Next **16.4.5** production compilation and TypeScript succeeded; **11/11** static pages generated, including all four calculators. No source changes after this final build.
5. `git diff --check`: exit **0**.

## Controller-owned remaining verification

The controller was notified that the production build is ready and owns restarting its existing 3001 production session and measuring the actual HTML labels at 360px and desktop, including endpoint alignment, overflow and hierarchy. The worker did not stop the controller's production session. The controller also owns the final 147-test full-suite run after scoped re-review; the worker did not repeat it. Browser measurements are not claimed by this report. No other concerns were found in the scoped self-review.
