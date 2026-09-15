# Prompt 22 — Admin property list: server-side DataTable with filters, bulk actions, toggles, duplicate, CSV export, role behaviour

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §5.7 admin filters/sorts, §5.8 bulk, §7 RBAC, §13 D23/D44/D47), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–21 are done; working tree clean; `npm install` run; `npm run dev` running.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
`src/pages/admin/AdminProperties.js` (931 lines, legacy) lists properties from `propertyService.adminList()` through the adapter with client-side search/filters/sort/pagination, per-page select-all, PATCH toggles (since 11), `Promise.all` bulk. The admin kit (`DataTable`, `FilterBar`, `PageHeader`, `StatusChip`, `BulkActionsBar`, `ConfirmDialog`) and `useApiList` (URL sync) exist; the mock supports `GET /admin/properties` with filters `q|listingType|segment|propertyTypeId|localityId|constructionStatus|availability|isActive|isFeatured|isVerified|developerId|seoScoreBand|createdBy`, sorts `updatedAt|price|viewCount|priorityOrder|title|seoScore`, `perPage=all`, `POST /admin/properties/bulk`, `duplicate`, `DELETE`. `utils/csv.js` (client) does not exist yet; `utils/download.js` does not exist yet.

## 2. Objective
When this prompt is finished `/admin/properties` is rebuilt on the kit: server-side pagination/sort/filters synced to the URL, columns (cover thumbnail, title + locality + type, listing type, construction status, price, BHK/area, status chips active/featured/verified, SEO score chip, views/enquiries, updated), filters (`q`, listingType, segment, propertyTypeId, localityId, constructionStatus, availability, isActive, isFeatured, developerId, seoScoreBand), row actions (View on site/Preview, Edit, Duplicate, Toggle active/featured (optimistic), Delete), bulk actions (activate/deactivate/feature/unfeature/verify/unverify/delete), CSV export of the current filter (client-built from `perPage=all`), "Add property", sales read-only behaviour; the legacy file is deleted.

