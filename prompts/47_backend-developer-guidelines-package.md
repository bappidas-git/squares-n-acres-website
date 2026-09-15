# Prompt 47 — Backend developer handover package: generator script, backend notes, full `backend_developer_guidelines/` (contract, auth, endpoints, models, schema.sql, business rules, SEO/sitemap, deployment, testing/parity, Postman, OpenAPI, seed copy)

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §5 API contract, §5.14/§5.15 registry, §6 data model, §7 RBAC, §9.8/§9.9/§9.10, §10 mock rules, the master spec BDG-01…BDG-03 and SEO-18 restated below, §13 D36b), then `docs/PROJECT_STATE.md`, `docs/DECISIONS.md`, `docs/API_CONTRACT.md`, `docs/DATA_MODEL.md`, `docs/RBAC.md`, `docs/SEO_ENGINE.md`, `docs/PERFORMANCE.md`, `mock-server/README.md`.
- Confirm prerequisites: prompts 01–46 are done; working tree clean; `npm install` run; `npm run mock` running (the generator captures live examples).
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
Sources of truth (all CommonJS-loadable from Node): `src/services/endpoints.js` (registry: key/method/path/auth/module/description/query/body/response/example), `src/services/schemas/*.js` (body descriptors), `src/config/enums.js`, `mock-server/schemas/models.js` (collections/fields/defaults/searchable/sortable/publicScope), `mock-server/routes/*` (behaviour), `scripts/smoke-api.js` (accepts `--baseUrl`), `db.json` (seed). Docs exist for contract/model/RBAC/SEO/performance. `docs/backend-notes/` does not exist yet. The package folder `backend_developer_guidelines/` does not exist.

## 2. Objective
When this prompt is finished `npm run generate:backend-guidelines` (`scripts/generate-backend-guidelines.js`) deterministically regenerates the complete package of `00_MASTER_CONTEXT.md` §10/BDG-02 from the registry, schemas, enums, models, `docs/backend-notes/*.md` (hand-written enrichment merged in) and live examples captured from the running mock (login as each role; call every endpoint with its `example`; store trimmed responses): `README.md`, `01_API_CONTRACT.md`, `02_AUTH_AND_RBAC.md`, `03_ENDPOINTS.md`, `04_DATA_MODELS.md`, `schema.sql`, `05_BUSINESS_RULES.md`, `06_SEO_SITEMAP_ROBOTS.md`, `07_DEPLOYMENT.md`, `08_TESTING_AND_PARITY.md`, `postman_collection.json` (v2.1, folders per module, `{{baseUrl}}`/`{{token}}` with a login test script setting the token, example requests + saved responses, tests asserting status + envelope), `postman_environment.json` (Local mock + Production template), `openapi.yaml` (OpenAPI 3.1, schemas from descriptors, every endpoint, security scheme bearer), `db.json` (byte-identical copy of the seed), `seed-mapping.md`; regeneration is idempotent (running twice yields no diff except nothing — the generator must not embed timestamps other than a fixed "generatedFrom: <git commit>" line, which is allowed to change per commit); the package is reviewed for completeness against the registry (a checker `scripts/check-guidelines.js` asserts every registry entry appears in `03_ENDPOINTS.md`, the Postman collection and `openapi.yaml`, every model in `04_DATA_MODELS.md` and `schema.sql`); the switch-over guarantee (BDG-03) is documented and testable (`npm run smoke -- --baseUrl=<url>`).

