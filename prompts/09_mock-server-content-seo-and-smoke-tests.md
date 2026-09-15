# Prompt 09 — Mock server: articles, master data, pages, media, settings, SEO settings/overview, dashboard, newsletter, redirects, jobs, sitemap/robots/rss/llms; smoke tests

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §5.13–§5.15, §6.8–§6.16, §9.5, §9.8, §10), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–08 are done; working tree clean; `npm install` run; `npm run test:mock` passes.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
Properties, leads, auth and users have custom routers; every other collection is still served by the generic JSON Server router with query translation and public scoping (fine for simple CRUD, but the contract needs slug lookups, embeds, counts, scheduling, singleton settings, the SEO overview, the dashboard, sitemaps and CSV exports). `mock-server/lib/xml.js`/`csv.js` exist. `seoSettings`/`siteSettings` are singleton objects in `db.json`. `src/services/endpoints.js` lists every endpoint with `example` ids; `scripts/smoke-api.js` does not exist yet.

## 2. Objective
When this prompt is finished **every** endpoint of `00_MASTER_CONTEXT.md` §5.14 exists on the mock with its documented behaviour, `npm run smoke` walks the whole registry and passes, and the root/`/api` sitemap, robots, RSS and llms endpoints produce valid output from data + `seoSettings`. The generic JSON Server router remains only as a fallback for collections explicitly listed as "generic" (cities, badges, amenities, property types, banks, article tags, partners, testimonials, team, redirects admin CRUD) — everything else is explicit.

## 3. Scope
### Files to create
- `mock-server/routes/articles.js`, `masterData.js` (localities, cities, property-types, amenities, badges, developers, banks, article-categories, article-tags, authors, faqs, testimonials, team, partners — explicit list routes with counts/embeds + delete guards; generic CRUD reuse via a `makeCrudRouter(model, options)` factory in `mock-server/lib/crud.js`), `pages.js`, `media.js`, `settings.js`, `seo.js`, `dashboard.js`, `newsletter.js`, `jobs.js`, `redirects.js`, `sitemap.js`
- `mock-server/lib/crud.js`, `mock-server/lib/usage.js` (usage/delete guard), `mock-server/lib/previewTokens.js`, `mock-server/lib/dashboard.js`, `mock-server/lib/sitemapBuilder.js`, `mock-server/lib/html.js` (`stripHtml`, `wordCount`, `readingTime`)
- `mock-server/__tests__/content.test.js`, `mock-server/__tests__/sitemap.test.js`
- `scripts/smoke-api.js`
### Files to modify
- `mock-server/routes/index.js`, `mock-server/app.js` (root mirrors now proxy to the sitemap router), `mock-server/middleware/publicScope.js` (generic collections list), `mock-server/README.md`, `package.json` (`smoke` script), `docs/API_CONTRACT.md`, `docs/PROJECT_STATE.md`, `docs/DECISIONS.md`
### Files to delete
- none
### May also touch
- `db.json` only if the validator requires a field the seed lacks (it should not)

