# Prompt 15 — Master data: property types, amenities, badges, banks (admin CRUD + public consumption hooks)

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §6.3 propertyTypes, §6.4 amenities/badges, §6.6 banks, §6.17 enums, §13 D25/D88), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–14 are done; working tree clean; `npm install` run; `npm run dev` running.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
The mock serves public `GET /property-types?segment=`, `GET /amenities?category=`, `GET /badges`, `GET /banks` and admin CRUD (`/admin/property-types`, `/admin/amenities`, `/admin/badges`, `/admin/banks`) with slugs, `bulk`, `order` PATCH and delete guards. `MasterDataContext` exposes `propertyTypes`, `amenities`, `badges`, `banks` (+ `byId/bySlug`, `refresh`). `MasterDataPage`, `IconPicker`, `ToneSelect`, `SortableList` exist. The legacy `AmenitiesTab.jsx` of the property form still uses the hardcoded `AMENITY_CATEGORIES` from `property-tabs/constants.js` (rewritten in prompt 20); `PropertyCard` renders `badges[]` with tone colours; `FinanceGuide.jsx` still uses `DEFAULT_BANKS` (rewritten in 25). Admin routes for these four collections currently render `AdminPlaceholderPage`.

## 2. Objective
When this prompt is finished the four master-data collections are fully manageable in the admin (`/admin/master-data/property-types`, `/admin/master-data/amenities`, `/admin/master-data/badges`, `/admin/master-data/banks`) with the generic `MasterDataPage` (dialog forms, reorder, toggles, delete guards), public consumers read them from `MasterDataContext` through small hooks (`usePropertyTypes({ segment })`, `useAmenitiesGrouped()`, `useBadgeMap()`, `useBanks()`), `adminConstants.js` loses `DEFAULT_BANKS`/`ARTICLE_CATEGORIES`/`FAQ_CATEGORIES` colour maps that are now enums (keep the file only if something still imports it; otherwise delete), and the master-data admin refreshes the contexts after saves.

