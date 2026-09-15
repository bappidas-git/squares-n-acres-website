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
```

## Environment

| Variable               | Default | Meaning                                                 |
| ---------------------- | ------- | ------------------------------------------------------- |
| `MOCK_PORT`            | `4000`  | Port the API listens on                                 |
| `MOCK_DELAY_MS`        | `0`     | Artificial latency on every response, for skeleton QA   |
| `MOCK_TOKEN_TTL_HOURS` | `24`    | Lifetime of a token issued by `/auth/login` (prompt 07) |
| `MOCK_FRESH`           | `0`     | `1` re-seeds the runtime db at startup                  |

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

> **Admin routes are unauthenticated until prompt 07.** `/api/admin/*` is open
> on the local mock, and `POST` / `PATCH` / `PUT` / `DELETE` are accepted
> without a token. Prompt 07 adds `Authorization: Bearer …`, the token store
> and the role matrix of §7.

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
const customRouters = [require('./properties')];
```

Each entry is a factory receiving `{ db, config, getModel, getCollection,
getSingleton }`. Inside a route, `res.ok(data[, meta])`, `res.created(data)`
and `res.message(text)` produce the envelopes; throwing or passing an
`ApiError` from `mock-server/middleware/errors.js` produces the error shapes.
`mock-server/middleware/rateLimit.js` guards the public write endpoints, and
`mock-server/middleware/validate.js` exposes `validateBody(schema, body, opts)`
for bodies the generic validator does not cover.

## Layout

```
mock-server/
├─ server.js            # npm run mock — prepares the runtime db and listens
├─ app.js               # createApp() — the whole request pipeline
├─ db.js                # runtime db, lowdb helpers, ensureRuntimeDb()
├─ reset.js             # npm run mock:reset
├─ config.js            # MOCK_* environment variables
├─ routes/index.js      # custom routers (prompts 07–09)
├─ middleware/          # envelope, errors, timestamps, validate,
│                       # queryTranslate, publicScope, requestLog, rateLimit
├─ lib/                 # ids, paginate, sort, filters, slug, embed, scope,
│                       # enums, models, xml, csv
├─ schemas/models.js    # the collection descriptors (§6)
└─ .runtime/db.json     # git-ignored working copy
```

## What is not here yet

Authentication and the role matrix arrive with prompt 07; the property, lead,
article, SEO and settings business rules with prompts 08 and 09. Until then the
sitemap, robots, RSS and `llms.txt` paths — served both at `/api/...` and at the
root, as Nginx will proxy them (D21) — answer
`501 { "message": "Not implemented until prompt 09" }`, and the domain routes
(`/properties/slug/:slug`, `/properties/featured`, `/admin/dashboard`, …) answer
404 because only the generic CRUD router is mounted.