## 4. Detailed tasks
1. **CRUD factory (`lib/crud.js`).** `makeCrudRouter({ model, basePath, permissions: { area }, slugged, embed, publicFilters, adminFilters, sortable, defaultSort, beforeSave, afterRead, deleteGuard })` producing: public `GET /<res>` (active scope, `q` on `model.searchable`, filters, sort, pagination), `GET /<res>/slug/:slug` (when slugged), admin `GET /admin/<res>` (`perPage=all`, `isActive` filter), `POST`, `GET /:id`, `PUT`, `PATCH`, `DELETE` (with `deleteGuard` → 409 `{ message: 'This item is in use.', errors: { id: [...] }, data: { usedBy } }`), `POST /bulk` (`activate|deactivate|delete` + `feature|unfeature` when the model has `isFeatured`), `GET /admin/<res>/check-slug` (when slugged), `PATCH` order reorders (`{ order }`). Validation via the matching `src/services/schemas` descriptor (create/update/patch modes).
2. **Usage guard (`lib/usage.js`).** `findUsages(type, id)` → `[{ type, id, title }]`: locality → properties (`location.localityId`), leads (`requirement.localityId`); city → localities, properties; propertyType → properties, faqs; amenity → properties (`amenityIds`); badge → properties; developer → properties (`project.developerId`); bank → none (delete allowed); articleCategory → articles; articleTag → articles; author → articles; faq → pages (`faq` blocks `faqIds`); testimonial → pages; teamMember → properties (`agent.teamMemberId`), pages (`team` blocks); partner → pages; job → applications; media → best-effort URL search across properties/articles/pages/settings (`usedIn`).
3. **Master data (`routes/masterData.js`).** Use the factory for each collection with: localities (slugged; embeds `city`; read `propertyCount` = active properties; public filters `zone`, `isFeatured`, `q`, `cityId`; sort `order|name|propertyCount`), cities, property-types (filter `segment`), amenities (filter `category`), badges, developers (slugged; `propertyCount`; filters `isFeatured`, `q`), banks (public: active, sorted `order`), article-categories (slugged; `articleCount` = published), article-tags (slugged; `articleCount`), authors (slugged; public strips `email`; only active), faqs (filters `category`, `showOnHome`, `propertyTypeId`; sort `order`), testimonials (filter `isFeatured`; public active only; `isSample` passes through), team (filter `showOnAbout`; slugged), partners (filter `category`; sort `order`).
4. **Articles (`routes/articles.js`).** Public `GET /api/articles`: `status === 'published' && publishedAt <= now` (a `scheduled` article whose time has passed is treated as published — also flip its `status` lazily to `published` on read), filters `categoryId|categorySlug|tagId|tagSlug|authorId|authorSlug|q|isFeatured`, sort `newest` (publishedAt desc, default) | `popular` (viewCount desc); embeds `category`, `author` (public fields), `tags`; strips `contentText`? — no, keep `contentText` out of list responses (list = `ArticleSummary`: `id, slug, title, excerpt, featuredImage, category, tags, author, publishedAt, readingTimeMinutes, isFeatured, viewCount`). `GET /api/articles/slug/:slug` (published, or any status with a valid `?preview=` token; `viewCount++` on non-preview reads, debounced like properties), `GET /api/articles/trending` (top 6 by viewCount). Admin CRUD via the factory with: `beforeSave` computes `contentText` (`lib/html.stripHtml`), `wordCount`, `readingTimeMinutes` (`ceil(words/200)`, min 1), sets `publishedAt` on first publish (`status: published` without a date), validates `scheduled` requires a future `publishedAt`, mirrors `seo.slug`; admin filters `status|categoryId|authorId|tagId|q|isFeatured`; sorts `updatedAt|publishedAt|title|viewCount`; bulk `publish|unpublish|archive|delete|feature|unfeature`; `GET /admin/articles/:id/preview-token` → `lib/previewTokens.js` (`{ token, url: '<siteUrl>/insights/articles/<slug>?preview=<token>' }`, in-memory + 24 h).
5. **Pages (`routes/pages.js`).** Public `GET /api/pages/slug/:slug` (published or preview token); admin CRUD via the factory (`blocks[].id` assigned like property nested ids; `order` within blocks normalised; sanitisation is a frontend concern but the mock rejects `<script` in `richText`/`html` blocks with 422 `errors['blocks.n.data.html']`), filters `status|template|q`, `GET /admin/pages/:id/preview-token`, bulk `publish|unpublish|delete`.
6. **Media (`routes/media.js`).** Admin only: `GET /admin/media` (filters `type|folder|q|provider`, sort `createdAt desc`), `POST` (metadata; `url` required; `provider` inferred from the host `res.cloudinary.com` → `cloudinary`; `type` inferred from extension when absent), `PATCH`, `DELETE` (metadata only; `usedIn` returned by `GET /:id` and in the list when `?withUsage=true`).
7. **Settings (`routes/settings.js`).** `GET /api/settings` → `scope.publicSettings(siteSettings)` (omit `leads`); `GET /api/admin/settings` (full); `PUT /api/admin/settings` (validate `settings.update`; deep-merge **known keys only** — unknown top-level keys dropped; arrays replaced; `updatedAt` set; `settings.edit` permission → manager gets 403).
8. **SEO (`routes/seo.js`).** `GET /api/seo/settings` (public subset: everything except `robotsTxt`, `llmsTxt`, `sitemap.excludeUrls`? — keep them public too except nothing sensitive exists; decision: return the full object minus `updatedAt` is fine → **return everything**), `GET|PUT /api/admin/seo/settings` (deep-merge known keys; validate `seoSettings.update`), `GET /api/admin/seo/overview` (`type` filter, `q` on title/slug/focusKeyword, `scoreBand`, `index` (`indexed|noindex`), `perPage=all` allowed; rows `{ id, type, title, slug, url, seo, isActive, status, updatedAt }` for properties, articles, pages, localities, developers, articleCategories, authors, propertyTypes; `url` = the public path built from `seoSettings.siteUrl`).
9. **Dashboard (`routes/dashboard.js`, `lib/dashboard.js`).** Implement §6.16 exactly (all stats, 30-day `leadsByDay`/`viewsByDay` from `propertyViews`, `leadsBySource`, `leadsByStatus`, `recentLeads`, `topProperties` by `viewCount + enquiryCount*5`, `seoHealth` from stored `seo.score/scoreBand/focusKeyword/description` across properties+articles+pages+localities+developers, `upcomingFollowUps` (`followUpAt` in the next 14 days, not lost/converted), sales scoping for lead figures).
10. **Newsletter (`routes/newsletter.js`).** `POST /api/newsletter/subscribe` (rate limit; honeypot; validate e-mail; existing `subscribed` → 200 `{ data: null, message: 'Already subscribed' }`; existing `unsubscribed` → re-subscribe 200; new → 201 `{ data: subscriber }`), admin `GET /admin/newsletter-subscribers` (filters `status|q`), `DELETE /:id`, `GET /admin/newsletter-subscribers/export` (CSV with BOM: `Email, Name, Source, Status, Subscribed At`).
11. **Jobs (`routes/jobs.js`).** Public `GET /api/jobs` (active and (`closesAt` null or future), sort `postedAt desc`), `GET /api/jobs/slug/:slug`, `POST /api/jobs/:id/apply` (rate limit; honeypot; validate `jobApplication.create`: `name`, `email`, `phone`, `resumeUrl` (url, required), `coverLetter?` ≤ 3000, `linkedinUrl?`; job must be active → 201 `{ data: application }`); admin: jobs CRUD via the factory (slugged; filters `isActive|department|q`; bulk), `GET /admin/job-applications` (filters `jobId|status|q`; embeds `job`), `PATCH|DELETE /admin/job-applications/:id`.
12. **Redirects (`routes/redirects.js`).** Public `GET /api/redirects` (active, `{ fromPath, toPath, statusCode }`), `GET /api/redirects/resolve?path=` (increments `hits`, returns the match or 404 — used by smoke/QA only), admin CRUD via the factory (validate `fromPath` starts with `/` and is unique, `toPath` non-empty, `statusCode` 301|302, no loop `fromPath === toPath`, no chain where `toPath` equals another active `fromPath` → 422), bulk `activate|deactivate|delete`, `POST /admin/redirects/import` (`{ rows: [{fromPath,toPath,statusCode}] }` → upserts by `fromPath`, returns `{ data: { created, updated, skipped } }`), `GET /admin/redirects/export` (CSV).
13. **Sitemap & co. (`routes/sitemap.js`, `lib/sitemapBuilder.js`).** Using `seoSettings.siteUrl`, `sitemap.*`, `changefreq/priority` defaults and per-entity `seo.sitemap` overrides (`include:false` excludes; `priority/changefreq` override), `excludeUrls`: `GET /api/sitemap.xml` (sitemap index listing the five child sitemaps with `<lastmod>` = max `updatedAt` of each set), `/api/sitemap-properties.xml` (active properties; `<lastmod>` = `updatedAt`; `<image:image>` entries with `<image:loc>` + `<image:title>` for up to 5 images), `/api/sitemap-localities.xml`, `/api/sitemap-developers.xml`, `/api/sitemap-articles.xml` (published; also category/tag/author pages), `/api/sitemap-pages.xml` (published pages + static routes: `/`, `/properties`, `/buy`, `/rent`, `/lease`, `/commercial`, `/plots`, `/buy/pre-launch`, `/buy/under-construction`, `/buy/ready-to-move`, `/buy/resale`, `/localities`, `/builders`, `/insights/articles`, `/insights/faqs`), `GET /api/robots.txt` (`seoSettings.robotsTxt` with `%siteurl%` replaced + one `Sitemap:` line per child sitemap), `GET /api/rss.xml` (RSS 2.0, latest 20 published articles: `title`, `link`, `guid`, `pubDate`, `description` (excerpt), `category`, `author`), `GET /api/llms.txt` (`seoSettings.llmsTxt` if non-empty, otherwise generated per §9.8; `GET /api/admin/seo/llms-preview` returns the generated version for the settings UI "regenerate from data"). All `text/xml; charset=utf-8` / `text/plain; charset=utf-8`, no envelope, `Cache-Control: public, max-age=3600`. Root mirrors in `app.js` call the same handlers.
14. **`scripts/smoke-api.js`.** Node 18+ `fetch`; args `--baseUrl` (default `http://localhost:4000/api`), `--email/--password` (defaults admin seed), `--managerEmail/--salesEmail` (defaults), `--verbose`. Steps: health; login as admin/manager/sales (store tokens); for every registry entry (`require('../src/services/endpoints').allEndpoints()`): build a request from `path` + `example` (`:id`/`:slug` from `example`; for `:noteId`, `:token` etc. use values created earlier in the run), send with the minimal required token, assert the expected status class and envelope (`data` key; lists have `meta.page/perPage/total/totalPages`; property lists have `meta.facets`; text endpoints return XML/text); then targeted assertions: 401 without token on an admin route; 403 for sales on `POST /admin/properties` and `GET /admin/users`; `PATCH` keeps untouched fields (property `title` unchanged after patching `isFeatured`); `PUT` fills defaults; slug lookup 404 for inactive; `bedrooms=3` filter purity; `POST /leads` 201 + honeypot 200-without-storage + 422 on bad phone + legacy source mapping; `check-slug`; `duplicate`; `bulk`; CSV BOM; sitemap index well-formed (regex `<sitemapindex`), robots contains `Sitemap:`; redirects resolve; dashboard shape keys; newsletter dedupe; seo overview rows; preview token works. Cleanup: delete everything the run created (properties/leads/users/subscribers/applications). Output: a table `key | method | path | expected | actual | ok` and totals; exit code 1 on any failure. `"smoke": "node scripts/smoke-api.js"`; `check:all` does **not** include `smoke` (needs a running server) — document.
15. Tests with `node --test` for articles (scheduling, preview, counts), pages (script rejection), settings (deep-merge, manager 403), seo overview, dashboard shape, newsletter dedupe, jobs apply, redirects validation/import, sitemap XML validity (parse with a minimal regex check + count of `<url>`), robots/llms content.
16. `docs/API_CONTRACT.md`: add captured examples for `GET /settings`, `GET /admin/dashboard`, `GET /admin/seo/overview`, `GET /sitemap.xml` snippet, `GET /robots.txt`; `mock-server/README.md`: full route list + "how to add a collection".

