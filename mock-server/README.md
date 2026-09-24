# Mock API

The local backend for the Squares N Acres frontend: **Express** with
**JSON Server 0.17.4 used as a library** (decision D9), seeded from the
committed `db.json`. It implements the contract of
`prompts/00_MASTER_CONTEXT.md` §5 — the same envelopes, errors, query
parameters and write semantics the Laravel API will implement — so the React
app never knows which backend it is talking to. Switching backends is a change
to `REACT_APP_API_URL` and nothing else.

```
npm run mock          # http://localhost:4000/api
npm run mock:watch    # the same, restarted whenever a file it loads changes
npm run mock:reset    # restore the runtime db from db.json
npm run dev           # mock:watch + React dev server together
npm run validate:seed # check db.json against the data model
npm run test:mock     # the mock's own tests (node --test, no framework)
npm run smoke         # walk every endpoint of the registry (needs a running mock)
```

## Environment

| Variable               | Default | Meaning                                               |
| ---------------------- | ------- | ----------------------------------------------------- |
| `MOCK_PORT`            | `4000`  | Port the API listens on                               |
| `MOCK_DELAY_MS`        | `0`     | Artificial latency on every response, for skeleton QA |
| `MOCK_TOKEN_TTL_HOURS` | `24`    | Lifetime of a token issued by `/auth/login`, in hours |
| `MOCK_FRESH`           | `0`     | `1` re-seeds the runtime db at startup                |

All four are documented in `.env.example`. They are read by Node at runtime,
so they are **not** prefixed `REACT_APP_` and never reach the bundle.

## A port held by an older mock

The web app talks to whatever answers on `MOCK_PORT`, and an older copy of
the mock refuses every admin screen added since it started (403: its route map
has no rule for them). So `server.js` claims the port before it reads the
runtime database, and when the port is taken it looks at what holds it
(`lib/takeover.js`, QA-57):

| What holds the port                              | What the new mock does                                                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| this checkout's mock, running the same code      | leaves it serving and exits 0 (`Nothing to start.`)                                                                |
| a mock running other code, or another checkout's | `POST /__mock/shutdown`, then takes the port                                                                       |
| a mock from before `/__mock/identity` existed    | finds the process on the port, checks that its command line runs `mock-server/server.js`, stops it, takes the port |
| any other program                                | touches nothing, exits 1 and says so                                                                               |

"The same code" is `sourceRevision()`: a digest of every module the process
loaded from the repository — the mock's own files and the `src/` modules it
shares — which is exactly what `node --watch` restarts on.

`GET /__mock/identity` and `POST /__mock/shutdown` belong to the standalone
server, not to the API: they sit outside `/api`, and neither the contract nor
the Laravel API has them. A shutdown is accepted only from this machine, only
with the `X-Mock-Takeover: 1` header and never with an `Origin` — a web page
cannot stop the developer's mock.

## The runtime database

`db.json` at the repository root is a **seed**, and the server never writes to
it. On first start the seed is copied to `mock-server/.runtime/db.json`
(git-ignored) and every mutation is written there, so a `POST` from the admin
panel cannot dirty the file under version control.

The copy survives restarts. To go back to the seed:

```
npm run mock:reset        # delete and re-copy, prints "Runtime db restored from db.json"
MOCK_FRESH=1 npm run mock # same, as part of starting the server
```

If the runtime copy is corrupt — a half-written file, a failed experiment — the
server refuses to start and says which file is broken and how to fix it. Run
`npm run mock:reset`.

## Envelopes

Every response carries one of three shapes (§5.2); there are no bare arrays or
objects anywhere.

```jsonc
// GET /api/properties/1
{ "data": { "id": 1, "slug": "lakeview-heights-3-bhk-whitefield", "…": "…" } }

// GET /api/properties?page=1&perPage=2
{ "data": [ … ], "meta": { "page": 1, "perPage": 2, "total": 6, "totalPages": 3 } }

// DELETE /api/admin/leads/7
{ "data": null, "message": "Deleted" }

// 422
{ "message": "The given data was invalid.",
  "errors": { "phone": ["The phone must be a valid Indian mobile number."] } }
```

Errors use §5.3: 400 bad request, 401 unauthenticated, 403 forbidden, 404 not
found, 409 conflict, 422 validation (Laravel's shape, nested keys dotted —
`location.localityId`, `images.0.alt`), 429 rate limited, 500 server error. An
unexpected failure answers `{ "message": "Internal server error" }` and logs
the stack to stderr.

