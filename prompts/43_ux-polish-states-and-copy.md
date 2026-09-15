# Prompt 43 — UX polish: loading/empty/error states everywhere, toasts, confirm dialogs, 404/500, copy review, leftover placeholders

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §8.2 states, §8.5 copywriting, §14 placeholders policy, §11 (BUG-12 leftovers), §13 D17), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–42 are done; working tree clean; `npm install` run; `npm run dev` running.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
All modules exist; states were implemented per prompt but never audited together. `src/config/copy.js` holds some microcopy; other strings are scattered. `ErrorBoundary` (04), `NotFound` (26 wiring), `EmptyState`/`ErrorState`/skeletons (04), `ToastProvider` (04/12), `ConfirmDialog` (04/13). `MOCK_DELAY_MS` can simulate slow networks; stopping the mock simulates outages. `check:traces` catches HOM/hex leftovers; nothing catches lorem ipsum or "TODO" in copy — add checks.

## 2. Objective
When this prompt is finished every data-driven view (public and admin) has been audited with (a) `MOCK_DELAY_MS=1500` (skeletons match final layouts, no spinners-only pages, no CLS), (b) the mock stopped (error states with Retry; admin keeps the session; no redirect loops), (c) empty data (filters yielding zero; admin lists empty; new site with no featured/localities → sections hidden, not blank), (d) success/confirm/undo behaviour (toasts for every action, confirm dialogs for every destructive action with the item name, optimistic toggles with rollback), (e) 404/500 pages (branded, search + popular links on 404; ErrorBoundary with Reload/Go home), (f) copy review of every user-facing string (concise, benefit-led, India-specific vocabulary, no lorem ipsum, no "within 24 hours"-style promises unless from settings, consistent capitalisation "Sentence case", consistent CTA verbs), all microcopy centralised in `src/config/copy.js` (public) and `src/config/adminCopy.js` (admin), leftover placeholders removed or moved to the client checklist; `scripts/check-traces.js` extended with `lorem ipsum`, `TODO`, `FIXME`, `Coming in prompt`, `placeholder until`, `dummy` (case-insensitive) in `src/` strings; `docs/QA/43-states-and-copy-report.md` records the audit.

## 3. Scope
### Files to create
- `docs/QA/43-states-and-copy-report.md`, `src/config/adminCopy.js`
- Tests: `src/config/__tests__/copy.test.js` (no empty strings, no lorem, no "H.O.M"), `src/components/common/__tests__/ErrorBoundary.test.jsx`, `src/pages/public/__tests__/NotFound.test.jsx`
### Files to modify
- Any page/component needing state fixes or copy moves; `src/config/copy.js` (complete); `scripts/check-traces.js` (new patterns + an allow-list for the `prompts/` folder and docs); `src/components/common/ErrorBoundary.jsx`; `src/pages/public/NotFound.jsx`; `docs/*`
### Files to delete
- `src/components/admin/AdminPlaceholderPage.jsx` (no route may use it anymore — verify), any remaining `SectionPlaceholder`
### May also touch
- `mock-server` only to add a `GET /api/__chaos?status=500` — no: stop the mock instead

