# Prompt 06 — Mock server core (Express + JSON Server library), runtime db, envelope, starter seed, seed validator

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §5 API contract, §6 Data model, §10 Mock server design, §3.4 scripts, §13 D9/D14/D19/D21), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–05 are done; working tree clean; `npm install` run.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
There is no backend. `db.json` at the root still has the HOM shape (string ids `"1"`, `"b998"`, `"8a37"`; collections `properties`, `leads`, `neighborhoods`, `partners`, `faqs`, `articles`, `siteSettings`, `adminUsers`). `mock-server/schemas/models.js` (prompt 05) describes the **target** collections and fields; `src/config/enums.js` holds the enums (CommonJS); `src/services/endpoints.js` lists every endpoint. `package.json` scripts `dev` = `react-scripts start`, no `mock`. `.gitignore` already ignores `/mock-server/.runtime/`.

## 2. Objective
When this prompt is finished `npm run mock` starts an Express server on `MOCK_PORT` (4000) that serves a **new-shape** `db.json` through JSON Server 0.17.4 used as a library, with the envelope/error/timestamp/id/PATCH-vs-PUT semantics of §5, query translation for generic collections, public `isActive` scoping, CORS, optional latency, request logging, a runtime copy of the seed (`mock-server/.runtime/db.json`) with `npm run mock:reset`, and root mirrors for the sitemap/robots/rss/llms paths (returning 501 placeholders until prompt 09). The root `db.json` is replaced by a **starter seed** in the target shape (small but complete: every collection present, every field present, referential integrity, integer ids) that passes `npm run validate:seed`; prompt 10 expands it. `npm run dev` runs mock + web together. Auth/RBAC and the custom domain routes come in prompts 07–09.

## 3. Scope
### Files to create
- `mock-server/server.js`, `mock-server/app.js` (exports `createApp()` for tests/smoke), `mock-server/db.js`, `mock-server/reset.js`, `mock-server/config.js`, `mock-server/README.md`
- `mock-server/middleware/envelope.js`, `errors.js`, `timestamps.js`, `validate.js`, `queryTranslate.js`, `publicScope.js`, `requestLog.js`, `rateLimit.js`
- `mock-server/lib/ids.js`, `paginate.js`, `sort.js`, `filters.js` (generic helpers only; domain filters in 08/09), `slug.js`, `embed.js`, `scope.js`, `enums.js` (`module.exports = require('../../src/config/enums')`), `models.js` (`require('../schemas/models')`), `xml.js`, `csv.js` (stubs with the signatures used later are acceptable only if fully implemented — implement `csv.toCsv(rows, columns)` and `xml.escape/element` now)
- `scripts/validate-seed.js`
- `db.json` (rewritten starter seed — see task 8)
- `docs/SEED_GUIDE.md` (first version: how the seed is structured, ids, how to reset)
### Files to modify
- `package.json` (scripts `mock`, `mock:reset`, `dev`, `validate:seed`, `lint` globs add `"mock-server/**/*.js"`, `check:all` adds `validate:seed`; devDependencies), `.env.example` (mock vars already documented — verify), `docs/PROJECT_STATE.md`, `docs/DECISIONS.md`, `docs/CODEBASE_INVENTORY.md` (db section → "replaced in prompt 06")
### Files to delete
- none
### May also touch
- nothing else

