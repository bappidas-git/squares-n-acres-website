# API contract — Squares N Acres

The contract the frontend, the mock server (`mock-server/`) and the future Laravel API all
implement. It is copied verbatim from `prompts/00_MASTER_CONTEXT.md` §5.1–§5.13 and
completed with the endpoint catalogue (§5.14) rendered from `src/services/endpoints.js`
and the response shapes every endpoint returns.

Companion documents: `docs/DATA_MODEL.md` (every collection and field) and
`docs/RBAC.md` (who may call what). The enums every value comes from live in
`src/config/enums.js`; the request bodies in `src/services/schemas/`.

Switching between the mock and Laravel is only a change of `REACT_APP_API_URL` — no code
knows which backend answers.

---

### 5.1 Base URL and paths

`REACT_APP_API_URL` (e.g. `http://localhost:4000/api`, later `https://api.squaresnacres.com/api`). All paths below are relative to it. Public and admin endpoints share the base; admin endpoints are prefixed `/admin/`. Casing: **the entire contract is camelCase** — request bodies, response bodies and query parameters. `db.json` is camelCase. There is **no transformation layer** in the frontend (`transformPropertyPayload`, `normalizePropertyResponse`, `normalizeListResponse`, `extractPaginationMeta`, `buildPayload` conversions and the snake↔camel mappers in `seoService.js` are deleted in prompt 11). The Laravel developer maps `snake_case` columns to camelCase JSON in API Resources.

### 5.2 Success envelope

- Single resource → `{ "data": { … } }`
- List → `{ "data": [ … ], "meta": { "page": 1, "perPage": 12, "total": 57, "totalPages": 5 } }` (non-paginated lists still return `meta` with `total`, `page: 1`, `perPage: total`, `totalPages: 1`). Property lists additionally return `meta.facets` (§5.7).
- Action/void → `{ "data": null, "message": "…" }`
- Never a bare array or bare object.

### 5.3 Error envelope

`{ "message": "Human readable", "errors": { "fieldName": ["message", …] } }` with status **400** bad request, **401** unauthenticated, **403** forbidden (role), **404** not found, **409** conflict (duplicate slug/email), **422** validation (Laravel format, keys camelCase, nested keys dotted: `"location.localityId"`, `"images.0.alt"`), **429** rate limited, **500** server error. The frontend shows `message` in a toast and `errors` inline on fields (`useForm.setServerErrors(errors)` / `usePropertyForm`).

A complete 422 body:

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "title": ["The title must be at least 10 characters."],
    "location.localityId": ["The selected locality is invalid."]
  }
}
```

### 5.4 Auth

Header `Authorization: Bearer <token>`. `POST /auth/login { email, password }` → `{ data: { token, expiresAt, user: { id, name, email, role, avatarUrl, phone } } }`; `POST /auth/logout` revokes (200 `{data:null,message}`); `GET /auth/profile` → `{ data: user }` (401 when the token is missing/expired/revoked); `PUT /auth/profile { name, phone, avatarUrl }`; `PUT /auth/password { currentPassword, newPassword }` (422 `currentPassword` when wrong; `newPassword` min 8). Tokens expire after `MOCK_TOKEN_TTL_HOURS` (default 24) on the mock and per Sanctum config on Laravel. Client storage: `sna_auth_token`, `sna_auth_user`, `sna_auth_expires_at` (localStorage); expiry enforced client-side (timer + check on every route change → auto-logout with toast "Your session has expired. Please sign in again.") and server-side (401).

### 5.5 IDs & timestamps

Integer auto-increment `id` (the mock uses `max(id)+1` per collection). ISO-8601 UTC strings `createdAt`, `updatedAt` on every record (and `publishedAt`, `deletedAt`, `lastLoginAt` where relevant); the API sets them, the client never sends them (ignored if sent). Foreign keys `xxxId`. Reads embed denormalised display objects (`property.locality = {id,name,slug}`, `property.location.city = {id,name,slug}`, `property.propertyType = {id,name,slug,segment}`, `property.developer = {id,name,slug,logoUrl}`, `property.amenities[] = {id,name,slug,icon,category}`, `property.badges[] = {id,name,slug,color,icon}`, `lead.property = {id,title,slug}`, `lead.assignedUser = {id,name}`, `article.category/author/tags`, `jobApplication.job = {id,title,slug}`); writes send only the ids (`localityId`, `cityId`, `propertyTypeId`, `developerId`, `amenityIds[]`, `badgeIds[]`, `categoryId`, `authorId`, `tagIds[]`, `assignedTo`). Read-only embedded/computed fields sent by a client are ignored.

### 5.6 Pagination, sorting, filtering

Query params `page` (1-based, default 1), `perPage` (default 12 public / 20 admin, max 100; `perPage=all` allowed **only on admin endpoints** and returns everything), `sort` (a field name or an alias from the endpoint's allowed list; default per endpoint), `order` (`asc|desc`), `q` (full-text on the endpoint's searchable fields, case-insensitive substring), plus endpoint-specific filters. Multi-value filters are comma-separated (`bedrooms=2,3`, `localityId=4,7`). Booleans are the strings `true|false`. Dates are `yyyy-mm-dd` (`from`, `to` inclusive). Unknown params are ignored. Out-of-range `page` returns an empty `data` with correct `meta`. A missing value (`null` or empty) sorts **last whichever the `order`**: "Published, newest first" lists the drafts after every dated article, not before them (QA-55) — in SQL, `ORDER BY published_at IS NULL, published_at DESC`.

### 5.7 Property list filters (`GET /properties`, `GET /admin/properties`)

`listingType`, `segment` (a `segments` slug — QA-52), `propertyTypeId` (multi), `localityId` (multi), `cityId`, `constructionStatus` (multi), `availability`, `bedrooms` (multi; `5` means ≥ 5; matches `configuration.bedrooms` **or any active `unitConfigurations[].bedrooms`**), `minPrice`, `maxPrice` (compare against `pricing.price` for sale, `pricing.rentPerMonth` for rent/lease; `priceOnRequest` records are excluded when a price filter is set), `minArea`, `maxArea`, `areaUnit` (default sqft; compare against `area.superBuiltUpArea ?? area.carpetArea ?? area.plotArea` converted to the requested unit), `furnishing` (multi), `facing` (multi), `developerId`, `amenityIds` (multi = **all** must match), `badgeIds` (multi = any), `isFeatured`, `isVerified`, `reraRegistered`, `possessionBy` (`yyyy-mm`; `possessionDate <= last day of that month` or ready-to-move), `q` (title, projectName, shortDescription, locality name, developer name), `ids` (multi, returns those ids in the given order, ignores other filters except `isActive` scoping), `sort` ∈ `relevance|newest|price-asc|price-desc|area-desc|popular` (`relevance` = `isFeatured desc, priorityOrder desc, updatedAt desc`; `newest` = `publishedAt desc`; `popular` = `viewCount desc`), `page`, `perPage`. Admin adds `isActive`, `seoScoreBand` (`good|ok|poor|none`), `createdBy`, `sort=updatedAt|price|viewCount|priorityOrder|title|seoScore`. Response `meta.facets` (public + admin): `{ propertyType: [{id,name,count}], locality: [{id,name,count}], bedrooms: [{value,count}], constructionStatus: [{value,count}] }` computed on the result set **before** pagination but **after** the other filters.

### 5.8 Write semantics

`POST` creates → **201** + full record. `PUT` replaces the full record (the client always sends the complete record from the form; missing optional fields become their defaults). `PATCH` updates only the provided fields — used by toggles, bulk actions, SEO panel saves, lead status changes, section-visibility toggles, `order` reorders. `DELETE` → 200 `{ data: null, message }`. Bulk: `POST /admin/<resource>/bulk { ids: [], action: 'activate'|'deactivate'|'delete'|'feature'|'unfeature'|'verify'|'unverify'|'publish'|'unpublish'|'assign'|'status', payload? }` → `{ data: { affected: n }, message }` (unsupported action for the resource → 422). `affected` counts the records that changed. **A write that changes nothing writes nothing** (QA-55): a `PUT` or `PATCH` whose result equals the stored record — `updatedAt`/`updatedBy` aside — answers 200 with the stored record and leaves `updatedAt` where it was, and a bulk action skips a record already in its target state.

#### Reordering — `PATCH /admin/<resource>/:id { order }` (prompt 17, D98)

Collections with an `order` field (FAQs, testimonials, team members, partners, localities,
property types, amenities, badges, banks, pages, header menus, article categories) are
reordered with **one write per move**: a `PATCH` on the record that moved, carrying the position it landed on.

The client reads that position off the row the moved record was dropped on, in the list as it
is on screen — which may be filtered, sorted and paginated:

| Move                              | `order` to send       |
| --------------------------------- | --------------------- |
| up (before the row it landed on)  | `neighbour.order`     |
| down (after the row it landed on) | `neighbour.order + 1` |

The API then settles the collection: it sorts by `order`, breaks a tie in favour of the record
whose `updatedAt` is newest — the one this `PATCH` just touched — and renumbers everything
`1..n`. The response is the moved record with its settled `order`.

Two consequences worth stating, because they are the point of the rule:

- **A filtered list reorders correctly.** The client never says what the other records should
  become, so the records a filter hid keep their relative positions. Sending `order = 12` for a
  record whose visible neighbour holds 12 places it immediately after that neighbour, wherever
  the hidden records sit.
- **`order` is always a dense `1..n` sequence** after any reorder. `GET /admin/<resource>?perPage=all&sort=order`
  is the check.

A `PATCH` that does not mention `order`, and a `POST`/`PUT` that does, leave the rest of the
collection alone; only an `order` `PATCH` renumbers. Laravel implements the same rule inside
the transaction that writes the moved row.

### 5.9 Slugs

Every public entity has a unique `slug` (lowercase, `[a-z0-9-]`, ≤ 75 chars). **CMS pages are the one exception:** a page's slug is a URL **path** — one or more slug segments joined by `/`, ≤ 120 chars (`buyer-assistance/home-loan`, §6.10) — because the public route serves the page at exactly that path. Each segment is slugified on its own, and `seo.slug` follows the same rule. Lookup: `GET /<resource>/slug/:slug`. Check: `GET /admin/<resource>/check-slug?slug=&excludeId=` → `{ data: { available: true|false, suggestion } }`. The API auto-generates a slug from the title when the client sends an empty slug and de-duplicates with `-2`, `-3`… A duplicate explicit slug → 409 with `errors.slug`. The entity `slug` and `seo.slug` are always kept identical by the API. **A page is derived from its title like everything else** — an empty `slug` on `POST /admin/pages` is a request to derive one, not a 422 (prompt 45, MB-03). **A page's slug may not begin with a segment a static route owns** — `properties`, `buy`, `rent`, `lease`, `commercial`, `plots`, `localities`, `builders`, `insights`, `careers`, `shortlist`, `admin` (`RESERVED_PATH_PREFIXES` in `src/routes/paths.js`): the router answers those paths first, so a page stored under one exists and can never be opened (D11). A create, or an update that *changes* the slug into a reserved prefix, answers **422** with `errors.slug`; a page already living under one keeps its slug, which is how the seeded `insights/real-estate-awareness` page stays where it is (prompt 45, MB-04). **A protected page keeps its slug** (QA-56): the built-in pages and the written pages the site's own templates link to by address (`src/config/pages.js`) answer **422** on `slug` to a write that changes it, and an empty slug on their `PUT` keeps the stored one rather than deriving a new one. The `home` record's public address is the site root, `/`, not `/home`.

### 5.10 Public vs admin reads

Public list endpoints return only `isActive: true` records (and `status: 'published'` for articles/pages, `publishedAt <= now`); public detail endpoints return 404 for inactive/unpublished/unknown slugs (except `?preview=<token>` on articles/pages, D28). Public responses strip private fields: `agent.phone/whatsapp/email` only when `agent.showOnListing`; never `leads`, `adminUsers`, `apiTokens`, `media`, `createdBy/updatedBy`, `authors[].email`, internal notes, `siteSettings.integrations.*Secret`, `siteSettings.leads`. Admin endpoints return everything, with `isActive` filterable.

**Properties have no preview token.** `GET /properties/slug/:slug` answers 404 for an unpublished listing to everybody, signed in or not. An editor previews one at `/properties/<slug>?preview=admin`, which the public route serves only while an admin session exists: it reads the record through **`GET /admin/properties/slug/:slug`** — an ordinary admin endpoint behind the usual Bearer token — and marks the page `noindex, nofollow`. Nothing about the query string grants access; the token does. (Articles and pages keep their 24-hour signed tokens, D28: a draft article is shown to somebody who is not an editor.)

**A gated file has no address in a public read** (QA-51 OPEN-1). While `brochureLeadGated` is on, every public property shape answers `brochureUrl: null` with `hasBrochure: true`; a document with `leadGated` on keeps its row with `url: null` and `hasFile: true`, and every document carries `hasFile`. The floor plans are always gated: every `floorPlans[]` row answers `imageUrl: null` and `pdfUrl: null` with `hasImage` / `hasPdf`, and every `unitConfigurations[]` row `floorPlanImageUrl: null` and `floorPlanPdfUrl: null` with `hasFloorPlanImage` / `hasFloorPlanPdf`. An open document or brochure whose address is also a gated file's — a floor plan's included — is gated with it, and a document whose address is the brochure's own is left out of `documents[]`. The photo gallery is not gated. The addresses are handed over by **`POST /properties/:id/documents/access`** to the token `POST /leads` answers a lead about that listing with (`access.token`, 24 hours, any lead about the listing — P24, P28). Admin reads are unchanged. The whole rule, with the Laravel sketch, is `docs/backend-notes/05_business_rules.md` → "Gated files".

### 5.11 Rate limiting & spam

`POST /leads`, `POST /newsletter/subscribe`, `POST /jobs/:id/apply` accept an optional honeypot field `website` (non-empty → 200 `{data:null, message:'ok'}` and nothing stored) and are rate limited per IP (mock: 10/min → 429 `{message:'Too many requests. Please try again in a minute.'}`). Documented for Laravel (`throttle:10,1`).

### 5.12 CORS

The API allows the site origin(s) from configuration; the mock allows `http://localhost:3000`, `http://127.0.0.1:3000` and `http://localhost:5000` (served build).

### 5.13 Sitemap/robots/RSS/llms