## 3. Scope
### Files to create
- `src/pages/admin/master-data/PropertyTypesPage.jsx`, `AmenitiesPage.jsx`, `BadgesPage.jsx`, `BanksPage.jsx`, `masterDataConfigs.js` (the four config objects)
- `src/hooks/useMasterData.js` (`usePropertyTypes`, `useAmenitiesGrouped`, `useBadgeMap`, `useBanks`, `useLocalities`, `useDevelopers`, `useCities`)
- Tests: `src/hooks/__tests__/useMasterData.test.js`, `src/pages/admin/master-data/__tests__/masterDataConfigs.test.js` (each config has columns/formFields/schema keys matching the model)
### Files to modify
- `src/routes/adminRouteConfig.js`, `src/contexts/MasterDataContext.js` (`refresh(collection)` granular), `src/config/adminConstants.js` (remove dead exports; delete the file if empty), `src/components/common/PropertyCard.jsx` (badge tones via `useBadgeMap` only if it reads `badgeIds`; it already receives `badges[]` — keep), `docs/*`
### Files to delete
- `src/config/adminConstants.js` if no imports remain (expected after the FAQ/article enums moved to `enums.js` — verify with grep; `Dashboard.js`, `AdminLeads.js`, `LeadDetail.js`, `AdminArticles.js`, `ArticleForm.jsx`, `FaqManager.jsx` may still import `LEAD_STATUS_CONFIG`/`ARTICLE_CATEGORIES`/`FAQ_CATEGORIES` — switch those imports to `enums.js` equivalents (`LEAD_STATUS`, `FAQ_CATEGORIES`; article categories become master data — for now `ARTICLE_CATEGORIES` in legacy admin article screens can read `articleService.categories()` — keep that legacy screen compiling with a minimal change; it is rewritten in 33)
### May also touch
- import fixes

## 4. Detailed tasks
1. **Configs (`masterDataConfigs.js`).**
   - `propertyTypes`: columns Icon (Iconify), Name (+ slug), Segment (`SEGMENTS.labelOf` chip), Properties (count via `usedBy`? — the list endpoint has no count: add `propertyCount` (read) to `GET /admin/property-types` on the mock — small change, update registry/docs), Active, Order; filters `q`, `segment`, `isActive`; form: name, slug (base `/buy/`), segment select, icon (`IconPicker` field type `icon`), description textarea, active, order; SEO placeholder (`Alert` "The SEO panel for property types arrives in prompt 36"). Delete guard.
   - `amenities`: columns Icon, Name, Category (`AMENITY_CATEGORIES` chip), Active, Order; filters `q`, `category`, `isActive`; group headers in the table when sorted by category (render a category row); form: name, slug, category select, icon, active, order; reorder within category.
   - `badges`: columns Swatch (tone), Name, Slug, Icon, Active, Order; form: name, slug, `ToneSelect` (`color` token), icon (optional), active, order.
   - `banks`: columns Logo, Name, Rate (min–max %), Max tenure, Max LTV, Active, Order; form: name, slug, logo (`ImageField` hint `logo`), interestRateMin/Max (numbers 5–20, max ≥ min), processingFeeNote, maxTenureYears (5–40), maxLtvPercent (50–95), minLoanAmount/maxLoanAmount (₹ number fields), features (tags), applyUrl (url), active, order. No delete guard (banks unused elsewhere).
2. **Pages** = `MasterDataPage` with each config; `PageHeader` subtitle explains where the data is used ("Shown in filters, cards and the property form").
3. **Context refresh.** `MasterDataContext.refresh(collection)` reloads one collection; `MasterDataPage` calls `refresh(config.key)` after create/update/delete/reorder/toggle so public pages in the same session see changes (also invalidates the `sna_master_data_cache`).
4. **Hooks (`useMasterData.js`).** `usePropertyTypes({ segment, activeOnly = true })` → sorted by `order`; `useAmenitiesGrouped()` → `[{ category, label, items[] }]` in `AMENITY_CATEGORIES` order; `useBadgeMap()` → `Map<id, badge>`; `useBanks()` → active sorted; `useLocalities({ featuredOnly })`; `useDevelopers({ featuredOnly })`; `useCities()`.
5. **Consumers now:** `PropertyCard` badge chips use `ui/Chip tone={badge.color}`; the legacy `PropertyFilters` property-type select reads `usePropertyTypes()` instead of its hardcoded `PROPERTY_TYPES` (values → ids; the listing adapter maps `propertyTypeId` — quick win, fully rewritten in 26); `FinanceGuide` bank cards read `useBanks()` instead of `DEFAULT_BANKS` and hide the section when empty (its refactor happens in 25 — here only the data source changes); the legacy `AmenitiesTab` reads `useAmenitiesGrouped()` for its checkbox groups (rewritten in 20).
6. Mock: add `propertyCount` (read) to `/admin/property-types`, `/admin/amenities` (count of properties containing the id), `/admin/badges`; registry/docs updated; smoke passes.
7. Tests as listed; `npm run format`.

## 5. Data contract touched
Consumed: `GET /property-types`, `/amenities`, `/badges`, `/banks`, admin CRUD for the four; mock change: `propertyCount` on admin property-types/amenities/badges lists (registry + `docs/API_CONTRACT.md`).

## 6. UI/UX requirements
Dialog forms (full-screen < 600 px); icon fields show the rendered icon next to the id; tone swatches use tokens; tables with category group rows; reorder handles visible on hover and always on touch.

## 7. Edge cases that must work
- Deleting a property type/amenity/badge in use → 409 guard dialog with property titles.
- Changing a property type's segment while properties use it → allowed (server), but the UI warns via the guard's usage list ("Used by 12 properties") before saving — implement as a confirm when `usedBy` > 0 (call `GET /admin/property-types/:id?withUsage=true` — add `withUsage` support to the CRUD factory `GET /:id` now).
- Bank `interestRateMax < interestRateMin` → client validation error.
- Amenity with an invalid icon id → live preview shows a placeholder and validation refuses ids not matching `^mdi:[a-z0-9-]+$`.
- Context cache invalidation: after adding a badge in admin, `/properties` (same tab) shows it after the next fetch without a reload.

## 8. Acceptance criteria
- [ ] The four admin pages support list/filter/sort/reorder/toggle/create/edit/delete/bulk end-to-end (verify records in `GET /api/admin/<collection>`).
- [ ] Delete guards render usages; segment-change confirm works.
- [ ] Public consumers (card badges, filters property-type select, finance bank cards, amenities tab) read master data from the context; `DEFAULT_BANKS` no longer exists (`grep -rn DEFAULT_BANKS src` → 0).
- [ ] `npm run lint`, `npm run test:ci`, `npm run build:ci`, `npm run check:traces`, `npm run test:mock`, `npm run smoke` pass.
- [ ] One commit; clean tree.

## 9. Verification
```
npm run lint
npm run test:ci
npm run build:ci
npm run check:traces
npm run test:mock
npm run dev   (then) npm run smoke
```
Manual QA (desktop + 390 px): create amenity "Pet Park" (category kids, icon `mdi:dog`), reorder it, toggle inactive; create badge "Festive Offer" tone warning; edit bank rates; try deleting "Apartments" type → guard; open `/properties` → filter select lists the property types from master data; open a property details page → finance section shows the seed banks.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 15 report; Known issues: BUG-05 (bank defaults) partially closed; `adminConstants.js` status; next prompt: 16.
- `docs/DECISIONS.md`: D88 (segment-change confirm), `withUsage` query.

## 11. Commit
`git add -A && git commit -m "feat(master-data): property types, amenities, badges and banks admin pages with context hooks"`

## 12. Guardrails
- Do not touch: property form tabs beyond the amenities data source, listing engine beyond the type select data source, `theme.js`, `global.css`, `db.json`.
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality.
