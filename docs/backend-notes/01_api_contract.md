# Backend notes — the API contract

Hand-written enrichment merged into `backend_developer_guidelines/01_API_CONTRACT.md`
by `npm run generate:backend-guidelines`. The contract itself is generated from
`prompts/00_MASTER_CONTEXT.md` §5 and `src/services/endpoints.js`; what is written
here is the part a registry cannot describe — policy, headers and the reasons
behind them.

Edit this file, never the generated one.

## Versioning policy

The API ships **unversioned** at `/api`. That is a decision, not an oversight:
the frontend and the API are released together, the contract is frozen in this
package, and a version segment nobody ever changes is a segment everybody has to
type.

The moment the contract has to break — a field removed, a response reshaped, a
status code changed for an existing call — mount the new shape at `/api/v2` and
keep `/api` answering the old one until the site that depends on it is rebuilt.
In Laravel that is a second route file:

```php
// routes/api.php
Route::prefix('v2')->group(base_path('routes/api_v2.php'));
```

Rules for the unversioned surface, so that day comes as late as possible:

- **Adding** a key to a response is not a break. The frontend reads the keys it
  knows and ignores the rest.
- **Adding** an optional query parameter is not a break; unknown parameters are
  ignored (§5.6), so an old client is unaffected.
- **Removing or renaming** a key, tightening a validation rule, or changing a
  status code **is** a break, and needs `/api/v2`.
- `REACT_APP_API_URL` carries the whole base including `/api`, so moving to
  `/api/v2` is one environment variable and a rebuild — the same single switch
  the handover promises.

One such change was made **before** the first release, while this frontend was
the only reader: public property reads stopped carrying the address of a file
kept behind the lead form, and `POST /leads` began answering with the token that
opens them (`05_BUSINESS_RULES.md` → "Gated files", QA-51 OPEN-1). Build the API
to the contract as this package states it; there is no older shape to keep.

## Caching headers

The API is read-heavy and the site is mostly anonymous, so the caching policy is
per endpoint class rather than per route:

| Endpoint class                                                                                        | `Cache-Control`                                                | Why                                                                                         |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Public detail reads (`/properties/slug/:slug`, `/articles/slug/:slug`, localities, developers, pages) | `public, max-age=60, s-maxage=300, stale-while-revalidate=600` | An edit should surface within minutes; a CDN absorbs the traffic spike of a shared listing  |
| Public lists and search (`/properties`, `/articles`, master data)                                     | `public, max-age=30, s-maxage=120`                             | Filter combinations are many and cheap to recompute; a short window still collapses a burst |
| Master data that changes monthly (`/property-types`, `/amenities`, `/badges`, `/banks`, `/cities`)    | `public, max-age=300, s-maxage=3600`                           | The frontend fetches these on nearly every page                                             |
| `/settings`, `/seo/settings`, `/redirects`                                                            | `public, max-age=120, s-maxage=600`                            | Read on boot by every visitor                                                               |
| Sitemaps, `robots.txt`, `rss.xml`, `llms.txt`                                                         | `public, max-age=3600`                                         | One hour, matching the generation cache of §6 of these notes                                |
| Everything under `/admin/*` and `/auth/*`                                                             | `no-store`                                                     | Per-user data, some of it private (§5.10)                                                   |
| `POST`, `PUT`, `PATCH`, `DELETE`                                                                      | `no-store`                                                     | —                                                                                           |

Send `ETag` on the public detail reads (Laravel: `Response::setEtag(md5($json))`)
and answer `304` to a matching `If-None-Match`. `Vary: Accept, Origin` belongs on
every response; `Vary: Authorization` on everything under `/admin`, so a cache
never serves one user's admin response to another.

Nothing in the frontend depends on caching: it is a performance layer and may be
switched off wholesale without breaking a single screen.

## CORS

The site and the API are separate origins, so every public read is a
cross-origin request.

```php
// config/cors.php
return [
    'paths' => ['api/*', 'sitemap*.xml', 'robots.txt', 'rss.xml', 'llms.txt'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_origins' => explode(',', env('CORS_ALLOWED_ORIGINS', '')),
    'allowed_headers' => ['Accept', 'Authorization', 'Content-Type', 'X-Requested-With'],
    'exposed_headers' => ['Content-Disposition'],
    'max_age' => 86400,
    'supports_credentials' => false,
];
```