`GET /sitemap.xml` (sitemap index), `GET /sitemap-properties.xml`, `/sitemap-localities.xml`, `/sitemap-developers.xml`, `/sitemap-articles.xml`, `/sitemap-pages.xml` (with `<lastmod>`, `<changefreq>`, `<priority>` from `seoSettings.sitemap` and per-entity `seo.sitemap` overrides; `<image:image>` entries for properties), `GET /robots.txt`, `GET /rss.xml` (latest 20 published articles), `GET /llms.txt` — `text/xml` / `text/plain`, no envelope, served both under the API base (`/api/sitemap.xml`) and mirrored at the mock's root (`/sitemap.xml`) for Nginx proxying. URLs use `seoSettings.siteUrl`.

### 5.14 Endpoint catalogue

243 endpoints, generated from `src/services/endpoints.js` — the registry is the source of
truth and `src/services/endpoints.test.js` fails when one goes missing. Every entry is
smoke-tested by `scripts/smoke-api.js` and exported to the backend handover package by
`scripts/generate-backend-guidelines.js`.

**Auth/role** is the minimum the route requires: _public_ needs no token, _any role_ only a
valid one, and the named roles are checked by `mock-server/middleware/role.js` (403
otherwise). Within an allowed route the action matrix of `docs/RBAC.md` narrows what the
caller may do — a sales user reaches `GET /admin/properties` but never
`POST /admin/properties`, and reaches `GET /admin/leads` scoped to their own and
unassigned leads.

**Query** lists the accepted parameters; unknown ones are ignored (§5.6). **Body schema**
names a key of `src/services/schemas/` (`getSchema('property.create')`).

#### Public — no token

| Method | Path                      | Auth/role | Purpose                                                                  | Query                                                                                                                                                                                                                                                                                                                                                         | Body schema | Response shape     | Side effects                                                                     |
| ------ | ------------------------- | --------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------ | -------------------------------------------------------------------------------- |
| GET    | `/properties`             | public    | Public paginated property search with facets                             | `page`, `perPage`, `sort`, `order`, `q`, `listingType`, `segment`, `propertyTypeId`, `localityId`, `cityId`, `constructionStatus`, `availability`, `bedrooms`, `minPrice`, `maxPrice`, `minArea`, `maxArea`, `areaUnit`, `furnishing`, `facing`, `developerId`, `amenityIds`, `badgeIds`, `isFeatured`, `isVerified`, `reraRegistered`, `possessionBy`, `ids` | —           | `PropertyList`     | —                                                                                |
| GET    | `/properties/featured`    | public    | Featured properties, ordered by priority then recency                    | `perPage`, `listingType`, `segment`, `propertyTypeId`, `localityId`, `cityId`, `constructionStatus`, `availability`, `bedrooms`, `minPrice`, `maxPrice`, `minArea`, `maxArea`, `areaUnit`, `furnishing`, `facing`, `developerId`, `amenityIds`, `badgeIds`, `isFeatured`, `isVerified`, `reraRegistered`, `possessionBy`, `ids`                               | —           | `PropertyList`     | —                                                                                |
| GET    | `/properties/slug/:slug`  | public    | Property details by slug; 404 when inactive                              | —                                                                                                                                                                                                                                                                                                                                                             | —           | `Property`         | —                                                                                |
| GET    | `/properties/:id/similar` | public    | Admin-selected similar properties, topped up to six by locality and type | `perPage`                                                                                                                                                                                                                                                                                                                                                     | —           | `PropertyList`     | —                                                                                |
| POST   | `/properties/:id/view`    | public    | Count one property view; debounced per IP per hour                       | —                                                                                                                                                                                                                                                                                                                                                             | —           | `ViewCount`        | Increments `viewCount`; appends a `propertyViews` row; debounced per IP per hour |
| POST   | `/properties/:id/documents/access` | public | The addresses of a listing’s files, for the token `POST /leads` answered a lead about it with | — | `property.documentAccess` | `DocumentAccess` | None — a read. 403 unless the token is live, names this listing and its lead still exists; 404 for an inactive listing |
| GET    | `/properties/suggestions` | public    | Type-ahead suggestions for the hero and header search                    | `q`                                                                                                                                                                                                                                                                                                                                                           | —           | `Suggestions`      | —                                                                                |
| GET    | `/localities`             | public    | Localities with their active property count                              | `page`, `perPage`, `sort`, `order`, `q`, `zone`, `cityId`, `isFeatured`, `ids`                                                                                                                                                                                                                                                                                | —           | `LocalityList`     | —                                                                                |
| GET    | `/localities/slug/:slug`  | public    | Locality guide page by slug                                              | —                                                                                                                                                                                                                                                                                                                                                             | —           | `Locality`         | —                                                                                |
| GET    | `/cities`                 | public    | Cities the portal covers                                                 | `page`, `perPage`, `sort`, `order`, `q`                                                                                                                                                                                                                                                                                                                       | —           | `CityList`         | —                                                                                |
| GET    | `/segments`               | public    | Every segment, the inactive ones flagged (QA-52)                         | `page`, `perPage`, `sort`, `order`, `q`, `kind`                                                                                                                                                                                                                                                                                                               | —           | `SegmentList`      | A listing filed under a retired segment still needs its layout; no read by slug  |
| GET    | `/developers`             | public    | Developers with their active property count                              | `page`, `perPage`, `sort`, `order`, `q`, `isFeatured`, `ids`                                                                                                                                                                                                                                                                                                  | —           | `DeveloperList`    | —                                                                                |
| GET    | `/developers/slug/:slug`  | public    | Developer page by slug                                                   | —                                                                                                                                                                                                                                                                                                                                                             | —           | `Developer`        | —                                                                                |
| GET    | `/property-types`         | public    | Property types, optionally filtered by segment                           | `page`, `perPage`, `sort`, `order`, `q`, `segment`                                                                                                                                                                                                                                                                                                            | —           | `PropertyTypeList` | —                                                                                |
| GET    | `/amenities`              | public    | Amenities, optionally filtered by category                               | `page`, `perPage`, `sort`, `order`, `q`, `category`                                                                                                                                                                                                                                                                                                           | —           | `AmenityList`      | —                                                                                |
| GET    | `/badges`                 | public    | Property badges                                                          | `page`, `perPage`, `sort`, `order`, `q`                                                                                                                                                                                                                                                                                                                       | —           | `BadgeList`        | —                                                                                |
| GET    | `/banks`                  | public    | Home-loan partners for the finance section and the EMI calculator        | `page`, `perPage`, `sort`, `order`, `q`                                                                                                                                                                                                                                                                                                                       | —           | `BankList`         | —                                                                                |

#### Public — articles

| Method | Path                     | Auth/role | Purpose                                                         | Query                                                                                                                                    | Body schema | Response shape        | Side effects |
| ------ | ------------------------ | --------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------- | ------------ |
| GET    | `/articles`              | public    | Published articles, newest or most read first                   | `page`, `perPage`, `sort`, `order`, `q`, `categoryId`, `categorySlug`, `tagId`, `tagSlug`, `authorId`, `authorSlug`, `isFeatured`, `ids` | —           | `ArticleList`         | —            |
| GET    | `/articles/slug/:slug`   | public    | Article by slug; a matching preview token also returns drafts   | `preview`                                                                                                                                | —           | `Article`             | —            |
| GET    | `/articles/trending`     | public    | The six most read published articles                            | `perPage`                                                                                                                                | —           | `ArticleList`         | —            |
| GET    | `/articles/:id/adjacent` | public    | The published articles either side of this one by `publishedAt` | `categoryId`                                                                                                                             | —           | `ArticleAdjacent`     | —            |
| GET    | `/article-categories`    | public    | Article categories with their published article count           | `page`, `perPage`, `sort`, `order`, `q`                                                                                                  | —           | `ArticleCategoryList` | —            |
| GET    | `/article-tags`          | public    | Article tags with their published article count                 | `page`, `perPage`, `sort`, `order`, `q`                                                                                                  | —           | `ArticleTagList`      | —            |
| GET    | `/authors`               | public    | Active authors, public fields only                              | `page`, `perPage`, `sort`, `order`, `q`                                                                                                  | —           | `AuthorList`          | —            |
| GET    | `/authors/slug/:slug`    | public    | Author page by slug                                             | —                                                                                                                                        | —           | `Author`              | —            |

#### Public — content, leads and settings

| Method | Path                    | Auth/role | Purpose                                                                  | Query                                                                                      | Body schema             | Response shape    | Side effects                                                                                                                                                                                                |
| ------ | ----------------------- | --------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ----------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/faqs`                 | public    | FAQs for the FAQ page, the home section and property pages               | `page`, `perPage`, `sort`, `order`, `q`, `category`, `showOnHome`, `propertyTypeId`, `ids` | —                       | `FaqList`         | —                                                                                                                                                                                                           |
| GET    | `/testimonials`         | public    | Active testimonials                                                      | `page`, `perPage`, `sort`, `order`, `q`, `isFeatured`, `ids`                               | —                       | `TestimonialList` | —                                                                                                                                                                                                           |
| GET    | `/team`                 | public    | Team members shown on the About page                                     | `page`, `perPage`, `sort`, `order`, `q`, `showOnAbout`, `ids`                              | —                       | `TeamMemberList`  | —                                                                                                                                                                                                           |
| GET    | `/partners`             | public    | Partner logos, optionally filtered by category                           | `page`, `perPage`, `sort`, `order`, `q`, `category`                                        | —                       | `PartnerList`     | —                                                                                                                                                                                                           |
| GET    | `/pages`                | public    | Published pages that belong in the header or footer navigation           | `showInHeader`, `showInFooter`, `page`, `perPage`                                          | —                       | `PageNavList`     | Unpaginated unless `page`/`perPage` are given; returns `{slug,title,headerMenu,headerSubmenu,footerColumn,order}` only                                                                                                    |
| GET    | `/pages/slug/:slug`     | public    | Published CMS page by slug; a matching preview token also returns drafts | `preview`                                                                                  | —                       | `Page`            | —                                                                                                                                                                                                           |
| GET    | `/header-menus` | public | The header's menus, left to right: the active ones, with their submenus and links (QA-56) | `page`, `perPage` | — | `HeaderMenuList` | Unpaginated unless `page`/`perPage` are given; hidden menus are left out; `builtIn` marks the generated Buy, Rent and Commercial |
| GET    | `/jobs`                 | public    | Open job postings                                                        | `page`, `perPage`, `sort`, `order`, `q`, `department`                                      | —                       | `JobList`         | —                                                                                                                                                                                                           |
| GET    | `/jobs/slug/:slug`      | public    | Job posting by slug                                                      | —                                                                                          | —                       | `Job`             | —                                                                                                                                                                                                           |
| POST   | `/jobs/:id/apply`       | public    | Apply for a job posting; honeypot and rate limited                       | —                                                                                          | `jobApplication.create` | `JobApplication`  | Creates a `jobApplications` record; honeypot; rate limited 10/min per IP                                                                                                                                    |
| POST   | `/leads`                | public    | Capture a lead from any form on the site; honeypot and rate limited      | —                                                                                          | `lead.create`           | `LeadCreated`     | Creates the lead with `status:new`, the default priority and a `created` activity; increments the property `enquiryCount`; maps legacy sources; round-robin assignment when enabled; honeypot; rate limited; answers `access`, the token that opens the named listing’s gated files |
| POST   | `/newsletter/subscribe` | public    | Subscribe an e-mail address; a duplicate answers 200 instead of 409      | —                                                                                          | `newsletter.subscribe`  | `Null`            | Creates a subscriber or returns 200 for a duplicate; honeypot; rate limited                                                                                                                                 |
| GET    | `/settings`             | public    | The public subset of the site settings                                   | —                                                                                          | —                       | `Settings`        | —                                                                                                                                                                                                           |
| GET    | `/seo/settings`         | public    | The public subset of the SEO settings used by <Seo> and the sitemap      | —                                                                                          | —                       | `SeoSettings`     | —                                                                                                                                                                                                           |
| GET    | `/redirects`            | public    | Active redirects, resolved client-side by RedirectHandler                | —                                                                                          | —                       | `RedirectList`    | —                                                                                                                                                                                                           |

#### Public — sitemaps and feeds

| Method | Path                      | Auth/role | Purpose                                                            | Query | Body schema | Response shape | Side effects |
| ------ | ------------------------- | --------- | ------------------------------------------------------------------ | ----- | ----------- | -------------- | ------------ |
| GET    | `/sitemap.xml`            | public    | Sitemap index listing every sub-sitemap                            | —     | —           | `Xml`          | —            |
| GET    | `/sitemap-properties.xml` | public    | Property URLs with lastmod, changefreq, priority and image entries | —     | —           | `Xml`          | —            |
| GET    | `/sitemap-localities.xml` | public    | Locality URLs                                                      | —     | —           | `Xml`          | —            |
| GET    | `/sitemap-developers.xml` | public    | Developer URLs                                                     | —     | —           | `Xml`          | —            |
| GET    | `/sitemap-articles.xml`   | public    | Article, category, tag and author URLs                             | —     | —           | `Xml`          | —            |
| GET    | `/sitemap-pages.xml`      | public    | CMS page URLs                                                      | —     | —           | `Xml`          | —            |
| GET    | `/robots.txt`             | public    | robots.txt from seoSettings.robotsTxt                              | —     | —           | `Text`         | —            |
| GET    | `/rss.xml`                | public    | RSS feed of the latest twenty published articles                   | —     | —           | `Xml`          | —            |
| GET    | `/llms.txt`               | public    | llms.txt from seoSettings.llmsTxt                                  | —     | —           | `Text`         | —            |

#### Auth

| Method | Path             | Auth/role | Purpose                                                               | Query | Body schema     | Response shape | Side effects                                        |
| ------ | ---------------- | --------- | --------------------------------------------------------------------- | ----- | --------------- | -------------- | --------------------------------------------------- |
| POST   | `/auth/login`    | public    | Exchange e-mail and password for a bearer token                       | —     | `auth.login`    | `AuthSession`  | Issues an `apiTokens` record and sets `lastLoginAt` |
| POST   | `/auth/logout`   | any role  | Revoke the current token                                              | —     | —               | `Null`         | Revokes the presented token                         |
| GET    | `/auth/profile`  | any role  | The signed-in user; 401 when the token is missing, expired or revoked | —     | —               | `User`         | —                                                   |
| PUT    | `/auth/profile`  | any role  | Update the signed-in user’s own name, phone and avatar                | —     | `auth.profile`  | `User`         | —                                                   |
| PUT    | `/auth/password` | any role  | Change the signed-in user’s own password                              | —     | `auth.password` | `Null`         | Revokes every other token of the user               |

##### Auth — worked examples

Real request/response pairs from the mock (`npm run mock`, seed credentials of §6.14,
`Content-Type: application/json` on every body).

```jsonc
// POST /api/auth/login  { "email": "admin@squaresnacres.com", "password": "Admin@123" }
{
  "data": {
    "token": "zVswPVqstiBs-jWupyHqcCfXWNiAHX2JHeDXixNImuVadSEG", // 48 chars, opaque
    "expiresAt": "2026-09-16T21:41:51.145Z", // now + MOCK_TOKEN_TTL_HOURS
    "user": {
      "id": 1,
      "name": "Admin User",
      "email": "admin@squaresnacres.com",
      "role": "admin",
      "avatarUrl": null,
      "phone": "9880000010",
    },
  },
}