## 5. Data contract touched
Every remaining endpoint of §5.14 (articles, article-categories, article-tags, authors, localities, cities, property-types, amenities, badges, developers, banks, faqs, testimonials, team, partners, pages, jobs, job-applications, newsletter, settings, seo settings/overview, redirects (+ resolve/import/export), media, dashboard, sitemap family, preview tokens). npm script: `smoke`.

## 6. UI/UX requirements
N/A.

## 7. Edge cases that must work
- Scheduled article with past `publishedAt` becomes visible without a restart.
- `PUT /admin/settings` with `{ general: { siteName: 'X' } }` keeps every other `general.*` key; with `{ unknownKey: 1 }` drops it.
- Deleting a locality used by a property → 409 with `usedBy`; after unlinking the property → 200.
- `GET /api/localities` `propertyCount` counts only active properties.
- Sitemap excludes properties with `seo.sitemap.include === false` and URLs listed in `seoSettings.sitemap.excludeUrls`; `<image:image>` omitted when no images.
- `GET /api/authors` never exposes `email`.
- `POST /api/jobs/:id/apply` on a closed job → 404 `{ message: 'This opening is closed.' }`.
- Smoke script against a real base URL with a self-signed certificate is out of scope (document `NODE_TLS_REJECT_UNAUTHORIZED` is **not** used).

