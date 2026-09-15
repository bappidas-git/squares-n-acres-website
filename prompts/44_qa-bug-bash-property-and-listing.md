# Prompt 44 — QA bug bash 1: property module end-to-end (master data → form → list → public listing → details → leads), Jest additions, optional Playwright

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §12 definition of done, QA-06/QA-08 (master spec 16.1/16.3), §5.7 filters, §6.1, §13 D6 (Playwright needs Node ≥ 20)), then `docs/PROJECT_STATE.md`, `docs/DECISIONS.md`, `docs/QA/*`.
- Confirm prerequisites: prompts 01–43 are done; working tree clean; `npm install` run; `npm run dev` running; `node -v` (record — Playwright is optional and requires Node ≥ 20 and browser downloads).
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
The property module spans master data (localities, cities, property types, amenities, badges, developers, banks), the property form (16 tabs, rail, autosave, SEO panel), the admin list (server-side, bulk, export), the listing engine (routes, filters, facets, search, shortlist), the details page (gallery, sections, gated downloads, finance, similar, enquiry, view tracking), lead capture (modal/forms/sources) and the mock rules (filters, similar, counters, validation). Unit tests exist per prompt; no end-to-end suite exists. `scripts/smoke-api.js` covers the API.

## 2. Objective
When this prompt is finished the whole property path has been exercised end-to-end against the mock with **every** role and **every** edge case listed below, every defect found is fixed in the same session (or, if outside this module, logged in "Known issues" with owner 45), Jest coverage is extended for the risky pure logic (`propertyFilters` client serialisation, `propertySections`, `toPayload/fromRecord` round-trips on every seed property, `format.js` corner cases, `finance.js`, `listingSeo`, `listingRoutes.resolveDynamicSlug`), a seed-wide contract test asserts every seed property renders on the details page without console errors (JSDOM render test over all active seed properties using fixtures from `db.json`), and — when Node ≥ 20 and browsers can be installed — Playwright e2e specs exist and pass for: login, create property (basics + image + publish), view details, submit lead, filter listing, shortlist; otherwise the specs are written, documented and skipped with a clear reason. Results recorded in `docs/QA/44-property-bug-bash.md`.

## 3. Scope
### Files to create
- `docs/QA/44-property-bug-bash.md` (scenario table with results and fix references)
- Tests: `src/__tests__/seedProperties.render.test.jsx` (for each active seed property: render `PropertyDetails` with a mocked service → no errors, H1 present, section nav items ⊆ visible sections), `src/utils/__tests__/listingFilters.roundtrip.test.js`, `src/pages/admin/properties/property-form/__tests__/payload.seed.test.js` (`fromRecord(toPayload(fromRecord(seed)))` equality for all seed properties), `src/utils/__tests__/format.edge.test.js`, `src/components/listing/__tests__/listingRoutes.test.js`
- `e2e/playwright.config.js`, `e2e/fixtures/auth.js`, `e2e/tests/login.spec.js`, `property-create.spec.js`, `property-details.spec.js`, `lead-submit.spec.js`, `listing-filters.spec.js`, `shortlist.spec.js`, `e2e/README.md`
### Files to modify
- Any file needing a fix; `package.json` (`"e2e": "playwright test"`, devDependency `@playwright/test@1.63.0` **only if** Node ≥ 20 — otherwise document and keep the script pointing to the README), `.gitignore` (`/e2e/test-results/`, `/playwright-report/` already), `docs/*`
### Files to delete
- none
### May also touch
- `mock-server/*` for contract bugs found (must keep `test:mock`/`smoke` green and update docs)