## 4. Detailed tasks
1. `npm i -D json-server@0.17.4 express@4.22.3 cors@2.8.6 concurrently@9.2.1`. Confirm with `npm ls json-server express` that 0.17.4/4.22.3 are installed.
2. **`mock-server/config.js`:** reads `process.env` → `{ port: MOCK_PORT||4000, delayMs: MOCK_DELAY_MS||0, tokenTtlHours: MOCK_TOKEN_TTL_HOURS||24, fresh: MOCK_FRESH==='1', seedPath: path.join(__dirname,'..','db.json'), runtimePath: path.join(__dirname,'.runtime','db.json'), corsOrigins: ['http://localhost:3000','http://127.0.0.1:3000','http://localhost:5000'] }`.
3. **`mock-server/db.js`:** `ensureRuntimeDb({ fresh })` copies the seed to the runtime path when missing or `fresh`; `createRouter()` = `jsonServer.router(runtimePath)` (lowdb file adapter; JSON Server writes the runtime file on each mutation); exports `{ router, db: router.db, ensureRuntimeDb }` plus helpers `getCollection(name)` (lowdb chain `db.get(name)`), `getSingleton(name)`, `write()`; `mock-server/reset.js` deletes the runtime file and re-copies the seed, printing "Runtime db restored from db.json".
4. **`mock-server/app.js`:** `createApp({ router, config })` → Express app with `cors({ origin: config.corsOrigins, credentials: false })`, `express.json({ limit: '5mb' })`, `requestLog` (one line: `METHOD /path → status (ms)`), optional delay middleware, `res.ok/res.created/res.message` (envelope middleware), a `/api/health` route `{ data: { status: 'ok', time, version } }`, mount point for custom routers (`app.use('/api', customRouters)` — an array filled by prompts 07–09; register a placeholder `mock-server/routes/index.js` exporting `[]`), then `queryTranslate` + `publicScope` + the JSON Server router under `/api` with `router.render = envelope` (wrap arrays as `{ data, meta }` using `X-Total-Count` from JSON Server for `meta.total`, compute `page/perPage/totalPages` from the translated query; wrap objects as `{ data }`; DELETE → `{ data: null, message: 'Deleted' }`; POST → 201), root mirrors `GET /sitemap.xml|/sitemap-*.xml|/robots.txt|/rss.xml|/llms.txt` → forward to `/api/<same>` (prompt 09 implements them; until then respond `501 { message: 'Not implemented until prompt 09' }`), `404 { message: 'Not found' }` for unknown `/api/*`, and the `errors` handler (maps `ApiError` and validation errors to §5.3; unknown errors → 500 with `message: 'Internal server error'` and the stack logged to stderr).
5. **Middleware details.** `timestamps.js`: on POST set `createdAt`/`updatedAt` = now ISO, `id` = `ids.nextId(collection)`; on PUT/PATCH set `updatedAt`, preserve `createdAt` and `id`, strip client-sent read-only fields (`id` in body, `createdAt`, `updatedAt`, `viewCount`, `enquiryCount`, embedded read objects such as `locality`, `city`, `propertyType`, `developer`, `amenities`, `badges`, `property`, `assignedUser`, `category`, `author`, `tags`, `job`, `propertyCount`, `articleCount`, `readingTimeMinutes`, `wordCount`, `contentText`). **PUT semantics:** load the model, build `defaults` from field descriptors, merge `{ ...defaults, ...body, id, createdAt }`. **PATCH semantics:** JSON Server's PATCH already merges shallowly; deep-merge one level for object fields (`pricing`, `area`, `location`, `configuration`, `project`, `sectionVisibility`, `seo`, `agent`) so `PATCH { seo: { title } }` keeps the other `seo` keys (implement in `timestamps.js` or a dedicated `deepPatch.js`). `validate.js`: `validateBody(schemaDescriptor, body, { partial })` → 422 `{ message: 'The given data was invalid.', errors: { field: [msg] } }` implementing `required`, types (`string/int/number/bool/enum/date/datetime/email/phone/url/html/slug/array/object`), `min/max/maxLength`, `enum`, `items`, nested `shape` with dotted keys, `unique` (checks the collection, excluding the current id). `queryTranslate.js`: for requests that reach the generic router, map `page→_page`, `perPage→_limit` (cap 100; `all` → no limit for `/admin/*` only), `sort→_sort`, `order→_order`, `q→q`, `isActive=true|false → isActive=true|false` (JSON Server parses booleans), comma values → repeated params (`localityId=4,7` → `localityId=4&localityId=7`), and drop unknown params. `publicScope.js`: for non-`/api/admin` GET requests on collections whose model has `publicScope`, force `isActive=true` (and `status=published` for articles/pages), and strip `publicOmit` fields from responses (implemented in `router.render` via `res.locals.public`). `rateLimit.js`: `rateLimit({ windowMs: 60000, max: 10 })` keyed by IP → 429 (used by prompts 08/09). `errors.js`: `class ApiError extends Error { constructor(status, message, errors) }` + `notFound()`, `forbidden()`, `unauthorized()`, `conflict()`, `validation(errors)` helpers.
6. **Lib.** `ids.nextId(collection)` = `max(id)+1` (1 when empty). `paginate(items, { page, perPage })` → `{ data, meta }`. `sort(items, sortSpec)` supporting field paths (`pricing.price`) and multi-key specs. `filters.js` generic helpers: `matchesQ(item, fields, q)`, `inCsv(param)`, `toBool(param)`, `range(value, min, max)`. `slug.js`: `slugify(text)` (lowercase, ASCII, hyphens, ≤ 75 chars, no leading/trailing hyphen — implement without the `slugify` npm package on the server: transliterate common Latin diacritics, drop others), `ensureUniqueSlug(collection, slug, excludeId)` (`-2`, `-3`…), `checkSlug(collection, slug, excludeId)` → `{ available, suggestion }`. `embed.js`: `embedProperty(p)`, `embedLead(l)`, `embedArticle(a)`, `embedLocality(l)`, `embedDeveloper(d)`, `embedJobApplication(j)` producing the read objects of §5.5 (prompt 08/09 wire them). `scope.js`: `publicProperty(p)` (strip `createdBy/updatedBy`, agent contact fields unless `showOnListing`), `publicAuthor`, `publicSettings`, `publicSeoSettings`.
7. **Scripts.** `package.json`: `"mock": "node mock-server/server.js"`, `"mock:reset": "node mock-server/reset.js"`, `"dev": "concurrently -n mock,web -c blue,green \"npm run mock\" \"npm start\""`, `"validate:seed": "node scripts/validate-seed.js"`, extend `lint` globs, add `validate:seed` to `check:all`. `mock-server/server.js`: `ensureRuntimeDb`, `createApp`, `listen(port)`, prints `Mock API: http://localhost:4000/api (runtime db: mock-server/.runtime/db.json)`.
8. **Starter seed (`db.json`, rewritten).** Target shape only, integer ids from 1, ISO timestamps, every collection of §6 present (`properties`, `localities`, `cities`, `propertyTypes`, `amenities`, `badges`, `developers`, `banks`, `leads`, `articles`, `articleCategories`, `articleTags`, `authors`, `faqs`, `testimonials`, `teamMembers`, `partners`, `pages`, `jobOpenings`, `jobApplications`, `media`, `siteSettings` (object), `seoSettings` (object), `redirects`, `newsletterSubscribers`, `adminUsers`, `apiTokens` (empty array), `propertyViews` (empty array)). Minimum content: 1 city; 6 localities (id 1 slug `whitefield`: Whitefield, Sarjapur Road, Electronic City, Hebbal, Koramangala, Yelahanka) with descriptions/coordinates; all 17 property types (§6.3); 20 amenities across all categories; 8 badges; 3 developers (fictional; id 1 slug `aurelia-estates`); 3 banks (fictional); **6 properties** converted from the HOM records with the §6.15 mapping (ids 1–6; one of them must be slug `lakeview-heights-3-bhk-whitefield` — retitle the Whitefield apartment record accordingly; include one rent listing, one under-construction with timeline, one villa), each with ≥ 3 images, cover, alt, amenities, unit configurations, faqs, `seo` object with defaults; 4 article categories, 15 tags, 3 authors, **3 articles** (short HTML placeholder bodies ≥ 300 words, `status: published`, one with slug `karnataka-rera-guide-for-homebuyers`); 8 FAQs; 2 testimonials (`isSample: true`); 2 team members (placeholder); 3 partners (fictional); **pages**: `home` and `about` only (blocks per §6.10, placeholder copy); 1 job (`real-estate-advisor-bengaluru`); 0 applications; 6 leads (mapped sources, statuses, notes/activities); `siteSettings` and `seoSettings` fully populated with placeholders (§6.13/§6.14, D-placeholders §14, robots default §9.8, title templates §9.5); 2 redirects (`/buy/pre-launch` is **not** a redirect — it is a route; use `/old-properties` → `/properties` and `/blog` → `/insights/articles`); 2 subscribers; 3 admin users (§6.14 credentials); media records for every image URL used. Keep the file readable (2-space indent, keys in a stable order: `id`, `slug`, `title`… then the rest as in §6).
9. **`scripts/validate-seed.js`:** loads `db.json`, validates every record of every collection against `mock-server/schemas/models.js` (types, required, enums, defaults present), checks integer unique ids per collection, ISO timestamps, unique slugs/e-mails, referential integrity (`localityId`, `cityId`, `propertyTypeId`, `developerId`, `amenityIds`, `badgeIds`, `similarPropertyIds`, `categoryId`, `tagIds`, `authorId`, `assignedTo`, `propertyId`, `jobId`, `agent.teamMemberId`, `relatedArticleIds`, `relatedPropertyIds`, `faq.faqIds` inside page blocks, `media` URLs used exist), exactly one `isCover` per non-empty `images[]`, `sectionVisibility` has all 18 keys, `seo` objects have the §9.6 shape, no HOM/placehold/dzbiw7t4i/gumlet strings (reuse the regex list from `check-traces`), and prints a summary table (collection → count → errors); exit 1 on any error. Also `--stats` prints counts only.
10. `mock-server/README.md`: how to run, env vars, runtime db, reset, envelope examples, how to add a route (for prompts 07–09), how PATCH/PUT differ.
11. Verify: `npm run validate:seed`; `npm run mock` then `curl http://localhost:4000/api/health`, `curl "http://localhost:4000/api/properties?page=1&perPage=2"` → envelope with `meta.total = <active count>`, `curl http://localhost:4000/api/properties/1` → `{ data }` (or 404 when inactive), `curl -X PATCH -H "Content-Type: application/json" -d "{\"isFeatured\":true}" http://localhost:4000/api/admin/properties/1` → note: without auth (prompt 07) admin routes are open for now — acceptable, document it; then `GET /api/admin/properties/1` shows `isFeatured: true` and all other fields intact; `PUT` with a partial body fills defaults; `POST /api/leads` with an invalid body → 422 in Laravel format; `npm run mock:reset` restores.

