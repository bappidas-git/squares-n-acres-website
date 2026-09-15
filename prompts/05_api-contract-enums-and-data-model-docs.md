# Prompt 05 — API contract docs, canonical enums, endpoint registry, schema descriptors

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §5 API contract, §6 Data model + §6.15 mapping + §6.17 enums, §7 RBAC, §10 mock design), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–04 are done; working tree clean; `npm install` run.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
The frontend still calls the HOM endpoints through `src/services/api.js` (snake_case params, `normalizeListResponse`, `transformPropertyPayload`, …) and `src/services/seoService.js`; enums are scattered (`src/config/adminConstants.js` `LEAD_STATUS_CONFIG`/`LEAD_SOURCE_OPTIONS`/`ARTICLE_CATEGORIES`/`FAQ_CATEGORIES`/`DEFAULT_BANKS`, `src/pages/admin/property-tabs/constants.js` `CONFIGURATION_OPTIONS`/`AMENITY_CATEGORIES`/`NEARBY_TYPES`/`TAG_OPTIONS`/`CATEGORY_OPTIONS`/`CONSTRUCTION_SPEC_CATEGORIES`/`SECTION_VISIBILITY_CONFIG`, `src/components/common/PropertyFilters.jsx` `BHK_OPTIONS`/`PRICE_RANGES`/`PROPERTY_TYPES`/`POSSESSION_STATUSES`/`SORT_OPTIONS`, `src/components/sections/property/NearbyPlaces.jsx` `typeConfig`, `ConstructionSpecs.jsx` `categoryConfig`). There is no contract document, no data-model document, no endpoint registry, no validation schema. `db.json` still has the HOM shape. This prompt is documentation + pure modules only; nothing is wired into the UI yet (prompt 11 does that).