## Query parameters

`mock-server/middleware/queryTranslate.js` maps the contract's vocabulary onto
JSON Server's:

| Contract         | JSON Server        | Notes                                          |
| ---------------- | ------------------ | ---------------------------------------------- |
| `page`           | `_page`            | 1-based, default 1                             |
| `perPage`        | `_limit`           | default 12 public / 20 admin, capped at 100    |
| `perPage=all`    | — (no limit)       | **admin routes only**; public falls back to 12 |
| `sort` + `order` | `_sort` + `_order` | `sort` must name a field of the collection     |
| `q`              | `q`                | full-text, case-insensitive                    |
| `localityId=4,7` | repeated parameter | any comma-separated filter                     |

A parameter the collection has no field for is dropped (§5.6, "unknown params
are ignored"). `page=999` returns an empty `data` with a correct `meta`.

## Authentication

`POST /api/auth/login` exchanges an e-mail and a password for an **opaque**
48-character token (`crypto.randomBytes(36)` in base64url), stored in the
`apiTokens` collection of the runtime database together with its `expiresAt`.
Every other authenticated call sends it back as `Authorization: Bearer <token>`.
Laravel Sanctum does the same job on the real API, so nothing about the token's
content is part of the contract.

```
curl -X POST -H "Content-Type: application/json" \
     -d '{"email":"admin@squaresnacres.com","password":"Admin@123"}' \
     http://localhost:4000/api/auth/login
# { "data": { "token": "…48 chars…", "expiresAt": "2026-09-16T21:41:51.145Z",
#             "user": { "id": 1, "name": "Admin User", "email": "…",
#                       "role": "admin", "avatarUrl": null, "phone": "9880000010" } } }

curl -H "Authorization: Bearer <token>" http://localhost:4000/api/auth/profile
```

| Endpoint             | Auth  | Notes                                                                        |
| -------------------- | ----- | ---------------------------------------------------------------------------- |
| `POST /auth/login`   | —     | 10 attempts per minute per IP → 429; 401 `Invalid email or password.`        |
| `POST /auth/logout`  | token | Revokes the token that made the call                                         |
| `GET /auth/profile`  | token | The signed-in user, never the password                                       |
| `PUT /auth/profile`  | token | `name`, `phone`, `avatarUrl` — a `PUT`, so the two optional fields are reset |
| `PUT /auth/password` | token | 422 on a wrong `currentPassword`; revokes the user's **other** tokens        |

The seed's three accounts (§6.14) are the only way in:

| E-mail                      | Password      | Role      |
| --------------------------- | ------------- | --------- |
| `admin@squaresnacres.com`   | `Admin@123`   | `admin`   |
| `manager@squaresnacres.com` | `Manager@123` | `manager` |
| `sales@squaresnacres.com`   | `Sales@123`   | `sales`   |

They are **local fixture credentials**: the seed stores them in plain text and
`mock-server/lib/password.js` compares them in plain text. Laravel stores a
bcrypt hash and compares with `Hash::check()`, so these three addresses and
passwords exist only on a developer's machine and are rotated before the real
API is seeded.

E-mail matching is case-insensitive and ignores surrounding whitespace;
passwords are case-sensitive. A login sets `lastLoginAt` and purges the tokens
that have expired since the last one.

A token is valid for `MOCK_TOKEN_TTL_HOURS` (default 24; fractional values
work, so `MOCK_TOKEN_TTL_HOURS=0.01` expires a session after 36 seconds — which
is how the client-side auto-logout is tested). Presenting an expired token
answers 401 and deletes the record. Tokens are also revoked when the account is
deactivated or deleted, and when its password changes (except the token that
changed it). A deactivated account's token answers `401 Account is inactive.`;
every other failure answers `401 Unauthenticated.` so that a response never
says whether a token was ever valid.

## Roles

`/api/admin/*` needs a token (401 otherwise) and the §7 matrix of
`src/config/rbac.js` (403 otherwise, with
`{ "message": "You do not have permission to perform this action." }`).
`mock-server/app.js` mounts the two middlewares on `/api/admin` **before** every
router, so the hand-written routes and the generic CRUD fallback are covered by
the same rule and a new admin route is protected before it is written.

The permission is derived from the path and the method by
`mock-server/lib/routePermissions.js`:

| Request                       | Permission          | Allowed               |
| ----------------------------- | ------------------- | --------------------- |
| `GET /admin/properties`       | `properties.view`   | admin, manager, sales |
| `POST /admin/properties`      | `properties.create` | admin, manager        |
| `PATCH /admin/properties/1`   | `properties.edit`   | admin, manager        |
| `POST /admin/properties/bulk` | `properties.bulk`   | admin, manager        |
| `GET /admin/localities`       | `masterData.view`   | admin, manager        |
| `GET /admin/leads/export`     | `leads.export`      | admin, manager, sales |
| `POST /admin/leads/7/notes`   | `leads.edit`        | admin, manager, sales |
| `DELETE /admin/leads/7`       | `leads.delete`      | admin, manager        |
| `GET /admin/settings`         | `settings.view`     | admin, manager        |
| `PUT /admin/settings`         | `settings.edit`     | admin                 |
| `GET /admin/users`            | `users.*`           | admin                 |

`GET` is `view`, `POST` `create`, `PUT`/`PATCH` `edit`, `DELETE` `delete`, and
a path segment that names the action itself wins (`bulk`, `export`,
`duplicate`, `check-slug`, `notes`, `claim`). An area that does not declare the
action falls back to the nearest one it does — a lead has no `create`, so
adding a note is a lead `edit`, which is exactly the permission a sales user
holds. **An admin path with no rule is denied**, so `/api/admin/apiTokens` and
`/api/admin/adminUsers` answer 403 for everyone.

Inside a route, `req.user` is the signed-in user (without the password) and
`req.token` the `apiTokens` row. `mock-server/middleware/role.js` also exports
`role('admin', 'manager')` and `can('leads', 'delete')` for a route that wants
to name its own rule.

`/admin/users` is the one resource whose own rules go beyond the matrix: you
cannot deactivate or delete your own account or change your own role (a `PUT`
on yourself keeps it, a `PATCH` that changes it is a 422), the last active
admin cannot be deactivated, demoted or deleted, e-mail addresses are unique
(409), and deleting a user unassigns their leads — with an "Unassigned (user
deleted)" activity on each — and revokes their tokens.