## 5. Data contract touched
Served now (generic, unauthenticated until 07): `GET /api/health`, generic CRUD for every collection at `/api/<collection>` and `/api/admin/<collection>` with the envelope, query translation and public scoping. `db.json` replaced by the starter seed (new shape). npm scripts: `mock`, `mock:reset`, `dev`, `validate:seed`. Env vars: `MOCK_PORT`, `MOCK_DELAY_MS`, `MOCK_TOKEN_TTL_HOURS`, `MOCK_FRESH`. Dev deps: `json-server@0.17.4`, `express@4.22.3`, `cors@2.8.6`, `concurrently@9.2.1`.

## 6. UI/UX requirements
N/A (the React app still talks to the old shapes and will show empty states/errors — expected until prompt 11; it must not crash on the new shapes: verify `/` and `/properties` render their empty/error states).

## 7. Edge cases that must work
- `perPage=all` on a public endpoint → treated as default 12; on `/api/admin/*` → everything.
- `page=999` → empty `data`, correct `meta`.
- `PATCH` with an unknown field → ignored (not stored) and 200; `PATCH` with a wrong type → 422.
- `PUT /api/admin/properties/1` with `{ title: 'X' }` only → 422 for missing required fields (`listingType`, `propertyTypeId`, …), not a silent wipe.
- `DELETE` twice → second returns 404.
- Runtime db locked/corrupt → `mock:reset` recovers; the server prints a clear error when `db.json` is invalid JSON.
- Windows paths and `concurrently` quoting work in `cmd.exe`.
- `MOCK_DELAY_MS=800` adds latency to every response (used later for skeleton QA).

