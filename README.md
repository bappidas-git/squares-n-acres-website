# Squares N Acres — Website & Admin Panel

Real-estate portal for **Squares N Acres**, Bengaluru: a public website for searching,
browsing and enquiring about properties, and an admin panel for managing properties, leads,
articles, SEO and site settings.

> **Status:** the repository is being rebuilt prompt by prompt (`prompts/`). The current
> state, the open issues and the executed steps are tracked in
> [`docs/PROJECT_STATE.md`](./docs/PROJECT_STATE.md); architecture decisions are recorded in
> [`docs/DECISIONS.md`](./docs/DECISIONS.md).

---

## What it is

- **Public site** — property search and listings, property details, localities, builders,
  buyer assistance, articles, company pages and lead capture.
- **Admin panel** — properties with their full detail set, leads, articles, FAQs, SEO
  settings and site settings, behind role-based authentication.
- **Dual mode** — the frontend runs unchanged against either backend:
  - the local **mock server** (JSON Server inside Express, seeded from `db.json`), used for
    development and tests;
  - the future **Laravel + MySQL API**.

  Switching between them is done **only** by changing `REACT_APP_API_URL`; no application
  code knows which backend answers.

| Layer     | Technology                                      |
| --------- | ----------------------------------------------- |
| Framework | React 18 (Create React App / `react-scripts` 5) |
| Routing   | React Router v6, route-level `React.lazy`       |
| UI        | MUI v7 + CSS Modules + CSS custom properties    |
| HTTP      | Axios with interceptors                         |
| Animation | Framer Motion                                   |
| Icons     | Iconify (MDI set)                               |
| Head tags | React Helmet Async                              |

---

## Requirements

- **Node 20 LTS** — the version is pinned in [`.nvmrc`](./.nvmrc) (`nvm use` picks it up).
  `package.json` accepts Node `>= 18.18`.
- **npm 9+**

---

## Quick start

```bash
npm install
npm run dev        # mock API on :4000 and the web app on :3000
```

The app starts on <http://localhost:3000>.

Environment variables are optional for local development: `.env.development` is committed
and already points at the local mock API. To override anything on your machine, copy the
template and edit the copy (`.env` is git-ignored):

```bash
cp .env.example .env
```

`npm start` runs the web app alone; `npm run mock` runs the API alone.

---

## Scripts

| Script                          | What it does                                                      |
| ------------------------------- | ----------------------------------------------------------------- |
| `npm start`                     | CRA dev server on port 3000                                       |
| `npm run dev`                   | Mock server and web app together                                  |
| `npm run build`                 | Production build into `build/`                                    |
| `npm run build:ci`              | `build` with `CI=true`, so warnings fail the build                |
| `npm test`                      | Jest in watch mode                                                |
| `npm run test:ci`               | Jest once, no watch                                               |
| `npm run lint`                  | ESLint over `src/**` and `scripts/**`, zero warnings tolerated    |
| `npm run lint:fix`              | ESLint with `--fix`                                               |
| `npm run format`                | Prettier over `src/**`, `scripts/**` and `docs/**`                |
| `npm run format:check`          | Prettier in check mode                                            |
| `npm run check:traces`          | Fails when boilerplate brand traces or stray hex colours remain   |
| `npm run check:traces:report`   | Same scan, totals only, always exits 0                            |
| `npm run generate:brand-assets` | Re-downloads the brand PNGs into `public/brand/`                  |
| `npm run generate:backend-guidelines` | Regenerates `backend_developer_guidelines/` (needs the mock) |
| `npm run check:guidelines`      | Checks the handover package covers every endpoint and model      |
| `npm run smoke`                 | Walks the endpoint registry against a running API                |
| `npm run check:all`             | `lint` + tests + `build:ci` + `check:traces` + `check:guidelines` |
| `npm run eject`                 | CRA eject — not used                                              |

---

## Environment variables

Every variable is documented in [`.env.example`](./.env.example). `REACT_APP_*` variables are
embedded into the bundle at build time; `MOCK_*` variables are read by the mock server.

