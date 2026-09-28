# Squares N Acres — the Laravel API

The API the Squares N Acres website and admin panel run on: **Laravel 12**, **MySQL 8**, **Sanctum**
bearer tokens. It implements the contract of [`../backend_developer_guidelines/`](../backend_developer_guidelines/)
— the 274 operations of `openapi.yaml` — and answers as the reference implementation, the Node mock
server in [`../mock-server/`](../mock-server/), does: same statuses, same envelopes, same keys, same values,
same error messages. The website cannot tell the two apart; that is the acceptance test. The few places where
MySQL makes it answer differently are listed under [Where it differs from the mock](#where-it-differs-from-the-mock).

- [Quick start](#quick-start)
- [How it is built](#how-it-is-built)
- [Request and response logging — the Debugbar](#request-and-response-logging--the-debugbar)
- [Deviations from schema.sql](#deviations-from-schemasql)
- [Where it differs from the mock](#where-it-differs-from-the-mock)
- [Rate limits, hosts, schedule, staging](#rate-limits-hosts-schedule-staging)
- [Testing and parity](#testing-and-parity)
- [Regenerating the contract](#regenerating-the-contract)

---

## Quick start

Requirements: PHP 8.2+ (8.4 tested) with `intl`, `mbstring`, `pdo_mysql`; Composer; MySQL 8.

```bash
cd laravel
composer install
cp .env.example .env && php artisan key:generate

# a database and a user (the values .env.example expects)
mysql -uroot -e "CREATE DATABASE squares_n_acres CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
                 CREATE USER 'sna'@'127.0.0.1' IDENTIFIED BY '<password>';
                 GRANT ALL ON squares_n_acres.* TO 'sna'@'127.0.0.1';"
#   → set DB_PASSWORD in .env

php artisan migrate --seed        # the 45 tables, and db.json imported per seed-mapping.md
php artisan serve                 # http://localhost:8000/api/health
```

Point the website at it with `REACT_APP_API_URL=http://localhost:8000/api`.

**Seed accounts** (from `db.json`, hashed on import): `admin@squaresnacres.com` / `Admin@123`,
`manager@squaresnacres.com` / `Manager@123`, `sales@squaresnacres.com` / `Sales@123`. These passwords are
published in the guidelines — **rotate all three before the API is reachable from anything but localhost**
(`07_DEPLOYMENT.md`, go-live checklist).

Production (`07_DEPLOYMENT.md`): `composer install --no-dev --optimize-autoloader`, `APP_ENV=production`,
`APP_DEBUG=false`, `php artisan migrate --force && php artisan db:seed --force` once, then
`php artisan config:cache && php artisan route:cache` on every deploy, and the cron line
`* * * * * php artisan schedule:run`.

---

## How it is built

```
resources/contract/        the contract, exported from the website repository (never edited by hand)
database/migrations/       the 45 tables of schema.sql (+ Sanctum's, cache, jobs)
database/seeders/          DatabaseSeeder — db.json (a byte copy in seeders/data/) → MySQL
app/Models/                Eloquent models, one per table, with their relations
app/Store/                 DocumentStore + TableMapper — the contract's JSON documents over the tables
app/Crud/                  the generic CRUD engine, its resource definitions, delete guards, ordering
app/Domain/                the business rules per module (properties, leads, articles, SEO…)
app/Http/Controllers/      thin controllers: request → domain → envelope
app/Http/Middleware/       traffic logging, JSON body, bearer auth, role matrix, honeypot, headers, CORS
app/Support/               the ported semantics: validation, slugs, HTML, IST, query/sort/pagination, CSV
routes/api.php             /api — module route files in routes/api/*.php, then the generic CRUD routes
routes/seo-root.php        /sitemap.xml, /robots.txt, /rss.xml, /llms.txt at the root
```

**The contract is data.** `scripts/export-contract.cjs` reads the descriptors the mock, the seed validator and
the guidelines are generated from — `mock-server/schemas/models.js`, `src/services/schemas/*`,
`src/config/enums.js` — and `backend_developer_guidelines/schema.sql`, and writes them to
`resources/contract/{models,schemas,enums,tables}.php`. The validator (`App\Support\Validation\SchemaValidator`,
a port of the mock's), the write semantics (`Documents`: defaults, sanitising, deep merge), the migrations and the
document mapper all read those arrays, so a field added to the contract is validated, stored and returned without
a line of PHP, and a 422 names the same keys with the same sentences as the mock's.

**Documents over tables.** The contract describes every resource as one JSON document — a listing with its
images, pricing and amenity ids inside it — and every rule of `05_BUSINESS_RULES.md` is written against that
document. `App\Store\TableMapper` maps each collection's document onto its tables exactly as `schema.sql`'s
comments say: flattened objects become columns (`location.address` ↔ `address`), nested arrays become child
rows (`property_images`, `lead_notes`…), id lists become pivots (`property_amenity`…), everything else nested stays
a JSON column (`seo`, `sectionVisibility`, settings groups). `App\Store\DocumentStore` loads a collection's
documents once per request through the Eloquent models' queries (their soft-delete scope included) and writes a
document back as its row, its child rows and its pivots in one transaction — after checking that every value fits
its column, so a write the tables cannot hold is a 422 naming the field rather than a database error. Documents
read back identical to `db.json` — the seeder's import is verified record by record.

**One CRUD engine.** Twenty resources are the same eight endpoints over — a public list and slug lookup, the admin
list, create, read, replace, patch, delete, bulk, check-slug — so they are written once in
`App\Crud\CrudResource` (a port of `mock-server/lib/crud.js`): the PUT/PATCH/POST semantics of §5.8, the slug
rules of §5.9 (`seo.slug` always equals the slug, a taken explicit slug is 409), order settling, delete guards
with their `usedBy` 409, bulk actions, the stale-save guard (409 `conflict: 'stale'`). Each resource's
definition in `app/Crud/Definitions/` says only what is its own. Properties and leads have routers of their own.

**Authentication and roles** (`02_AUTH_AND_RBAC.md`). Sanctum personal access tokens, each with its own
`expires_at` (`SANCTUM_TOKEN_TTL_MINUTES`, 24 h), so `POST /auth/refresh` extends the token the client holds.
Every `/api/admin/*` route runs the `admin` middleware group: the bearer token, then the role matrix
(`App\Support\Auth\Rbac`), with the permission derived from the path and method
(`App\Support\Auth\RoutePermissions`) — an admin route without a rule is refused, not served. Sales users see
only the leads assigned to them or unassigned. A deactivated account's token answers 401 "Account is inactive.".

**Errors** always leave in the contract's envelope (`App\Exceptions\ApiExceptionRenderer`):
`{ "message": "…", "errors"?: { "field": ["…"] }, "data"?: { … } }` — 400 for a malformed body, 401, 403,
404, 409, 422, 429 with `Retry-After`, and a bare 500 whose details go to the log, never the body.

---

## Request and response logging — the Debugbar

Every API request and its response are logged by `App\Http\Middleware\LogApiTraffic` (a global middleware, so a
404 is logged too) through `App\Support\Debug\ApiLog`, which writes each entry to two places:

1. **The Laravel Debugbar** (`barryvdh/laravel-debugbar`, a dev dependency). For each request, the Messages tab
   shows a `request` entry (method, path, query, the JSON body with secrets masked, IP, user agent), a `response`
   entry (status, duration, the signed-in user and role, the body), and the decision logs of the modules under
   their own labels (`auth`, `rbac`, `validation`, `leads`, `properties`, `store`, `stale-guard`, `spam`,
   `throttle`…). The timeline shows the handler and every collection load; the Queries tab shows the SQL.
   The Debugbar stores every API request (`storage/debugbar/`), and each response names its entry in the
   `phpdebugbar-id` header:
   - open **`http://localhost:8000/_debugbar/open`** on the machine running the API to browse the stored requests
     (or `http://localhost:8000/_debugbar/open?op=get&id=<phpdebugbar-id>` for one);
   - or set `DEBUGBAR_CLOCKWORK=true` and use the Clockwork browser extension.
2. **The `api` log channel** — `storage/logs/api-YYYY-MM-DD.log`, daily, 14 days (`API_LOG_LEVEL`,
   `API_LOG_DAYS`). Always on, so production — where the Debugbar is not installed — keeps the trail. Browse it at
   `/log-viewer` locally (opcodesio/log-viewer).

Every request carries an id — the client's `X-Request-Id`, or a new UUID — returned in the `X-Request-Id` response
header, added to the context of every log line written while the request runs, and printed in the Debugbar
entries: one id leads from a browser's network tab to the log lines and the Debugbar entry of that request.

Bodies are cut to `API_LOG_MAX_BODY` characters (4000); `password`, `currentPassword`, `newPassword`, `token`,
`authorization` and the honeypot are always masked (`config/sna.php` → `logging.redact`).

`DEBUGBAR_ENABLED=true` in `.env` switches the Debugbar on (it follows `APP_DEBUG` when unset); a
`composer install --no-dev` build does not contain it, and nothing in the API depends on it being there.

---

## Deviations from schema.sql

`schema.sql` is the specification; the migrations follow it column for column, index for index, foreign key for
foreign key, with these changes — each also listed in `resources/contract/tables.php`:

| Change | Why |
| --- | --- |
| `articles.author_id` → `ON DELETE RESTRICT` (was `SET NULL`) | `SET NULL` on a `NOT NULL` column is refused by MySQL 8 (error 1830), so `schema.sql` does not run as written. The API refuses to delete an author in use first (409 with `usedBy`). |
| `property_views.property_id` → `ON DELETE CASCADE` (was `SET NULL`) | the same error 1830 |
| every `DATETIME` is `DATETIME(3)` | the contract reports milliseconds, and the stale-save guard compares the exact `updatedAt` a form read — two saves within one second must differ |
| child tables gain `local_id` and `position` | the id an item has inside its parent document (`images[].id`, `notes[].id`) is local to that parent, repeats across records and is what the API returns and addresses (`DELETE /admin/leads/:id/notes/:noteId`); `position` keeps the array's order apart from an item's own `order` field (`seed-mapping.md` allows keeping the original id "in a column of its own") |
| `property_amenity`, `property_badge` gain `position` | the order the editor chose, as `property_similar` and `article_tag` already keep |
| `personal_access_tokens` is Sanctum's own table | the mock's token store (`apiTokens`) is not imported (`seed-mapping.md`) |

Two behaviours worth knowing: MySQL's `JSON` type stores an object's keys sorted, so the mapper puts the keys of
a JSON column (`seo`, `utm`, a settings group) back in the order the contract lists them — the order the mock
answers in. Only an object the contract gives no shape (a page block's `data`, a lead's `meta`) comes back with
MySQL's order; JSON key order carries no meaning, and every value is kept exactly. The four soft-deleted tables
(`properties`, `articles`, `pages`, `leads`) keep a deleted record's row with `deleted_at` set; the API never reads
it again, and a master-data record that only a deleted record still names is refused with a 409 rather than a
database error.

---

## Where it differs from the mock

Every endpoint was compared with the mock value by value (see [Testing and parity](#testing-and-parity)). What
still differs is listed here; each difference comes from what MySQL can hold, or is a mock quirk not copied.

**Refused where the mock stores what the tables cannot hold** — a 422 in the usual shape, never a 500:

- an id that names no record: a listing's `propertyTypeId`, `location.localityId`/`cityId`,
  `project.developerId`, `agent.teamMemberId`, `amenityIds.*`, `badgeIds.*`, `similarPropertyIds.*`, and a lead's
  `propertyId`/`articleId` ("The selected … is invalid.", the `exists` rules of `03_ENDPOINTS.md`); a lead may still
  name a soft-deleted listing or article, as an enquiry from a stale page does;
- `notes` sent in a lead `PATCH` (the mock lets any field of the lead model through) must each carry an id, the text
  and when it was written, and name an author who exists;
- a moment `DATETIME(3)` cannot hold — a year after 9999 or before 0, which `Date.parse` accepts
  (`+010000-01-01T00:00:00Z`) — "is not a valid date.";
- any other value its column cannot hold — an item `id` below 0 or above 4294967295, an `order` beyond an `INT`, a
  string longer than its `VARCHAR` (a phone padded with spaces passes the phone rule, which ignores them) — is
  refused before anything is written, naming the field (`TableMapper::storageProblems()`);
- redirect-import rows longer than their columns are counted as `skipped`; duplicating a listing whose title is
  over 193 characters shortens the title so " (Copy)" fits; a lead's user agent is cut to 500 characters.

**Stored the way the tables store it:**

- ids are never reused: the mock gives a new record `max(id) + 1`, so after deleting the newest record the two
  servers number the next one differently;
- an array item sent with some of its fields only (an image as `{url, alt}`, a page block without `hidden`) reads
  back with every field, the missing ones at their defaults, and keys the contract does not name are dropped;
- id lists hold each id once (`amenityIds: [1, 1, 2]` reads back `[1, 2]`; `tagIds` likewise);
- dates read back in the contract's ISO form (`2026-10-01` → `2026-10-01T00:00:00.000Z`), and a lead's
  `followUpAt` is compared by instant — the same moment spelled differently is not a change;
- a desk lead sent without `source` gets the schema's default, `walk-in` (the mock stores none);
- media records have no `updatedBy` (the mock adds one to records written through the API).

**Mock quirks not copied:** `?sort=constructor` (or another `Object.prototype` name) falls back to the documented
default sort; a trailing slash (`/pages/slug/about/`) finds the page; `/api/SITEMAP.xml` is not a route (Laravel's
routes are case-sensitive); `GET /redirects/:id`, which the mock answers from its generic fallback, is not a
contract endpoint; `Cache-Control` reads `max-age=…, public` (Symfony's order).

**Only here:** the lead alert e-mail; the honeypot answers before the rate limiter, so bots do not use up the form
budget (the mock counts them); the view-counting windows live in the cache and survive a restart; the host check
below.

---

## Rate limits, hosts, schedule, staging

| Limit | Key | Config |
| --- | --- | --- |
| `POST /leads`, `/newsletter/subscribe`, `/jobs/:id/apply` — 10 / min | route + IP; the honeypot is answered before the throttle | `RATE_LIMIT_PUBLIC_FORMS` |
| `POST /auth/login` — 5 / min | e-mail + IP | `RATE_LIMIT_LOGIN` |
| `PUT /auth/password` — 5 / min | account | `RATE_LIMIT_PASSWORD` |
| `/api/admin/*` — 120 / min | user | `RATE_LIMIT_ADMIN` |
| `POST /redirects/:id/hit` — 60 / min, `POST /not-found` — 30 / min | IP | `RATE_LIMIT_REDIRECT_HITS`, `RATE_LIMIT_NOT_FOUND` |

Over a limit: 429, `Retry-After`, "Too many requests. Please try again in a minute." (the password change says
what it refuses). The limits are read per request, so a test can lower one with `config()`.

**Hosts.** Outside the local environment and tests, the API answers only for its own hosts (`07_DEPLOYMENT.md` →
`trustHosts`): `TRUSTED_HOSTS`, comma-separated, or — unset — the hosts of `APP_URL` and `SITE_URL`. A request for
any other host (a forged `Host` or `X-Forwarded-Host`) is a 400 before it reaches a route. Add the host the
platform's health check sends, if it sends another. CORS (`config/cors.php`, `CORS_ALLOWED_ORIGINS`) allows the
site's origins only, with the same paths for every host.

The schedule (`routes/console.php`, run by `php artisan schedule:run` every minute): `articles:publish-scheduled`
every minute, `sanctum:prune-expired --hours=48` daily, `sna:prune` hourly (listing views beyond 90 days, the 404 log
beyond its 500 most recent rows).

`SEO_FORCE_NOINDEX=true` (staging): every response carries `X-Robots-Tag: noindex, nofollow`, robots.txt disallows
everything, and every public read answers its robots directives as `noindex, nofollow` — whatever the database
says, so a staging database copied to production cannot take a "block crawlers" switch with it.

---

## Testing and parity

```bash
php artisan test                  # PHPUnit on a MySQL database of its own (phpunit.xml → sna_testing)
```

Create the test database once: `CREATE DATABASE sna_testing …; GRANT ALL ON sna_testing.* TO 'sna'@…`.

**Parity with the mock** is what `08_TESTING_AND_PARITY.md` asks for:

```bash
npm run mock                                                   # the reference, :4000 (repository root)
php artisan migrate:fresh --seed && php artisan serve          # this API, :8000
node ../backend_developer_guidelines/smoke/smoke-api.js --baseUrl=http://localhost:8000/api
node ../backend_developer_guidelines/smoke/smoke-api.js --baseUrl=http://localhost:8000/api \
     --compare=http://localhost:4000/api
```

The smoke walk signs in as the three roles, calls every endpoint of the registry, runs the behaviour checks a
status code cannot show (PATCH keeps untouched fields, `bedrooms=3` purity, CSV BOMs, the sitemap index, the
stale-save guard…) and deletes what it created. The comparison sends every read to both servers and prints only
the differences of shape. Every endpoint was also compared **value by value** with the mock over the same seed:
each module's reads as every role, and its write sequences on a fresh seed. On the finished application that is
2,449 of 2,471 requests identical; the other 22 are the differences listed under
[Where it differs from the mock](#where-it-differs-from-the-mock). The smoke walk passes 335/335, twice in a row on one
database, and `--compare` finds no difference of shape in its 127 reads.

For repeated local smoke runs, raise `RATE_LIMIT_LOGIN`, `RATE_LIMIT_ADMIN` and `RATE_LIMIT_PUBLIC_FORMS` in `.env`:
one run signs in several times, makes a few hundred admin requests and sends a handful of enquiries. (The mock
limits its forms to 10 a minute too, so a second run against it within the minute gets 429s.)

---

## Regenerating the contract

When the website's descriptors or the guidelines change (`npm run generate:backend-guidelines` in the website
repository), refresh the exported contract from the repository root:

```bash
node laravel/scripts/export-contract.cjs
```

It rewrites `resources/contract/*.php` and fails when a writable field has no column or a column no field — the
signal that a migration is due.
