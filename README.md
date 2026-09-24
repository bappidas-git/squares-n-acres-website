# Squares N Acres — Website & Admin Panel

Real-estate portal for **Squares N Acres**, Bengaluru: a public website for searching,
browsing and enquiring about properties, and an admin panel for managing properties, leads,
articles, SEO and site settings.

**Version 1.0.0.** The build is complete and every check is green. What shipped, the final
metrics and the whole history are in [`docs/PROJECT_STATE.md`](./docs/PROJECT_STATE.md);
architecture decisions are in [`docs/DECISIONS.md`](./docs/DECISIONS.md); the release audit
is [`docs/QA/48-final-audit.md`](./docs/QA/48-final-audit.md).

**Before going live**, two documents are mandatory reading:

- [`docs/RELEASE_CHECKLIST.md`](./docs/RELEASE_CHECKLIST.md) — build, env, DNS, TLS, the
  live SEO checks, password rotation.
- [`docs/CONTENT_TO_BE_PROVIDED_BY_CLIENT.md`](./docs/CONTENT_TO_BE_PROVIDED_BY_CLIENT.md) —
  every placeholder value and the Admin screen that changes it. The seeded catalogue is
  **invented** and must not be launched as real.

---

## What it is

- **Public site** — property search and listings, property details, localities, builders,
  buyer assistance, articles, company pages and lead capture.
- **Admin panel** — properties with their full detail set, leads, articles, FAQs, media,
  SEO settings and site settings, behind role-based authentication
  (`admin` / `manager` / `sales` — [`docs/RBAC.md`](./docs/RBAC.md)).