## 3. Scope
### Files to create
- `src/pages/admin/properties/PropertiesListPage.jsx` (+ css), `src/pages/admin/properties/propertyColumns.jsx`, `propertyFilters.js`
- `src/utils/csv.js` (`toCsv(rows, columns)` with BOM + quoting), `src/utils/download.js` (`downloadBlob(blob, filename)`, `downloadAuthenticated(endpoint, params, filename)` via `http` `responseType: 'blob'`)
- `src/components/seo/SeoScoreChip.jsx` (band chip from `seo.score/scoreBand`; "Not analysed" muted when null) — reused by articles/SEO dashboard later
- Tests: `src/utils/__tests__/csv.test.js`, `src/pages/admin/properties/__tests__/PropertiesListPage.test.jsx` (renders rows from a fake service; bulk confirm; sales hides actions)
### Files to modify
- `src/routes/adminRouteConfig.js`, `src/utils/adapters/legacyProperty.js` (drop admin-list mappings), `docs/*`
### Files to delete
- `src/pages/admin/AdminProperties.js`
### May also touch
- `src/components/admin/DataTable.jsx` (only if a needed prop is missing — add, don't fork)

## 4. Detailed tasks
1. **List state:** `useApiList(propertyService.adminList, { syncToUrl: true, paramKeys: ['q','listingType','segment','propertyTypeId','localityId','constructionStatus','availability','isActive','isFeatured','developerId','seoScoreBand','sort','order','page','perPage'], defaults: { sort: 'updatedAt', order: 'desc', perPage: 20 } })`.
2. **Columns (`propertyColumns.jsx`):** Cover (48×36 `LazyImage`, monogram fallback), Title (primary; `title` + line 2 `locality.name · propertyType.name`; link to edit), Listing (`LISTING_TYPES` chip), Status (`CONSTRUCTION_STATUS` chip + availability when not `available`), Price (`formatPrice` per listing type; "On request"), Config (`formatBhk` + `formatArea`), Flags (`StatusChip`s Active/Featured/Verified — clickable toggles for admin/manager → `patch`), SEO (`SeoScoreChip`), Views/Enquiries (two numbers), Updated (`formatDate`, `hideBelow: 'lg'`). Sortable: title, price, viewCount, priorityOrder, updatedAt, seoScore.
3. **Filters (`FilterBar`):** search, listingType, segment, propertyType (options from `usePropertyTypes({ activeOnly: false })`), locality (`useLocalities`), constructionStatus (multi), availability, active (All/Active/Inactive), featured, developer (`useDevelopers`), SEO band (Good/OK/Poor/Not analysed). Active count + reset.
4. **Row actions:** View (public URL in a new tab; when inactive → `?preview=admin`), Edit, Duplicate (`propertyService.duplicate` → toast + navigate to the copy's edit page), Activate/Deactivate, Feature/Unfeature (optimistic with rollback), Delete (`ConfirmDialog` danger with the title). Sales: only View; flag chips not clickable; no Add button; page subtitle "Read-only".
5. **Bulk:** `BulkActionsBar` actions activate/deactivate/feature/unfeature/verify/unverify/delete (delete needs confirm with count) → `propertyService.bulk({ ids, action })` → toast "N properties updated" → `refetch()`; selection cleared.
6. **Export CSV:** button "Export CSV (N)" → `propertyService.adminList({ ...currentFilters, perPage: 'all' })` → `toCsv` with columns ID, Title, Slug, Listing type, Segment, Property type, Status, Availability, Locality, City, Price, Rent, Bedrooms, Super built-up area, Carpet area, Area unit, Developer, Active, Featured, Verified, SEO score, Views, Enquiries, Published at, Updated at → `downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'properties-<yyyy-mm-dd>.csv')`; disabled while exporting; toast on completion.
7. **Header:** `PageHeader` title "Properties" with total count from `meta.total`, actions "Export CSV", "Add property" (`can('properties','create')`).
8. Mobile card renderer: cover, title, locality, price, flags, kebab with the row actions.
9. Delete the legacy page; tests; format.

## 5. Data contract touched
Consumed: `GET /admin/properties` (all filters/sorts, `perPage=all`), `PATCH /admin/properties/:id`, `POST /admin/properties/:id/duplicate`, `POST /admin/properties/bulk`, `DELETE /admin/properties/:id`.

## 6. UI/UX requirements
Table density comfortable; thumbnails with fixed boxes; chips tones; flag toggles show a spinner while patching; bulk bar with count; empty state "No properties match — Reset filters" or "No properties yet — Add your first property"; URL reflects filters (shareable); 390 px cards.

## 7. Edge cases that must work
- Toggle failure (stop the mock) → chip reverts + error toast.
- Bulk delete of a property referenced in others' `similarPropertyIds` → server handles; list refreshes.
- Export with 0 rows → header-only CSV; with 40 rows → all rows (not just the page).
- URL `?page=5` beyond range → empty data with meta; the pagination shows page 5 of N and "Go to first page" in the empty state.
- Sales user: no Add/Duplicate/Delete/bulk/toggles; export allowed? — `properties.view` only → export allowed (read-only data) — decision recorded.

## 8. Acceptance criteria
- [ ] `/admin/properties` works server-side (Network shows `page/perPage/sort/filters` params) with all filters/sorts/toggles/bulk/duplicate/delete/export.
- [ ] Sales sees a read-only list; manager/admin full.
- [ ] Legacy `AdminProperties.js` deleted; tests pass.
- [ ] `npm run lint`, `npm run test:ci`, `npm run build:ci`, `npm run check:traces`, `npm run smoke` pass; no console warnings.
- [ ] One commit; clean tree.

## 9. Verification
```
npm run lint
npm run test:ci
npm run build:ci
npm run check:traces
npm run dev   (then) npm run smoke
```
Manual QA (desktop + 390 px): filter Rent + Koramangala → URL updates → sort by price → toggle featured on a row → bulk deactivate two → export CSV → open in Excel/Notepad (BOM, columns) → duplicate a property → delete the copy; sales login → read-only.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 22 report; Known issues: additional defect 21 (AdminProperties) closed; next prompt: 23.
- `docs/DECISIONS.md`: D44, D47, sales export decision.

## 11. Commit
`git add -A && git commit -m "feat(properties): server-side admin property list with filters, bulk actions, toggles and CSV export"`

## 12. Guardrails
- Do not touch: public pages, mock server, `db.json`, `theme.js`, `global.css`.
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality.