## 2. Objective
When this prompt is finished the contract is frozen in code and docs: `docs/API_CONTRACT.md`, `docs/DATA_MODEL.md` (with the HOM → SNA mapping table), `docs/RBAC.md`; `src/config/enums.js` (CommonJS, every enum of §6.17 with `values/options/labelOf`); `src/services/endpoints.js` (the complete registry of §5.14/§5.15 — every endpoint, with query/body/response descriptors); `src/services/schemas/*.js` (request body descriptors); `mock-server/schemas/models.js` (collection/field descriptors shared by the mock validator, the seed validator and the guidelines generator); `src/config/rbac.js` rewritten to the §7 matrix (`PERMISSIONS`, `ROUTE_PERMISSIONS`, `NAV_ITEMS` for the final admin navigation, `hasRouteAccess`, `can(role, area, action)`, `getNavItemsForRole`, `getDefaultRoute`); `scripts/check-endpoints.js`. Existing code keeps compiling (old constants stay until their consumers are rewritten; `rbac.js` keeps the old exports' names).

## 3. Scope
### Files to create
- `docs/API_CONTRACT.md`, `docs/DATA_MODEL.md`, `docs/RBAC.md`
- `src/config/enums.js`, `src/config/enums.test.js`
- `src/services/endpoints.js`, `src/services/endpoints.test.js`
- `src/services/schemas/index.js`, `src/services/schemas/property.js`, `lead.js`, `article.js`, `page.js`, `masterData.js` (localities, cities, propertyTypes, amenities, badges, developers, banks, articleCategories, articleTags, authors, faqs, testimonials, teamMembers, partners, jobs, redirects, media, users), `settings.js` (siteSettings, seoSettings), `auth.js`, `seo.js` (the `seo` sub-schema), `newsletter.js`, `jobApplication.js`
- `mock-server/schemas/models.js` (+ `mock-server/schemas/README.md`)
- `scripts/check-endpoints.js`
### Files to modify
- `src/config/rbac.js`, `package.json` (`lint` script gains `&& node scripts/check-endpoints.js`), `docs/PROJECT_STATE.md`, `docs/DECISIONS.md`
### Files to delete
- none
### May also touch
- nothing else

## 4. Detailed tasks
1. **`docs/API_CONTRACT.md`** — copy §5.1–§5.13 of `00_MASTER_CONTEXT.md` verbatim (base URL, casing, envelopes, errors with a full 422 example `{ "message": "The given data was invalid.", "errors": { "title": ["The title must be at least 10 characters."], "location.localityId": ["The selected locality is invalid."] } }`, auth, ids/timestamps, pagination/sort/filter, property filters + facets, write semantics, slugs, public vs admin reads, rate limiting, CORS, sitemap), then the endpoint catalogue of §5.14 as a table with columns Method · Path · Auth/role · Purpose · Query · Body schema · Response shape · Side effects, and a "Response shapes" section defining `Property`, `PropertyList`, `PropertySummary` (card fields: `id, slug, title, listingType, segment, propertyType, constructionStatus, availability, pricing, area, configuration, location {locality, city, showExactLocation}, images[0..3], badges, isFeatured, isVerified, publishedAt, updatedAt, viewCount`), `Lead`, `Article`, `ArticleSummary`, `Locality`, `Developer`, `Page`, `Settings`, `SeoSettings`, `DashboardData`, `SeoOverviewRow`, `Suggestions`, `Envelope`, `ListMeta`, `Error`.
2. **`docs/DATA_MODEL.md`** — copy §6.1–§6.14 verbatim (every collection, every field: type, nullability, default, enum) and §6.15 as "HOM → SNA field mapping"; add a "Seed ids" section reserving id ranges (properties 1–60, localities 1–30, …) and the singleton note for `siteSettings`/`seoSettings`.
3. **`docs/RBAC.md`** — §7 verbatim + the route map + a "How it is enforced" section (`ProtectedRoute`, `RoleRoute`, `can()`, API 403).
4. **`src/config/enums.js` (CommonJS).** Implement `makeEnum(entries)` and every enum of §6.17 with exact values/labels/tones/icons, plus `LEGACY_LEAD_SOURCE_MAP`, `AREA_UNITS.toSqft(value, unit)`, `LISTING_TYPES.verbOf(value)`, `PRICE_BUCKETS_SALE`/`PRICE_BUCKETS_RENT` (arrays of `{min, max, label}` with `null` max for the last), `SEO_SCORE_BANDS.bandOf(score)` (`null` → `none`, ≤ 50 poor, 51–80 ok, ≥ 81 good), `SECTION_VISIBILITY_KEYS` (the 18 keys in display order with labels), `BLOCK_TYPES` (23 types with label + icon + `defaultData()` factory). `src/config/enums.test.js`: every enum has unique values, `labelOf` returns labels and `''` for unknown, `bandOf` thresholds, `toSqft` factors, legacy map covers all 24 old sources.
5. **`src/services/schemas/*.js` (CommonJS).** Body descriptors in the same mini-language as the models: `{ name: { type: 'string'|'int'|'number'|'bool'|'enum'|'date'|'datetime'|'email'|'phone'|'url'|'html'|'slug'|'array'|'object', required, nullable, enum: [...], min, max, maxLength, items: descriptor, shape: { … }, default } }`. Cover: `property.create` (= full record write shape), `property.update` (same), `property.patch` (all optional), `lead.create` (`name` required 2–80, `phone` required phone, `email` optional email, `message` ≤ 2000, `source` enum, `propertyId?`, `articleId?`, `pageSlug?`, `pageUrl?`, `requirement?` shape, `consent?` bool, `utm?`, `meta?` object, `website?` honeypot), `lead.patch` (`status`, `priority`, `assignedTo`, `followUpAt`, `lostReason`, `requirement`), `lead.note` (`text` 1–2000), `article.create/update/patch`, `page.create/update`, every master-data create/update, `settings.update` (deep shape of §6.13), `seoSettings.update`, `auth.login`, `auth.profile`, `auth.password`, `newsletter.subscribe`, `jobApplication.create`, `bulk` (`ids` int[] non-empty, `action` enum, `payload?`), `redirect` (`fromPath` starts with `/`, `toPath`, `statusCode` 301|302).
6. **`mock-server/schemas/models.js` (CommonJS).** One descriptor per collection: `{ collection, singleton?, slugField?, searchable: [...], sortable: [...], defaultSort, publicScope: { isActive: true } | null, publicOmit: [...], fields: {...} }` using the same field mini-language, with **all** fields of §6 and their defaults. Export `MODELS` (object) and `getModel(name)`. `mock-server/schemas/README.md` explains the mini-language and how rules map to Laravel (`required|string|max:300`, `nullable|integer|exists:localities,id`, `in:sale,rent,lease`, …).
7. **`src/services/endpoints.js` (CommonJS, D36b — `require`d by `scripts/smoke-api.js` and the guidelines generator).** The complete registry of §5.14 in the exact entry shape of §5.15 (`key, method, path, auth, module, description, query, body, response, example`), grouped as listed there. `example` uses ids/slugs that prompt 10 must honour: `properties.bySlug` example `lakeview-heights-3-bhk-whitefield` (prompt 10 creates it), article `karnataka-rera-guide-for-homebuyers`, locality `whitefield`, developer `aurelia-estates`, page `about`, job `real-estate-advisor-bengaluru`. Export `endpoints`, `allEndpoints()`, `findEndpoint(key)`. `src/services/endpoints.test.js`: keys are unique and equal `group.action` naming, every `path` starts with `/`, every `auth` ∈ the allowed set, every entry with `body` references an existing schema key, at least 120 entries exist, every path in §5.14 is present (hardcode the expected list in the test).
8. **`scripts/check-endpoints.js`.** Scans `src/**/*.{js,jsx}` except `src/services/endpoints.js` and `src/services/endpoints.test.js`; fails (exit 1, listing file:line) when a line contains `http.request(` / `http.get(` / `axios.` with a string literal path, or a string literal matching `^/(admin|auth|properties|leads|articles|localities|developers|pages|settings|seo|media|jobs|newsletter|redirects|sitemap)(/|$)` inside `src/services/*.js` other than the registry; also fails when a registry `path` contains `_` (snake_case) or `:` params not declared in the entry key comment (skip). Add it to `npm run lint` (`"lint": "eslint … --max-warnings=0 && node scripts/check-endpoints.js"`). Until prompt 11 the old `api.js`/`seoService.js` would fail this check → add a temporary allow-list `scripts/check-endpoints.allow.json` `["src/services/api.js", "src/services/seoService.js"]` that prompt 11 empties (record in "Pending rewrites").
9. **`src/config/rbac.js`.** Keep exports `ROLES`, `ROUTE_PERMISSIONS`, `NAV_ITEMS`, `hasRouteAccess`, `getNavItemsForRole`, `getDefaultRoute` (signatures unchanged so current consumers compile) and add `PERMISSIONS` (the §7 matrix: `dashboard: { view: all }`, `properties: { view: all, create/edit/delete/bulk/duplicate: [admin, manager] }`, `masterData: { view/create/edit/delete: [admin, manager] }`, `leads: { view: all, edit: all, claim: [sales], assign: [admin, manager], delete: [admin, manager], bulk: [admin, manager], export: all }`, `articles`, `content`, `seo`, `media`: `[admin, manager]` for everything, `settings: { view: [admin, manager], edit: [admin] }`, `users: { *: [admin] }`, `profile: { *: all }`) and `can(role, area, action)`. `NAV_ITEMS` becomes the **final** admin navigation (with `roles`): Dashboard `/admin/dashboard`; Properties (children All `/admin/properties`, Add `/admin/properties/add`); Leads `/admin/leads` (badge); Articles (All `/admin/articles`, Add `/admin/articles/add`, Categories `/admin/articles/categories`, Tags `/admin/articles/tags`, Authors `/admin/articles/authors`); Pages `/admin/pages`; FAQs `/admin/faqs`; Master data (Localities `/admin/master-data/localities`, Cities `/admin/master-data/cities`, Property types `/admin/master-data/property-types`, Amenities `/admin/master-data/amenities`, Badges `/admin/master-data/badges`, Developers `/admin/master-data/developers`, Banks `/admin/master-data/banks`); Content (Testimonials `/admin/testimonials`, Team `/admin/team`, Partners `/admin/partners`, Jobs `/admin/jobs`, Job applications `/admin/jobs/applications`, Newsletter `/admin/newsletter`); Media `/admin/media`; SEO (Dashboard `/admin/seo`, Settings `/admin/seo/settings`, Redirects `/admin/seo/redirects`, Guide `/admin/seo/guide`); Settings `/admin/settings` (+ Users `/admin/settings/users` admin-only); Profile `/admin/profile`. Routes that do not exist yet simply render 404 inside the admin layout until their prompt; the sidebar may show them (acceptable; note it in the state file).
10. `npm run format`, lint, tests, build.

## 5. Data contract touched
Documented (not yet served): every endpoint of §5.14. Schemas/models created. No `db.json` change. npm script `lint` extended with `check-endpoints`.

## 6. UI/UX requirements
N/A (the admin sidebar now lists the final navigation; missing pages show the admin 404 — acceptable for this prompt).

## 7. Edge cases that must work
- `require('../src/config/enums')` works from a Node script (`node -e "console.log(require('./src/config/enums').LEAD_SOURCES.values.length)"` → 29) **and** `import { LEAD_SOURCES } from '../config/enums'` compiles under CRA and Jest.
- `endpoints.test.js` catches a missing endpoint when one is removed (temporarily remove one and confirm the test fails; restore).
- `check-endpoints.js` ignores strings in comments/tests? — it does not need to: keep the registry as the only file with API paths; test files may reference registry keys, not paths.
- `getNavItemsForRole('sales')` returns Dashboard, Properties (All only — no "Add"), Leads, Profile.
- `can('sales', 'leads', 'delete')` → false; `can('manager', 'settings', 'edit')` → false; `can('manager', 'settings', 'view')` → true.

## 8. Acceptance criteria
- [ ] `docs/API_CONTRACT.md`, `docs/DATA_MODEL.md` (with the mapping table), `docs/RBAC.md` exist and contain every endpoint / every field of the master context.
- [ ] `src/config/enums.js` exports every enum of §6.17; `enums.test.js` passes.
- [ ] `src/services/endpoints.js` contains ≥ 120 entries covering every path in §5.14; `endpoints.test.js` passes.
- [ ] `src/services/schemas/*` and `mock-server/schemas/models.js` load in Node and in Jest; each model lists every field of §6 with defaults.
- [ ] `src/config/rbac.js` exports `PERMISSIONS` and `can()`; old exports still work; the admin sidebar shows the final navigation per role.
- [ ] `npm run lint` (incl. `check-endpoints` with the temporary allow-list), `npm run test:ci`, `npm run build:ci`, `npm run check:traces` pass.
- [ ] One commit; clean tree.

## 9. Verification
```
node -e "const e=require('./src/config/enums'); console.log(e.LEAD_SOURCES.values.length, e.SEO_SCORE_BANDS.bandOf(81), e.AREA_UNITS.toSqft(1,'acre'))"
node -e "const {allEndpoints}=require('./src/services/endpoints'); console.log(allEndpoints().length)"
npm run lint
npm run test:ci
npm run build:ci
npm run check:traces
```
Manual QA: log in to `/admin` as admin, manager and sales (mock not available yet — use the existing HOM-shaped `AdminAuthContext` flow which fails without an API: verify the sidebar structure by temporarily reading `NAV_ITEMS` in a Node one-liner instead: `node -e "console.log(require('./src/config/rbac').getNavItemsForRole('sales').map(i=>i.label))"` — expected `['Dashboard','Properties','Leads','Profile']`). Open `/` and `/properties` at 390 px: unchanged.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 05 report; Pending rewrites: "`scripts/check-endpoints.allow.json` contains api.js/seoService.js → prompt 11"; Known issues: BUG-02/BUG-04/BUG-09 marked "contract defined; code migration in 08–11/28"; next prompt: 06.
- `docs/DECISIONS.md`: D14, D20, D23, D25, D36, D36b, D38, D56, D58–D61, D76–D78, D88–D91.

## 11. Commit
`git add -A && git commit -m "docs(contract): API contract, data model, RBAC; add enums, endpoint registry and schema descriptors"`

## 12. Guardrails
- Do not touch: UI components, pages, `db.json`, `services/api.js`, `services/seoService.js`, `theme.js`, `global.css`.
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality.
