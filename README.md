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
npm start          # mock server coming in a later step; see "Scripts" below
```

The app starts on <http://localhost:3000>.

Environment variables are optional for local development: `.env.development` is committed
and already points at the local mock API. To override anything on your machine, copy the
template and edit the copy (`.env` is git-ignored):

```bash
cp .env.example .env
```

Once the mock server exists, `npm run dev` will start the API and the web app together.

---

## Scripts

| Script                          | What it does                                                      |
| ------------------------------- | ----------------------------------------------------------------- |
| `npm start`                     | CRA dev server on port 3000                                       |
| `npm run dev`                   | Alias of `npm start` today; becomes "mock server + web app" later |
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
| `npm run check:all`             | `lint` + `test:ci` + `build:ci` + `check:traces`                  |
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
├─ docs/                    # project state, decisions, codebase inventory
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

## Deployment

The production build is a static site (`build/`) served by any web server, with client-side
routing rewritten to `index.html`. Full deployment instructions — web-server configuration,
API proxying for `robots.txt`/sitemaps, and the release checklist — are still to be written;
see `docs/`.

---

## License

Private — Squares N Acres. All rights reserved.
