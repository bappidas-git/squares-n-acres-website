# Backend notes — testing and parity

Merged into `backend_developer_guidelines/08_TESTING_AND_PARITY.md`. The claim
this whole package makes is that the frontend cannot tell the two backends
apart. This file is how you prove it.

Edit this file, never the generated one.

## Running both

Run the mock beside the Laravel API on one machine and you can compare them
request by request.

```bash
# terminal 1 — the reference implementation, on port 4000
cd squares-n-acres-website
npm install
npm run mock                       # http://localhost:4000/api

# terminal 2 — the implementation under test
cd squares-n-acres-api
php artisan serve --port=8000      # http://localhost:8000/api

# terminal 3 — the site, pointed at either one
cd squares-n-acres-website
REACT_APP_API_URL=http://localhost:8000/api npm start
```

Four things make the mock a fair reference:

- **It is seeded from the same data.** `db.json` in this package is the byte
  copy of the seed; import it with `seed-mapping.md` and both servers answer
  about the same 36 properties, 20 localities and 45 leads.
- **`npm run mock:reset` restores it.** The mock writes to
  `mock-server/.runtime/db.json`, never to the seed, so a comparison run that
  creates records is undone by one command.
- **`MOCK_DELAY_MS=400 npm run mock` adds latency**, which is how you find the
  loading states that only look right at localhost speed.
- **`MOCK_TOKEN_TTL_HOURS=0.02` expires a token in about a minute**, which is how
  you test the auto-logout without waiting a day.

The mock is not a specification of performance, of concurrency or of SQL. It is a
specification of **shape**: status codes, envelopes, field names, ordering and
the business rules of `05_BUSINESS_RULES.md`.

## Comparing responses

`scripts/smoke-api.js` walks the endpoint registry — the same file the frontend
calls through — and asserts status codes, envelopes, pagination meta, RBAC and
two dozen behaviours a status code cannot describe.

**Against one server:**

```bash
npm run smoke -- --baseUrl=https://api.squaresnacres.com/api
npm run smoke -- --baseUrl=https://api.squaresnacres.com/api --verbose
npm run smoke -- --baseUrl=… --email=someone@squaresnacres.com --password=…
```

It prints a `key | method | path | expected | actual | ok` table, a pass/fail
count, and exits non-zero on any failure — so it drops straight into CI.

**Against two servers at once:**

```bash
npm run smoke -- --baseUrl=http://localhost:8000/api --compare=http://localhost:4000/api
```

Compare mode sends **the same read to both** and prints only what differs:

| What it compares                                                                                             | Why                                                                            |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| the HTTP status                                                                                              | a 404 where the mock answers 200 is a missing route or a wrong scope           |
| the envelope keys (`data`, `meta`, `message`)                                                                | `{ "data": … }` versus a bare array is the single most common mistake          |
| `meta`'s key set and the types of `page`, `perPage`, `total`, `totalPages` — and whether `facets` is present | a list that forgets `meta` breaks every paginator on the site                  |
| the key set of `data` — of the first item, for a list                                                        | a missing `slug`, a `snake_case` leak, a read-only embed that was not embedded |
| the content type, for the CSV, XML and text endpoints                                                        | a sitemap served as `text/html` is ignored by crawlers                         |

It deliberately does **not** compare values. The two servers hold different rows,
`updatedAt` differs by definition, and a diff full of legitimate differences hides
the one that matters. Values are what the Postman tests and the module checklist
below are for.

Compare mode is **read-only**: it signs in on both servers and then sends only
`GET` requests, so it is safe against production. Writes are covered by running
the full smoke walk against each server in turn — do that against staging, never
against production, because it creates and deletes records.

Read the table top to bottom and fix in this order: status differences first
(something is missing), then envelope differences (something is shaped wrong),
then `data` key differences (something is named wrong). A status difference
usually explains the two below it.

## Postman

`postman_collection.json` and `postman_environment.json` are generated from the
same registry, with the captured mock response saved under each request as an
example.

1. Import both files (Postman → Import → drop both).
2. Select the **Squares N Acres — Local mock** environment.
3. Open `auth › auth › POST /auth/login` and send it. Its test script writes
   `{{token}}` into the environment; every other request inherits it from the
   collection's bearer auth.
4. **Run the collection** (Collection → Run). Every request asserts its status
   and its envelope.
5. To test the Laravel API, disable the local `baseUrl` row in the environment,
   enable the production one, sign in again and run it again. Every test that
   passed against the mock must pass.

To work as another role, change `email` and `password` in the environment — the
manager and sales values are there, disabled — and sign in again. That is the
fastest way to check the 403s of `02_AUTH_AND_RBAC.md`: a sales token on
`DELETE /admin/leads/:id` must be 403, not 200 and not 404.

The saved responses are captured from the mock and their timestamps are
normalised to a fixed instant, so they show the **shape**, not live data. Use
them to see what a field is called and how it nests, not to assert a value.

## Acceptance checklist

