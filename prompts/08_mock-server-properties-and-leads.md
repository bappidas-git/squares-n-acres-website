# Prompt 08 — Mock server: property and lead domain routes (filters, facets, slug, featured, similar, view, duplicate, bulk, notes, activities, export)

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §5.6–§5.11, §5.14 properties/leads rows, §6.1, §6.7, §6.17 enums, §10 business rules), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–07 are done; working tree clean; `npm install` run; `npm run mock` + `npm run test:mock` pass.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
The mock serves generic CRUD with envelope/PATCH/PUT semantics, auth and RBAC (`requireAuth`, `routePermissions`). `mock-server/lib/` has `paginate`, `sort`, `filters` (generic), `slug`, `embed` (stubs for property/lead), `scope`, `csv`, `ids`, `enums`, `models`. The starter seed has 6 properties (target shape, §6.1) and 6 leads (§6.7). `src/services/schemas/property.js`/`lead.js` describe bodies. `AREA_UNITS.toSqft`, `PRICE_BUCKETS_*`, `LEGACY_LEAD_SOURCE_MAP`, `LEAD_STATUS`, `LEAD_SOURCES` are in `src/config/enums.js`.

## 2. Objective
When this prompt is finished every property and lead endpoint of §5.14 exists on the mock with the exact semantics of §5.6–§5.11 and §10: public property search with all §5.7 filters, sorting, facets and `ids`; `featured`, `slug`, `similar`, `view`, `suggestions`; admin property CRUD with validation, `duplicate`, `bulk`, `check-slug`, admin filters (`isActive`, `seoScoreBand`, …); `POST /leads` with honeypot, rate limit, legacy-source mapping, counters, activities, auto-assign; admin leads list with filters and sales scoping, `PATCH` with activities, notes add/delete, `claim`, `bulk`, CSV export. Embedded read objects are attached on every read; public responses are scoped.

## 3. Scope
### Files to create
- `mock-server/routes/properties.js`, `mock-server/routes/leads.js`
- `mock-server/lib/propertyFilters.js`, `mock-server/lib/leadFilters.js`, `mock-server/lib/facets.js`, `mock-server/lib/activities.js`, `mock-server/lib/viewCounter.js`
- `mock-server/__tests__/properties.test.js`, `mock-server/__tests__/leads.test.js`
### Files to modify
- `mock-server/routes/index.js`, `mock-server/lib/embed.js` (property/lead embeds complete), `mock-server/lib/scope.js`, `mock-server/middleware/publicScope.js` (properties/leads handled by custom routes → skip generic), `mock-server/README.md`, `docs/API_CONTRACT.md` (examples), `docs/PROJECT_STATE.md`, `docs/DECISIONS.md`
### Files to delete
- none
### May also touch
- `db.json` only to add `enquiryCount`/`viewCount` consistency if the validator reports it (it should not)