## 3. Scope
### Files to create
- `scripts/generate-backend-guidelines.js`, `scripts/lib/guidelines/` (`capture.js` (live examples), `markdown.js` (tables), `postman.js`, `openapi.js`, `sql.js` (DDL from models + relational mapping rules), `rules.js` (Laravel rule strings from descriptors), `merge.js` (notes merging by heading anchors)), `scripts/check-guidelines.js`
- `docs/backend-notes/` — `01_api_contract.md` (versioning policy `/api` unversioned now, `/api/v2` future; caching headers `Cache-Control` per endpoint class; CORS config; rate limiting `throttle:10,1`), `02_auth.md` (Sanctum token flow, TTL, hashing + rotation of seed passwords, sales scoping SQL), `04_relational_mapping.md` (which nested arrays become tables — `property_images`, `property_documents`, `property_floor_plans`, `property_unit_configurations`, `property_nearby_places`, `property_construction_timeline`, `property_faqs`, `property_amenity`, `property_badge`, `property_similar`, `lead_notes`, `lead_activities`, `article_tag`, `page_blocks`; which stay JSON — `section_visibility`, `pricing.other_charges`, `seo`, `settings`, `requirement`, `utm`, `meta`, `specifications`, `construction_specs`, `highlights`, `connectivity`, `social_links`; snake_case column table; indexes: `slug unique`, `locality_id`, `listing_type`, `construction_status`, `is_active`, `price`, `published_at`, `status`, full-text on `title, project_name, short_description` and `articles.title, content_text`), `05_business_rules.md` (every rule of §10 with exact formulas: relevance sort, bedrooms 5+, price accessor by listing type, facets, similar fill, view debounce, counters, lead activities/auto-assign/round-robin, scheduled publishing job (`php artisan schedule` every minute), preview tokens, dashboard formulas, SEO overview rows + `duplicateOf`, bulk semantics, duplicate property, CSV BOM, master-data delete guards, settings deep-merge + public subsets, redirects, newsletter dedupe, honeypot, order re-numbering, `isPossibleDuplicate`), `06_seo.md` (sitemap XML samples with images, lastmod sources, cache 1 h, robots default, rss sample, llms sample, redirect handling at Nginx + Laravel + list endpoint, canonical host rules, HTML escaping), `07_deployment.md` (env vars for both apps, CORS, Nginx server blocks: SPA `try_files $uri $uri/index.html /index.spa.html` (prerender) or `/index.html`, proxies `/api/`, `/sitemap*.xml`, `/robots.txt`, `/rss.xml`, `/llms.txt` to the API, long cache for hashed assets, no-cache for `index.html`, gzip/brotli, HTTP→HTTPS, `www` canonical redirect, security headers (CSP allowing Cloudinary/picsum/Google fonts/maps/GA/GTM/Pixel/YouTube), switch-over + rollback + go-live smoke checklist), `08_testing.md` (running mock next to Laravel, diffing responses (`scripts/smoke-api.js --baseUrl` + a `--compare=<mockUrl>` mode: add it to the smoke script — compares status + envelope keys + meta shape per endpoint and prints differences), Postman tests usage, acceptance checklist per module)
- Generated: `backend_developer_guidelines/*` (all files of §2)
### Files to modify
- `scripts/smoke-api.js` (`--compare`), `package.json` (`generate:backend-guidelines` exists — verify; add `check:guidelines`), `.gitignore` (`/backend_developer_guidelines/.tmp/`), `README.md` (section "Handover package"), `docs/*`
### Files to delete
- none
### May also touch
- `src/services/endpoints.js` (fill any missing `description`/`response`/`example` the generator flags)

## 4. Detailed tasks
1. **Generator architecture**: `node scripts/generate-backend-guidelines.js [--baseUrl] [--skip-capture]`; loads registry/schemas/enums/models; captures examples (login admin/manager/sales; for each entry call with `example` path params and minimal valid bodies for POST/PUT/PATCH on **copies** created during the run and cleaned up; store `{ request: { method, path, query, body }, response: { status, body (truncated arrays to 2 items, strings to 300 chars) } }` in `.tmp/examples.json`; deterministic ordering); renders each document from templates in `scripts/lib/guidelines/templates/*.md` (plain JS template strings — no dependency) merging `docs/backend-notes/*.md` sections by heading; writes files with LF endings and a stable key order for JSON/YAML (hand-written YAML emitter for the OpenAPI subset used).
2. **Documents** (exact content requirements of BDG-02): `README.md` (purpose, how the frontend talks to the API, the ONE switch-over step (`REACT_APP_API_URL` in `.env.production` + rebuild), how to use Postman, parity checklist, support matrix (endpoints × status: required for v1 / optional), regeneration instructions, "do not edit generated files — edit `docs/backend-notes`"); `01_API_CONTRACT.md` (§5 verbatim with examples); `02_AUTH_AND_RBAC.md` (flow diagrams as text, role matrix per endpoint from `routePermissions` + `PERMISSIONS`, seed users with the hash/rotate instruction, sales scoping); `03_ENDPOINTS.md` (one section per endpoint: method, path, auth/role, purpose, query params table (type/default/allowed), body table with Laravel rule strings (`required|string|max:300`, `nullable|integer|exists:localities,id`, `in:sale,rent,lease`, arrays `array|max:6`, nested `images.*.alt required|string`), success example (captured), error cases, side effects); `04_DATA_MODELS.md` (every collection: field/type/nullable/default/enum/relation/index; JSON-vs-relational guidance; snake_case mapping table; indexes; full-text); `schema.sql` (MySQL 8 DDL: utf8mb4, InnoDB, FKs with `ON DELETE` rules (restrict for master data used by properties; cascade for property child tables; set null for `assigned_to`), JSON columns, `created_at/updated_at`, `deleted_at` on properties/articles/pages/leads, unique indexes, full-text indexes, pivots); `05_BUSINESS_RULES.md`; `06_SEO_SITEMAP_ROBOTS.md`; `07_DEPLOYMENT.md`; `08_TESTING_AND_PARITY.md`; `postman_collection.json` + `postman_environment.json`; `openapi.yaml`; `db.json` copy; `seed-mapping.md` (table order for import, id preservation, pivot extraction, JSON columns, singleton settings rows, media/tokens omitted, passwords hashed).
3. **Checker**: `scripts/check-guidelines.js` → registry ↔ docs/Postman/OpenAPI coverage, models ↔ `04`/`schema.sql`, notes headings present, no HOM/placeholder domains except the documented `api.squaresnacres.com`/`www.squaresnacres.com`; exit non-zero on gaps; add `check:guidelines` and include it in `check:all`.
4. **Smoke `--compare`**: run the same request against two base URLs and diff status/envelope keys/meta shape/`data` key sets (first item) → table of differences; documented in `08`.
5. Run the generator twice; `git diff --stat` after the second run must be empty; run the checker; review every generated file for readability (tables render, no `undefined`, no empty sections); update README.
6. Tests: `scripts/__tests__/guidelines.test.js` (rules mapping, sql generation for a sample model, markdown tables) in `test:scripts`.