## Public versus admin

`/api/<collection>` is the public view, `/api/admin/<collection>` the editor's.
Public reads are forced into the collection's `publicScope` (`isActive=true`,
or `status=published` for articles and pages), a detail read of a record
outside that scope answers 404 rather than 403, and the fields of `publicOmit`
— plus an agent's contact details when `agent.showOnListing` is false — are
stripped. A collection with no public endpoint at all (`leads`, `media`,
`adminUsers`, …) answers 404 on the public prefix, while the public writes the
contract does define (`POST /leads`, `POST /newsletter/subscribe`) stay open.
Fields marked `secret` in the schema (`adminUsers.password`, `apiTokens.token`)
are never returned by any endpoint.

Seven collections exist only behind `/api/admin` and answer **404** on the
public prefix — `adminUsers`, `apiTokens`, `media`, `leads`, `jobApplications`,
`newsletterSubscribers` and `propertyViews` (`PRIVATE_COLLECTIONS` in
`mock-server/middleware/publicScope.js`). 404 rather than 403, because the
existence of the collection is not public information either. The one public
write the contract defines on such a collection — `POST /leads`, the lead form
— stays open; `POST /newsletter/subscribe` and `POST /jobs/:id/apply` have
their own paths and need no exception.

## Properties

`GET /api/properties` implements §5.7 in full: `listingType`, `segment`,
`propertyTypeId`, `localityId`, `cityId`, `constructionStatus`, `availability`,
`bedrooms`, `minPrice`/`maxPrice`, `minArea`/`maxArea`/`areaUnit`, `furnishing`,
`facing`, `developerId`, `amenityIds`, `badgeIds`, `isFeatured`, `isVerified`,
`reraRegistered`, `possessionBy`, `q`, `ids`, `sort`, `page`, `perPage`. The
admin list adds `isActive`, `seoScoreBand` and `createdBy`.

Three rules are worth knowing before reading a result set:

| Rule     | What the mock does                                                                                                                                                                        |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| price    | `pricing.price` for a sale, `pricing.rentPerMonth` for a rent or lease, `priceRangeMin` when a project is quoted as a range. **On request** drops out of any price filter and sorts last. |
| area     | `superBuiltUpArea ?? carpetArea ?? plotArea`, converted to sq ft; the filter's bounds are converted from `areaUnit`, so `minArea=280&areaUnit=sqm` works.                                 |
| bedrooms | the property's own `configuration.bedrooms` **or** any active unit configuration; `bedrooms=5` means five or more. A plot or an office matches neither.                                   |