// POST /api/auth/login  { "email": "admin@squaresnacres.com", "password": "wrong" } → 401
{ "message": "Invalid email or password." }

// POST /api/auth/login — 11th attempt of a minute from one IP → 429
{ "message": "Too many requests. Please try again in a minute." }
```

Every call below sends `Authorization: Bearer <token>`; without it, or with an expired or
revoked one, the answer is `401 { "message": "Unauthenticated." }` — and
`401 { "message": "Account is inactive." }` when the account has been deactivated.

```jsonc
// GET /api/auth/profile
{
  "data": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@squaresnacres.com",
    "role": "admin",
    "phone": "9880000010",
    "avatarUrl": null,
    "isActive": true,
    "lastLoginAt": "2026-09-15T21:41:51.143Z",
    "createdAt": "2026-08-01T09:00:00.000Z",
    "updatedAt": "2026-09-10T09:00:00.000Z",
  },
}

// PUT /api/auth/profile  { "name": "Priya Nair", "phone": "9880000013", "avatarUrl": null }
{
  "data": {
    "id": 4,
    "name": "Priya Nair",
    "email": "priya@squaresnacres.com",
    "role": "manager",
    "phone": "9880000013",
    "avatarUrl": null,
    "isActive": true,
    "lastLoginAt": "2026-09-15T21:42:42.688Z",
    "createdAt": "2026-09-15T21:42:42.677Z",
    "updatedAt": "2026-09-15T21:42:42.725Z",
  },
}
```

A `PUT /auth/profile` replaces the three fields it owns, so an omitted `phone` or
`avatarUrl` is stored as `null` (§5.8). `name` is 2–80 characters; a shorter one answers
`422 { "errors": { "name": ["The name must be at least 2 characters."] } }`.

```jsonc
// PUT /api/auth/password  { "currentPassword": "Wrong@123", "newPassword": "Str0ngPass" } → 422
{
  "message": "The given data was invalid.",
  "errors": { "currentPassword": ["Current password is incorrect."] },
}

// PUT /api/auth/password  { "currentPassword": "Editor@123", "newPassword": "Str0ngPass" }
{ "data": null, "message": "Password updated." } // every *other* token of the user is revoked

// POST /api/auth/logout
{ "data": null, "message": "Logged out." }
```

`newPassword` is at least 8 characters with at least one letter and one digit; a weaker one
answers `422 { "errors": { "newPassword": [ … ] } }`.

#### Admin — dashboard, properties and leads

| Method | Path                              | Auth/role       | Purpose                                                              | Query                                                                                                                                                                                                                                                                                                                                                                                                  | Body schema       | Response shape  | Side effects                                                                                                                                      |
| ------ | --------------------------------- | --------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/admin/dashboard`                | any role        | Role-aware dashboard aggregates, trends and recent activity          | —                                                                                                                                                                                                                                                                                                                                                                                                      | —                 | `DashboardData` | —                                                                                                                                                 |
| GET    | `/admin/properties`               | any role        | List properties for the admin table                                  | `page`, `perPage`, `sort`, `order`, `q`, `isActive`, `ids`, `listingType`, `segment`, `propertyTypeId`, `localityId`, `cityId`, `constructionStatus`, `availability`, `bedrooms`, `minPrice`, `maxPrice`, `minArea`, `maxArea`, `areaUnit`, `furnishing`, `facing`, `developerId`, `amenityIds`, `badgeIds`, `isFeatured`, `isVerified`, `reraRegistered`, `possessionBy`, `seoScoreBand`, `createdBy` | —                 | `PropertyList`  | —                                                                                                                                                 |
| POST   | `/admin/properties`               | admin · manager | Create a property                                                    | —                                                                                                                                                                                                                                                                                                                                                                                                      | `property.create` | `Property`      | Generates and de-duplicates the slug; mirrors it into `seo.slug`                                                                                  |
| GET    | `/admin/properties/:id`           | any role        | Read one property with every admin field                             | —                                                                                                                                                                                                                                                                                                                                                                                                      | —                 | `Property`      | —                                                                                                                                                 |
| GET    | `/admin/properties/slug/:slug`    | any role        | Read one property by slug with every admin field, active or not      | —                                                                                                                                                                                                                                                                                                                                                                                                      | —                 | `Property`      | Behind the same token as the rest of `/admin`; the admin preview of an unpublished listing (`/properties/<slug>?preview=admin`) reads through it  |
| PUT    | `/admin/properties/:id`           | admin · manager | Replace a property with the full record from the form                | —                                                                                                                                                                                                                                                                                                                                                                                                      | `property.update` | `Property`      | Regenerates the slug when it changed; sets `publishedAt` the first time `isActive` becomes true                                                   |
| PATCH  | `/admin/properties/:id`           | admin · manager | Update the given fields of a property (toggles, order, SEO panel)    | —                                                                                                                                                                                                                                                                                                                                                                                                      | `property.patch`  | `Property`      | Sets `publishedAt` the first time `isActive` becomes true                                                                                         |
| DELETE | `/admin/properties/:id`           | admin · manager | Delete a property; 409 when it is still in use                       | —                                                                                                                                                                                                                                                                                                                                                                                                      | —                 | `Null`          | Hard delete                                                                                                                                       |
| POST   | `/admin/properties/bulk`          | admin · manager | Apply one action to several properties                               | —                                                                                                                                                                                                                                                                                                                                                                                                      | `bulk`            | `BulkResult`    | activate · deactivate · feature · unfeature · verify · unverify · delete                                                                          |
| GET    | `/admin/properties/check-slug`    | admin · manager | Check whether a property slug is free and suggest an alternative     | `slug`, `excludeId`                                                                                                                                                                                                                                                                                                                                                                                    | —                 | `SlugCheck`     | —                                                                                                                                                 |
| POST   | `/admin/properties/:id/duplicate` | admin · manager | Copy a property as an inactive draft with a fresh slug               | —                                                                                                                                                                                                                                                                                                                                                                                                      | —                 | `Property`      | Creates an inactive copy: title `"<title> (Copy)"`, slug `<slug>-copy[-n]`, `isFeatured:false`, `viewCount:0`, `enquiryCount:0`, `seo.score:null` |
| GET    | `/admin/leads`                    | any role        | Lead list for the CRM; scoped to own and unassigned leads for sales  | `page`, `perPage`, `sort`, `order`, `q`, `status`, `source`, `priority`, `assignedTo`, `propertyId`, `from`, `to`                                                                                                                                                                                                                                                                                      | —                 | `LeadList`      | —                                                                                                                                                 |
| GET    | `/admin/leads/:id`                | any role        | One lead with its notes and activity timeline                        | —                                                                                                                                                                                                                                                                                                                                                                                                      | —                 | `Lead`          | —                                                                                                                                                 |
| PATCH  | `/admin/leads/:id`                | any role        | Change status, priority, assignee, follow-up or lost reason          | —                                                                                                                                                                                                                                                                                                                                                                                                      | `lead.patch`      | `Lead`          | Appends an activity for a status, priority, assignee or follow-up change                                                                          |
| DELETE | `/admin/leads/:id`                | admin · manager | Delete a lead; forbidden for sales                                   | —                                                                                                                                                                                                                                                                                                                                                                                                      | —                 | `Null`          | 409 with `data.usedBy` when the record is still referenced                                                                                        |
| POST   | `/admin/leads/:id/claim`          | any role        | Assign an unassigned lead to the signed-in user                      | —                                                                                                                                                                                                                                                                                                                                                                                                      | —                 | `Lead`          | Sets `assignedTo` to the caller when the lead is unassigned; appends an `assigned` activity                                                       |
| POST   | `/admin/leads/:id/notes`          | any role        | Append a note to a lead and return the lead                          | —                                                                                                                                                                                                                                                                                                                                                                                                      | `lead.note`       | `Lead`          | Appends the note and a `note-added` activity                                                                                                      |
| DELETE | `/admin/leads/:id/notes/:noteId`  | any role        | Delete one note from a lead                                          | —                                                                                                                                                                                                                                                                                                                                                                                                      | —                 | `Lead`          | Removes the note; the activity stays                                                                                                              |
| GET    | `/admin/leads/export`             | any role        | CSV export of the filtered lead list, scoped like the list endpoint  | `q`, `status`, `source`, `priority`, `assignedTo`, `propertyId`, `from`, `to`                                                                                                                                                                                                                                                                                                                          | —                 | `Csv`           | UTF-8 BOM CSV, `Content-Disposition: attachment; filename="leads-<yyyy-mm-dd>.csv"`                                                               |
| POST   | `/admin/leads/bulk`               | admin · manager | Change status, priority or assignee of several leads, or delete them | —                                                                                                                                                                                                                                                                                                                                                                                                      | `bulk`            | `BulkResult`    | status · assign · priority · delete                                                                                                               |

##### Properties and leads — worked examples

From the mock (`npm run mock`) over the starter seed of prompt 06.

```jsonc
// GET /api/properties?listingType=sale&perPage=2
{
  "data": [
    {
      "id": 1,
      "slug": "lakeview-heights-3-bhk-whitefield",
      "title": "Lakeview Heights — 3 BHK Apartments in Whitefield",
      "projectName": "Lakeview Heights",
      "listingType": "sale",
      "segment": "residential",
      "propertyTypeId": 1,
      "propertyType": { "id": 1, "name": "Apartments", "slug": "apartments", "segment": "residential" },
      "constructionStatus": "ready-to-move",
      "availability": "available",
      "amenityIds": [1, 2, 3, "…"],
      "amenities": [
        { "id": 1, "name": "Power Backup", "slug": "power-backup", "icon": "mdi:power-plug-outline", "category": "basic" },
        "…",
      ],
      "badges": [{ "id": 3, "name": "…", "slug": "…", "color": "…", "icon": "…" }],
      "location": {
        "address": "Off Whitefield Main Road, Whitefield",
        "localityId": 1,
        "locality": { "id": 1, "name": "Whitefield", "slug": "whitefield" },
        "cityId": 1,
        "city": { "id": 1, "name": "Bengaluru", "slug": "bengaluru" },
        "showExactLocation": false,
        "…": "…",
      },
      "pricing": { "price": 12400000, "priceOnRequest": false, "pricePerSqft": 7515, "currency": "INR", "…": "…" },
      "area": { "superBuiltUpArea": 1650, "carpetArea": 1185, "areaUnit": "sqft", "…": "…" },
      "configuration": { "bedrooms": 3, "bathrooms": 3, "…": "…" },
      "project": {
        "developerId": 1,
        "developer": { "id": 1, "name": "Aurelia Estates", "slug": "aurelia-estates", "logoUrl": "…" },
        "…": "…",
      },
      // `agent.phone`, `whatsapp` and `email` are here only when `showOnListing`
      // is true; `createdBy` and `updatedBy` never are (§5.10).
      "agent": { "teamMemberId": 1, "name": "Team Member One", "photoUrl": "…", "showOnListing": false },
      "viewCount": 184,
      "enquiryCount": 12,
      "isActive": true,
      "isFeatured": true,
      "…": "…",
    },
    "…",
  ],
  "meta": {
    "page": 1,
    "perPage": 2,
    "total": 4,
    "totalPages": 2,
    // Computed after the filters and before the page is cut (§5.7).
    "facets": {
      "propertyType": [
        { "id": 1, "name": "Apartments", "count": 2 },
        { "id": 9, "name": "Residential Plots", "count": 1 },
        { "id": 2, "name": "Villas", "count": 1 },
      ],
      "locality": [{ "id": 3, "name": "Electronic City", "count": 1 }, "…"],
      "bedrooms": [
        { "value": 2, "count": 2 },
        { "value": 3, "count": 2 },
        { "value": 4, "count": 1 },
      ],
      "constructionStatus": [
        { "value": "ready-to-move", "count": 3 },
        { "value": "under-construction", "count": 1 },
      ],
    },
  },
}

// POST /api/properties/1/view — once per IP per property per hour
{ "data": { "viewCount": 185 } }

// GET /api/properties/suggestions?q=whi
{
  "data": {
    "localities": [{ "id": 1, "name": "Whitefield", "slug": "whitefield", "propertyCount": 1 }],
    "properties": [
      {
        "id": 1,
        "title": "Lakeview Heights — 3 BHK Apartments in Whitefield",
        "slug": "lakeview-heights-3-bhk-whitefield",
        "localityName": "Whitefield",
        "price": 12400000,
      },
    ],
    "propertyTypes": [],
    "developers": [],
  },
}
```

`POST /api/leads` answers with the stored lead. The `source` arrives as
`property_enquiry` from an old bundle and is stored as `property-enquiry`; the
phone number is normalised; `utm` is read out of `pageUrl` when the body carries
none; `ipAddress` and `userAgent` are stored but returned to admins only.