| Variable                             | Required | Default (development)       | Purpose                                                                                   |
| ------------------------------------ | -------- | --------------------------- | ----------------------------------------------------------------------------------------- |
| `REACT_APP_API_URL`                  | yes      | `http://localhost:4000/api` | API base URL including `/api`; no fallback — the app throws at startup when it is missing |
| `REACT_APP_SITE_URL`                 | no       | `http://localhost:3000`     | Public origin used for canonical and Open Graph URLs                                      |
| `REACT_APP_SITE_NAME`                | no       | `Squares N Acres`           | Display name of the site                                                                  |
| `REACT_APP_CLOUDINARY_CLOUD_NAME`    | no       | —                           | Enables image uploads from the admin media library                                        |
| `REACT_APP_CLOUDINARY_UPLOAD_PRESET` | no       | —                           | Unsigned Cloudinary upload preset                                                         |
| `REACT_APP_GOOGLE_MAPS_KEY`          | no       | —                           | Enables the property location map                                                         |
| `CHROME_PATH`                        | no       | —                           | Chrome/Chromium binary used by the prerender script                                       |
| `MOCK_PORT`                          | no       | `4000`                      | Port of the mock server                                                                   |
| `MOCK_DELAY_MS`                      | no       | `0`                         | Artificial latency of mock responses                                                      |
| `MOCK_TOKEN_TTL_HOURS`               | no       | `24`                        | Lifetime of a mock auth token                                                             |
| `MOCK_FRESH`                         | no       | `0`                         | `1` re-seeds the runtime database on every start                                          |

Which file is loaded is decided by Create React App: `npm start` reads `.env.development`,
`npm run build` reads `.env.production`, and `.env` is read by both. Only `.env.example`,
`.env.development` and `.env.production.example` are committed — copy the latter to
`.env.production` on the build machine.

---

## Project structure

```
squares-n-acres-website/
├─ backend_developer_guidelines/  # generated handover package for the API developer
├─ docs/                    # project state, decisions, codebase inventory
│  └─ backend-notes/        # the hand-written half of the handover package
├─ prompts/                 # the build plan: master context + one file per step
├─ public/                  # index.html, manifest.json, robots.txt
│  └─ brand/                # brand PNGs (favicons, PWA icons, OG image, wordmark)
├─ scripts/                 # repository tooling (trace check, brand assets)
├─ src/
│  ├─ assets/styles/        # global.css — CSS custom properties, reset, utilities
│  ├─ components/admin/     # admin-only building blocks (route guards, pickers)
│  ├─ components/common/    # shared components (property card, lead form, …)
│  ├─ components/layout/    # header, mobile header, footer, admin layout
│  ├─ components/sections/  # page sections, grouped by page (home, property)
│  ├─ config/               # site.js (brand/site constants), rbac.js, adminConstants.js
│  ├─ contexts/             # React context providers (admin auth)
│  ├─ hooks/                # reusable hooks
│  ├─ pages/admin/          # admin screens
│  ├─ pages/public/         # public screens
│  ├─ routes/               # route definitions
│  ├─ services/             # API client and service functions
│  ├─ utils/                # formatting, validation, SEO helpers
│  ├─ App.js  index.js      # root component and entry point
│  └─ theme.js              # MUI theme
└─ db.json                  # seed data for the mock server
```

---

## Brand assets

The logo, monogram, favicons, PWA icons and the default Open Graph image live in
`public/brand/` and are committed, so no build step depends on the network. They are derived
from the Cloudinary originals referenced by `src/config/site.js`. To refresh them:

```bash
npm run generate:brand-assets
```

The script re-downloads the ten PNGs, prints a table of file, size and status, and exits 0
even when a download fails, so it can be run offline without breaking anything.

The brand constants (`BRAND`, `SITE`) are exported from `src/config/site.js` — the only module
that reads the brand-related environment variables. Components import them from there instead
of hardcoding a logo URL, a site name or a domain.

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

The generator reads the endpoint registry, the schema and model descriptors, the enums, the
RBAC matrix and the hand-written notes in **`docs/backend-notes/`**, then captures a real
response for every endpoint from the running mock. It is deterministic: two runs produce no
diff, and the only line that moves between commits is `generatedFrom: <commit>`.

**To change the package, change its sources.** Prose lives in `docs/backend-notes/*.md`;
facts live in `src/services/endpoints.js`, `src/services/schemas/`, `src/config/enums.js`
and `mock-server/schemas/models.js`. An edit to a generated file is thrown away by the next
run.

### Parity

`npm run smoke` walks the same registry the frontend calls through, against any base URL:

```bash
npm run smoke -- --baseUrl=https://api.squaresnacres.com/api
npm run smoke -- --baseUrl=https://api.squaresnacres.com/api --compare=http://localhost:4000/api
```

`--compare` sends every read to both servers and prints only what differs — status,
envelope keys, `meta` shape and the key set of `data`. An empty table is the signal that the
frontend cannot tell the two backends apart.

---

## Deployment

The production build is a static site (`build/`) served by any web server, with client-side
routing rewritten to `index.html`. Switching the site from the mock to the real API is one
line — `REACT_APP_API_URL` in `.env.production` — and a rebuild. The full procedure, the
Nginx server blocks, the security headers, the rollback and the go-live checklist are in
[`backend_developer_guidelines/07_DEPLOYMENT.md`](./backend_developer_guidelines/07_DEPLOYMENT.md).

---

## License

Private — Squares N Acres. All rights reserved.