## 8. Acceptance criteria
- [ ] `npm run validate:seed` passes on the new `db.json`; `--stats` prints counts for all 27 collections/singletons.
- [ ] `npm run mock` serves `/api/health`, envelopes lists/objects/deletes exactly per §5.2, returns 404/422/500 per §5.3.
- [ ] Public GETs exclude inactive records; `/api/admin/*` include them.
- [ ] PATCH keeps untouched fields (verified on `properties/1` and on a nested `seo` patch); PUT applies model defaults; POST assigns `id = max+1` and timestamps.
- [ ] `npm run mock:reset` restores the runtime db; `MOCK_FRESH=1 npm run mock` re-seeds.
- [ ] `npm run dev` starts both processes (Ctrl+C stops both).
- [ ] `npm run lint` (now including `mock-server/**`), `npm run test:ci`, `npm run build:ci`, `npm run check:traces` pass.
- [ ] One commit; clean tree.

## 9. Verification
```
npm run validate:seed
npm run lint
npm run test:ci
npm run build:ci
npm run check:traces
npm run mock   (in a second terminal, then:)
curl http://localhost:4000/api/health
curl "http://localhost:4000/api/properties?perPage=2"
curl -X PATCH -H "Content-Type: application/json" -d "{\"isFeatured\":true}" http://localhost:4000/api/admin/properties/1
curl http://localhost:4000/api/admin/properties/1
npm run mock:reset
```
Manual QA:
1. Start `npm run dev`; open `http://localhost:3000/` — the site renders without crashing (data may be empty/errored — expected).
2. Open `http://localhost:4000/api/properties/slug/lakeview-heights-3-bhk-whitefield` — 404 for now (custom slug route arrives in 08) — confirm the JSON error envelope shape.
3. Kill the mock, corrupt `mock-server/.runtime/db.json` (write `{`), restart → clear error message; run `npm run mock:reset` → works again.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 06 report (files, scripts, env vars, endpoints served generically), Known issues: BUG-13 closed (ids/timestamps), BUG-03 partially (generic CRUD; custom routes → 07–09), note "admin routes unauthenticated until 07"; next prompt: 07.
- `docs/DECISIONS.md`: D9, D14, D19, D21, plus any seed-shape decision.

## 11. Commit
`git add -A && git commit -m "feat(mock): express + json-server core with envelope, PATCH/PUT semantics, runtime db and starter seed"`

## 12. Guardrails
- Do not touch: React source (except nothing), `theme.js`, `global.css`, docs other than the state files/SEED_GUIDE/inventory note.
- Do not add dependencies other than: `json-server@0.17.4`, `express@4.22.3`, `cors@2.8.6`, `concurrently@9.2.1` (dev).
- Do not leave TODO/FIXME comments, console.log calls (the request logger uses `console.info` inside `mock-server/`, which is allowed there), commented-out code, lorem ipsum, or HOM traces (the seed must pass `check:traces`).
- Do not reduce or remove existing functionality.