## 4. Detailed tasks
1. **Embeds (`lib/embed.js`).** `embedProperty(p, db)` attaches `propertyType {id,name,slug,segment}`, `location.locality {id,name,slug}`, `location.city {id,name,slug}`, `amenities[]`, `badges[]`, `project.developer {id,name,slug,logoUrl}`, `agent.teamMember` display fields when `agent.teamMemberId` (name/photo/phone/whatsapp/email copied into `agent` if the manual fields are empty); `embedLead(l, db)` attaches `property {id,title,slug}`, `assignedUser {id,name}`. `scope.publicProperty` strips `createdBy/updatedBy`, and `agent.phone/whatsapp/email` unless `agent.showOnListing`.
2. **Property filters (`lib/propertyFilters.js`).** `applyPropertyFilters(items, query, { admin })` implementing every §5.7 rule: `listingType`, `segment`, `propertyTypeId` (csv), `localityId` (csv), `cityId`, `constructionStatus` (csv), `availability`, `bedrooms` (csv; matches `configuration.bedrooms` OR any active `unitConfigurations[].bedrooms`; `5` = ≥ 5), `minPrice`/`maxPrice` (`pricing.price` for sale, `pricing.rentPerMonth` for rent/lease; exclude `priceOnRequest` when a price filter is set; if `pricing.price` is null but `priceRangeMin` exists use `priceRangeMin`), `minArea`/`maxArea`/`areaUnit` (convert with `AREA_UNITS.toSqft`, compare `superBuiltUpArea ?? carpetArea ?? plotArea`), `furnishing` (csv), `facing` (csv), `developerId`, `amenityIds` (csv, all must match), `badgeIds` (csv, any), `isFeatured`, `isVerified`, `reraRegistered`, `possessionBy` (`yyyy-mm`), `q` (title, projectName, shortDescription, locality name, developer name; case-insensitive), `ids` (csv → return in that order, skip other filters); admin extras `isActive`, `seoScoreBand` (`good|ok|poor|none` from `seo.scoreBand`), `createdBy`. `applyPropertySort(items, sort, order)` for `relevance|newest|price-asc|price-desc|area-desc|popular` (+ admin `updatedAt|price|viewCount|priorityOrder|title|seoScore`); `price-asc/desc` uses the same price accessor and puts `priceOnRequest` last.
3. **Facets (`lib/facets.js`).** `computeFacets(filteredItems, db)` → `{ propertyType: [{id,name,count}], locality: [{id,name,count}], bedrooms: [{value,count}], constructionStatus: [{value,count}] }` sorted by count desc, computed after filters, before pagination.
4. **`routes/properties.js`.**
   - `GET /api/properties` (public): active only → filters → sort (default `relevance`) → facets → paginate (default 12, max 100) → `scope.publicProperty` + embed → `{ data, meta: { page, perPage, total, totalPages, facets } }`.
   - `GET /api/properties/featured`: `isFeatured && isActive`, sort `priorityOrder desc, updatedAt desc`, `perPage` default 12.
   - `GET /api/properties/suggestions?q=`: `q` < 2 chars → empty groups; localities by name (with active `propertyCount`), properties by title/projectName (active, max 5, `{id,title,slug,localityName,price}`), propertyTypes by name, developers by name.
   - `GET /api/properties/slug/:slug`: active only (404 otherwise), embedded + scoped.
   - `GET /api/properties/:id/similar`: §5.14 rule (admin-selected active ids in order, then fill to 6 by same `listingType` and (same `localityId` or same `propertyTypeId`), exclude self, sort `relevance`).
   - `POST /api/properties/:id/view`: `lib/viewCounter.js` in-memory `Map<ip:id, timestamp>` (1 h); when not debounced → `viewCount++`, push `{ propertyId, viewedAt, referrer }` to `propertyViews` → `{ data: { viewCount } }`; 404 for inactive/unknown.
   - Admin (`requireAuth` + permissions from prompt 07): `GET /api/admin/properties` (all records, admin filters, admin sorts, facets, `perPage=all`), `POST` (validate `property.create` via `validate.js`; slug auto/unique; `seo.slug` mirrored; `publishedAt` set when `isActive`; `createdBy` = user id; ensure exactly one `isCover`; ids for nested arrays (`images[].id`, `unitConfigurations[].id`, `floorPlans[].id`, `documents[].id`, `nearbyPlaces[].id`, `constructionTimeline[].id`, `faqs[].id`) assigned as `max+1` within the array; → 201 embedded), `GET /:id`, `PUT /:id` (full replace with defaults; same nested id handling; `viewCount/enquiryCount/createdAt/createdBy` preserved), `PATCH /:id` (partial; deep-merge object fields; `isActive` true → `publishedAt` if null), `DELETE /:id` (also remove the id from other properties' `similarPropertyIds`), `POST /:id/duplicate` (§5.14), `POST /bulk` (`activate|deactivate|feature|unfeature|verify|unverify|delete`; returns `{ data: { affected }, message }`), `GET /check-slug?slug=&excludeId=`.
5. **Lead rules (`routes/leads.js`, `lib/leadFilters.js`, `lib/activities.js`).**
   - `POST /api/leads` (public, rate limit 10/min): honeypot `website` non-empty → 200 `{ data: null, message: 'ok' }` without storing; validate `lead.create`; map `source` through `LEGACY_LEAD_SOURCE_MAP` and reject unknown sources with 422; set `status 'new'`, `priority` = `siteSettings.leads.defaultPriority`, `consent` default false, `ipAddress` (`req.ip`), `userAgent`, `utm` (from body or from `pageUrl` query string `utm_*`), `notes: []`, `activities: [created]` ("Lead created via <LEAD_SOURCES.labelOf(source)>"), `meta` stored as given; if `propertyId` refers to an active property → `enquiryCount++`; auto-assign round-robin among active `sales` users when `siteSettings.leads.autoAssign === 'round-robin'` (persist the last assigned user id in a `_meta` document? — **no** new collection: compute from the most recently created assigned lead); → 201 embedded lead.
   - `GET /api/admin/leads`: filters `q` (name/email/phone/message), `status` (csv), `source` (csv), `assignedTo` (`me` | `unassigned` | id), `propertyId`, `from`/`to` (createdAt date range, inclusive), `priority`; sort `createdAt|updatedAt|followUpAt|status` (default `createdAt desc`); **sales scoping**: `assignedTo == req.user.id || assignedTo == null` applied before filters; embedded; `meta.total`.
   - `GET /:id` (sales: 404 when outside scope), `PATCH /:id` (validate `lead.patch`; activities for `status-changed` ("Status changed from New to Contacted"), `assigned` ("Assigned to <name>" / "Unassigned"), `priority-changed`, `follow-up-set` ("Follow-up set for 05 Sep 2026"); sales may only set `status/priority/followUpAt/lostReason` and `assignedTo` = self via `claim`), `DELETE /:id` (`leads.delete` permission → sales 403), `POST /:id/claim` (sales; only when unassigned → sets `assignedTo` + activity; otherwise 409), `POST /:id/notes` (`{ text }` → note `{ id, text, createdBy, createdByName, createdAt }` + `note-added` activity → returns the lead), `DELETE /:id/notes/:noteId` (author or admin/manager), `POST /bulk` (`status` with `payload.status`, `assign` with `payload.assignedTo` (admin/manager), `priority`, `delete`), `GET /export` (same filters/scoping; CSV columns `ID, Name, Phone, Email, Source, Status, Priority, Assigned To, Property, Requirement, Message, Follow-up, Created At`; UTF-8 BOM; `Content-Type: text/csv; charset=utf-8`; `Content-Disposition: attachment; filename="leads-<yyyy-mm-dd>.csv"`).
6. **Generic router exclusion.** `publicScope.js`/`app.js`: requests for `/api/properties*`, `/api/admin/properties*`, `/api/leads*`, `/api/admin/leads*` never reach the generic JSON Server router (custom routers are mounted first and end with a 404 for unknown sub-paths).
7. **Tests (`node --test`).** properties: filters (`bedrooms=3` returns only 3-BHK incl. unit configurations; `amenityIds` all-match; `minPrice/maxPrice` excludes on-request; `areaUnit=sqm` conversion; `q` on locality name; `ids` order), sort options, facets counts, `featured` ordering, slug 404 for inactive, `similar` admin-first then fill, `view` debounce, admin create with auto slug + duplicate slug 409, PUT defaults, PATCH deep-merge on `seo`, duplicate copy naming, bulk affected count, delete removes references, sales 403 on create, `check-slug` suggestion. leads: honeypot, rate limit 429, legacy source mapping, unknown source 422, `enquiryCount` increment, activities on PATCH, notes add/delete, sales scoping (list/detail/claim/delete 403), export BOM + header row, bulk status.
8. Update `docs/API_CONTRACT.md` with real response examples captured from the mock (`GET /properties` first item, `POST /leads` response) and `mock-server/README.md`.

## 5. Data contract touched
Endpoints (all of §5.14 for properties and leads): `GET /properties`, `/properties/featured`, `/properties/suggestions`, `/properties/slug/:slug`, `/properties/:id/similar`, `POST /properties/:id/view`, `GET|POST /admin/properties`, `GET|PUT|PATCH|DELETE /admin/properties/:id`, `POST /admin/properties/:id/duplicate`, `POST /admin/properties/bulk`, `GET /admin/properties/check-slug`, `POST /leads`, `GET /admin/leads`, `GET|PATCH|DELETE /admin/leads/:id`, `POST /admin/leads/:id/claim`, `POST /admin/leads/:id/notes`, `DELETE /admin/leads/:id/notes/:noteId`, `GET /admin/leads/export`, `POST /admin/leads/bulk`. Collections written: `properties` (counters, nested ids), `leads`, `propertyViews`.

## 6. UI/UX requirements
N/A.

## 7. Edge cases that must work
- `bedrooms=5` matches 5, 6 and unit configurations with ≥ 5 bedrooms; plots/commercial never match a bedrooms filter.
- `minPrice=0` (present but zero) still applies the "exclude on-request" rule; absent → no exclusion.
- `similar` for a property whose `similarPropertyIds` include inactive/deleted ids skips them silently.
- `duplicate` of `slug-copy` → `slug-copy-2`.
- `PATCH { images: [...] }` replaces the array (arrays are not merged) and re-validates the single cover.
- Lead `phone` accepts `+91 98765 43210`, `09876543210`, `9876543210` and normalises to `+919876543210`; rejects `12345`.
- `GET /admin/leads?assignedTo=me` for admin returns the admin's own leads; `unassigned` returns `assignedTo == null`.
- Export with zero rows returns the header row only (+ BOM).
- `from=2026-09-01&to=2026-09-01` includes the whole day in Asia/Kolkata? — **decision:** compare on UTC dates of `createdAt` (document in DECISIONS as D96) to stay timezone-agnostic on the server.

## 8. Acceptance criteria
- [ ] Every endpoint listed in §5 responds per contract (verified by `npm run test:mock` — tests for properties and leads pass).
- [ ] `GET /api/properties?bedrooms=3` returns only 3-BHK properties; `?amenityIds=1,2` only properties having both; `?ids=3,1` returns them in that order.
- [ ] `meta.facets` present on public and admin property lists.
- [ ] `POST /api/leads` increments the property's `enquiryCount`, maps `property_enquiry` → `property-enquiry`, stores `activities[0]`, respects honeypot and rate limit.
- [ ] Sales scoping enforced on list/detail/patch/claim/delete/export.
- [ ] CSV export starts with `﻿` and the header row; PATCH on leads appends the right activities.
- [ ] `npm run test:mock`, `npm run lint`, `npm run test:ci`, `npm run build:ci`, `npm run check:traces`, `npm run validate:seed` pass.
- [ ] One commit; clean tree.

## 9. Verification
```
npm run test:mock
npm run lint
npm run test:ci
npm run build:ci
npm run check:traces
npm run validate:seed
npm run mock   (second terminal; login as admin to get <token>, then:)
curl "http://localhost:4000/api/properties?bedrooms=3&sort=price-asc"
curl "http://localhost:4000/api/properties/slug/lakeview-heights-3-bhk-whitefield"
curl -X POST -H "Content-Type: application/json" -d "{\"name\":\"Test Lead\",\"phone\":\"9876543210\",\"source\":\"property_enquiry\",\"propertyId\":1}" http://localhost:4000/api/leads
curl -H "Authorization: Bearer <token>" "http://localhost:4000/api/admin/leads?status=new"
curl -H "Authorization: Bearer <token>" -o leads.csv "http://localhost:4000/api/admin/leads/export"
```
Manual QA: inspect `leads.csv` in a text editor (BOM + header); call `POST /api/properties/1/view` twice → the second call does not increment; `GET /api/admin/properties/1` shows `enquiryCount` incremented by the lead POST.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 08 report; Known issues: BUG-02 (server side) closed, BUG-03 partially, BUG-07 server rule done, BUG-09 server mapping done; next prompt: 09.
- `docs/DECISIONS.md`: D68 (bedrooms semantics), D89 (claim), D95 (counters read-only), D96 (UTC date filters), round-robin computation choice.

## 11. Commit
`git add -A && git commit -m "feat(mock): property search/facets/similar/view/duplicate/bulk and lead pipeline with notes, activities, export"`

## 12. Guardrails
- Do not touch: React source, `theme.js`, `global.css`.
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality.