- `CORS_ALLOWED_ORIGINS` is an explicit list, never `*` once the site is live:
  `https://www.squaresnacres.com,https://squaresnacres.com`. Add the staging
  origin on staging only.
- `supports_credentials` stays **false**. Authentication is a bearer token in a
  header, not a cookie, so no credentialed request is ever made and the wildcard
  ban that comes with credentials never applies.
- `Content-Disposition` **must** be exposed: the admin's CSV export reads the
  filename from it, and a browser hides unexposed headers from `fetch`.
- The mock allows `http://localhost:3000`, `http://127.0.0.1:3000` and
  `http://localhost:5000` (the served production build) — mirror those three on a
  developer machine.
- A preflight (`OPTIONS`) must answer `204` **without** authentication. A CORS
  preflight carries no `Authorization` header, so a middleware that demands one
  breaks every admin call from the browser while `curl` keeps working.

## Rate limiting

Three endpoints accept anonymous writes and are the only ones that need a limit:

```php
// routes/api.php
Route::middleware('throttle:10,1')->group(function () {
    Route::post('/leads', [LeadController::class, 'store']);
    Route::post('/newsletter/subscribe', [NewsletterController::class, 'store']);
    Route::post('/jobs/{job}/apply', [JobApplicationController::class, 'store']);
});
```

Ten requests per minute per IP, which is what the mock enforces. Over the limit
the answer is `429` with the §5.3 envelope and the message
`Too many requests. Please try again in a minute.` — the frontend shows it in a
toast, so the wording is part of the contract.

Two more rules that belong with it:

- **The honeypot comes first.** Each of the three accepts an optional `website`
  field. A non-empty value means a bot filled a field no human can see: answer
  **200** with `{ "data": null, "message": "ok" }`, store nothing, and do not
  count the request against the limit. Answering 4xx tells the bot it was
  detected.
- **Authenticated routes are throttled by user, not by IP** — `throttle:120,1`
  on `/admin/*` is generous for a person and still stops a runaway script. An
  office behind one NAT address would otherwise share a per-IP budget.

`/auth/login` deserves its own, stricter limit — `throttle:5,1` keyed on the
e-mail address plus the IP — and that limit is the only one allowed to answer
429 to a signed-out human.

## Planned additions

One endpoint is specified but not yet in the registry, so it is not in
`03_ENDPOINTS.md`, the Postman collection or `openapi.yaml`. It is here because
the frontend has a use for it today and works without it.

### `GET /properties/counts` — one response instead of twenty-five

The home page shows a row of category tiles — six segment and listing-type
tiles, seventeen property-type tiles — each with a count beside it. Today
`useCategoryCounts` reads each count from `meta.total` of its own
`GET /properties?…&perPage=1`: **25 requests and 25 state updates for 23
numbers.** Against the mock each answers in under 100 ms; against an API across
the network it is the slowest thing the home page does.

```
GET /properties/counts?by=segment,propertyTypeId[&listingType=sale]

200 {
  "data": {
    "segment": { "residential": 26, "commercial": 5, "land": 5 },
    "propertyTypeId": { "1": 8, "2": 4, "9": 3 }
  },
  "meta": null
}
```

- Public, no auth, cacheable — `Cache-Control: public, max-age=300, s-maxage=3600`.
- `by` is a comma-separated list of the dimensions to group on; the only two the
  frontend asks for are `segment` and `propertyTypeId`, and an unknown dimension
  is ignored rather than refused (§5.6).
- Any §5.7 filter may be sent alongside and narrows the counts, so
  `?by=propertyTypeId&listingType=rent` answers "how many rentals of each type".
- The same `isActive: true` scoping every public read applies, and a dimension's
  keys are the ids or enum values, as strings.
- One `SELECT … GROUP BY` per dimension. Do not compute it by counting rows in
  PHP.

`useCategoryCounts` will call it once and keep the per-tile requests as the
fallback for a backend that has not shipped it, so the frontend is correct
either way and simply becomes faster the day the endpoint exists. Until then it
is **optional**: nothing breaks without it.

When you do add it, add it to `src/services/endpoints.js` in the same change —
that is what puts it into this package, the smoke test and the Postman
collection.