```jsonc
// POST /api/leads
// { "name": "Ananya Rao", "phone": "98765 43210", "source": "property_enquiry",
//   "propertyId": 1, "requirement": { "listingType": "sale", "bedrooms": 3, "timeline": "1-3-months" },
//   "pageUrl": "https://www.squaresnacres.com/properties/…?utm_source=google&utm_medium=cpc" }
{
  "data": {
    "id": 7,
    "name": "Ananya Rao",
    "phone": "+919876543210",
    "email": "ananya@example.com",
    "message": "Interested in a 3 BHK. Please call after 6 pm.",
    "source": "property-enquiry",
    "propertyId": 1,
    "property": {
      "id": 1,
      "title": "Lakeview Heights — 3 BHK Apartments in Whitefield",
      "slug": "lakeview-heights-3-bhk-whitefield",
    },
    "requirement": { "listingType": "sale", "bedrooms": 3, "timeline": "1-3-months" },
    "status": "new",
    "priority": "medium",
    "assignedTo": null,
    "assignedUser": null,
    "notes": [],
    "activities": [
      {
        "id": 1,
        "type": "created",
        "description": "Lead created via Property Enquiry",
        "createdBy": null,
        "createdByName": null,
        "createdAt": "2026-09-15T22:40:33.115Z",
      },
    ],
    "utm": { "source": "google", "medium": "cpc", "campaign": null, "term": null, "content": null },
    "consent": true,
    "createdAt": "2026-09-15T22:40:33.115Z",
    "updatedAt": "2026-09-15T22:40:33.115Z",
  },
}

// POST /api/leads with the honeypot `website` filled in → 200, nothing stored
{ "data": null, "message": "ok" }

// PATCH /api/admin/leads/1 { "status": "contacted", "assignedTo": 3 } → the lead,
// with the timeline it just grew:
// [ "Lead created via Property Enquiry",
//   "Status changed from New to Contacted",
//   "Assigned to Sales User" ]

// GET /api/admin/leads/export → text/csv; charset=utf-8, a BOM, then
// ID,Name,Phone,Email,Source,Status,Lost Reason,Priority,Assigned To,Property,Requirement,Message,Follow-up (IST),Created At (IST)
// — the same filters and the same order as the list; labels rather than stored
// values, IST dates as `yyyy-mm-dd hh:mm`, formula-like cells prefixed with `'`;
// with no matches the file is the header row alone.