## 4. Detailed tasks
1. **Scenario matrix (execute all, record all)** — for roles admin, manager, sales:
   - Master data: create locality/type/amenity/badge/developer/bank → used in the form; delete guard on each; reorder persists; featured toggles reflect on home.
   - Form: create a sale apartment with every tab filled (incl. unit configs, floor plans, documents, timeline, FAQs, similar, agent, SEO) → publish → public page shows every section; edit → PUT keeps counters/`createdAt`; autosave restore; duplicate; delete; 422 mapping (send an invalid pincode via the UI); slug conflict; sales read-only; rent listing (rent fields only), plot (no BHK), commercial (no BHK, specifications), pre-launch (possession + timeline), price on request.
   - Admin list: every filter/sort/toggle/bulk/export; URL sharing; pagination beyond range.
   - Listing: every route of `listingRoutes`; every filter group incl. `bedrooms=5`, price buckets sale/rent, area unit conversion, amenities all-match, badges any, possessionBy, `q`; facets consistency; empty + widen suggestions; grid/list toggle; shortlist add/remove/share; recently viewed; global search groups; deep link restore; back/forward.
   - Details: gallery/lightbox/video tab/virtual tour; price card variants (range/on request/rent/EMI); key facts per type; section nav ↔ sections; gated brochure/floor plan/document flows (new session, identified session); finance assessment/bank modal/EMI; similar admin-first; enquiry; view count once; share; admin preview of inactive; 404.
   - Leads: each property source appears in admin with property link, `meta` for assessments, duplicate chip, notifications.
   - Mock: `PATCH` keeps untouched nested fields; `similar` fill rule; `enquiryCount` increments; `check-slug` suggestions; sales 403s.
2. **Fix** every defect found (product code, mock, docs); add a regression unit test where a pure function was wrong.
3. **Jest additions** listed in §3 (seed render test uses `db.json` via `fs` at test time; mock `propertyService`/contexts with fixtures).
4. **Playwright (optional)**: if `node -v` ≥ 20 → `npm i -D @playwright/test@1.63.0`, `npx playwright install chromium` (if the download fails, document and skip), `e2e/playwright.config.js` (`baseURL http://localhost:3000`, `webServer` starts `npm run dev`? — start `mock` + `start` via two `webServer` entries, reuse existing), specs per §2 using role fixtures (`admin@squaresnacres.com`); run `npm run e2e` → all pass; else write the specs + README ("requires Node 20 + `npx playwright install`") and set `"e2e": "playwright test"` anyway.
5. Report; update docs.

## 5. Data contract touched
Only fixes (documented). npm: `@playwright/test@1.63.0` (dev, optional, per D6); script `e2e`.

## 6. UI/UX requirements
N/A (fixes must respect the design system).

## 7. Edge cases that must work
All of task 1 — plus: property with 0 amenities/FAQs/documents publishes only with images+description; `ids` ordering in shortlist; concurrent edits (edit in two tabs → second save wins; no crash); very long titles; lat/lng at boundaries; unit configuration prices out of order (range computed min/max); admin preview link for an inactive property from the list.

## 8. Acceptance criteria
- [ ] `docs/QA/44-property-bug-bash.md` records every scenario of task 1 for all roles with ✓ and links to fixes (commit-level references are this commit).
- [ ] New Jest suites pass (seed render test over all active seed properties; payload round-trip for all seed properties).
- [ ] Playwright specs pass (or are documented as skipped with the reason and still present).
- [ ] `npm run lint`, `npm run test:ci`, `npm run build:ci`, `npm run check:traces`, `npm run test:mock`, `npm run smoke` pass; no console warnings on any property-related page.
- [ ] One commit; clean tree.

## 9. Verification
```
npm run lint
npm run test:ci
npm run build:ci
npm run check:traces
npm run test:mock
npm run dev   (then) npm run smoke
npm run e2e   (if Playwright installed)
```
Manual QA: the scenario matrix of task 1 executed at 1280 and 390 px with the console open; record durations/notes in the report.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 44 report (defects found/fixed count, e2e status); Known issues updated; next prompt: 45.
- `docs/DECISIONS.md`: Playwright decision (installed or deferred), any contract fix.

## 11. Commit
`git add -A && git commit -m "test(qa): property module bug bash with fixes, seed render/payload tests and Playwright e2e"`

## 12. Guardrails
- Do not touch: unrelated modules (log them for 45), `theme.js`, `global.css` tokens.
- Do not add dependencies other than: `@playwright/test@1.63.0` (dev, optional).
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces; never skip/disable a failing test — fix the cause.
- Do not reduce or remove existing functionality.