## 5. Data contract touched
None (documentation); `scripts/smoke-api.js` gains `--compare`. Scripts: `generate:backend-guidelines` (verify), `check:guidelines`.

## 6. UI/UX requirements
N/A.

## 7. Edge cases that must work
- Mock not running → generator fails fast with instructions (`--skip-capture` regenerates without examples but marks them "not captured" — the checker then fails; capture is required for the committed package).
- An endpoint returning a file (CSV/XML/text) → example stored as a truncated text sample with the content type.
- Registry entry without `example` → generator error listing the key (fix the registry).
- Idempotency: sorted keys, no dates except the commit line, LF endings, stable truncation.
- Windows: `path.join`, no shell commands, YAML/JSON written with `\n`.

## 8. Acceptance criteria
- [ ] `backend_developer_guidelines/` contains every file of §2 with the content of BDG-02; `npm run check:guidelines` passes; regeneration is idempotent (second run → no diff).
- [ ] `03_ENDPOINTS.md`/Postman/OpenAPI cover 100 % of the registry (checker); `schema.sql` covers every collection with the documented relational mapping; `db.json` copy byte-identical.
- [ ] `npm run smoke -- --baseUrl=http://localhost:4000/api` and `--compare` mode work; `08_TESTING_AND_PARITY.md` documents them; README updated.
- [ ] `npm run lint`, `npm run test:ci`, `npm run build:ci`, `npm run check:traces`, `npm run test:scripts`, `npm run check:all` pass.
- [ ] One commit; clean tree.

## 9. Verification
```
npm run mock                         (terminal 2)
npm run generate:backend-guidelines
npm run generate:backend-guidelines  (second run)
git status --short                   (only new/changed from the first run; second run adds nothing)
npm run check:guidelines
npm run smoke -- --baseUrl=http://localhost:4000/api
npm run lint
npm run test:scripts
npm run check:all
```
Manual QA: open `postman_collection.json` in Postman (human) → run the Local environment → login sets `{{token}}` → run the collection → all tests pass; open `openapi.yaml` in `https://editor.swagger.io` (human) → no errors; read `03_ENDPOINTS.md` for three endpoints and compare with the mock behaviour.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 47 report (package file list, sizes, checker output); next prompt: 48.
- `docs/DECISIONS.md`: relational mapping decisions, ON DELETE rules, versioning policy, `--compare` semantics.

## 11. Commit
`git add -A && git commit -m "docs(handover): generated backend developer guidelines package with Postman, OpenAPI, schema.sql and parity tooling"`

## 12. Guardrails
- Do not touch: React source (except registry metadata fixes), `theme.js`, `global.css`, mock behaviour (documentation only; if a doc/mock mismatch is found, fix the **mock** to match the contract and record it).
- Do not add dependencies other than: none (hand-written YAML/Postman emitters).
- Do not leave TODO/FIXME comments, console.log calls (scripts may print), commented-out code, lorem ipsum, HOM traces, or placeholder domains other than the documented `squaresnacres.com` ones.
- Do not reduce or remove existing functionality.