// GET /api/admin/leads?q=Ananya → the list rows, each with the duplicate flag
// and without the timeline:
// { "data": [ { "id": 7, "name": "Ananya Rao", …, "isPossibleDuplicate": false } ],
//   "meta": { "page": 1, "perPage": 20, "total": 1, "totalPages": 1 } }
```

#### Admin — master data

| Method | Path                               | Auth/role       | Purpose                                                                | Query                                                                                      | Body schema           | Response shape     | Side effects                                                     |
| ------ | ---------------------------------- | --------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------- | ------------------ | ---------------------------------------------------------------- |
| GET    | `/admin/localities`                | admin · manager | List localities for the admin table                                    | `page`, `perPage`, `sort`, `order`, `q`, `isActive`, `ids`, `cityId`, `zone`, `isFeatured` | —                     | `LocalityList`     | —                                                                |
| POST   | `/admin/localities`                | admin · manager | Create a locality                                                      | —                                                                                          | `locality.create`     | `Locality`         | Generates and de-duplicates the slug; mirrors it into `seo.slug` |
| GET    | `/admin/localities/:id`            | admin · manager | Read one locality with every admin field                               | `withUsage`                                                                                | —                     | `Locality`         | —                                                                |
| PUT    | `/admin/localities/:id`            | admin · manager | Replace a locality with the full record from the form                  | —                                                                                          | `locality.update`     | `Locality`         | Replaces the record; regenerates the slug when it changed        |
| PATCH  | `/admin/localities/:id`            | admin · manager | Update the given fields of a locality (toggles, order, SEO panel)      | —                                                                                          | `locality.patch`      | `Locality`         | —                                                                |
| DELETE | `/admin/localities/:id`            | admin · manager | Delete a locality; 409 when it is still in use                         | —                                                                                          | —                     | `Null`             | 409 with `data.usedBy` when the record is still referenced       |
| POST   | `/admin/localities/bulk`           | admin · manager | Apply one action to several localities                                 | —                                                                                          | `bulk`                | `BulkResult`       | activate · deactivate · delete (plus the resource’s own actions) |
| GET    | `/admin/localities/check-slug`     | admin · manager | Check whether a locality slug is free and suggest an alternative       | `slug`, `excludeId`                                                                        | —                     | `SlugCheck`        | —                                                                |
| GET    | `/admin/cities`                    | admin · manager | List cities for the admin table                                        | `page`, `perPage`, `sort`, `order`, `q`, `isActive`, `ids`                                 | —                     | `CityList`         | —                                                                |
| POST   | `/admin/cities`                    | admin · manager | Create a city                                                          | —                                                                                          | `city.create`         | `City`             | Generates and de-duplicates the slug; mirrors it into `seo.slug` |
| GET    | `/admin/cities/:id`                | admin · manager | Read one city with every admin field                                   | `withUsage`                                                                                | —                     | `City`             | —                                                                |
| PUT    | `/admin/cities/:id`                | admin · manager | Replace a city with the full record from the form                      | —                                                                                          | `city.update`         | `City`             | Replaces the record; regenerates the slug when it changed        |
| PATCH  | `/admin/cities/:id`                | admin · manager | Update the given fields of a city (toggles, order, SEO panel)          | —                                                                                          | `city.patch`          | `City`             | —                                                                |
| DELETE | `/admin/cities/:id`                | admin · manager | Delete a city; 409 when it is still in use                             | —                                                                                          | —                     | `Null`             | 409 with `data.usedBy` when the record is still referenced       |
| POST   | `/admin/cities/bulk`               | admin · manager | Apply one action to several cities                                     | —                                                                                          | `bulk`                | `BulkResult`       | activate · deactivate · delete (plus the resource’s own actions) |
| GET    | `/admin/cities/check-slug`         | admin · manager | Check whether a city slug is free and suggest an alternative           | `slug`, `excludeId`                                                                        | —                     | `SlugCheck`        | —                                                                |
| GET    | `/admin/segments`                  | admin · manager | List segments for the admin table                                      | `page`, `perPage`, `sort`, `order`, `q`, `isActive`, `ids`, `kind`                         | —                     | `SegmentList`      | —                                                                |
| POST   | `/admin/segments`                  | admin · manager | Create a segment                                                       | —                                                                                          | `segment.create`      | `Segment`          | Generates and de-duplicates the slug (the key listings store)    |
| GET    | `/admin/segments/:id`              | admin · manager | Read one segment with every admin field                                | `withUsage`                                                                                | —                     | `Segment`          | —                                                                |
| PUT    | `/admin/segments/:id`              | admin · manager | Replace a segment with the full record from the form                   | —                                                                                          | `segment.update`      | `Segment`          | Keeps the slug (422 if another is sent); a built-in keeps its `kind` |
| PATCH  | `/admin/segments/:id`              | admin · manager | Update the given fields of a segment (toggles, order)                  | —                                                                                          | `segment.patch`       | `Segment`          | Same locks as `PUT`                                              |
| DELETE | `/admin/segments/:id`              | admin · manager | Delete a segment; 409 when it is in use or built in                    | —                                                                                          | —                     | `Null`             | 409 with `data.usedBy` (property types, properties); a built-in never goes |
| POST   | `/admin/segments/bulk`             | admin · manager | Apply one action to several segments                                   | —                                                                                          | `bulk`                | `BulkResult`       | activate · deactivate · delete — a built-in in a delete refuses it whole |
| GET    | `/admin/segments/check-slug`       | admin · manager | Check whether a segment slug is free and suggest an alternative        | `slug`, `excludeId`                                                                        | —                     | `SlugCheck`        | —                                                                |
| GET    | `/admin/property-types`            | admin · manager | List property types for the admin table                                | `page`, `perPage`, `sort`, `order`, `q`, `isActive`, `ids`, `segment`                      | —                     | `PropertyTypeList` | —                                                                |
| POST   | `/admin/property-types`            | admin · manager | Create a property type                                                 | —                                                                                          | `propertyType.create` | `PropertyType`     | Generates and de-duplicates the slug; mirrors it into `seo.slug` |
| GET    | `/admin/property-types/:id`        | admin · manager | Read one property type with every admin field                          | `withUsage`                                                                                | —                     | `PropertyType`     | —                                                                |
| PUT    | `/admin/property-types/:id`        | admin · manager | Replace a property type with the full record from the form             | —                                                                                          | `propertyType.update` | `PropertyType`     | Replaces the record; regenerates the slug when it changed        |
| PATCH  | `/admin/property-types/:id`        | admin · manager | Update the given fields of a property type (toggles, order, SEO panel) | —                                                                                          | `propertyType.patch`  | `PropertyType`     | —                                                                |
| DELETE | `/admin/property-types/:id`        | admin · manager | Delete a property type; 409 when it is still in use                    | —                                                                                          | —                     | `Null`             | 409 with `data.usedBy` when the record is still referenced       |
| POST   | `/admin/property-types/bulk`       | admin · manager | Apply one action to several property types                             | —                                                                                          | `bulk`                | `BulkResult`       | activate · deactivate · delete (plus the resource’s own actions) |
| GET    | `/admin/property-types/check-slug` | admin · manager | Check whether a property type slug is free and suggest an alternative  | `slug`, `excludeId`                                                                        | —                     | `SlugCheck`        | —                                                                |
| GET    | `/admin/amenities`                 | admin · manager | List amenities for the admin table                                     | `page`, `perPage`, `sort`, `order`, `q`, `isActive`, `ids`, `category`                     | —                     | `AmenityList`      | —                                                                |
| POST   | `/admin/amenities`                 | admin · manager | Create a amenity                                                       | —                                                                                          | `amenity.create`      | `Amenity`          | Generates and de-duplicates the slug; mirrors it into `seo.slug` |
| GET    | `/admin/amenities/:id`             | admin · manager | Read one amenity with every admin field                                | `withUsage`                                                                                | —                     | `Amenity`          | —                                                                |
| PUT    | `/admin/amenities/:id`             | admin · manager | Replace a amenity with the full record from the form                   | —                                                                                          | `amenity.update`      | `Amenity`          | Replaces the record; regenerates the slug when it changed        |
| PATCH  | `/admin/amenities/:id`             | admin · manager | Update the given fields of a amenity (toggles, order, SEO panel)       | —                                                                                          | `amenity.patch`       | `Amenity`          | —                                                                |
| DELETE | `/admin/amenities/:id`             | admin · manager | Delete a amenity; 409 when it is still in use                          | —                                                                                          | —                     | `Null`             | 409 with `data.usedBy` when the record is still referenced       |
| POST   | `/admin/amenities/bulk`            | admin · manager | Apply one action to several amenities                                  | —                                                                                          | `bulk`                | `BulkResult`       | activate · deactivate · delete (plus the resource’s own actions) |
| GET    | `/admin/amenities/check-slug`      | admin · manager | Check whether a amenity slug is free and suggest an alternative        | `slug`, `excludeId`                                                                        | —                     | `SlugCheck`        | —                                                                |
| GET    | `/admin/badges`                    | admin · manager | List badges for the admin table                                        | `page`, `perPage`, `sort`, `order`, `q`, `isActive`, `ids`                                 | —                     | `BadgeList`        | —                                                                |
| POST   | `/admin/badges`                    | admin · manager | Create a badge                                                         | —                                                                                          | `badge.create`        | `Badge`            | Generates and de-duplicates the slug; mirrors it into `seo.slug` |
| GET    | `/admin/badges/:id`                | admin · manager | Read one badge with every admin field                                  | `withUsage`                                                                                | —                     | `Badge`            | —                                                                |
| PUT    | `/admin/badges/:id`                | admin · manager | Replace a badge with the full record from the form                     | —                                                                                          | `badge.update`        | `Badge`            | Replaces the record; regenerates the slug when it changed        |
| PATCH  | `/admin/badges/:id`                | admin · manager | Update the given fields of a badge (toggles, order, SEO panel)         | —                                                                                          | `badge.patch`         | `Badge`            | —                                                                |
| DELETE | `/admin/badges/:id`                | admin · manager | Delete a badge; 409 when it is still in use                            | —                                                                                          | —                     | `Null`             | 409 with `data.usedBy` when the record is still referenced       |
| POST   | `/admin/badges/bulk`               | admin · manager | Apply one action to several badges                                     | —                                                                                          | `bulk`                | `BulkResult`       | activate · deactivate · delete (plus the resource’s own actions) |
| GET    | `/admin/badges/check-slug`         | admin · manager | Check whether a badge slug is free and suggest an alternative          | `slug`, `excludeId`                                                                        | —                     | `SlugCheck`        | —                                                                |
| GET    | `/admin/developers`                | admin · manager | List developers for the admin table                                    | `page`, `perPage`, `sort`, `order`, `q`, `isActive`, `ids`, `isFeatured`                   | —                     | `DeveloperList`    | —                                                                |
| POST   | `/admin/developers`                | admin · manager | Create a developer                                                     | —                                                                                          | `developer.create`    | `Developer`        | Generates and de-duplicates the slug; mirrors it into `seo.slug` |
| GET    | `/admin/developers/:id`            | admin · manager | Read one developer with every admin field                              | `withUsage`                                                                                | —                     | `Developer`        | —                                                                |
| PUT    | `/admin/developers/:id`            | admin · manager | Replace a developer with the full record from the form                 | —                                                                                          | `developer.update`    | `Developer`        | Replaces the record; regenerates the slug when it changed        |
| PATCH  | `/admin/developers/:id`            | admin · manager | Update the given fields of a developer (toggles, order, SEO panel)     | —                                                                                          | `developer.patch`     | `Developer`        | —                                                                |
| DELETE | `/admin/developers/:id`            | admin · manager | Delete a developer; 409 when it is still in use                        | —                                                                                          | —                     | `Null`             | 409 with `data.usedBy` when the record is still referenced       |
| POST   | `/admin/developers/bulk`           | admin · manager | Apply one action to several developers                                 | —                                                                                          | `bulk`                | `BulkResult`       | activate · deactivate · delete (plus the resource’s own actions) |
| GET    | `/admin/developers/check-slug`     | admin · manager | Check whether a developer slug is free and suggest an alternative      | `slug`, `excludeId`                                                                        | —                     | `SlugCheck`        | —                                                                |
| GET    | `/admin/banks`                     | admin · manager | List banks for the admin table                                         | `page`, `perPage`, `sort`, `order`, `q`, `isActive`, `ids`                                 | —                     | `BankList`         | —                                                                |
| POST   | `/admin/banks`                     | admin · manager | Create a bank                                                          | —                                                                                          | `bank.create`         | `Bank`             | Generates and de-duplicates the slug; mirrors it into `seo.slug` |
| GET    | `/admin/banks/:id`                 | admin · manager | Read one bank with every admin field                                   | `withUsage`                                                                                | —                     | `Bank`             | —                                                                |
| PUT    | `/admin/banks/:id`                 | admin · manager | Replace a bank with the full record from the form                      | —                                                                                          | `bank.update`         | `Bank`             | Replaces the record; regenerates the slug when it changed        |
| PATCH  | `/admin/banks/:id`                 | admin · manager | Update the given fields of a bank (toggles, order, SEO panel)          | —                                                                                          | `bank.patch`          | `Bank`             | —                                                                |
| DELETE | `/admin/banks/:id`                 | admin · manager | Delete a bank; 409 when it is still in use                             | —                                                                                          | —                     | `Null`             | 409 with `data.usedBy` when the record is still referenced       |
| POST   | `/admin/banks/bulk`                | admin · manager | Apply one action to several banks                                      | —                                                                                          | `bulk`                | `BulkResult`       | activate · deactivate · delete (plus the resource’s own actions) |
| GET    | `/admin/banks/check-slug`          | admin · manager | Check whether a bank slug is free and suggest an alternative           | `slug`, `excludeId`                                                                        | —                     | `SlugCheck`        | —                                                                |

#### Admin — articles

| Method | Path                                   | Auth/role       | Purpose                                                                   | Query                                                                                                                                 | Body schema              | Response shape        | Side effects                                                     |
| ------ | -------------------------------------- | --------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | --------------------- | ---------------------------------------------------------------- |
| GET    | `/admin/articles`                      | admin · manager | List articles for the admin table                                         | `page`, `perPage`, `sort`, `order`, `q`, `isActive`, `ids`, `status`, `categoryId`, `tagId`, `authorId`, `isFeatured`, `seoScoreBand` | —                        | `ArticleList`         | —                                                                |
| POST   | `/admin/articles`                      | admin · manager | Create a article                                                          | —                                                                                                                                     | `article.create`         | `Article`             | Generates and de-duplicates the slug; mirrors it into `seo.slug` |
| GET    | `/admin/articles/:id`                  | admin · manager | Read one article with every admin field                                   | `withUsage`                                                                                                                           | —                        | `Article`             | —                                                                |
| PUT    | `/admin/articles/:id`                  | admin · manager | Replace a article with the full record from the form                      | —                                                                                                                                     | `article.update`         | `Article`             | Replaces the record; regenerates the slug when it changed        |
| PATCH  | `/admin/articles/:id`                  | admin · manager | Update the given fields of a article (toggles, order, SEO panel)          | —                                                                                                                                     | `article.patch`          | `Article`             | —                                                                |
| DELETE | `/admin/articles/:id`                  | admin · manager | Delete a article; 409 when it is still in use                             | —                                                                                                                                     | —                        | `Null`                | 409 with `data.usedBy` when the record is still referenced       |
| POST   | `/admin/articles/bulk`                 | admin · manager | Apply one action to several articles                                      | —                                                                                                                                     | `bulk`                   | `BulkResult`          | activate · deactivate · delete (plus the resource’s own actions) |
| GET    | `/admin/articles/check-slug`           | admin · manager | Check whether a article slug is free and suggest an alternative           | `slug`, `excludeId`                                                                                                                   | —                        | `SlugCheck`           | —                                                                |
| GET    | `/admin/articles/:id/preview-token`    | admin · manager | A 24-hour preview token and URL for an unpublished article                | —                                                                                                                                     | —                        | `PreviewToken`        | Issues a token valid for 24 hours                                |
| GET    | `/admin/article-categories`            | admin · manager | List article categories for the admin table                               | `page`, `perPage`, `sort`, `order`, `q`, `isActive`, `ids`                                                                            | —                        | `ArticleCategoryList` | —                                                                |
| POST   | `/admin/article-categories`            | admin · manager | Create a article category                                                 | —                                                                                                                                     | `articleCategory.create` | `ArticleCategory`     | Generates and de-duplicates the slug; mirrors it into `seo.slug` |
| GET    | `/admin/article-categories/:id`        | admin · manager | Read one article category with every admin field                          | `withUsage`                                                                                                                           | —                        | `ArticleCategory`     | —                                                                |
| PUT    | `/admin/article-categories/:id`        | admin · manager | Replace a article category with the full record from the form             | —                                                                                                                                     | `articleCategory.update` | `ArticleCategory`     | Replaces the record; regenerates the slug when it changed        |
| PATCH  | `/admin/article-categories/:id`        | admin · manager | Update the given fields of a article category (toggles, order, SEO panel) | —                                                                                                                                     | `articleCategory.patch`  | `ArticleCategory`     | —                                                                |
| DELETE | `/admin/article-categories/:id`        | admin · manager | Delete a article category; 409 when it is still in use                    | —                                                                                                                                     | —                        | `Null`                | 409 with `data.usedBy` when the record is still referenced       |
| POST   | `/admin/article-categories/bulk`       | admin · manager | Apply one action to several article categories                            | —                                                                                                                                     | `bulk`                   | `BulkResult`          | activate · deactivate · delete (plus the resource’s own actions) |
| GET    | `/admin/article-categories/check-slug` | admin · manager | Check whether a article category slug is free and suggest an alternative  | `slug`, `excludeId`                                                                                                                   | —                        | `SlugCheck`           | —                                                                |
| GET    | `/admin/article-tags`                  | admin · manager | List article tags for the admin table                                     | `page`, `perPage`, `sort`, `order`, `q`, `isActive`, `ids`                                                                            | —                        | `ArticleTagList`      | —                                                                |
| POST   | `/admin/article-tags`                  | admin · manager | Create a article tag                                                      | —                                                                                                                                     | `articleTag.create`      | `ArticleTag`          | Generates and de-duplicates the slug; mirrors it into `seo.slug` |
| GET    | `/admin/article-tags/:id`              | admin · manager | Read one article tag with every admin field                               | `withUsage`                                                                                                                           | —                        | `ArticleTag`          | —                                                                |
| PUT    | `/admin/article-tags/:id`              | admin · manager | Replace a article tag with the full record from the form                  | —                                                                                                                                     | `articleTag.update`      | `ArticleTag`          | Replaces the record; regenerates the slug when it changed        |
| PATCH  | `/admin/article-tags/:id`              | admin · manager | Update the given fields of a article tag (toggles, order, SEO panel)      | —                                                                                                                                     | `articleTag.patch`       | `ArticleTag`          | —                                                                |
| DELETE | `/admin/article-tags/:id`              | admin · manager | Delete a article tag; 409 when it is still in use                         | —                                                                                                                                     | —                        | `Null`                | 409 with `data.usedBy` when the record is still referenced       |
| POST   | `/admin/article-tags/bulk`             | admin · manager | Apply one action to several article tags                                  | —                                                                                                                                     | `bulk`                   | `BulkResult`          | activate · deactivate · delete (plus the resource’s own actions) |
| GET    | `/admin/article-tags/check-slug`       | admin · manager | Check whether a article tag slug is free and suggest an alternative       | `slug`, `excludeId`                                                                                                                   | —                        | `SlugCheck`           | —                                                                |
| GET    | `/admin/authors`                       | admin · manager | List authors for the admin table                                          | `page`, `perPage`, `sort`, `order`, `q`, `isActive`, `ids`                                                                            | —                        | `AuthorList`          | —                                                                |
| POST   | `/admin/authors`                       | admin · manager | Create a author                                                           | —                                                                                                                                     | `author.create`          | `Author`              | Generates and de-duplicates the slug; mirrors it into `seo.slug` |
| GET    | `/admin/authors/:id`                   | admin · manager | Read one author with every admin field                                    | `withUsage`                                                                                                                           | —                        | `Author`              | —                                                                |
| PUT    | `/admin/authors/:id`                   | admin · manager | Replace a author with the full record from the form                       | —                                                                                                                                     | `author.update`          | `Author`              | Replaces the record; regenerates the slug when it changed        |
| PATCH  | `/admin/authors/:id`                   | admin · manager | Update the given fields of a author (toggles, order, SEO panel)           | —                                                                                                                                     | `author.patch`           | `Author`              | —                                                                |
| DELETE | `/admin/authors/:id`                   | admin · manager | Delete a author; 409 when it is still in use                              | —                                                                                                                                     | —                        | `Null`                | 409 with `data.usedBy` when the record is still referenced       |
| POST   | `/admin/authors/bulk`                  | admin · manager | Apply one action to several authors                                       | —                                                                                                                                     | `bulk`                   | `BulkResult`          | activate · deactivate · delete (plus the resource’s own actions) |
| GET    | `/admin/authors/check-slug`            | admin · manager | Check whether a author slug is free and suggest an alternative            | `slug`, `excludeId`                                                                                                                   | —                        | `SlugCheck`           | —                                                                |

#### Admin — content

| Method | Path                                   | Auth/role       | Purpose                                                              | Query                                                                                                  | Body schema            | Response shape             | Side effects                                                     |
| ------ | -------------------------------------- | --------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------- | -------------------------- | ---------------------------------------------------------------- |
| GET    | `/admin/faqs`                          | admin · manager | List FAQs for the admin table                                        | `page`, `perPage`, `sort`, `order`, `q`, `isActive`, `ids`, `category`, `showOnHome`, `propertyTypeId` | —                      | `FaqList`                  | —                                                                |
| POST   | `/admin/faqs`                          | admin · manager | Create a FAQ                                                         | —                                                                                                      | `faq.create`           | `Faq`                      | Generates and de-duplicates the slug; mirrors it into `seo.slug` |
| GET    | `/admin/faqs/:id`                      | admin · manager | Read one FAQ with every admin field                                  | `withUsage`                                                                                            | —                      | `Faq`                      | —                                                                |
| PUT    | `/admin/faqs/:id`                      | admin · manager | Replace a FAQ with the full record from the form                     | —                                                                                                      | `faq.update`           | `Faq`                      | Replaces the record; regenerates the slug when it changed        |
| PATCH  | `/admin/faqs/:id`                      | admin · manager | Update the given fields of a FAQ (toggles, order, SEO panel)         | —                                                                                                      | `faq.patch`            | `Faq`                      | —                                                                |
| DELETE | `/admin/faqs/:id`                      | admin · manager | Delete a FAQ; 409 when it is still in use                            | —                                                                                                      | —                      | `Null`                     | 409 with `data.usedBy` when the record is still referenced       |
| POST   | `/admin/faqs/bulk`                     | admin · manager | Apply one action to several FAQs                                     | —                                                                                                      | `bulk`                 | `BulkResult`               | activate · deactivate · delete (plus the resource’s own actions) |
| GET    | `/admin/testimonials`                  | admin · manager | List testimonials for the admin table                                | `page`, `perPage`, `sort`, `order`, `q`, `isActive`, `ids`, `isFeatured`                               | —                      | `TestimonialList`          | —                                                                |
| POST   | `/admin/testimonials`                  | admin · manager | Create a testimonial                                                 | —                                                                                                      | `testimonial.create`   | `Testimonial`              | Generates and de-duplicates the slug; mirrors it into `seo.slug` |
| GET    | `/admin/testimonials/:id`              | admin · manager | Read one testimonial with every admin field                          | `withUsage`                                                                                            | —                      | `Testimonial`              | —                                                                |
| PUT    | `/admin/testimonials/:id`              | admin · manager | Replace a testimonial with the full record from the form             | —                                                                                                      | `testimonial.update`   | `Testimonial`              | Replaces the record; regenerates the slug when it changed        |
| PATCH  | `/admin/testimonials/:id`              | admin · manager | Update the given fields of a testimonial (toggles, order, SEO panel) | —                                                                                                      | `testimonial.patch`    | `Testimonial`              | —                                                                |
| DELETE | `/admin/testimonials/:id`              | admin · manager | Delete a testimonial; 409 when it is still in use                    | —                                                                                                      | —                      | `Null`                     | 409 with `data.usedBy` when the record is still referenced       |
| POST   | `/admin/testimonials/bulk`             | admin · manager | Apply one action to several testimonials                             | —                                                                                                      | `bulk`                 | `BulkResult`               | activate · deactivate · delete (plus the resource’s own actions) |
| GET    | `/admin/team`                          | admin · manager | List team members for the admin table                                | `page`, `perPage`, `sort`, `order`, `q`, `isActive`, `ids`, `showOnAbout`                              | —                      | `TeamMemberList`           | —                                                                |
| POST   | `/admin/team`                          | admin · manager | Create a team member                                                 | —                                                                                                      | `teamMember.create`    | `TeamMember`               | Generates and de-duplicates the slug; mirrors it into `seo.slug` |
| GET    | `/admin/team/:id`                      | admin · manager | Read one team member with every admin field                          | `withUsage`                                                                                            | —                      | `TeamMember`               | —                                                                |
| PUT    | `/admin/team/:id`                      | admin · manager | Replace a team member with the full record from the form             | —                                                                                                      | `teamMember.update`    | `TeamMember`               | Replaces the record; regenerates the slug when it changed        |
| PATCH  | `/admin/team/:id`                      | admin · manager | Update the given fields of a team member (toggles, order, SEO panel) | —                                                                                                      | `teamMember.patch`     | `TeamMember`               | —                                                                |
| DELETE | `/admin/team/:id`                      | admin · manager | Delete a team member; 409 when it is still in use                    | —                                                                                                      | —                      | `Null`                     | 409 with `data.usedBy` when the record is still referenced       |
| POST   | `/admin/team/bulk`                     | admin · manager | Apply one action to several team members                             | —                                                                                                      | `bulk`                 | `BulkResult`               | activate · deactivate · delete (plus the resource’s own actions) |
| GET    | `/admin/team/check-slug`               | admin · manager | Check whether a team member slug is free and suggest an alternative  | `slug`, `excludeId`                                                                                    | —                      | `SlugCheck`                | —                                                                |
| GET    | `/admin/partners`                      | admin · manager | List partners for the admin table                                    | `page`, `perPage`, `sort`, `order`, `q`, `isActive`, `ids`, `category`                                 | —                      | `PartnerList`              | —                                                                |
| POST   | `/admin/partners`                      | admin · manager | Create a partner                                                     | —                                                                                                      | `partner.create`       | `Partner`                  | Generates and de-duplicates the slug; mirrors it into `seo.slug` |
| GET    | `/admin/partners/:id`                  | admin · manager | Read one partner with every admin field                              | `withUsage`                                                                                            | —                      | `Partner`                  | —                                                                |
| PUT    | `/admin/partners/:id`                  | admin · manager | Replace a partner with the full record from the form                 | —                                                                                                      | `partner.update`       | `Partner`                  | Replaces the record; regenerates the slug when it changed        |
| PATCH  | `/admin/partners/:id`                  | admin · manager | Update the given fields of a partner (toggles, order, SEO panel)     | —                                                                                                      | `partner.patch`        | `Partner`                  | —                                                                |
| DELETE | `/admin/partners/:id`                  | admin · manager | Delete a partner; 409 when it is still in use                        | —                                                                                                      | —                      | `Null`                     | 409 with `data.usedBy` when the record is still referenced       |
| POST   | `/admin/partners/bulk`                 | admin · manager | Apply one action to several partners                                 | —                                                                                                      | `bulk`                 | `BulkResult`               | activate · deactivate · delete (plus the resource’s own actions) |
| GET    | `/admin/pages`                         | admin · manager | List pages for the admin table                                       | `page`, `perPage`, `sort`, `order`, `q`, `isActive`, `ids`, `status`, `template`                       | —                      | `PageList`                 | —                                                                |
| POST   | `/admin/pages`                         | admin · manager | Create a page                                                        | —                                                                                                      | `page.create`          | `Page`                     | Generates and de-duplicates the slug; mirrors it into `seo.slug` |
| GET    | `/admin/pages/:id`                     | admin · manager | Read one page with every admin field                                 | `withUsage`                                                                                            | —                      | `Page`                     | —                                                                |
| PUT    | `/admin/pages/:id` | admin · manager | Replace a page with the full record from the form | — | `page.update` | `Page` | Replaces the record; regenerates the slug when it changed — never for a protected page (QA-56) |
| PATCH  | `/admin/pages/:id`                     | admin · manager | Update the given fields of a page (toggles, order, SEO panel)        | —                                                                                                      | `page.patch`           | `Page`                     | —                                                                |
| DELETE | `/admin/pages/:id` | admin · manager | Delete a page; 409 for a protected page (QA-56) | — | — | `Null` | 409 with the reason in `message` for the home page, a built-in page or a page the site links to by address |
| POST   | `/admin/pages/bulk` | admin · manager | Apply one action to several pages | — | `bulk` | `BulkResult` | publish · unpublish · delete; refused whole — 409 for a delete, 422 for an unpublish — with `data.refused[] { id, title, reason }` when a selected page cannot take the action (QA-56) |
| GET    | `/admin/pages/check-slug`              | admin · manager | Check whether a page slug is free and suggest an alternative         | `slug`, `excludeId`                                                                                    | —                      | `SlugCheck`                | —                                                                |
| GET    | `/admin/pages/:id/preview-token`       | admin · manager | A 24-hour preview token and URL for an unpublished page              | —                                                                                                      | —                      | `PreviewToken`             | Issues a token valid for 24 hours                                |
| GET    | `/admin/header-menus` | admin · manager | List the header's menus, hidden ones included (QA-56) | `page`, `perPage`, `sort`, `order`, `q`, `isActive`, `ids` | — | `HeaderMenuList` | — |
| POST   | `/admin/header-menus` | admin · manager | Add a menu of pages and links | — | `headerMenu.create` | `HeaderMenu` | Derives the slug from the name and each submenu's slug from its name; `source` is always `custom` |
| GET    | `/admin/header-menus/:id` | admin · manager | Read one menu | — | — | `HeaderMenu` | — |
| PUT    | `/admin/header-menus/:id` | admin · manager | Replace a menu with the full record from the dialog | — | `headerMenu.update` | `HeaderMenu` | Keeps the slug and the `source`; a removed submenu moves its pages into the menu's own list |
| PATCH  | `/admin/header-menus/:id` | admin · manager | Update the given fields of a menu (shown/hidden, order) | — | `headerMenu.patch` | `HeaderMenu` | An `order` PATCH renumbers the menus `1..n` (§5.8) |
| DELETE | `/admin/header-menus/:id` | admin · manager | Delete a menu of pages and links; 409 for a generated one | — | — | `Null` | Takes the menu's pages out of the header (`showInHeader:false`, `headerMenu:null`); they stay published |
| POST   | `/admin/header-menus/bulk` | admin · manager | Apply one action to several menus | — | `bulk` | `BulkResult` | activate · deactivate · delete |
| GET    | `/admin/header-menus/check-slug` | admin · manager | Check whether a menu slug is free and suggest an alternative | `slug`, `excludeId` | — | `SlugCheck` | — |
| GET    | `/admin/jobs`                          | admin · manager | List job postings for the admin table                                | `page`, `perPage`, `sort`, `order`, `q`, `isActive`, `ids`, `department`                               | —                      | `JobList`                  | —                                                                |
| POST   | `/admin/jobs`                          | admin · manager | Create a job posting                                                 | —                                                                                                      | `job.create`           | `Job`                      | Generates and de-duplicates the slug; mirrors it into `seo.slug` |
| GET    | `/admin/jobs/:id`                      | admin · manager | Read one job posting with every admin field                          | `withUsage`                                                                                            | —                      | `Job`                      | —                                                                |
| PUT    | `/admin/jobs/:id`                      | admin · manager | Replace a job posting with the full record from the form             | —                                                                                                      | `job.update`           | `Job`                      | Replaces the record; regenerates the slug when it changed        |
| PATCH  | `/admin/jobs/:id`                      | admin · manager | Update the given fields of a job posting (toggles, order, SEO panel) | —                                                                                                      | `job.patch`            | `Job`                      | —                                                                |
| DELETE | `/admin/jobs/:id`                      | admin · manager | Delete a job posting; 409 when it is still in use                    | —                                                                                                      | —                      | `Null`                     | 409 with `data.usedBy` when the record is still referenced       |
| POST   | `/admin/jobs/bulk`                     | admin · manager | Apply one action to several job postings                             | —                                                                                                      | `bulk`                 | `BulkResult`               | activate · deactivate · delete (plus the resource’s own actions) |
| GET    | `/admin/jobs/check-slug`               | admin · manager | Check whether a job posting slug is free and suggest an alternative  | `slug`, `excludeId`                                                                                    | —                      | `SlugCheck`                | —                                                                |
| GET    | `/admin/job-applications`              | admin · manager | Applications received for the job postings                           | `page`, `perPage`, `sort`, `order`, `q`, `jobId`, `status`                                             | —                      | `JobApplicationList`       | —                                                                |
| PATCH  | `/admin/job-applications/:id`          | admin · manager | Move an application through the hiring statuses                      | —                                                                                                      | `jobApplication.patch` | `JobApplication`           | —                                                                |
| DELETE | `/admin/job-applications/:id`          | admin · manager | Delete an application                                                | —                                                                                                      | —                      | `Null`                     | 409 with `data.usedBy` when the record is still referenced       |
| GET    | `/admin/newsletter-subscribers`        | admin · manager | Newsletter subscribers                                               | `page`, `perPage`, `sort`, `order`, `q`, `status`                                                      | —                      | `NewsletterSubscriberList` | —                                                                |
| DELETE | `/admin/newsletter-subscribers/:id`    | admin · manager | Remove a subscriber                                                  | —                                                                                                      | —                      | `Null`                     | 409 with `data.usedBy` when the record is still referenced       |
| GET    | `/admin/newsletter-subscribers/export` | admin · manager | CSV export of the filtered subscriber list                           | `q`, `status`                                                                                          | —                      | `Csv`                      | UTF-8 BOM CSV attachment                                         |

#### Admin — media, SEO, settings and users

| Method | Path                    | Auth/role       | Purpose                                                                                        | Query                                                                                                 | Body schema          | Response shape       | Side effects                                                                                                                                                                                                                             |
| ------ | ----------------------- | --------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/admin/media`          | admin · manager | List media items for the admin table                                                           | `page`, `perPage`, `sort`, `order`, `q`, `isActive`, `ids`, `type`, `provider`, `folder`, `withUsage` | —                    | `MediaList`          | `withUsage=true` adds `usedIn[]` to every row — one request for the page rather than one per card                                                                                                                                        |
| POST   | `/admin/media`          | admin · manager | Create a media item                                                                            | —                                                                                                     | `media.create`       | `Media`              | Metadata only — no binary crosses this API (D12). `provider`, `type` and `format` are inferred from the URL when the client omits them                                                                                                   |
| GET    | `/admin/media/:id`      | admin · manager | Read one media item with every admin field                                                     | `withUsage`                                                                                           | —                    | `Media`              | —                                                                                                                                                                                                                                        |
| PUT    | `/admin/media/:id`      | admin · manager | Replace a media item with the full record from the form                                        | —                                                                                                     | `media.update`       | `Media`              | Replaces the record                                                                                                                                                                                                                      |
| PATCH  | `/admin/media/:id`      | admin · manager | Update the given fields of a media item (toggles, order, SEO panel)                            | —                                                                                                     | `media.patch`        | `Media`              | —                                                                                                                                                                                                                                        |
| DELETE | `/admin/media/:id`      | admin · manager | Delete a media record; 409 listing `usedIn` when the file is still in use, unless `force=true` | `force`                                                                                               | —                    | `Null`               | 409 with `data.usedIn` (and `data.usedBy`) when a listing, article, page or the settings still show the file; `?force=true` removes the record anyway. The Cloudinary asset is never deleted — the API never held it (D12, prompt 39 §5) |
| POST   | `/admin/media/bulk`     | admin · manager | Apply one action to several media items                                                        | —                                                                                                     | `bulk`               | `BulkResult`         | activate · deactivate · delete (plus the resource’s own actions)                                                                                                                                                                         |
| GET    | `/admin/redirects`      | admin · manager | List redirects for the admin table                                                             | `page`, `perPage`, `sort`, `order`, `q`, `isActive`, `ids`                                            | —                    | `RedirectList`       | —                                                                                                                                                                                                                                        |
| POST   | `/admin/redirects`      | admin · manager | Create a redirect                                                                              | —                                                                                                     | `redirect.create`    | `Redirect`           | Generates and de-duplicates the slug; mirrors it into `seo.slug`                                                                                                                                                                         |
| GET    | `/admin/redirects/:id`  | admin · manager | Read one redirect with every admin field                                                       | `withUsage`                                                                                           | —                    | `Redirect`           | —                                                                                                                                                                                                                                        |
| PUT    | `/admin/redirects/:id`  | admin · manager | Replace a redirect with the full record from the form                                          | —                                                                                                     | `redirect.update`    | `Redirect`           | Replaces the record; regenerates the slug when it changed                                                                                                                                                                                |
| PATCH  | `/admin/redirects/:id`  | admin · manager | Update the given fields of a redirect (toggles, order, SEO panel)                              | —                                                                                                     | `redirect.patch`     | `Redirect`           | —                                                                                                                                                                                                                                        |
| DELETE | `/admin/redirects/:id`  | admin · manager | Delete a redirect; 409 when it is still in use                                                 | —                                                                                                     | —                    | `Null`               | 409 with `data.usedBy` when the record is still referenced                                                                                                                                                                               |
| POST   | `/admin/redirects/bulk` | admin · manager | Apply one action to several redirects                                                          | —                                                                                                     | `bulk`               | `BulkResult`         | activate · deactivate · delete (plus the resource’s own actions)                                                                                                                                                                         |
| GET    | `/admin/seo/settings`   | admin · manager | The complete SEO settings singleton                                                            | —                                                                                                     | —                    | `SeoSettings`        | —                                                                                                                                                                                                                                        |
| PUT    | `/admin/seo/settings`   | admin · manager | Replace the SEO settings; known keys are deep-merged                                           | —                                                                                                     | `seoSettings.update` | `SeoSettings`        | Deep-merges the known keys only; **403** when a manager changes `customHeadHtml` or `customBodyEndHtml`                                                                                                                                  |
| GET    | `/admin/seo/overview`   | admin · manager | Lightweight SEO rows for the dashboard and the uniqueness checks                               | `page`, `perPage`, `sort`, `order`, `q`, `type`, `scoreBand`, `index`                                 | —                    | `SeoOverviewRowList` | —                                                                                                                                                                                                                                        |
| GET    | `/admin/settings`       | admin · manager | The complete site settings singleton, including the lead branch                                | —                                                                                                     | —                    | `Settings`           | —                                                                                                                                                                                                                                        |
| PUT    | `/admin/settings`       | admin           | Replace the site settings; known keys are deep-merged                                          | —                                                                                                     | `settings.update`    | `Settings`           | Deep-merges the known keys only                                                                                                                                                                                                          |
| GET    | `/admin/users`          | admin · manager | List users for the admin table                                                                 | `page`, `perPage`, `sort`, `order`, `q`, `isActive`, `ids`, `role`                                    | —                    | `UserList`           | —                                                                                                                                                                                                                                        |
| POST   | `/admin/users`          | admin           | Create a user                                                                                  | —                                                                                                     | `user.create`        | `User`               | Generates and de-duplicates the slug; mirrors it into `seo.slug`                                                                                                                                                                         |
| GET    | `/admin/users/:id`      | admin · manager | Read one user with every admin field                                                           | —                                                                                                     | —                    | `User`               | —                                                                                                                                                                                                                                        |
| PUT    | `/admin/users/:id`      | admin           | Replace a user with the full record from the form                                              | —                                                                                                     | `user.update`        | `User`               | Replaces the record; regenerates the slug when it changed                                                                                                                                                                                |
| PATCH  | `/admin/users/:id`      | admin           | Update the given fields of a user (toggles, order, SEO panel)                                  | —                                                                                                     | `user.patch`         | `User`               | —                                                                                                                                                                                                                                        |
| DELETE | `/admin/users/:id`      | admin           | Delete a user; 409 when it is still in use                                                     | —                                                                                                     | —                    | `Null`               | 409 with `data.usedBy` when the record is still referenced                                                                                                                                                                               |
| POST   | `/admin/users/bulk`     | admin           | Apply one action to several users                                                              | —                                                                                                     | `bulk`               | `BulkResult`         | activate · deactivate · delete (plus the resource’s own actions)                                                                                                                                                                         |

