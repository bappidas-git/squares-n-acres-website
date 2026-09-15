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
npm run mock:reset    # restore the runtime db from db.json
npm run dev           # mock + React dev server together
npm run validate:seed # check db.json against the data model
npm run test:mock     # the mock's own tests (node --test, no framework)
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

## Layout

```
mock-server/
├─ server.js            # npm run mock — prepares the runtime db and listens
├─ app.js               # createApp() — the whole request pipeline
├─ db.js                # runtime db, lowdb helpers, ensureRuntimeDb()
├─ reset.js             # npm run mock:reset
├─ config.js            # MOCK_* environment variables
├─ routes/              # index.js + auth.js, users.js (prompts 08–09 add more)
├─ middleware/          # auth, role, envelope, errors, timestamps, validate,
│                       # queryTranslate, publicScope, requestLog, rateLimit
├─ lib/                 # tokens, password, routePermissions, ids, paginate,
│                       # sort, filters, slug, embed, scope, enums, models,
│                       # xml, csv
├─ schemas/models.js    # the collection descriptors (§6)
├─ __tests__/           # npm run test:mock
└─ .runtime/db.json     # git-ignored working copy
```

## What is not here yet

The property, lead, article, SEO and settings business rules arrive with
prompts 08 and 09. Until then the sitemap, robots, RSS and `llms.txt` paths —
served both at `/api/...` and at the root, as Nginx will proxy them (D21) —
answer `501 { "message": "Not implemented until prompt 09" }`, and the domain
routes (`/properties/slug/:slug`, `/properties/featured`, `/admin/dashboard`,
…) answer 404 because outside `/auth/*` and `/admin/users` only the generic
CRUD router is mounted. They are authenticated and role-checked already: a
`/admin/...` path answers 401 or 403 before it answers 404.

The React admin panel cannot sign in against this yet — `AdminAuthContext`
still posts the boilerplate's payload shape. Prompt 12 rewrites it; until then
the API is exercised with `curl` and `npm run test:mock`.