## 8. Acceptance criteria
- [ ] `npm run smoke` passes with 0 failures against the running mock (record the totals in the state file).
- [ ] Every endpoint of §5.14 is present in `mock-server/routes/*` or the CRUD factory (cross-check against `allEndpoints()` — the smoke script fails otherwise).
- [ ] Sitemap index + 5 sitemaps, robots, rss, llms served at both `/api/...` and `/...`, valid XML/text.
- [ ] Dashboard, SEO overview, settings deep-merge, preview tokens, newsletter dedupe, jobs apply, redirects import/export work (tests).
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
npm run mock      (second terminal)
npm run smoke
curl http://localhost:4000/sitemap.xml
curl http://localhost:4000/robots.txt
curl http://localhost:4000/api/rss.xml
curl http://localhost:4000/llms.txt
curl "http://localhost:4000/api/admin/seo/overview?type=property" -H "Authorization: Bearer <token>"
```
Manual QA: open `http://localhost:4000/sitemap-properties.xml` in a browser (renders as XML); `GET /api/articles/slug/karnataka-rera-guide-for-homebuyers` returns the article with `category`, `author`, `tags` embedded and `readingTimeMinutes`.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 09 report (all endpoints, `smoke` totals), Known issues: BUG-03 closed, BUG-15 server side (honeypot/dedupe) closed, BUG-18 server side closed; next prompt: 10.
- `docs/DECISIONS.md`: D21, D28, D88, factory design, `seo/settings` public scope decision, smoke not in `check:all`.

## 11. Commit
`git add -A && git commit -m "feat(mock): content, master data, pages, media, settings, seo, dashboard, newsletter, jobs, redirects, sitemaps; smoke tests"`

## 12. Guardrails
- Do not touch: React source, `theme.js`, `global.css`.
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality.