#### The SEO desk's four endpoints

These four existed on the API from prompt 09 and were outside
`src/services/endpoints.js` while no screen called them. **Prompt 37 registered all
four**: the redirects screen imports, exports and tests paths with them, and the SEO
settings screen regenerates `llms.txt` with them.

| Method | Path                      | Auth/role       | Purpose                                                                    | Query  | Body              | Response                |
| ------ | ------------------------- | --------------- | -------------------------------------------------------------------------- | ------ | ----------------- | ----------------------- |
| GET    | `/redirects/resolve`      | public          | The rule for one path, or 404; the only place `hits` is counted            | `path` | —                 | `Redirect`              |
| POST   | `/admin/redirects/import` | admin · manager | Upsert redirects by `fromPath`; an unusable row is counted and skipped     | —      | `redirect.import` | `RedirectImportSummary` |
| GET    | `/admin/redirects/export` | admin · manager | CSV of the whole redirect table                                            | —      | —                 | `Csv`                   |
| GET    | `/admin/seo/llms-preview` | admin · manager | The `llms.txt` that "regenerate from data" would write, without storing it | —      | —                 | `LlmsPreview`           |

`GET /redirects/resolve` answers **404** when no active rule matches the path, which is
the answer "there is no redirect" rather than a failure; `redirectService.resolve()`
resolves to `null` for it. It is the one endpoint that increments `hits`, so a path
checked in the admin tester is a path with one more hit against it (D30, §9.10).