```
curl "http://localhost:4000/api/properties?bedrooms=3&sort=price-asc"
curl "http://localhost:4000/api/properties?minArea=280&areaUnit=sqm"
curl "http://localhost:4000/api/properties?ids=3,1"   # in that order, other filters ignored
```

Every property list carries `meta.facets` — `propertyType`, `locality`,
`bedrooms` and `constructionStatus` counts computed **after** the filters and
**before** pagination, so "Whitefield (3)" counts the results you are looking
at. A property is counted under each bedroom count it can be found under,
which is exactly what the filter would return.

`GET /properties/featured`, `/properties/suggestions?q=`, `/properties/slug/:slug`,
`/properties/:id/similar` and `POST /properties/:id/view` complete the public
set. `similar` answers with the editor's `similarPropertyIds` first — skipping
the ones that are no longer active — and fills up to six from the same listing
type in the same locality or of the same property type. A view counts once per
IP per property per hour; the repeat answers with the same number and writes
nothing.

On the admin side, `POST`/`PUT`/`PATCH` generate and de-duplicate the slug
(`seo.slug` always matches), assign an id to every new entry of `images`,
`unitConfigurations`, `floorPlans`, `documents`, `nearbyPlaces`,
`constructionTimeline` and `faqs`, keep exactly one cover image, set
`publishedAt` the first time a listing goes live and record `createdBy` /
`updatedBy`. `viewCount` and `enquiryCount` are never taken from a client
(D95). `POST /admin/properties/:id/duplicate` copies the listing as an inactive
draft named `… (Copy)` at `<slug>-copy`, with the counters and the SEO score
reset; `DELETE` also removes the listing from every `similarPropertyIds` that
named it.

## Leads

`POST /api/leads` is the one public write. It is throttled to ten submissions
per minute per IP, honours the `website` honeypot (a filled one answers
`200 { "data": null, "message": "ok" }` and stores nothing), normalises the
phone number to `+919876543210`, maps the boilerplate's 24 legacy `source`
values onto the §6.17 vocabulary (`property_enquiry` → `property-enquiry`),
reads `utm_*` out of `pageUrl` when the body carries none, stores `ipAddress`
and `userAgent`, opens the timeline with "Lead created via …" and increments
the property's `enquiryCount`. With `siteSettings.leads.autoAssign` set to
`round-robin` it also hands the lead to the next active sales user.