Per module, and each line is a thing a person clicks or a command someone runs.
Work through it with the site pointed at the API under test.

**Auth and roles** — sign in as each of the three roles; a wrong password is 422
on `email`; the token expires and the site signs itself out with a toast;
`GET /auth/profile` matches the login response; changing the password revokes the
other sessions; a sales token on an admin-only route is **403**, and a manager on
`PUT /admin/settings` is **403**.

**Properties** — the public list paginates and its `meta.facets` counts match the
filter rail; `bedrooms=3` returns only 3-BHK listings, and `bedrooms=5` returns
five-and-above; a price filter drops `priceOnRequest` listings; `sort=price-asc`
puts them last; an inactive listing is 404 by slug; `POST …/view` moves the
counter once an hour and not twice; `similar` returns the editor's picks first;
create, edit, publish and duplicate a listing from the admin and find the copy
inactive with a `-copy` slug.

**Leads** — submit every public form and check the source lands as the documented
value; a legacy source value is mapped, not rejected; the honeypot answers 200 and
stores nothing; the eleventh submission in a minute is 429; `enquiryCount` moved;
a status change appends exactly one activity and a no-op change appends none; a
sales user sees only their own and unassigned leads, in the list, the detail, the
export **and** the dashboard; claiming an assigned lead is 409; the CSV opens in
Excel with the accents intact.

**Articles** — a draft is 404 in public and 200 with a preview token; an article
scheduled for five minutes' time is invisible, and visible five minutes later
without anybody deploying; the RSS feed holds the latest 20; the taxonomy pages
filter correctly. Publishing a draft with no excerpt, no featured image or fewer
than 300 words is 422 by `PUT`, `PATCH` and the bulk action, and the bulk refusal
names each article and leaves all of them as they were; `published` with a
future `publishedAt` is 422; a bulk-published scheduled article is live at once;
a category, author or tag id that does not exist is 422; a `<script>` or an
`onerror=` in the body is 422; saving an article twice without a change leaves
its `updatedAt` where it was.

**CMS pages** — every block type renders; a page removed from the header menu
disappears from the navigation; `showInFooter` moves it between footer columns,
and every page placed in a column is drawn in it. The list holds the eleven
built-in pages beside the written ones, and the home record answers at `/` (its
preview token too, `/home` redirecting there). Deleting `home`, `contact`, a
legal text or a built-in page is 409 — alone or in a bulk delete, which then
deletes nothing and names them in `data.refused`; changing their slug is 422;
unpublishing a built-in page is 422; a redirect switched on for `home` is 422.

**Header menus** — `GET /header-menus` answers the ten seeded menus in the
header's order, hidden ones left out; add a menu with two submenus, a link and a
page filed under a submenu, and find it drawn in the header with its groups; a
second "company" is 422 on `name`, and two submenus of one name 422 on
`submenus.1.name`; a `javascript:` link is 422; renaming a submenu keeps its
pages, removing one moves them to the menu's own list; an `order` PATCH
renumbers `1..n`; deleting a custom menu takes its pages out of the header and
leaves them published; deleting Buy, Rent or Commercial is 409.

**Master data** — deleting a locality a property uses is 409 and the response
names the properties; reordering by dragging renumbers the collection; a
duplicate slug is 409 and `check-slug` offers a free one.

**FAQs** — an `order` PATCH carrying `after: <id>` lands immediately after that
record even when several records share a number, and one sent with stale numbers
still lands by the id; a FAQ created at 0 is first and at 3 is third, and no two
FAQs share an `order`; an answer with no words (`<ul><li><p></p></li></ul>`) or
with a `<script>` is 422 on `answer`; `propertyTypeId: 99999` is 422; the same
question twice in one category is 422 on `question`, and in another category is
201; `q=<p` finds nothing and `q=R%26D` finds an answer stored as `R&amp;D`; a
bulk delete naming two FAQs a page shows is 409 with both in `data.refused[]`,
and deletes nothing; a property page lists the FAQs tied to its type after its
own (QA-59).

**SEO** — the panel saves and the score comes back on the next read; the overview
flags two records that share a focus keyword; a redirect added in the admin
resolves; `/sitemap.xml`, `/robots.txt`, `/rss.xml` and `/llms.txt` all answer
with the right content type and absolute URLs.

**Settings** — a partial `PUT` changes one key and leaves the group alone; the
public `GET /settings` omits `leads`; a manager sees the form read-only.

**Media** — a record whose URL a listing uses refuses to delete with 409 and its
`usedIn` list, and `?force=true` deletes it anyway.

**Dashboard** — the 30-day trend has 30 entries including the empty days; the
conversion rate matches the lead counts; every figure a sales user sees is scoped.

Finish with the four commands, and keep their output with the release notes:

```bash
npm run smoke -- --baseUrl=<the API>
npm run smoke -- --baseUrl=<the API> --compare=http://localhost:4000/api
npm run check:guidelines
# and the Postman collection run, green
```