---

## Response shapes

Every name in the **Response shape** column above is defined here. `XList` is always
`{ data: X[], meta: ListMeta }`; a single resource is always `{ data: X }`.

### Envelope

```jsonc
// single resource
{ "data": { /* the record */ } }

// list
{ "data": [ /* records */ ], "meta": { "page": 1, "perPage": 12, "total": 57, "totalPages": 5 } }

// action / void
{ "data": null, "message": "Property deleted." }
```

### `ListMeta`

```jsonc
{
  "page": 1, // 1-based
  "perPage": 12, // 12 public, 20 admin, `all` on admin endpoints
  "total": 57,
  "totalPages": 5,
  "facets": {
    // property lists only (§5.7)
    "propertyType": [{ "id": 1, "name": "Apartments", "count": 24 }],
    "locality": [{ "id": 4, "name": "Whitefield", "count": 11 }],
    "bedrooms": [{ "value": 3, "count": 18 }],
    "constructionStatus": [{ "value": "ready-to-move", "count": 30 }],
  },
}
```

### `Error`

```jsonc
{
  "message": "The given data was invalid.",
  "errors": { "title": ["The title must be at least 10 characters."] },
}
```

`errors` is absent on 401, 403, 404, 429 and 500. A 409 from a master-data delete adds
`data.usedBy`:

```jsonc
{
  "message": "This locality is still in use.",
  "errors": { "id": ["Used by 3 properties"] },
  "data": { "usedBy": [{ "type": "property", "id": 12, "title": "Lakeview Heights" }] },
}
```

### `Property`

Every writable field of `docs/DATA_MODEL.md` §6.1 plus the read-only embeds and counters:
`propertyType {id,name,slug,segment}`, `amenities[] {id,name,slug,icon,category}`,
`badges[] {id,name,slug,color,icon}`, `location.locality {id,name,slug}`,
`location.city {id,name,slug}`, `project.developer {id,name,slug,logoUrl}`, `viewCount`,
`enquiryCount`, `publishedAt`, `createdAt`, `updatedAt`. Admin reads add `createdBy` and
`updatedBy`. Public reads drop `agent.phone`, `agent.whatsapp` and `agent.email` unless
`agent.showOnListing` is true.

Public reads also carry no address for a file behind the lead form (§5.10): they add
`hasBrochure` (a brochure is attached, gated or not) and `documents[].hasFile`, answer
`brochureUrl: null` while the brochure is gated, and a gated document keeps its row with
`url: null` and `leadGated: true`. A document that is the brochure's own file is left out.
Every floor plan answers `imageUrl: null`, `pdfUrl: null`, `hasImage`, `hasPdf`, and every
unit configuration `floorPlanImageUrl: null`, `floorPlanPdfUrl: null`,
`hasFloorPlanImage`, `hasFloorPlanPdf`. `DocumentAccess` below is how the page gets the
addresses.

### `PropertySummary`

The card payload returned inside `PropertyList`:

```jsonc
{
  "id": 1,
  "slug": "lakeview-heights-3-bhk-whitefield",
  "title": "Lakeview Heights",
  "listingType": "sale",
  "segment": "residential",
  "propertyType": { "id": 1, "name": "Apartments", "slug": "apartments", "segment": "residential" },
  "constructionStatus": "ready-to-move",
  "availability": "available",
  "pricing": {
    "price": 14200000,
    "priceOnRequest": false,
    "pricePerSqft": 8600,
    "rentPerMonth": null,
    "currency": "INR",
  },
  "area": { "superBuiltUpArea": 1650, "carpetArea": 1180, "plotArea": null, "areaUnit": "sqft" },
  "configuration": { "bedrooms": 3, "bathrooms": 3, "balconies": 2 },
  "location": {
    "locality": { "id": 4, "name": "Whitefield", "slug": "whitefield" },
    "city": { "id": 1, "name": "Bengaluru", "slug": "bengaluru" },
    "showExactLocation": false,
  },
  "images": [{ "id": 1, "url": "…", "alt": "…", "isCover": true }],
  "badges": [{ "id": 2, "name": "Ready to Move", "slug": "ready-to-move", "color": "success" }],
  "isFeatured": true,
  "isVerified": true,
  "publishedAt": "2026-08-02T06:14:00Z",
  "updatedAt": "2026-09-01T11:20:00Z",
  "viewCount": 412,
}
```

`images` carries at most the first four, cover first. `PropertyList` is
`{ data: PropertySummary[], meta: ListMeta }` — `meta.facets` is always present.

### `Lead`

Every field of §6.7 including `notes[]` and `activities[]`, plus the embeds
`property {id,title,slug}` and `assignedUser {id,name}`. `ipAddress` and
`userAgent` are returned to admins only. `LeadList` rows carry the same shape
without `activities`.