- **Dual mode** — the frontend runs unchanged against either backend:
  - the local **mock server** (JSON Server inside Express, seeded from `db.json`), used for
    development and tests;
  - the future **Laravel + MySQL API**.

  Switching between them is done **only** by changing `REACT_APP_API_URL`; no application
  code knows which backend answers. See [Switch-over](#switch-over).

| Layer     | Technology                                      |
| --------- | ----------------------------------------------- |
| Framework | React 18 (Create React App / `react-scripts` 5) |
| Routing   | React Router v6, route-level `React.lazy`       |
| UI        | MUI v7 + CSS Modules + CSS custom properties    |
| HTTP      | Axios with interceptors                         |
| Animation | Framer Motion                                   |
| Icons     | Iconify (MDI set)                               |
| Head tags | React Helmet Async                              |
| Editor    | Tiptap v3 (admin rich text)                     |
| Charts    | Recharts (admin dashboard)                      |

---

## Requirements

- **Node 20 LTS** — pinned in [`.nvmrc`](./.nvmrc) (`nvm use` picks it up).
  `package.json` accepts Node `>= 18.18`.
- **npm 9+**
- **Chrome or Chromium** — optional. Only the prerender and the browser-driven checks
  (`check:links`, `check:jsonld`, `check:sitemap`, `a11y:audit`) need it; everything else,
  including `npm run check:all`, runs without a browser.

---

## Quick start

```bash
npm ci             # or `npm install` for a first, non-reproducible install
npm run dev        # mock API on :4000 and the web app on :3000
```

The site is on <http://localhost:3000> and the admin panel on
<http://localhost:3000/admin> (it is deliberately not linked from the public site).

Sign in with any of the three seeded accounts:

| E-mail                       | Password      | Role      | Sees                                     |
| ---------------------------- | ------------- | --------- | ---------------------------------------- |
| `admin@squaresnacres.com`    | `Admin@123`   | `admin`   | everything, including users and settings |
| `manager@squaresnacres.com`  | `Manager@123` | `manager` | content and leads, not users or settings |
| `sales@squaresnacres.com`    | `Sales@123`   | `sales`   | leads, and properties read-only          |

> These three passwords are in this repository and in the handover package. **Rotate them
> before launch** — `docs/RELEASE_CHECKLIST.md` §6.

No environment file is needed for local development: `.env.development` is committed and
already points at the local mock API. To override anything on your machine, copy the
template and edit the copy (`.env` is git-ignored):

```bash
cp .env.example .env
```

`npm start` runs the web app alone; `npm run mock` runs the API alone.

Both halves of `npm run dev` pick up code changes on their own, a `git pull` included: the
web app hot-reloads, and the mock API restarts when one of its files changes — or one of the
`src/` modules it shares with the web app, such as `src/config/rbac.js`. Writes to the runtime
database do not restart it. `npm run mock` on its own does not watch; restart it after pulling.

---

## Scripts

Every script in `package.json`, grouped by what it is for. The ones marked **browser** need
Chrome; the ones marked **API** need `npm run mock` running in another terminal.

### Running the app

| Script                 | What it does                                                     |
| ---------------------- | ---------------------------------------------------------------- |
| `npm start`            | CRA dev server on port 3000                                      |
| `npm run mock`         | Mock API on port 4000, over the runtime copy of the seed         |
| `npm run mock:watch`   | `mock`, restarted whenever a file it loads changes (`node --watch`) |
| `npm run mock:reset`   | Restores the runtime database from `db.json` — see [Seed](#the-seed-and-the-runtime-database) |
| `npm run dev`          | `mock:watch` and `start` together, via `concurrently`            |
| `npm run serve:build`  | Serves `build/` statically on port 5000, with SPA fallback       |

### Building

| Script                    | What it does                                                          |
| ------------------------- | --------------------------------------------------------------------- |
| `npm run build`           | Production build into `build/`                                        |
| `npm run build:ci`        | `build` with `CI=true`, so a warning fails the build                   |
| `npm run build:prerender` | **browser, API** — `build`, then writes each public URL's rendered HTML |
| `npm run analyze`         | Bundle report: chunk sizes against the performance budget              |

### Testing

| Script                | What it does                                                        |
| --------------------- | ------------------------------------------------------------------- |
| `npm test`            | Jest in watch mode                                                  |
| `npm run test:ci`     | Jest once, no watch (3 344 tests)                                   |
| `npm run test:mock`   | `node --test` over the mock server's own tests                      |
| `npm run test:scripts`| `node --test` over the repository tooling's tests                   |
| `npm run smoke`       | **API** — walks the endpoint registry against a running API         |
| `npm run e2e`         | Playwright end-to-end specs (optional; needs Node ≥ 20 and browsers)|

### Checking

| Script                        | What it does                                                          |
| ----------------------------- | --------------------------------------------------------------------- |
| `npm run check:all`           | **The gate.** Everything below that needs no browser and no API       |
| `npm run lint`                | ESLint over `src/`, `mock-server/`, `scripts/` — zero warnings — plus `check:endpoints` |
| `npm run lint:fix`            | ESLint with `--fix`                                                   |
| `npm run format`              | Prettier over the source and the docs                                 |
| `npm run format:check`        | Prettier in check mode                                                |
| `npm run check:traces`        | Fails on a boilerplate brand trace, a stray hex colour or placeholder copy |
| `npm run check:traces:report` | The same scan, totals only, always exits 0                            |
| `npm run check:endpoints`     | Fails when a component builds a URL instead of using the registry     |
| `npm run check:contrast`      | Asserts every text/background pair meets WCAG AA                      |
| `npm run check:env`           | Asserts `.env.example` documents every variable the code reads        |
| `npm run check:guidelines`    | Asserts the handover package covers every endpoint and model          |
| `npm run validate:seed`       | Validates `db.json` against the model descriptors                     |
| `npm run check:links`         | **browser** — follows every internal link and reports the broken ones |
| `npm run check:jsonld`        | **browser** — parses and validates every page's structured data       |
| `npm run check:sitemap`       | **browser, API** — every sitemap URL renders, and every page is listed |
| `npm run a11y:audit`          | **browser** — in-page accessibility audit across the routes           |

### Generating

| Script                                  | What it does                                                    |
| --------------------------------------- | --------------------------------------------------------------- |
| `npm run seed:build`                    | Rebuilds `db.json` deterministically from `scripts/seed/`        |
| `npm run generate:brand-assets`         | Re-downloads the brand PNGs into `public/brand/`                 |
| `npm run generate:backend-guidelines`   | **API** — regenerates `backend_developer_guidelines/`            |
| `npm run eject`                         | CRA eject — **not used**, and it cannot be undone                |

`check:all` is the one to run before every commit:

```bash
npm run check:all
```

It is `lint` → `test:ci` → `test:mock` → `test:scripts` → `build:ci` → `check:traces` →
`validate:seed` → `check:contrast` → `check:guidelines` → `check:env`, and it needs neither
a browser nor a running API. The five browser-driven checks and `smoke` are run explicitly,
because they need a server.

---

## Environment variables

Every variable is documented in [`.env.example`](./.env.example), and
`npm run check:env` fails if one is read in code but missing there. `REACT_APP_*` variables
are embedded into the bundle **at build time** — they are public, so no secret belongs in
one. `MOCK_*` are read by the mock server (Node) at runtime.

| Variable                             | Required | Default (development)       | Purpose                                                                                   |
| ------------------------------------ | -------- | --------------------------- | ----------------------------------------------------------------------------------------- |
| `REACT_APP_API_URL`                  | **yes**  | `http://localhost:4000/api` | API base URL including `/api`; no fallback — the app throws at startup when it is missing |
| `REACT_APP_SITE_URL`                 | no       | `http://localhost:3000`     | Public origin used for canonical and Open Graph URLs                                      |
| `REACT_APP_SITE_NAME`                | no       | `Squares N Acres`           | Display name of the site; the API's setting wins once it answers                           |
| `REACT_APP_CLOUDINARY_CLOUD_NAME`    | no       | —                           | Enables image uploads from the admin media library                                        |
| `REACT_APP_CLOUDINARY_UPLOAD_PRESET` | no       | —                           | Unsigned Cloudinary upload preset; needed with the cloud name                              |
| `REACT_APP_GOOGLE_MAPS_KEY`          | no       | —                           | Enables the property location map                                                         |
| `CHROME_PATH`                        | no       | auto-detected               | Chrome/Chromium binary for the prerender and the browser-driven checks                     |
| `MOCK_PORT`                          | no       | `4000`                      | Port of the mock server; must match the host in `REACT_APP_API_URL`                        |
| `MOCK_DELAY_MS`                      | no       | `0`                         | Artificial latency on every mock response, for testing loading states                      |
| `MOCK_TOKEN_TTL_HOURS`               | no       | `24`                        | Lifetime of a mock auth token (`0.01` = 36 s, to watch a session expire)                   |
| `MOCK_FRESH`                         | no       | `0`                         | `1` re-seeds the runtime database on every start                                           |
| `MOCK_URL`                           | no       | `http://localhost:4000/api` | The API whose sitemaps the prerender crawls                                                |

### Which file is loaded

Create React App decides, and it does **not** read `.env.development` during a production
build:

| Command                | Reads                                  |
| ---------------------- | -------------------------------------- |
| `npm start`            | `.env.development`, then `.env`         |
| `npm run build`        | `.env.production`, then `.env`          |

Only `.env.example`, `.env.development` and `.env.production.example` are committed. On the
build machine, copy the last one to `.env.production` and edit it.

**This is why a local production build looks broken.** With no `.env.production`,
`REACT_APP_API_URL` is never embedded and every page throws
`REACT_APP_API_URL is not set` — by design, since a silent fallback URL is worse. To build
locally against the mock, put it on the command line:

```bash
REACT_APP_API_URL=http://localhost:4000/api npm run build     # macOS/Linux
```

```powershell
$env:REACT_APP_API_URL='http://localhost:4000/api'; npm run build    # PowerShell
```

---

## The mock server

`mock-server/` is a small Express app with JSON Server 0.17 used as a **library**. It
answers the same contract the Laravel API will (`docs/API_CONTRACT.md`): the same success
and error envelopes, the same pagination and filters, the same auth and role matrix, the
same slugs — and the nine SEO documents (`sitemap.xml` and its children, `robots.txt`,
`rss.xml`, `llms.txt`).

```bash
npm run mock                            # http://localhost:4000/api
curl http://localhost:4000/api/health   # {"data":{"status":"ok",…}}
```

Useful variations:

```bash
MOCK_DELAY_MS=1500 npm run mock         # see every skeleton and spinner
MOCK_TOKEN_TTL_HOURS=0.01 npm run mock  # watch the session expire after 36 s
MOCK_FRESH=1 npm run mock               # re-seed on start
MOCK_PORT=4100 npm run mock             # another port (change REACT_APP_API_URL too)
```

### The seed and the runtime database

There are two files, and the difference matters:

| File                          | Committed | What it is                                                    |
| ----------------------------- | --------- | ------------------------------------------------------------- |
| `db.json`                     | **yes**   | The seed. Reviewable, deterministic, never written to at runtime. |
| `mock-server/.runtime/db.json`| no        | The working copy the API mutates. Git-ignored and disposable.  |

Anything created through the admin panel lives in the runtime copy, so the seed stays
reviewable and every developer starts from the same data.

**To get back to the seed, stop the server first:**

```bash
# Ctrl+C in the terminal running `npm run mock` or `npm run dev`
npm run mock:reset       # "Runtime db restored from db.json"
npm run mock
```

`mock:reset` **refuses to run while the mock is up**, and that refusal is deliberate. JSON
Server holds the database in memory and rewrites the whole file on the next request, so a
reset against a running server is silently undone — the file is restored and then
overwritten from the server's stale copy. Stopping it first is the only order that works.

The shortcut that needs no stop-and-start is to re-seed on start instead:

```bash
MOCK_FRESH=1 npm run mock
```

To change the seed itself, edit the modules under `scripts/seed/` and rebuild — never edit
`db.json` by hand:

```bash
npm run seed:build && npm run validate:seed
```

`seed:build` is deterministic (a fixed PRNG seed and a fixed timestamp), so two runs produce
a byte-identical file and a change to one data module produces a diff you can read.
[`docs/SEED_GUIDE.md`](./docs/SEED_GUIDE.md) has the details.

---

## Testing

```bash
npm run test:ci      # 3 344 Jest tests over src/
npm run test:mock    # the mock server's own node:test suites
npm run test:scripts # the repository tooling's node:test suites
```

Unit and component tests are Jest + React Testing Library, next to the code they cover in
`__tests__/` folders. They never reach the network: the API client is mocked.

Two suites need a server, and are run explicitly:

```bash
npm run mock         # terminal 1
npm run smoke        # terminal 2 — 282 checks over the endpoint registry
npm run e2e          # Playwright (optional; installs its own browsers)
```

`smoke` is also the parity tool — it can walk any base URL, and compare two:

```bash
npm run smoke -- --baseUrl=https://api.squaresnacres.com/api
npm run smoke -- --baseUrl=https://api.squaresnacres.com/api --compare=http://localhost:4000/api
```

An empty difference table is the signal that the frontend cannot tell the two backends apart.

---

## Build and prerender

```bash
npm run build          # build/ — a static site, hashed assets, SPA fallback
npm run serve:build    # http://localhost:5000, with the SPA rewrite
npm run analyze        # chunk sizes against the 300 KB gzip budget for main.js
```

The build is a static site. Any web server can host it, as long as unknown paths are
rewritten to `index.html` (`07_DEPLOYMENT.md` has the Nginx block).

### Prerender (optional)

The site is a single-page app, so the HTML a crawler receives is an empty `<div id="root">`.
Google renders JavaScript and sees the real page; a social-card scraper, an LLM crawler and
a link preview do not. `build:prerender` fixes that for them: it serves the build, opens
every URL the sitemaps name in a real Chrome, and writes the rendered HTML back over the
static file at that address.

```bash
npm run mock                                                    # terminal 1
REACT_APP_API_URL=http://localhost:4000/api npm run build:prerender   # terminal 2
```

It needs Chrome — `puppeteer-core` downloads no browser. `CHROME_PATH` wins when it is set,
otherwise the usual install locations are tried. **Without a browser it exits 1 and says so,
and the ordinary `npm run build` keeps working**, so a machine with no Chrome can still
deploy. `createRoot` is untouched: React re-renders into `#root` rather than hydrating, so
there is no hydration contract to break.

---

## Deployment

The production build is a static site served by any web server. The full procedure — the
Nginx server blocks for the site and the API, the security headers, the release-directory
layout, the rollback and the API's own go-live list — is in
[`backend_developer_guidelines/07_DEPLOYMENT.md`](./backend_developer_guidelines/07_DEPLOYMENT.md).

The frontend's release list is [`docs/RELEASE_CHECKLIST.md`](./docs/RELEASE_CHECKLIST.md).

One thing the web server must do, beyond serving files: proxy `/robots.txt`,
`/sitemap*.xml`, `/rss.xml` and `/llms.txt` to the API, which generates them from live data.
Serving the placeholder `public/robots.txt` in production would be a launch bug.

### Switch-over

Pointing the site at the Laravel API is **one line and a rebuild**:

```bash
# .env.production, on the build machine
REACT_APP_API_URL=https://api.squaresnacres.com/api
```

```bash
npm ci && npm run build          # or npm run build:prerender
```

There is no second step. No source file names a backend, no adapter translates a payload and
no feature flag chooses between them: the whole application reaches the API through
`src/services/endpoints.js` and `src/services/http.js`, and both read that one variable.
Reverting to the mock is the same line in reverse.

Before cutting over, prove the new API answers the same contract with
`npm run smoke -- --compare=…` as under [Testing](#testing). An empty difference table is
the go signal.

---

## Handover package

`backend_developer_guidelines/` is everything the Laravel + MySQL API developer needs, and
it is **generated** — never edited by hand:

| File                                                  | What it is                                                                          |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `README.md`                                           | orientation, the one-line switch-over, the parity checklist, the support matrix     |
| `01_API_CONTRACT.md`                                  | envelopes, errors, auth, pagination, filters, write semantics, slugs                |
| `02_AUTH_AND_RBAC.md`                                 | the token flow and who may call what, endpoint by endpoint                          |
| `03_ENDPOINTS.md`                                     | every endpoint: parameters, Laravel rules, a captured example, errors, side effects |
| `04_DATA_MODELS.md`, `schema.sql`                     | every collection and field; the MySQL 8 DDL                                         |
| `05_BUSINESS_RULES.md`                                | the formulas: search, facets, leads, dashboard, exports, guards                     |
| `06_SEO_SITEMAP_ROBOTS.md`                            | the nine documents the API serves to crawlers                                       |
| `07_DEPLOYMENT.md`                                    | environment, Nginx, security headers, switch-over, rollback, go-live                |
| `08_TESTING_AND_PARITY.md`                            | how to prove the two backends answer the same                                       |
| `postman_collection.json`, `postman_environment.json` | every endpoint as a request, with tests and saved responses                         |
| `openapi.yaml`                                        | OpenAPI 3.1 for tooling                                                             |
| `db.json`, `seed-mapping.md`                          | the seed, and how to import it into MySQL                                           |

Regenerate it with the mock running:

```bash
npm run mock                            # terminal 1 — the examples are captured live
npm run generate:backend-guidelines     # terminal 2
npm run check:guidelines                # registry ↔ docs ↔ Postman ↔ OpenAPI coverage
```

**To change the package, change its sources.** Prose lives in `docs/backend-notes/*.md`;
facts live in `src/services/endpoints.js`, `src/services/schemas/`, `src/config/enums.js`
and `mock-server/schemas/models.js`. An edit to a generated file is thrown away by the next
run. The generator is deterministic — two runs produce no diff, and the only line that moves
between commits is `generatedFrom: <commit>`.

---

## Project structure

```
squares-n-acres-website/
├─ backend_developer_guidelines/  # generated handover package for the API developer
├─ docs/                    # state, decisions, contract, data model, SEO, RBAC, release
│  ├─ QA/                   # one report per QA pass, including the final audit
│  ├─ archive/              # frozen historical documents (not scanned by check:traces)
│  └─ backend-notes/        # the hand-written half of the handover package
├─ e2e/                     # Playwright specs (optional)
├─ mock-server/             # the Express + JSON Server mock API
│  └─ .runtime/             # git-ignored working copy of the seed
├─ prompts/                 # the build plan: master context + one file per step
├─ public/                  # index.html, manifest.json, robots.txt placeholder
│  └─ brand/                # brand PNGs (favicons, PWA icons, OG image, wordmark)
├─ scripts/                 # repository tooling — every check and generator
│  └─ seed/                 # the seed builder, one module per collection
├─ src/
│  ├─ assets/styles/        # global.css — CSS custom properties, reset, utilities
│  ├─ components/           # admin/, common/, layout/, listing/, sections/, ui/, editor/
│  ├─ config/               # site.js, enums.js, rbac.js, copy.js
│  ├─ contexts/             # auth, settings, toast, shortlist, lead notifications
│  ├─ hooks/                # reusable hooks
│  ├─ pages/admin/          # admin screens
│  ├─ pages/public/         # public screens
│  ├─ routes/               # paths.js and the route tables
│  ├─ seo/                  # the <Seo> engine: templates, variables, JSON-LD, URLs
│  ├─ services/             # the endpoint registry, the HTTP client, the schemas
│  ├─ utils/                # formatting, validation, helpers
│  ├─ App.js  index.js      # root component and entry point
│  └─ theme.js              # MUI theme
└─ db.json                  # the seed for the mock server
```

---

## Brand assets

The logo, monogram, favicons, PWA icons and the default Open Graph image live in
`public/brand/` and are committed, so no build step depends on the network. To refresh them
from the Cloudinary originals:

```bash
npm run generate:brand-assets
```

The script re-downloads the ten PNGs, prints a table of file, size and status, and exits 0
even when a download fails, so it can be run offline without breaking anything.

The brand constants (`BRAND`, `SITE`) are exported from `src/config/site.js` — the only
module that reads the brand-related environment variables. Components import them from there
instead of hardcoding a logo URL, a site name or a domain. The logo is never recoloured
locally; `check:contrast` and `check:traces` enforce the palette.

---

## Notes for Windows

Everything is cross-platform — no shell one-liners, no `cp -r`, `rimraf` for deletes and
`cross-env` for variables inside npm scripts. Three things still differ:

**Environment variables on the command line.** npm scripts themselves run in `cmd.exe`, so
the `cross-env` inside them works everywhere. But a variable you set *around* a command is
PowerShell syntax:

```powershell
$env:MOCK_DELAY_MS=1500; npm run mock
$env:REACT_APP_API_URL='http://localhost:4000/api'; npm run build
$env:CHROME_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'
```

`MOCK_DELAY_MS=1500 npm run mock` is Bash syntax and fails in PowerShell. `CHROME_PATH` is
usually unnecessary: the usual install locations, including a per-user install under
`LOCALAPPDATA` and Edge, are auto-detected.

**Two processes in one terminal.** `npm run dev` uses `concurrently`, so one terminal runs
both the mock and the web app, and `Ctrl+C` stops both. Prefixed output (`mock`, `web`) says
which spoke. If you prefer separate windows:

```powershell
Start-Process npm -ArgumentList 'run','mock'
npm start
```

**Line endings.** `.gitattributes` sets `* text=auto eol=lf`, so the working tree is LF
whatever Git is configured to do, and `.editorconfig` keeps editors in line. Prettier
enforces `endOfLine: 'lf'`. If a diff shows every line changed, the file was saved with CRLF
— run `npm run format` on it.

---

## Troubleshooting

**`Something is already running on port 3000` / `EADDRINUSE :4000`.** A previous run did not
stop. Find and stop it, or move the port:

```bash
lsof -ti:4000 | xargs kill          # macOS/Linux
```

```powershell
Get-NetTCPConnection -LocalPort 4000 | Select-Object -ExpandProperty OwningProcess | Stop-Process
```

The mock's port is `MOCK_PORT`; change `REACT_APP_API_URL` to match when you move it. CRA
offers another port for the web app on its own.

**A screen says "You do not have permission to perform this action." to the admin.** The
web app is newer than the mock API answering it. The API refuses an admin route it has no
rule for, so a screen added since that process started — Master data → Segments, say — fails
with a 403 even for the admin. Two things cause it: a mock started with `npm run mock` before
a `git pull` (it does not restart itself; `npm run dev` does), or an earlier mock still holding
port 4000, which makes the new one exit with `Port 4000 is already in use`. Stop every mock
(the commands above free the port), then `npm run dev` again.

**`REACT_APP_API_URL is not set. Copy .env.example to .env.`** Thrown at startup, on
purpose — there is no fallback URL. In development `.env.development` supplies it, so this
almost always means a **production** build with no `.env.production`. See
[Which file is loaded](#which-file-is-loaded).

**The admin panel shows stale or broken data / the runtime database is corrupt.** Stop the
mock, reset, start it again — the order matters, and `mock:reset` refuses while the server is
up:

```bash
npm run mock:reset       # with the mock stopped
```

Or skip the reset: `MOCK_FRESH=1 npm run mock`.

**`Set CHROME_PATH to run the prerender (optional step).`** No browser was found. Install
Chrome or point `CHROME_PATH` at one. Every check that prints this is optional —
`npm run check:all` does not need a browser, and `npm run build` does not either.

**A blocked font or image CDN in the console.** Google Fonts, `picsum.photos` and Cloudinary
are third-party; on a restricted network they fail and the page still renders, because the
font stack falls back. It is the network, not the app.

**`npm ci` fails on the lockfile.** The lockfile is authoritative, so `npm ci` refuses when
`package.json` disagrees with it. Use `npm install` once to reconcile, and commit both files
together.

**`npm audit` reports vulnerabilities.** Almost all of them are transitive dependencies of
`react-scripts` 5.0.1, which is unmaintained. They are build-time, not shipped in the
bundle. Do **not** run `npm audit fix --force`: it replaces `react-scripts` and breaks the
build. `docs/QA/48-final-audit.md` records the review.

---

## License

Private — Squares N Acres. All rights reserved.