## 4. Detailed tasks
1. **State audit** — for each route (public + admin) run the four scenarios and record ✓/✗ in the report: loading (skeleton identical in height/columns; `aria-busy`; no layout jump when data arrives), error (`ErrorState` with the ApiError message and Retry; public: never redirects; admin: toast + inline state; auth pages unaffected), empty (contextual `EmptyState` with a CTA: listing → "Clear filters"/"View all in <locality>", shortlist → "Browse properties", admin lists → "Add your first …" (respecting `can()`), search suggestions → "No matches — search for '…'", dashboard → "No leads yet", SEO dashboard → "Nothing analysed yet — Re-analyse all"), success (toast wording consistent: "<Entity> saved", "<Entity> published", "<N> items updated", "Link copied"). Fix every gap.
2. **Destructive actions**: verify every delete/bulk delete/deactivate/lost/unassign uses `ConfirmDialog` with the item name and a danger button; toggles roll back on failure with the error toast; "Undo" is **not** implemented (record) except toasts for reversible toggles link to the item.
3. **404/500**: `NotFound` — branded illustration (monogram), "We couldn't find that page", search (`GlobalSearch`), popular links (Buy, Rent, Localities, Insights, Contact), `noindex`; `ErrorBoundary` — branded, "Something went wrong", "Reload" + "Go home", logs `console.error`, resets on route change (wrap per route in `App` with a `key={location.pathname}` boundary); admin boundary variant inside the layout ("Reload this page").
4. **Copy review**: extract every hardcoded UI string from public components into `copy.js` (nested by area: `nav`, `hero`, `listing`, `property`, `leads`, `blog`, `footer`, `forms`, `errors`, `empty`, `seo` (defaults for index page titles)) and admin strings into `adminCopy.js` (`tables`, `forms`, `toasts`, `dialogs`, `seo`, `dashboard`); review for tone (§8.5): sentence case for buttons/labels, Indian vocabulary (BHK, sq ft, carpet area, khata, RERA, possession, EMI), no exclamation marks, no invented SLAs ("We'll get back within 24 hours" → "We'll get back to you shortly"), success messages positive and short, error messages actionable; consistent naming ("Localities", "Builders", "Insights", "Buyer assistance", "Post requirement", "Shortlist"); date/number formats via `format.js` only. Seed copy (`db.json` pages/settings) is **not** rewritten here except to remove leftover placeholders that should have been client-checklist items (record them in `docs/CONTENT_TO_BE_PROVIDED_BY_CLIENT.md` — create the file now with the first entries; 48 completes it).
5. **Placeholders**: grep `src/` for "placeholder until", "Coming in prompt", "arrives in prompt", "temporary", "Legacy", "TODO", "lorem" — remove/replace; delete `AdminPlaceholderPage.jsx` after confirming no route references it; ensure `docs/PROJECT_STATE.md` "Pending rewrites" is empty after this prompt (anything left = bug to fix now).
6. **Trace script**: add the patterns of §2 to `check-traces.js` (scanning `src/` only for the copy patterns; `prompts/` and `docs/` excluded from the copy patterns but still scanned for HOM traces); ensure `npm run check:traces` passes.
7. Tests; format; report.

## 5. Data contract touched
None.

## 6. UI/UX requirements
Skeletons identical to layouts; empty states with an icon, one sentence and one CTA; error states with Retry; toasts ≤ 60 characters; confirm dialogs name the item; 404/500 pages branded and helpful; all copy in the two copy files.

## 7. Edge cases that must work
- Mock stopped while on the property page → hero/gallery skeleton → error state with Retry; restarting the mock and clicking Retry recovers without reload.
- Slow network (`MOCK_DELAY_MS=1500`) on admin lists → skeleton rows, disabled filters? (filters stay enabled; results update on arrival).
- 401 during outage never fires (network errors are not 401).
- Zero-state site (temporarily deactivate all featured properties via the admin) → home rows hidden cleanly; re-activate.
- `ErrorBoundary` recovers on navigation (route key) without a full reload.

## 8. Acceptance criteria
- [ ] `docs/QA/43-states-and-copy-report.md` covers every route × {loading, error, empty, success} with ✓ and lists fixes.
- [ ] `copy.js`/`adminCopy.js` hold all UI strings (spot-check: `grep -rn ">Submit<\|'Save'" src/components src/pages` finds only references through copy objects — allow a documented exception list for aria-labels).
- [ ] `AdminPlaceholderPage.jsx` deleted; "Pending rewrites" empty; `check:traces` extended and passing.
- [ ] `npm run lint`, `npm run test:ci`, `npm run build:ci`, `npm run check:traces`, `npm run smoke` pass; no console warnings.
- [ ] One commit; clean tree.

## 9. Verification
```
npm run lint
npm run test:ci
npm run build:ci
npm run check:traces
cross-env MOCK_DELAY_MS=1500 npm run mock    (PowerShell: $env:MOCK_DELAY_MS=1500; npm run mock)
npm start   (then walk every route at 1280 and 390 px)
npm run smoke
```
Manual QA: per the report grid; stop the mock mid-session on `/admin/leads` → error state + Retry; open `/this-does-not-exist` → 404 with search; throw an error from a component temporarily? — do not commit; instead verify the boundary via its unit test.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 43 report; Known issues: BUG-12 final closed, all "additional defects" statuses re-verified (list any still open with owner 44/45); Pending rewrites: empty; next prompt: 44.
- `docs/DECISIONS.md`: copy centralisation, no-undo decision, ErrorBoundary per route.

## 11. Commit
`git add -A && git commit -m "polish(ux): unified loading/empty/error/success states, 404/500 pages, centralised copy, trace checks"`

## 12. Guardrails
- Do not touch: data contracts, mock server, `db.json` (except the documented placeholder → checklist moves), `theme.js`, `global.css` tokens.
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality.