Each activity also carries **`createdByName`** — the author's name, joined from
the users on read (`null` for the system's own entries), as each note carries
its author's. A sales user cannot list the directory, so an id alone left their
timeline without authors (QA-53). A move to `lost` requires `lostReason`
(3–300 characters) and a move away from it clears the reason; see
`docs/backend-notes/05_business_rules.md` → Leads.

**`pageSlug` is a page's whole slug *path*, not a single segment.** §6.10 types
a CMS page's slug as a URL path and every lead-capture block passes `page.slug`
through verbatim, so a lead sent from `buyer-assistance/home-loan` carries that
string. It is still a slug and never a URL: a leading `/` is a 422 (prompt 45,
MB-02). The ceiling is 120 characters, the page's own.

Admin reads — the list, the detail and every write that answers with a lead —
also carry the computed boolean **`isPossibleDuplicate`**: `true` when another
lead holds the same normalised phone number and was created within **30 days**
of this one. The window is measured between the two leads rather than from
today, so a pair's answer never changes as the calendar moves on, and it is
computed over the whole collection rather than over the caller's scope — that
a caller has enquired before is a fact about the caller, and the sales user who
cannot see the other enquiry is the one who most needs telling that it exists
(D15 governs the records, not this flag). The public `POST /leads` response
does not carry it. A number the Indian mobile rule does not recognise is
compared on its digits rather than dropped.

### `LeadCreated`

What `POST /leads` answers: the public `Lead`, plus `access` — the token that opens the
gated files of the listing the lead names, or `null` when it names no active listing. The
token is never stored on the lead and never appears in a CRM read.

```jsonc
{
  "data": {
    "id": 46,
    "source": "brochure-download",
    "propertyId": 1,
    // …the rest of the Lead…
    "access": { "token": "tnc8yAeyAxhBDcMoky52ogcNlQcwX_Cm", "expiresAt": "2026-09-24T20:53:36Z" },
  },
}
```

### `DocumentAccess`

What `POST /properties/:id/documents/access` answers for a live token: every file of the
listing that has an address — the gated papers and the open ones, without a document that
is the brochure's own file — and the drawings and PDFs of the floor plans and of the
active unit configurations.

```jsonc
{
  "data": {
    "brochureUrl": "https://files.example.com/lakeview/brochure.pdf",
    "documents": [{ "id": 2, "url": "https://files.example.com/lakeview/price-list.pdf" }],
    "floorPlans": [
      {
        "id": 1,
        "imageUrl": "https://files.example.com/lakeview/plan-2bhk.png",
        "pdfUrl": "https://files.example.com/lakeview/plan-2bhk.pdf",
      },
    ],
    "unitConfigurations": [
      { "id": 1, "floorPlanImageUrl": "https://files.example.com/lakeview/unit-2bhk.png", "floorPlanPdfUrl": null },
    ],
  },
}
```

### `Article` / `ArticleSummary`

`Article` is every field of §6.8 plus `category`, `tags[]`, `author`, `contentText`,
`readingTimeMinutes`, `wordCount` and `viewCount`. `ArticleSummary` (what `ArticleList`
returns) drops `content`, `contentText`, `faqs`, `relatedArticleIds`,
`relatedPropertyIds` and the full `seo` object, keeping `seo.title` and
`seo.description`.

**Writes (QA-55).** An article that is `published` or `scheduled` needs an `excerpt`, a
`featuredImage.url` and 300 words in `content` — 422 on `excerpt`, `featuredImage.url` and
`content`, by `POST`, `PUT`, a `PATCH` that touches them or the status, and the bulk
`publish`, which refuses the whole batch with `data.notReady[] { id, title, gaps[] }`.
`published` with a future `publishedAt` is 422 on `publishedAt`; a scheduled article that
is bulk-published goes live now. `categoryId`, `authorId`, `tagIds[]`,
`relatedArticleIds[]` and `relatedPropertyIds[]` must name records that exist, and an
article cannot be related to itself (422 on the field, `tagIds.2` for the third). `content`
and `faqs[].answer` carrying a `<script>`, an inline event handler or a `javascript:` link
are 422. The rules, the messages and a Laravel sketch are in
`docs/backend-notes/05_business_rules.md` → "Article writes".

### `ArticleAdjacent`

The two articles either side of one, by `publishedAt`, within the category
`categoryId` names (all published articles when it is omitted). `prev` is the
one published **before** the article and `next` the one published after it, so
the pair walks a category in the order it was written; either is `null` at the
end of the category, and both are `null` when the article is not in the pool.
The rows are `ArticleSummary`, never the bodies.

```jsonc
{ "data": { "prev": {/* ArticleSummary */}, "next": null } }
```

### `Locality`, `Developer`, `PropertyType`, `Amenity`, `Badge`, `Bank`, `City`

The fields of §6.2–§6.6 plus `seo` where the entity has one; `Locality`, `Developer`,
`PropertyType`, `Amenity` and `Badge` add the computed `propertyCount` (active listings that
carry the record), and `Locality` embeds `city {id,name,slug}`. `Amenity` and `Badge` can also
be sorted by it (`sort=propertyCount`).

### `ArticleCategory`, `ArticleTag`, `Author`

The fields of §6.8 plus the computed `articleCount`. `Author` never exposes `email`
publicly.

### `Faq`, `Testimonial`, `TeamMember`, `Partner`

The fields of §6.9, unchanged.

### `Page`

The fields of §6.10: `blocks[] { id, type, order, data }` with the `data` shape of the
block type, plus `seo` and the header/footer placement: `showInHeader`, `headerMenu` (a
`headerMenus` slug), `headerSubmenu` (one of that menu's `submenus[].slug`, or `null` for
the menu's own list), `showInFooter`, `footerColumn`, `order`.

**Built-in and protected pages (QA-56).** Template `system` marks a **built-in** page — one
the site generates from its own data (`/buy`, `/localities`, `/insights/articles`…, the
eleven of `SYSTEM_PAGES` in `src/config/pages.js`). Its name, its placement and its order
are edited like any page's; it carries no blocks, it is always `published` (422 on
`status`), it is never created by a client (422 on `template`) and it is never deleted. A
**protected** page — a built-in one, or a written page the site's templates reach by
address (`home`, `contact`, `careers`, `sell-let`, the three legal texts,
`insights/real-estate-awareness`) — keeps its slug (§5.9) and is never deleted (409, single
or bulk). The home record may not be redirected (422 on `seo.redirect.enabled`): its
address is `/`. Its preview URL is `/?preview=…`. The rules and a Laravel sketch are in
`docs/backend-notes/05_business_rules.md` → "Pages".

### `PageNavList`

What the header and the footer are built from (prompt 27). Six fields per published
page, and never the blocks:

```jsonc
{
  "data": [
    {
      "slug": "buyer-assistance/home-loan",
      "title": "Home Loan Assistance",
      "headerMenu": "buyer-assistance", // a headerMenus slug (QA-56), or null
      "headerSubmenu": null, // one of that menu's submenus[].slug, or null
      "footerColumn": "services", // FOOTER_COLUMNS, or null
      "order": 7,
    },
  ],
  "meta": { "page": 1, "perPage": 10, "total": 10, "totalPages": 1 },
}
```

`showInHeader=true` and `showInFooter=true` narrow the list; without either it is every
published page's placement. Drafts never appear. A menu arrives whole, so the list is
unpaginated unless `page`/`perPage` ask otherwise.

### `HeaderMenu` / `HeaderMenuList`

One menu of the header (QA-56). The header is built from these, left to right by `order`,
and from the pages placed in each (`PageNavList`):

```jsonc
{
  "id": 9,
  "slug": "company", // kept once it exists: pages are filed under it
  "name": "Company", // the label the bar shows; unique in the header, any case
  "href": null, // where the label itself goes: "/path" or "https://…"; null opens the first entry
  "source": "custom", // custom | buy | rent | commercial — the last three are generated
  "submenus": [{ "slug": "who-we-are", "name": "Who we are" }], // the panel's groups
  "links": [
    {
      "label": "Under ₹50 lakh",
      "href": "/buy?maxPrice=5000000",
      "submenu": null, // one of submenus[].slug, or null for the menu's own list
      "order": 1,
      "newTab": false,
    },
  ],
  "isActive": true, // a hidden menu keeps its pages and links
  "order": 9,
  "builtIn": false, // read-only: true for a generated menu
  "createdAt": "2026-09-24T06:00:00.000Z",
  "updatedAt": "2026-09-24T06:00:00.000Z",
}
```

A generated menu (`source` `buy`, `rent`, `commercial`) draws the columns master data gives
it and takes pages and links after them; it is never created by a client and never deleted
(409), only hidden. A menu keeps its `slug` and its `source` (422). A submenu's slug is
derived from its name when sent empty and is unique within its menu, as is its name; a
link's `submenu` names one of them or none (422 per index). Deleting a menu takes its pages
out of the header; removing a submenu moves its pages into the menu's own list.

### `Job`, `JobApplication`

The fields of §6.11. `Job` adds the computed `applicationCount` on admin reads;
`JobApplication` embeds `job {id,title,slug}`.

### `Media`, `Redirect`, `NewsletterSubscriber`, `User`

The fields of §6.12 and §6.14. `Media` adds the best-effort `usedIn[] {type,id,title}`.
`User` never returns `password`. Public `Redirect` rows carry only `fromPath`, `toPath`
and `statusCode`.

### `Settings`

`siteSettings` (§6.13). `GET /settings` returns every branch except `leads`;
`GET /admin/settings` returns all of it.

### `SeoSettings`

`seoSettings` (§6.14), **in full** on both endpoints. The public site renders the title
templates, the knowledge graph, the verification tags and `customHeadHtml` itself, the
`robotsTxt` and `llmsTxt` documents are already public at `/robots.txt` and `/llms.txt`,
and the `sitemap` branch only describes files a crawler can fetch — so there is nothing
in the model to withhold, and a subset would be a rule nobody could justify later
(prompt 09 §4.8).

**Reading it is not writing it.** `customHeadHtml` and `customBodyEndHtml` are rendered
verbatim into every page of the public site, which makes them a way to run a script in
every visitor's browser — an administrator's decision rather than an editor's (§7, §9.3).
`PUT /admin/seo/settings` therefore answers **403** to a manager whose body changes either
field, while every other field on the screen stays a manager's to write. A body that
carries the stored value unchanged — which is what saving another tab of the same form
does — is not a change and is allowed through. The SEO settings screen enforces the same
rule by not offering the tab to a manager at all (prompt 37).

### `DashboardData`

```jsonc
{
  "data": {
    "stats": {
      "propertiesTotal": 0,
      "propertiesActive": 0,
      "propertiesFeatured": 0,
      "propertiesInactive": 0,
      "leadsTotal": 0,
      "leadsNew": 0,
      "leadsToday": 0,
      "leadsThisMonth": 0,
      "leadsLastMonth": 0,
      "conversionRate": 0.0,
      "articlesPublished": 0,
      "articlesDraft": 0,
      "viewsThisMonth": 0,
      "enquiriesThisMonth": 0,
      "subscribers": 0,
    },
    "trends": {
      "leadsByDay": [{ "date": "2026-09-15", "count": 3 }],
      "leadsBySource": [{ "source": "property-enquiry", "count": 12 }],
      "leadsByStatus": [{ "status": "new", "count": 7 }],
      "viewsByDay": [{ "date": "2026-09-15", "count": 84 }],
    },
    "recentLeads": [
      {
        "id": 1,
        "name": "…",
        "phone": "…",
        "source": "…",
        "status": "new",
        "propertyId": 1,
        "property": { "id": 1, "title": "…", "slug": "…" },
        "createdAt": "…",
        "assignedTo": null,
      },
    ],
    "topProperties": [{ "id": 1, "title": "…", "slug": "…", "viewCount": 412, "enquiryCount": 9 }],
    "seoHealth": {
      "averageScore": 0,
      "good": 0,
      "ok": 0,
      "poor": 0,
      "missingFocusKeyword": 0,
      "missingMetaDescription": 0,
    },
    "upcomingFollowUps": [
      { "id": 1, "name": "…", "followUpAt": "…", "status": "contacted", "assignedTo": 3 },
    ],
  },
}
```

`leadsByDay` and `viewsByDay` always hold 30 entries. For the `sales` role every lead
figure is scoped to leads assigned to the user or unassigned; property, article and SEO
figures stay global.

### `SeoOverviewRow`

```jsonc
{
  "key": "property:1", // `<type>:<id>` — unique across the eight collections
  "id": 1,
  "type": "property",
  "title": "…",
  "slug": "…",
  "url": "https://…/properties/…",
  "seo": {
    "focusKeyword": "…",
    "title": "…",
    "description": "…",
    "score": 84,
    "scoreBand": "good",
    "testsPassed": 21,
    "testsTotal": 24,
    "robots": { "index": true, "follow": true },
    "lastAnalyzedAt": "…",
  },
  "isActive": true,
  "status": "published",
  "updatedAt": "…",
  "duplicateOf": {
    // the `key`s of the records that share this row's value, per field
    "title": ["article:3"],
    "description": [],
    "focusKeyword": [],
  },
}
```

`GET /admin/seo/overview` returns `SeoOverviewRowList` and accepts `perPage=all`.

**`duplicateOf` is computed by the API** (prompt 37). Grouping eight collections by three
values is a pairwise comparison, and doing it in the browser on every render of the SEO
dashboard is an O(n²) the desk would pay for nothing; the server groups once, in one pass.
Three rules: values are compared trimmed, lower-cased and with runs of whitespace
collapsed; an **empty** value never collides, so two records nobody has written a
description for are not duplicates of each other; and the comparison is always over the
**whole site**, never over the filtered page, so `?type=property` still reports a title a
locality has taken. Entries are row `key`s rather than bare ids, because an id alone is
ambiguous across eight collections.

### `RedirectImportSummary`

```jsonc
{ "data": { "created": 12, "updated": 3, "skipped": 1 } }
```

### `LlmsPreview`

```jsonc
{ "data": { "llmsTxt": "# Squares N Acres\n…" } }
```

### `Suggestions`

```jsonc
{
  "data": {
    "localities": [{ "id": 4, "name": "Whitefield", "slug": "whitefield", "propertyCount": 11 }],
    "properties": [
      {
        "id": 1,
        "title": "Lakeview Heights",
        "slug": "…",
        "localityName": "Whitefield",
        "price": 14200000,
      },
    ],
    "propertyTypes": [{ "id": 1, "name": "Apartments", "slug": "apartments" }],
    "developers": [{ "id": 2, "name": "Aurelia Estates", "slug": "aurelia-estates" }],
  },
}
```

At most five of each; `q` must be at least two characters.

### `AuthSession`

```jsonc
{
  "data": {
    "token": "…",
    "expiresAt": "2026-09-16T09:00:00Z",
    "user": {
      "id": 1,
      "name": "…",
      "email": "…",
      "role": "admin",
      "avatarUrl": null,
      "phone": null,
    },
  },
}
```

### `BulkResult`, `SlugCheck`, `PreviewToken`, `ViewCount`, `Null`

```jsonc
{ "data": { "affected": 4 }, "message": "4 properties updated." }          // BulkResult
{ "data": { "available": false, "suggestion": "lakeview-heights-2" } }     // SlugCheck
{ "data": { "token": "…", "url": "https://…/insights/articles/…?preview=…" } } // PreviewToken
{ "data": { "viewCount": 413 } }                                            // ViewCount
{ "data": null, "message": "…" }                                            // Null
```

### `Csv`, `Xml`, `Text`

Not enveloped. `Csv` is UTF-8 with a BOM and a `Content-Disposition: attachment` header;
`Xml` is `text/xml`; `Text` is `text/plain`.

---

## Captured examples

Recorded from the mock (`npm run mock`) against the committed seed, with long branches
trimmed where the shape repeats. The counts are the starter seed's; the shapes are the
contract's.

### `GET /settings`

The public subset: everything except the `leads` branch (§6.13).

```jsonc
{
  "data": {
    "general": {
      "siteName": "Squares N Acres",
      "tagline": "Property advisory for Bengaluru",
      "logoUrl": "https://res.cloudinary.com/dn9gyaiik/image/upload/v1789465788/sna-logo_o09ugt.png",
      "siteUrl": "https://www.squaresnacres.com",
      "defaultLanguage": "en-IN",
      "contactEmail": "info@squaresnacres.com",
      "contactPhone": "9880000001",
      "whatsappNumber": "9880000001",
      "address": {
        "line1": "[Office address to be provided]",
        "line2": null,
        "locality": null,
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560001",
        "country": "India",
      },
      "workingHours": [
        {
          "days": "Monday to Saturday",
          "hours": "9:30 am – 6:30 pm",
        },
        {
          "days": "Sunday",
          "hours": "By appointment",
        },
      ],
    },
    "hero": {
      "title": "Find the right property in Bengaluru",
      "searchTabs": ["sale", "rent", "lease", "commercial", "plots"],
      "stats": [],
    },
    "navigation": {
      "headerCtaLabel": "Post Requirement",
      "headerCtaHref": "#post-requirement",
      "showCallButton": true,
      "showWhatsappButton": true,
    },
    "social": {
      "facebook": null,
      "instagram": null,
      "linkedin": null,
      "youtube": null,
      "x": null,
      "pinterest": null,
    },
    "footer": {
      "aboutText": "Squares N Acres is a property advisory based in Bengaluru. We list what we have seen, verify what we publish, and stay with our clients through the whole transaction.",
      "showNewsletter": true,
      "showGallery": false,
    },
    "newsletter": {
      "enabled": true,
      "title": "Property insight, once a month",
      "subtitle": "Locality notes, new launches and practical guidance. No spam, unsubscribe anytime.",
      "successMessage": "Thank you — please check your inbox to confirm the subscription.",
    },
    "integrations": {
      "googleAnalyticsId": null,
      "googleTagManagerId": null,
      "facebookPixelId": null,
      "googleMapsApiKey": null,
      "cloudinaryCloudName": null,
      "cloudinaryUploadPreset": null,
      "recaptchaSiteKey": null,
    },
    "updatedAt": "2026-09-10T09:00:00.000Z",
  },
}
```

### `GET /admin/dashboard`

```jsonc
{
  "data": {
    "stats": {
      "propertiesTotal": 6,
      "propertiesActive": 6,
      "propertiesFeatured": 3,
      "propertiesInactive": 0,
      "leadsTotal": 6,
      "leadsNew": 1,
      "leadsToday": 0,
      "leadsThisMonth": 3,
      "leadsLastMonth": 1,
      "conversionRate": 16.7,
      "articlesPublished": 3,
      "articlesDraft": 0,
      "viewsThisMonth": 0,
      "enquiriesThisMonth": 3,
      "subscribers": 2,
    },
    "trends": {
      "leadsByDay": [
        {
          "date": "2026-09-15",
          "count": 0,
        },
        {
          "date": "2026-09-16",
          "count": 0,
        },
      ],
      "leadsBySource": [
        {
          "source": "property-enquiry",
          "count": 1,
        },
        {
          "source": "brochure-download",
          "count": 1,
        },
      ],
      "leadsByStatus": [
        {
          "status": "new",
          "count": 1,
        },
        {
          "status": "contacted",
          "count": 1,
        },
      ],
      "viewsByDay": [
        {
          "date": "2026-09-15",
          "count": 0,
        },
        {
          "date": "2026-09-16",
          "count": 0,
        },
      ],
    },
    "recentLeads": [
      {
        "id": 1,
        "name": "Ananya Rao",
        "phone": "9876500001",
        "source": "property-enquiry",
        "status": "new",
        "propertyId": 1,
        "property": {
          "id": 1,
          "title": "Lakeview Heights — 3 BHK Apartments in Whitefield",
          "slug": "lakeview-heights-3-bhk-whitefield",
        },
        "createdAt": "2026-09-08T11:20:00.000Z",
        "assignedTo": null,
      },
    ],
    "topProperties": [
      {
        "id": 1,
        "title": "Lakeview Heights — 3 BHK Apartments in Whitefield",
        "slug": "lakeview-heights-3-bhk-whitefield",
        "viewCount": 184,
        "enquiryCount": 12,
      },
      {
        "id": 3,
        "title": "Cauvery Green Villas — 4 BHK Villas in Yelahanka",
        "slug": "cauvery-green-villas-yelahanka",
        "viewCount": 142,
        "enquiryCount": 9,
      },
    ],
    "seoHealth": {
      "averageScore": 0,
      "good": 0,
      "ok": 0,
      "poor": 0,
      "missingFocusKeyword": 0,
      "missingMetaDescription": 0,
    },
    "upcomingFollowUps": [
      {
        "id": 4,
        "name": "Rahul Menon",
        "followUpAt": "2026-09-16T05:30:00.000Z",
        "status": "site-visit",
        "assignedTo": 2,
        "assignedUser": "Manager User",
      },
    ],
  },
}
```

`leadsByDay` and `viewsByDay` always hold 30 entries and `leadsByStatus` always holds all
seven statuses, so a chart never has to guess at a missing day or a missing rung.

### `GET /admin/seo/overview?type=property&perPage=2`

```jsonc
{
  "data": [
    {
      "id": 1,
      "type": "property",
      "title": "Lakeview Heights — 3 BHK Apartments in Whitefield",
      "slug": "lakeview-heights-3-bhk-whitefield",
      "url": "https://www.squaresnacres.com/properties/lakeview-heights-3-bhk-whitefield",
      "seo": {
        "focusKeyword": "3 bhk apartments in whitefield",
        "title": "",
        "description": "Ready-to-move 2 and 3 BHK apartments at Lakeview Heights, Whitefield, Bengaluru — clubhouse, pool, covered parking and Purple Line metro access.",
        "score": null,
        "scoreBand": "none",
        "robots": {
          "index": true,
          "follow": true,
        },
      },
      "isActive": true,
      "status": null,
      "updatedAt": "2026-09-10T09:00:00.000Z",
    },
  ],
  "meta": {
    "page": 1,
    "perPage": 2,
    "total": 6,
    "totalPages": 3,
  },
}
```

### `GET /sitemap.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://www.squaresnacres.com/sitemap-properties.xml</loc>
    <lastmod>2026-09-10T09:00:00.000Z</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://www.squaresnacres.com/sitemap-localities.xml</loc>
    <lastmod>2026-09-10T09:00:00.000Z</lastmod>
  </sitemap>
  <!-- …developers, articles, pages -->
</sitemapindex>
```

Each child sitemap is a `<urlset>` of the same shape; `sitemap-properties.xml` adds
`<image:image>` entries (up to five per listing) under the Google image namespace.

### `GET /robots.txt`

```text
User-agent: *
Allow: /
Disallow: /admin
Disallow: /shortlist
Disallow: /*?preview=
Disallow: /*?q=

…
Sitemap: https://www.squaresnacres.com/sitemap.xml
Sitemap: https://www.squaresnacres.com/sitemap-properties.xml
Sitemap: https://www.squaresnacres.com/sitemap-localities.xml
Sitemap: https://www.squaresnacres.com/sitemap-developers.xml
Sitemap: https://www.squaresnacres.com/sitemap-articles.xml
Sitemap: https://www.squaresnacres.com/sitemap-pages.xml
```

`%siteurl%` is replaced from `seoSettings.siteUrl` at serve time and one `Sitemap:` line
is appended per child sitemap.