The CRM list supports `q`, `status`, `source`, `assignedTo` (`me`,
`unassigned` or an id), `propertyId`, `priority`, `from`/`to` and
`sort=createdAt|updatedAt|followUpAt|status|priority`. `from` and `to` compare
the **IST date** of `createdAt` (QA-53, superseding D96's UTC), the day the
panel prints. A status sorts along the funnel with Lost last and a priority from
Low to High; rows that tie stay newest first. `q` also finds a phone number
however it is typed — `98765 43210`, `+91 98765 43210`, `098765 43210`.
`GET /admin/leads/export` answers with the same rows, in the same order, as a
UTF-8 CSV with a BOM and a
`Content-Disposition: attachment; filename="leads-<yyyy-mm-dd>.csv"` header:
labels rather than stored values, IST dates, a Lost Reason column, and a cell a
spreadsheet would run as a formula prefixed with an apostrophe.

Every change that matters appends an activity — "Status changed from New to
Contacted", "Status changed from Contacted to Lost — Bought elsewhere",
"Assigned to Sales User", "Priority changed from Medium to High", "Follow-up set
for 20 Sep 2026, 10:00 am", "Note added" — so the lead detail can be read as a
story. Notes carry their author (`createdBy`, `createdByName`), and so does
every activity in a response: `createdByName` is read from the directory, which
a sales user cannot list. A change that changes nothing writes nothing.

**Lost asks why.** Moving a lead to `lost` — by `PATCH` or by a bulk action —
needs a `lostReason` of at least three characters (422 otherwise); reopening a
lost lead clears it, and a reason on a lead that is not lost is a 422. A lead
cannot be handed to a deactivated user.

**The sales scope (D15)** applies to the list, the detail read, every write and
the export: a sales user sees the leads assigned to them and the ones nobody
has taken. A lead outside that scope answers 404, not 403. They may change
`status`, `priority`, `followUpAt` and `lostReason`, and take an unassigned
lead with `POST /admin/leads/:id/claim` (409 when somebody got there first);
handing a lead to somebody else (`assignedTo`), deleting one and the bulk
actions are `leads.assign`, `leads.delete` and `leads.bulk`, which they do not
hold.

## `PUT` versus `PATCH`

|                                                                                                               | `PUT`                               | `PATCH`                              |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------ |
| Meaning                                                                                                       | replace the whole record            | change only what is sent             |
| Missing required field                                                                                        | **422** — never a silent wipe       | ignored                              |
| Missing optional field                                                                                        | stored at its model default         | left untouched                       |
| Object field (`seo`, `pricing`, `location`, `area`, `configuration`, `project`, `sectionVisibility`, `agent`) | defaults merged under what you send | merged one level with what is stored |
| Unknown field                                                                                                 | dropped                             | dropped, still 200                   |

```
# keeps the other 18 seo keys, and every other field of the property
curl -X PATCH -H "Content-Type: application/json" \
     -d '{"seo":{"title":"New title"}}' \
     http://localhost:4000/api/admin/properties/1
```

`POST` assigns `id = max(id) + 1` (D14) and sets `createdAt`/`updatedAt`; a
`PUT` keeps the id, the `createdAt` and every server-managed value
(`viewCount`, `enquiryCount`, `publishedAt`, `createdBy`…). Read-only fields —
the embedded display objects and the computed counters — are dropped from any
body that sends them (§5.5). The two singletons, `siteSettings` and
`seoSettings`, are always merged into, never replaced.

`DELETE` is handled before JSON Server sees it, because JSON Server's own
`destroy` also removes every record whose foreign key no longer resolves —
and a lead with `propertyId: null` qualifies, so one delete would take
unrelated rows with it. Deleting something already gone is a 404.

## Adding a route (prompts 07–09)

Custom routers are mounted under `/api` **before** the generic CRUD router, so
a hand-written route always wins:

```js
// mock-server/routes/properties.js
const express = require('express');

module.exports = ({ getCollection, getModel }) => {
  const router = express.Router();

  router.get('/properties/slug/:slug', (req, res, next) => {
    const property = getCollection('properties').find((p) => p.slug === req.params.slug);
    if (!property || !property.isActive) return next(notFound());
    res.ok(embedProperty(property));
  });

  return router;
};
```

Register it in `mock-server/routes/index.js`:

```js
const customRouters = [require('./auth'), require('./users'), require('./properties')];
```

Each entry is a factory receiving `{ db, config, getModel, getCollection,
getSingleton }`. Inside a route, `res.ok(data[, meta])`, `res.created(data)`
and `res.message(text)` produce the envelopes; throwing or passing an
`ApiError` from `mock-server/middleware/errors.js` produces the error shapes.
`mock-server/middleware/rateLimit.js` guards the public write endpoints, and
`mock-server/middleware/validate.js` exposes `validateBody(schema, body, opts)`
for bodies the generic validator does not cover.

An `/admin/...` route inside a custom router is authenticated and checked
against the matrix before it runs, so it can read `req.user` straight away —
and it must add its resource to `mock-server/lib/routePermissions.js`, or every
call to it answers 403.

## Tests

```
npm run test:mock   # cd mock-server && node --test
```

`mock-server/__tests__/` holds the mock's own tests: Node's built-in
`node:test` and `node:assert`, no framework (§3.3 allows no new dependency).
Each test starts `createApp()` on an ephemeral port over its **own** copy of
the seed in `os.tmpdir()`, so the tests never touch `db.json`, never touch
`mock-server/.runtime/db.json`, and each one gets a fresh login rate-limit
counter. `npm run test:mock` is part of `npm run check:all`.

The script runs `node --test` from inside `mock-server/` rather than passing it
a path: Node 22 no longer expands a directory given to `--test`, and Node 20
does not expand a glob, so the directory to run _from_ is the one form that
works on both.

## Content, master data, SEO and the files

Prompt 09 completed the catalogue: **every endpoint of §5.14 now has a
hand-written owner**, and the generic JSON Server router is a fallback for the
spellings the contract never named (see _Adding a collection_ below).

### The routers

| Router                 | Owns                                                                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `routes/auth.js`       | `/auth/*`                                                                                                                                       |
| `routes/users.js`      | `/admin/users`                                                                                                                                  |
| `routes/properties.js` | `/properties*`, `/admin/properties*`                                                                                                            |
| `routes/leads.js`      | `/leads`, `/admin/leads*`                                                                                                                       |
| `routes/masterData.js` | localities, cities, property types, amenities, badges, developers, banks, article categories, tags, authors, FAQs, testimonials, team, partners |
| `routes/articles.js`   | `/articles*`, `/admin/articles*`                                                                                                                |
| `routes/pages.js`      | `/pages/slug/:slug`, `/admin/pages*`                                                                                                            |
| `routes/media.js`      | `/admin/media*`                                                                                                                                 |
| `routes/settings.js`   | `/settings`, `/admin/settings`                                                                                                                  |
| `routes/seo.js`        | `/seo/settings`, `/admin/seo/*`                                                                                                                 |
| `routes/dashboard.js`  | `/admin/dashboard`                                                                                                                              |
| `routes/newsletter.js` | `/newsletter/subscribe`, `/admin/newsletter-subscribers*`                                                                                       |
| `routes/jobs.js`       | `/jobs*`, `/admin/jobs*`, `/admin/job-applications*`                                                                                            |
| `routes/redirects.js`  | `/redirects*`, `/admin/redirects*`                                                                                                              |
| `routes/sitemap.js`    | `/sitemap*.xml`, `/robots.txt`, `/rss.xml`, `/llms.txt` — and their root mirrors                                                                |

### Public routes

```
GET  /api/localities           zone, cityId, isFeatured, q; sort order|name|propertyCount
GET  /api/localities/slug/:slug
GET  /api/cities               GET /api/cities/slug/:slug
GET  /api/property-types       segment                  GET /api/property-types/slug/:slug
GET  /api/amenities            category                 GET /api/amenities/slug/:slug
GET  /api/badges               GET /api/badges/slug/:slug
GET  /api/developers           isFeatured, q            GET /api/developers/slug/:slug
GET  /api/banks                active, sorted by order  GET /api/banks/slug/:slug
GET  /api/article-categories   with articleCount        GET /api/article-categories/slug/:slug
GET  /api/article-tags         with articleCount        GET /api/article-tags/slug/:slug
GET  /api/authors              never with an e-mail     GET /api/authors/slug/:slug
GET  /api/faqs                 category, showOnHome, propertyTypeId
GET  /api/testimonials         isFeatured
GET  /api/team                 showOnAbout              GET /api/team/slug/:slug
GET  /api/partners             category
GET  /api/articles             categoryId|categorySlug, tagId|tagSlug, authorId|authorSlug,
                               q, isFeatured, ids; sort newest|popular
GET  /api/articles/slug/:slug  ?preview=<token> for a draft; counts one read per hour
GET  /api/articles/trending    the six most-read
GET  /api/pages/slug/:slug     ?preview=<token> for a draft
GET  /api/jobs                 active and not past closesAt, newest first
GET  /api/jobs/slug/:slug      readable after it closes, with isOpen:false
POST /api/jobs/:id/apply       throttled, honeypot, 404 "This opening is closed."
GET  /api/settings             everything except the leads branch
GET  /api/seo/settings         the whole singleton
GET  /api/redirects            active rules as { fromPath, toPath, statusCode }
GET  /api/redirects/resolve    ?path=… — the one place hits are counted
POST /api/newsletter/subscribe throttled, honeypot, 200 "Already subscribed" for a known address
GET  /api/sitemap.xml          + sitemap-properties|localities|developers|articles|pages.xml
GET  /api/robots.txt  /api/rss.xml  /api/llms.txt
```

Every one of those files is also served at the root — `/sitemap.xml`,
`/robots.txt`, `/rss.xml`, `/llms.txt` — which is where Nginx proxies them in
production (D21). `mock-server/app.js` rewrites the root path onto `/api`, so
there is one implementation and not two.

### Admin routes

Each of the master-data, article, page, media, job, redirect and subscriber
resources answers the same shape (§5.14):

```
GET    /api/admin/<resource>             perPage=all, isActive, the resource's filters
POST   /api/admin/<resource>
GET    /api/admin/<resource>/:id
PUT    /api/admin/<resource>/:id         replaces; omitted optional fields become defaults
PATCH  /api/admin/<resource>/:id         changes only what it sends
DELETE /api/admin/<resource>/:id         409 with data.usedBy when something still points at it
POST   /api/admin/<resource>/bulk        activate|deactivate|delete (+ feature|unfeature, …)
GET    /api/admin/<resource>/check-slug  ?slug=&excludeId=
```

and these add their own:

```
GET  /api/admin/dashboard                  §6.16; sales sees their own lead figures
GET  /api/admin/articles/:id/preview-token 24-hour link to a draft (D28)
GET  /api/admin/pages/:id/preview-token
POST /api/admin/articles/bulk              publish | unpublish | archive | feature | unfeature | delete
POST /api/admin/pages/bulk                 publish | unpublish | delete
GET  /api/admin/media?withUsage=true       adds usedIn to every row
GET  /api/admin/job-applications           jobId, status, q; embeds the job
GET  /api/admin/newsletter-subscribers/export   CSV with a BOM
GET  /api/admin/redirects/export           CSV with a BOM
POST /api/admin/redirects/import           { rows: [...] } → { created, updated, skipped }
GET, PUT /api/admin/settings               PUT deep-merges the known keys only
GET, PUT /api/admin/seo/settings
GET  /api/admin/seo/overview               type, q, scoreBand, index, perPage=all
GET  /api/admin/seo/llms-preview           the generated llms.txt, unsaved
```

### The rules worth knowing

| Area         | Rule                                                                                                                                                                                                                                                                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Articles     | An article is public when `status` says published **or** `scheduled` **and** `publishedAt` has arrived; a read settles a due `scheduled` article to `published`. A save derives `contentText`, `wordCount` and `readingTimeMinutes`, sets `publishedAt` the first time it goes live and never moves it again, and refuses `scheduled` without a future date (422). |
| Counters     | `propertyCount` counts **active** listings; `articleCount` counts published ones. Both are computed per request, so they are filterable and sortable and can never go stale.                                                                                                                                                                                       |
| Delete guard | Deleting master data that something still names answers 409 with `errors.id` and `data.usedBy` (D88). Only a **named** reference counts: a `team` block with an empty `memberIds` renders everybody but names nobody. A bank has no dependants and always deletes.                                                                                                 |
| Pages        | Blocks get ids on save and their `order` is renumbered `1…n`. A `<script` in a `richText` or `html` block answers 422 on `blocks.<n>.data.html`.                                                                                                                                                                                                                   |
| Settings     | `PUT /admin/settings` and `PUT /admin/seo/settings` merge **known keys only** — unknown keys are dropped — descend into objects and **replace** arrays. `settings.edit` is an admin permission, so a manager reads and gets 403 on save.                                                                                                                           |
| Redirects    | `fromPath` starts with `/` and is unique; a rule may not point at itself or at another active rule's `fromPath` (422). `import` upserts by `fromPath` and skips a row it cannot use.                                                                                                                                                                               |
| Sitemaps     | Built from `seoSettings.sitemap` with per-entity `seo.sitemap` overrides: `include:false` drops a record, `priority`/`changefreq` override the defaults, and `excludeUrls` drops a path or an absolute URL. Properties carry up to five `<image:image>` entries and none when there are no images.                                                                 |
| llms.txt     | `seoSettings.llmsTxt` when it is not empty, otherwise generated from the data (§9.8). `GET /admin/seo/llms-preview` shows what "regenerate from data" would write.                                                                                                                                                                                                 |
| Preview      | `?preview=<token>` opens one draft for 24 hours. The tokens live in memory, so a restart ends every preview link — and `<Seo>` renders every previewed page `noindex,nofollow`.                                                                                                                                                                                    |

## Adding a collection

Twenty resources are the same eight endpoints, so they are written once in
`mock-server/lib/crud.js` and configured per resource. A new plain collection
is an entry in `mock-server/routes/masterData.js`:

```js
{
  basePath: 'awards',                 // /awards and /admin/awards
  collection: 'awards',               // the db.json key and the schemas/models.js descriptor
  schema: 'award',                    // src/services/schemas — award.create/.update/.patch
  needs: ['properties'],              // collections `afterRead` resolves ids against
  noun: { one: 'award', many: 'awards' },
  deleteGuard: 'award',               // a finder in mock-server/lib/usage.js, or false
  afterRead: (record, { collections }) => ({ ...record, propertyCount: … }),
  publicFilters: { category: { field: 'category' } },
  sorts: { order: 'order,name', name: 'name' },
  defaultSort: 'order',
}
```

Four things have to exist alongside it, and the checks say so when they do not:

1. a descriptor in `mock-server/schemas/models.js` (`npm run validate:seed` reads it);
2. `award.create` / `award.update` / `award.patch` in `src/services/schemas`;
3. the resource in `mock-server/lib/routePermissions.js`, or every admin call is a 403;
4. its entries in `src/services/endpoints.js`, or `npm run smoke` never exercises it.

A resource that needs more than the factory gives — a filter that compares
something computed, a save that derives a field, a publication rule — writes its
own router and mounts the factory for the rest, the way
`mock-server/routes/articles.js` does:

```js
router.get('/articles/trending', …);            // the part that is its own
router.use(makeCrudRouter({ …, publicPath: false, beforeSave: deriveFromContent }));
```

The hooks the factory offers, in the order it calls them: `beforeValidate(body)`
(ids and inferred values a client is not expected to send), `beforeSave(record)`
(what a save derives), `afterSave(record)` (including bulk actions),
`afterRead(record, { admin, collections, query, list })` (embeds and counters),
`publicTransform(record)`, `listShape(record, { admin })`, `beforeDelete(record)`
and `deleteGuard`. `routes` narrows the endpoint set for a resource whose
contract stops short — job applications have no `PUT`.

The generic JSON Server router still answers two things, and nothing the
contract names: the camelCase spellings of the kebab-case paths
(`/api/propertyTypes`), and a detail read by id where the contract gives only a
slug lookup (`/api/localities/1`). `GENERIC_COLLECTIONS` in
`mock-server/middleware/publicScope.js` names them.

## Smoke tests

```
npm run mock     # one terminal
npm run smoke    # another
```

`scripts/smoke-api.js` walks **`src/services/endpoints.js`** — the registry the
frontend calls through — and exercises every entry against a running server: it
logs in as each role, creates a fixture for every writable resource, sends each
endpoint the smallest valid request with the least privileged token that should
be allowed, and asserts the status and the envelope of §5.2. Then it checks the
behaviours a status code cannot show (a `PATCH` that left the other fields
alone, `bedrooms=3` returning only 3-BHK listings, a CSV that starts with a BOM,
a preview token that opens a draft, a 409 that lists what is in the way) and
deletes everything it created.

Walking the registry is the point: an endpoint the frontend believes in but the
API does not have fails here, and so does one the API has but the registry never
declared.

```
node scripts/smoke-api.js --baseUrl=https://api.example.com/api --verbose
node scripts/smoke-api.js --email=… --password=… --managerEmail=… --salesEmail=…
```

It needs a **running** server, so it is deliberately **not** part of
`npm run check:all`. It uses `fetch` over whatever TLS Node trusts and never
touches `NODE_TLS_REJECT_UNAUTHORIZED`: a base URL with a self-signed
certificate is out of scope. Two runs inside the same minute legitimately hit
the ten-public-writes-a-minute limit of §5.11; the script waits the window out
once rather than weakening the rule.

## Layout

```
mock-server/
├─ server.js            # npm run mock — prepares the runtime db and listens
├─ app.js               # createApp() — the whole request pipeline
├─ db.js                # runtime db, lowdb helpers, ensureRuntimeDb()
├─ reset.js             # npm run mock:reset
├─ config.js            # MOCK_* environment variables
├─ routes/              # index.js + auth, users, properties, leads, masterData,
│                       # articles, pages, media, settings, seo, dashboard,
│                       # newsletter, jobs, redirects, sitemap
├─ middleware/          # auth, role, envelope, errors, timestamps, validate,
│                       # queryTranslate, publicScope, requestLog, rateLimit
├─ lib/                 # crud (the CRUD factory), usage (the delete guard),
│                       # previewTokens, dashboard, sitemapBuilder, html,
│                       # tokens, password, routePermissions, propertyFilters,
│                       # leadFilters, articleFilters, facets, activities,
│                       # viewCounter, ids, paginate, sort, filters, slug,
│                       # embed, scope, enums, models, xml, csv
├─ schemas/models.js    # the collection descriptors (§6)
├─ __tests__/           # npm run test:mock
└─ .runtime/db.json     # git-ignored working copy
```

## What the React app does not use yet

The API is complete; the frontend is not. The services still use the
boilerplate's paths and payload shapes (prompt 11), and the admin panel cannot
sign in until `AdminAuthContext` is rewritten (prompt 12). Until then the API is
exercised with `curl`, `npm run test:mock` and `npm run smoke`.
