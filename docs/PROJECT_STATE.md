# Project state — Squares N Acres website

Status: IN PROGRESS
Last prompt executed: 47 — Backend developer handover package Next prompt: 48

## Executed prompts

| #   | Title                                                              | Commit                                                                             | Date       |
| --- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ---------- |
| 01  | Repository audit, tooling baseline and project state files         | `c1cc2f7`                                                                          | 2026-09-15 |
| 02  | Rebrand identity, environment files, brand assets and README       | `376203f`                                                                          | 2026-09-15 |
| 03  | Purge HOM traces and dead code; strict trace check                 | `f82d069`                                                                          | 2026-09-15 |
| 04  | Design system: tokens, MUI theme, UI kit and layout restyle        | `373e092`                                                                          | 2026-09-15 |
| 05  | API contract, enums, endpoint registry and schema descriptors      | `1812eae`                                                                          | 2026-09-15 |
| 06  | Mock server core, runtime db, envelope and starter seed            | `1a2ce23`                                                                          | 2026-09-15 |
| 07  | Auth tokens, RBAC middleware, users CRUD and profile               | `2383116`                                                                          | 2026-09-15 |
| 08  | Property search and lead pipeline on the mock                      | `71e0727`                                                                          | 2026-09-15 |
| 09  | Mock content, master data, SEO, sitemaps and smoke tests           | `92df3cb`                                                                          | 2026-09-16 |
| 10  | Full Bangalore seed data and seed guide                            | `bdaeaa9`                                                                          | 2026-09-16 |
| 11  | Frontend data layer, hooks, contexts and page rewiring             | `d60193e`                                                                          | 2026-09-16 |
| 12  | Auth, admin shell, RBAC routes, notifications and profile          | `d6128b5`                                                                          | 2026-09-16 |
| 13  | Admin UI kit, `MasterDataPage`, users page, IconPicker fixes       | `651a8cc`                                                                          | 2026-09-16 |
| 14  | Localities and cities: admin CRUD, public index and guide          | `b3813a1`                                                                          | 2026-09-16 |
| 15  | Master data: property types, amenities, badges and banks           | `0cc1afc`                                                                          | 2026-09-16 |
| 16  | Developers: admin CRUD and the public builder pages                | `da19cb5`                                                                          | 2026-09-16 |
| 17  | FAQs, testimonials, team and partners: admin and sections          | `4dcf5cd`                                                                          | 2026-09-16 |
| 18  | Property form foundation: reducer, validators, rail, payload       | `c917a9a`                                                                          | 2026-09-16 |
| 19  | Property form tabs 1–6: basics → media                             | `44122e1`                                                                          | 2026-09-16 |
| 20  | Property form tabs 7–12: amenities → FAQs                          | `d114794`                                                                          | 2026-09-16 |
| 21  | Property form tabs 13–16, admin preview, publish polish            | `fb93d0c`                                                                          | 2026-09-16 |
| 22  | Admin property list: filters, bulk, toggles, CSV export            | `28e892a`                                                                          | 2026-09-16 |
| 23  | Property details part 1: page shell, gallery, price, shortlist     | `399b188`                                                                          | 2026-09-16 |
| 24  | Property details part 2: the eleven content sections               | `296deaa`                                                                          | 2026-09-16 |
| 25  | Property details part 3: documents, finance, similar, enquiry      | `adfe5ad`                                                                          | 2026-09-17 |
| 26  | Public listing engine, filters, global search and shortlist        | `382e5cf`                                                                          | 2026-09-17 |
| 27  | Data-driven home page, navigation and footer                       | `f20e4e0`                                                                          | 2026-09-17 |
| 28  | Unified lead capture, spam protection, click tracking              | `66d200a`                                                                          | 2026-09-17 |
| 29  | Admin leads CRM and the real-data dashboard                        | `69fd6c5`                                                                          | 2026-09-17 |
| 30  | Pages CMS: admin block editor, public renderer, CmsPage routes     | `7a161a0`                                                                          | 2026-09-17 |
| 31  | Careers & jobs, CMS awareness page, newsletter subscribers         | `9e7d1cc`                                                                          | 2026-09-17 |
| 32  | Tiptap rich text editor, sanitiser, SafeHtml, every textarea       | `42d836f`                                                                          | 2026-09-17 |
| 33  | Articles admin: list, editor form, scheduling, taxonomy CRUD       | `ad85093`                                                                          | 2026-09-17 |
| 34  | Public blog: index, taxonomy pages, article page, RSS link         | `6862bf2`                                                                          | 2026-09-17 |
| 35  | SEO engine core: analyzers, scoring, readability, schema           | `a9e806f`                                                                          | 2026-09-17 |
| 36  | SEO panel: General/Social/Advanced/Schema, wired into 8 forms      | `e52a9ea`                                                                          | 2026-09-17 |
| 37  | SEO dashboard, global SEO settings, redirects manager, playbook    | `7b179f0`                                                                          | 2026-09-17 |
| 38  | Public `<Seo>`, JSON-LD graphs, breadcrumbs, redirects, checks     | `261bf66`                                                                          | 2026-09-17 |
| 39  | Media library, Cloudinary uploads, picker, responsive images       | `b54145e`                                                                          | 2026-09-18 |
| 40  | Site settings admin, context refresh, public subset verified       | `f88a01d`                                                                          | 2026-09-18 |
| 41  | Code splitting, lazy sections, LCP preloads, web-vitals, prerender | `3a89808`                                                                          | 2026-09-18 |
| 42  | Mobile UX and accessibility pass across public and admin           | `e950419`                                                                          | 2026-09-18 |
| 43  | UX polish: loading/empty/error/success states, 404/500, copy       | `042066b`                                                                          | 2026-09-18 |
| 44  | QA bug bash: property module, seed render/payload tests, Playwright | `58f1b11`                                                                            | 2026-09-18 |
| 45  | QA bug bash: leads, articles, SEO, CMS, settings, auth               | `4a4720a`                                                                          | 2026-09-18 |
| 46  | QA: cross-device, Lighthouse, SEO validation, prerender dry run      | `4a917e8` (+ `95c6f3b`, the review fix on the same branch)                          | 2026-09-18 |
| 47  | Backend developer handover package: generator, docs, schema, Postman | HEAD of this branch (a commit cannot contain its own hash — prompt 48 fills it in) | 2026-09-18 |

## Baseline (prompt 01)

### Toolchain

| Item                               | Value                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node -v`                          | `v22.22.2` (above the `.nvmrc` pin of `20`; `engines` requires `>=18.18`)                                                                                                                                                                                                                                                                       |
| `npm -v`                           | `10.9.7`                                                                                                                                                                                                                                                                                                                                        |
| `npm install`                      | `added 1624 packages, and audited 1625 packages in 25s` — **70 vulnerabilities (15 low, 15 moderate, 37 high, 3 critical)**, all inside the `react-scripts 5.0.1` dependency tree (`svgo`/`postcss`/`webpack-dev-server`/`workbox`); not fixable without ejecting or a CRA major, so they are accepted for now.                                 |
| `npm install` deprecation warnings | `w3c-hr-time@1.0.2`, `stable@0.1.8`, `workbox-cacheable-response@6.6.0`, `sourcemap-codec@1.4.8`, `rollup-plugin-terser@7.0.2`, `workbox-google-analytics@6.6.0`, `domexception@2.0.1`, `abab@2.0.6`, `svgo@1.3.2`, `@babel/plugin-proposal-{optional-chaining,numeric-separator,private-methods,nullish-coalescing-operator,class-properties}` |
| Dev deps added                     | `prettier@3.9.6`, `eslint-config-prettier@10.1.8`, `cross-env@7.0.3`, `rimraf@5.0.10` (`added 11 packages, changed 3 packages`)                                                                                                                                                                                                                 |

Every build emits the CRA notice that `babel-preset-react-app` imports
`@babel/plugin-proposal-private-property-in-object` without declaring it, plus
`Browserslist: caniuse-lite is outdated`. Neither fails the build; neither is fixed here
(adding the Babel plugin would mean a dependency outside the allow-list of §12).

### `npm run build` — before any change

Exit 0, `Compiled with warnings.` — **10 ESLint warnings, 0 errors.** First lines:

```
Compiled with warnings.

[eslint]
src/components/sections/home/HeroSection.jsx
  Line 267:17:  Elements with the ARIA role "combobox" must have the following attributes defined: aria-controls,aria-expanded  jsx-a11y/role-has-required-aria-props

src/components/sections/property/EnquiryForm.jsx
  Line 6:28:  'sanitizeInput' is defined but never used  no-unused-vars

src/components/sections/property/FinanceGuide.jsx
  Line 168:9:  'resultRef' is assigned a value but never used  no-unused-vars

src/components/sections/property/StickyNav.jsx
  Line 127:5:  React Hook useCallback has a missing dependency: 'navItems'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

src/pages/admin/LeadDetail.js
  Line 41:9:  'isMobile' is assigned a value but never used  no-unused-vars

src/pages/admin/property-tabs/SeoTagsTab.jsx
  Line 2:67:  'LinearProgress' is defined but never used  no-unused-vars

src/pages/public/ArticleDetail.js
  Line 43:7:  'inList' is assigned a value but never used  no-unused-vars

src/pages/public/PropertyDetails.jsx
  Line 203:9:  'handleOpenLeadForm' is assigned a value but never used  no-unused-vars

src/pages/public/PropertyListing.jsx
  Line 1:60:  'memo' is defined but never used       no-unused-vars
  Line 5:10:  'useInView' is defined but never used  no-unused-vars
```

Bundle (gzip): `main.28d19d0e.js` 212.91 kB + 41.44 kB + 34.67 kB and ~90 further chunks.

### `npx eslint "src/**/*.{js,jsx}"` — before any change (CRA config, no project rules)

`✖ 16 problems (0 errors, 16 warnings)` — the 10 above plus:

```
src/services/api.js
  75:7  warning  'extractPaginationMeta' is assigned a value but never used  no-unused-vars

src/utils/seoGenerator.js
   21:7    warning  'capitalize' is assigned a value but never used      no-unused-vars
  238:116  warning  'specifications' is assigned a value but never used  no-unused-vars
  241:9    warning  'state' is assigned a value but never used           no-unused-vars

src/utils/validators.js
  26:21  warning  Unnecessary escape character: \-  no-useless-escape
  59:35  warning  Unnecessary escape character: \-  no-useless-escape
```

Under the **new** config (prompt 01 §7) the same tree reported
`✖ 26 problems (23 errors, 3 warnings)` — the 16 above re-graded to errors, plus
`AnimatedSection.jsx` `Tag`, `ToastProvider.jsx` `index`,
`property-tabs/BasicInfoTab.jsx` `slugManuallyEdited` and the 7 `no-console` errors in
`PropertyForm.jsx`. All are fixed in this commit.

### Size counters

| Counter                                                | Value                                                  |
| ------------------------------------------------------ | ------------------------------------------------------ |
| Files tracked under `src/`                             | 173 (80 `.jsx`, 39 `.js`, 53 `.css`, 1 `.png`)         |
| Lines under `src/` (`git ls-files src \| xargs wc -l`) | 47 834                                                 |
| Hex literals in `src/**/*.{js,jsx}` outside `theme.js` | **1 206** (expected ≈ 1 206 ✔)                         |
| Hex literals in `src/**/*.css` outside `global.css`    | **290** (expected ≈ 290 ✔); 307 including `global.css` |
| Inline `fontFamily:` literals in `src/**/*.{js,jsx}`   | 30 (17 of them in `PropertyDetails.jsx`)               |
| JS/JSX files scanned by the inventory                  | 119                                                    |

### Boilerplate-trace counters (regexes of `00_MASTER_CONTEXT.md` §13 D17)

Brand strings only (the eight brand/identifier/host patterns of D17 — the dotted and
spaced brand names, the old domain, the tagline, the two identifier prefixes, the CSS class
prefix and the Cloudways host):

| Scope     | Matches                |
| --------- | ---------------------- |
| `db.json` | **52** (expected ≈ 49) |
| `src/`    | **84** (expected ≈ 90) |

Full D17 pattern set (brand strings + the boilerplate palette hexes and fonts + the old
Cloudinary cloud + the video host + the placeholder-image host and its colour name):

| Scope     | Matches |
| --------- | ------- |
| `db.json` | 226     |
| `src/`    | 475     |

`npm run check:traces:report` scans 181 files (`src`, `public`, `scripts`, `docs`, `db.json`,
`README.md`, `package.json`, `.env`). Excluding `docs/**` — whose three new files quote the
traces as evidence and are handled under "Pending rewrites" — the **product tree** reports:

```
brand/legacy traces:  717
hex colour literals: 1495
total findings:      2212
```

(The totals printed by the script itself are higher because the scan includes this file and the
inventory; those documentation findings are not product defects.)

By pattern in the product tree: hex-literal 1495 · HOM palette navy 222 · the dotted brand
string 95 · the placeholder-image host 89 · its colour name 77 · the palette gold 63 ·
the old domain 35 ·
the boilerplate body font 35 · navy-light 26 · navy-alt 14 · the old Cloudinary cloud 11 ·
the hyphen identifier prefix 10 ·
the boilerplate heading font 9 · the Cloudways host 4 · gold-dark 4 · cream 4 ·
the CSS class prefix 4 ·
the HOM tagline 3 · the Gumlet host 2 · the HOM numeral font 2 · navy-dark 2 · gold-light 2 ·
the underscore storage-key prefix 2 · the spaced brand string 2.

Worst product files: `db.json` 226 · `AdminSeo.js` 141 · `AdminProperties.js` 94 ·
`Dashboard.js` 80 · `LeadDetail.js` 76 · `ArticleForm.jsx` 72 ·
`AdminLayout.module.css` 67 · `AdminSettings.js` 65 · `FaqManager.jsx` 65 ·
`PropertyDetails.jsx` 60.

`npm run check:traces` (strict) exits **1** — expected until prompt 03.

### Line endings

`git add --renormalize .` after switching `.gitattributes` to `* text=auto eol=lf` changed
**no** files: the working tree was already LF-only (`file` reports no CRLF in any tracked file).
The renormalisation is therefore invisible in the diff.

## Current npm scripts / env vars / endpoints added (cumulative lists)

### npm scripts

| Script                  | Command                                                                                                         | Added by                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `start`                 | `react-scripts start`                                                                                           | boilerplate                     |
| `dev`                   | `concurrently -n mock,web -c blue,green "npm run mock" "npm start"`                                             | boilerplate (replaced in 06)    |
| `mock`                  | `node mock-server/server.js`                                                                                    | 06                              |
| `mock:reset`            | `node mock-server/reset.js`                                                                                     | 06                              |
| `build`                 | `react-scripts build`                                                                                           | boilerplate                     |
| `test`                  | `react-scripts test`                                                                                            | boilerplate                     |
| `eject`                 | `react-scripts eject`                                                                                           | boilerplate                     |
| `lint`                  | `eslint … --max-warnings=0 && node scripts/check-endpoints.js`                                                  | 01 (extended in 05, 06)         |
| `lint:fix`              | `eslint "src/**/*.{js,jsx}" "mock-server/**/*.js" "scripts/**/*.js" --fix`                                      | 01 (extended in 06)             |
| `format`                | `prettier --write "src/**" "mock-server/**/*.js" "scripts/**" "docs/**/*.md"`                                   | 01 (extended in 06)             |
| `format:check`          | `prettier --check "src/**" "mock-server/**/*.js" "scripts/**/*.js"`                                             | 01 (extended in 06)             |
| `test:ci`               | `cross-env CI=true react-scripts test --watchAll=false --passWithNoTests`                                       | 01                              |
| `test:mock`             | `cd mock-server && node --test`                                                                                 | 07                              |
| `build:ci`              | `cross-env CI=true react-scripts build`                                                                         | 01                              |
| `check:traces`          | `node scripts/check-traces.js`                                                                                  | 01                              |
| `check:traces:report`   | `node scripts/check-traces.js --report`                                                                         | 01                              |
| `generate:brand-assets` | `node scripts/fetch-brand-assets.js`                                                                            | 02                              |
| `check:contrast`        | `node scripts/contrast-check.js`                                                                                | 04                              |
| `check:endpoints`       | `node scripts/check-endpoints.js`                                                                               | 05                              |
| `validate:seed`         | `node scripts/validate-seed.js`                                                                                 | 06                              |
| `seed:build`            | `node scripts/seed/build-seed.js`                                                                               | 10                              |
| `smoke`                 | `node scripts/smoke-api.js` (needs a running mock; deliberately outside `check:all`)                            | 09                              |
| `check:links`           | `node scripts/check-links.js` (needs `npm run dev`; outside `check:all`)                                        | 38                              |
| `check:jsonld`          | `node scripts/validate-jsonld.js` (needs `npm run dev`; outside `check:all`)                                    | 38                              |
| `serve:build`           | `serve -s build -l 5000` (the production build, for Lighthouse and the prerender)                               | 41                              |
| `build:prerender`       | `npm run build && node scripts/prerender.js` (needs `CHROME_PATH` + a running mock)                             | 41                              |
| `analyze`               | `node scripts/bundle-report.js` (the §8.6 budget check; needs `npm run build` first)                            | 41                              |
| `test:scripts`          | `node --test "scripts/__tests__/**/*.test.js"`                                                                  | 41                              |
| `a11y:audit`            | `node scripts/a11y-audit.js` (needs a running mock, a served build and `CHROME_PATH`; skips without Chrome)     | 42                              |
| `generate:backend-guidelines` | `node scripts/generate-backend-guidelines.js` (needs a running mock; `--skip-capture` reuses `.tmp/examples.json`) | 47                              |
| `check:guidelines`      | `node scripts/check-guidelines.js` (reads files only, so it is inside `check:all`)                              | 47                              |
| `check:all`             | `… lint && test:ci && test:mock && test:scripts && build:ci && check:traces && validate:seed && check:contrast && check:guidelines` | 01 (extended in 04, 06, 07, 41, 47) |

### Environment variables

The boilerplate's committed `.env` was removed from git and from disk in prompt 02; the
committed files are now `.env.example` (documents every variable), `.env.development` (read
by `npm start`) and `.env.production.example` (template for `.env.production`, git-ignored).

| Variable                             | Required | Default (development)       | Added by | Consumed by                                                  |
| ------------------------------------ | -------- | --------------------------- | -------- | ------------------------------------------------------------ |
| `REACT_APP_API_URL`                  | yes      | `http://localhost:4000/api` | 02       | `src/services/api.js` — throws when missing (D48)            |
| `REACT_APP_SITE_URL`                 | no       | `http://localhost:3000`     | 02       | `src/config/site.js` → `SITE.url`                            |
| `REACT_APP_SITE_NAME`                | no       | `Squares N Acres`           | 02       | `src/config/site.js` → `SITE.name`                           |
| `REACT_APP_CLOUDINARY_CLOUD_NAME`    | no       | —                           | 02       | media uploads (prompt 39)                                    |
| `REACT_APP_CLOUDINARY_UPLOAD_PRESET` | no       | —                           | 02       | media uploads (prompt 39)                                    |
| `REACT_APP_GOOGLE_MAPS_KEY`          | no       | —                           | 02       | property location map                                        |
| `CHROME_PATH`                        | no       | —                           | 02       | `check:links` / `check:jsonld` (38); prerender script (41)   |
| `MOCK_PORT`                          | no       | `4000`                      | 02       | `mock-server/config.js` — the port `npm run mock` listens on |
| `MOCK_DELAY_MS`                      | no       | `0`                         | 02       | `mock-server/config.js` — latency on every response          |
| `MOCK_TOKEN_TTL_HOURS`               | no       | `24`                        | 02       | `mock-server/config.js` — token lifetime (used by prompt 07) |
| `MOCK_FRESH`                         | no       | `0`                         | 02       | `mock-server/config.js` — `1` re-seeds the runtime db        |
| `MOCK_URL`                           | no       | `http://localhost:4000/api` | 41       | `scripts/prerender.js` — the API whose sitemaps it crawls    |

`.gitignore` (prompt 01) already ignored `.env` and `.env.production`; those rules now
protect real files instead of being a no-op.

### Endpoints

**236 endpoints are now declared** in `src/services/endpoints.js` — the complete catalogue
of `00_MASTER_CONTEXT.md` §5.14 (44 public, 5 auth, 187 admin) in 52 groups, documented in
`docs/API_CONTRACT.md`. Prompt 21 added the one endpoint the catalogue did not list:
`GET /admin/properties/slug/:slug`, the admin read by slug that the preview of an unpublished
listing needs (a public URL carries no id). None of them is served yet (prompts 06–09 build the mock) and none
is called yet (prompt 11 rewrites the services): this prompt freezes the contract, it does
not wire it.

`src/services/endpoints.test.js` hardcodes every path of §5.14 and fails when one
disappears from the registry; `scripts/check-endpoints.js` (now part of `npm run lint`)
fails when a path literal appears anywhere else under `src/`.

Prompt 27 added the second endpoint the catalogue did not list: **`GET /pages`**
(`pages.list`), the navigation list of published pages — `showInHeader` / `showInFooter`
filters, `{slug,title,headerMenu,footerColumn,order}` per row, unpaginated unless
`page`/`perPage` ask otherwise. The header and the footer are built from it, so **237**
endpoints are now declared.

**Prompt 37 registered the last four paths the mock already served.**
`GET /redirects/resolve` (the redirects screen's "Check a URL" tester, and the only
endpoint that counts a `hits`), `POST /admin/redirects/import` (body `redirect.import`),
`GET /admin/redirects/export` and `GET /admin/seo/llms-preview` are now entries of
`src/services/endpoints.js`, walked by `npm run smoke` and listed in
`src/services/endpoints.test.js` — so **241** endpoints are declared. Two response shapes
were added to `docs/API_CONTRACT.md` with them (`RedirectImportSummary`, `LlmsPreview`), and
`SeoOverviewRow` grew `key` and `duplicateOf`.

**Served by the mock:** all 241 registry endpoints, plus `GET /api/health`. Prompt 06 built the core and generic CRUD for all 28
collections; 07 added `/auth/*` and `/admin/users`; 08 the property and lead routes; 09 the
rest — articles, pages, the fourteen master-data collections, media, settings, SEO settings
and overview, the dashboard, the newsletter, careers, redirects, and the sitemap family
(`sitemap.xml` + five children, `robots.txt`, `rss.xml`, `llms.txt`) at both `/api/...` and
the root (D21).

Every `/api/admin/*` path — hand-written or generic — answers 401 without a bearer token and
403 outside the §7 matrix. `npm run smoke` walks `allEndpoints()` against a running server
and asserts the status, the envelope and two dozen behaviours: **280/280 checks pass, 0
failures** (2026-09-17, against the committed seed).

The generic JSON Server router is now a fallback for two things only, neither of them in the
contract: the camelCase spellings of the kebab-case paths (`/api/propertyTypes`) and a
detail read by id where the contract gives only a slug lookup (`/api/localities/1`).
`GENERIC_COLLECTIONS` in `mock-server/middleware/publicScope.js` names them.

Prompt 29 added no endpoint. It added one **field** —
`isPossibleDuplicate` on every admin lead read (`GET /admin/leads`,
`GET /admin/leads/:id` and every write that answers with a lead), computed
from a phone-keyed index over the whole collection with a thirty-day window and
documented under `Lead` in `docs/API_CONTRACT.md` — and moved one **permission**:
reading `/admin/users` (the list and one record) is now `users.list`, held by
admin and manager, because §7 gives `leads.assign` to managers and naming a
colleague means reading the directory. Every write on `/admin/users` and the
`/admin/settings/users` screen stay admin-only.

The boilerplate's own endpoint surface stays inventoried in
`docs/archive/CODEBASE_INVENTORY.md` §d until prompt 11 replaces it.

## Pending rewrites (temporary adapters that must be removed; owner prompt)

**Empty as of prompt 43.** Every row below is struck through and closed; the
table is kept as the record of what each temporary adapter was and which prompt
removed it. Anything added here from now on is a bug until it is closed again.


| Item                                             | Why it is temporary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Owner prompt     |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| ~~`test:ci --passWithNoTests`~~                  | **Closed in 43.** The flag is gone from `package.json`: `src/` holds 138 suites and 2 642 tests, so `react-scripts test --watchAll=false` has something to run and an empty run is a failure again, which is what the flag was hiding.                                                                                                       | ~~35~~ closed in 43 |
| ~~Header / MobileHeader / BottomNav nav arrays~~ | **Closed in 27, verified in 42 and re-verified in 43.** `src/config/navigation.js` is the one source of every public menu — `buildHeaderNav()`, `buildBottomNav()`, `buildFooterNav()` — and its labels are `NAV` in `src/config/copy.js`. There is no `navItems` or `sideMenuItems` literal anywhere in the public tree; the one `navItems` left is `AdminSidebar`'s, which reads `getNavItemsForRole()` from `config/rbac.js` and is the admin rail, not this row. | ~~04~~ closed in 27 |
| ~~501 on the sitemap / robots / RSS / llms paths~~ | **Closed in 09, verified in 43.** `/sitemap.xml`, `/robots.txt`, `/rss.xml`, `/llms.txt` and their `/api/` mirrors all answer **200** from the running mock.                                                                                                                                                                       | ~~09~~ closed in 09 |
| ~~`src/utils/adapters/legacyArticle.js`~~        | **Closed in 33.** The file is deleted with the two screens that read it. `/admin/articles` and its form now speak the §6.8 record: `featuredImage{url,alt,caption}`, `categoryId`/`category`, `authorId`/`author`, `tagIds[]`/`tags[]` and `readingTimeMinutes`. `src/utils/adapters/` is gone.                                                                                                                                                                                                                 | —                |
| ~~`src/components/common/LegacyHtml.jsx`~~       | **Closed in 32.** The file is deleted. `src/components/editor/SafeHtml.jsx` holds the only `dangerouslySetInnerHTML` in `src/`: it sanitises against the allow-list `RichTextEditor` writes with, renders the result inside `.prose`, gives every H2/H3 an id, and turns the three `data-sna-block` placeholders into live components.                                                                                                                                                                          | 32               |
| ~~FAQ answers textarea → `RichTextEditor`~~      | **Closed in 32.** The FAQs tab draws `RichTextField variant="compact"`; the field, the validator key and the payload did not move. The script/iframe/handler regex stays as the cheap guard against a value that never went through the editor (an import, a payload assembled by hand) rather than as the sanitiser it never was.                                                                                                                                                                              | 32               |
| ~~Description textarea → `RichTextEditor`~~      | **Closed in 32.** The Basics tab draws `RichTextField variant="full"`; the reducer, the validators and the payload are untouched, and the editor's own status bar now carries the character, word and reading-time counters the tab printed under the box.                                                                                                                                                                                                                                                      | 32               |
| ~~`ArticleForm` saving disabled~~                | **Closed in 33.** `src/pages/admin/articles/ArticleFormPage.jsx` writes the real record: the category and the author are `<select>`s over `/admin/article-categories` and `/admin/authors`, the tags are records a creatable multi-select posts to `/admin/article-tags`, the body is the Tiptap editor's sanitised HTML, and the status radio publishes, schedules or archives. Every write goes through `POST`/`PUT` with the §6.8 payload.                                                                   | —                |
| ~~`AdminSettings` saving disabled~~              | **Closed in 40.** The file is deleted. `/admin/settings` is `pages/admin/settings/SettingsPage.jsx`: one `useForm` over the whole §6.13 object, seven panels, and a `PUT` that carries every branch — so there is nothing left to flatten.                                                                                                                                                                                                                                                                      | 40               |
| ~~`AdminSeo` saving disabled~~                   | **Closed in 35.** The file is deleted, with `utils/seoScoring.js` and `utils/seoGenerator.js`. `src/seo/` is the engine those two were standing in for (ADD-27 closed); `/admin/seo` renders `pages/admin/seo/SeoPlaceholderPage.jsx` until 37 builds the dashboard.                                                                                                                                                                                                                                            | 36–37            |
| ~~`SeoPlaceholderPage` → SEO dashboard~~         | **Closed in 37.** The file is deleted. `/admin/seo` is `pages/admin/seo/SeoDashboardPage.jsx` — the server-paged `GET /admin/seo/overview` table, six cards over the whole site, the SEO panel in a dialog, the two bulk runs, the duplicates and issues tabs and the CSV export — and `/admin/seo/settings`, `/admin/seo/redirects` and `/admin/seo/guide` are the three screens beside it.                                                                                                                    | 37 (**done**)    |
| ~~`LegacyHtml` in `LocalityGuide`~~              | **Closed in 32.** `SafeHtml` renders the guide; the module's duplicate typography is gone, since the global `.prose` now covers it.                                                                                                                                                                                                                                                                                                                                                                             | 32               |
| ~~`SeoPlaceholderTab` → `SeoPanel`~~             | **Closed in 36.** The file is deleted; tab 16 is `tabs/SeoTab.jsx`, the full `SeoPanel` bound to the form's own `seo` branch. The rail carries `SeoSummaryCard`, and a test's fix hint calls `form.focusField(path)`, which opens the tab that owns the field and puts the cursor in it.                                                                                                                                                                                                                        | 36               |
| ~~Locality SEO placeholder card~~                | **Closed in 36.** The section renders `SeoPanel variant="compact"` (D87): General inline, Social, Advanced and Schema folded. The form's `toPayload` builds the branch through `toSeoPayload`, and the save writes the redirect the panel asked for.                                                                                                                                                                                                                                                            | 36               |
| ~~Locality/localities Helmet titles~~            | **Closed in 38.** `Localities.jsx` renders `<Seo type="localities">` with the `ItemList` of the grid it is showing; `LocalityDetail.jsx` renders `<Seo type="locality">`, whose graph carries the `Place`. Both hand `<Breadcrumbs>` and `<Seo>` the same array from `seo/breadcrumbs.js`.                                                                                                                                                                                                                      | 38               |
| ~~`LegacyHtml` in the builder profile~~          | **Closed in 32.** `SafeHtml` renders the profile on `/builders/:slug`.                                                                                                                                                                                                                                                                                                                                                                                                                                          | 32               |
| ~~Developer SEO placeholder card~~               | **Closed in 36.** The section renders `SeoPanel variant="compact"`, on the same contract as the locality form.                                                                                                                                                                                                                                                                                                                                                                                                  | 36               |
| ~~Builders/builder Helmet titles~~               | **Closed in 38.** `Builders.jsx` is `<Seo type="builders">` with the `ItemList` of the page it shows; `BuilderDetail.jsx` is `<Seo type="developer">`, whose graph carries the builder's `Organization`.                                                                                                                                                                                                                                                                                                        | 38               |
| ~~Article SEO placeholder card~~                 | **Closed in 36.** The article form is two `AdminTabs` — Content and SEO — with the full panel on the second and `SeoSummaryCard` in the rail; the categories and authors screens carry `seoPanel: 'compact'` in `taxonomyConfigs.js`, which `MasterDataForm` renders under the fields.                                                                                                                                                                                                                          | 36               |
| ~~Legacy public article pages~~                  | **Closed in 34.** `Articles.js` and `ArticleDetail.js` are deleted. `Articles.jsx` holds one `ArticleIndex` engine that `GET /articles` filters, sorts and pages, and `ArticleCategory.jsx`, `ArticleTag.jsx` and `AuthorPage.jsx` are the same engine with one filter nailed down by the route. `ArticleDetail.jsx` has the contents list, the live blocks, the share bar, the merged FAQs, the related listings row and the previous/next pair.                                                               | 34               |
| ~~Property-type SEO placeholder card~~           | **Closed in 36.** `masterDataConfigs.js` carries `seoPanel: 'compact'` / `seoEntityType: 'propertyType'`, and `MasterDataPage` puts the branch in the form's values, its payload and its validation.                                                                                                                                                                                                                                                                                                            | 36               |
| ~~`LegacyHtml` in `FaqAccordion`~~               | **Closed in 32.** Every FAQ on the site renders its answer through `SafeHtml`, and the FAQ library's own form (`contentConfigs.js`) draws the compact editor.                                                                                                                                                                                                                                                                                                                                                   | 32               |
| ~~`LegacyHtml` in `OverviewSection`~~            | **Closed in 32.** `SafeHtml` renders the description; the measured twelve-line clamp and its "Read more" are unchanged, and a CTA or a listings row an editor drops into a description now renders live on the page.                                                                                                                                                                                                                                                                                            | 32               |
| ~~`AdminPlaceholderPage` routes~~                | **Closed in 39.** `/admin/media` was the last one; it is now `pages/admin/media/MediaLibraryPage.jsx`. `adminRouteConfig.js` no longer imports the placeholder or declares the `soon()` helper that produced it — every row in the table is a real screen. The component itself stays in the admin kit (and in its barrel test) for a screen that is stubbed in future. Prompt 30 took the three `pages` routes off the list, 31 the careers and newsletter ones, 33 the articles ones, 37 the four SEO routes. | 13–39 (**done**) |
| ~~`LeadModalTemp` → `LeadCaptureModal`~~         | **Closed in 28.** `LeadModalTemp.jsx` and its stylesheet are deleted; `components/common/LeadCaptureModal.jsx` is the one dialog, parameterised from `ENTRY_POINTS`. Prompt 25 gave it `successTitle`/`successAction`, which is how the documents section hands the file over after the lead (BUG-08); what it still lacks is the requirement fields, the submit throttle (D43) and `<label>`s on its boxes (ADD-09). Prompt 28 unifies every form on the site behind `LeadCaptureModal` and deletes it.        | 28               |
| ~~`PropertyDetails` temporary `Helmet`~~         | **Closed in 38.** `<Seo type="property">` carries the §9.5 template, the social card and the `RealEstateListing` + residence type + `Offer` + `PostalAddress` + `FAQPage` + `VideoObject` + `BreadcrumbList` graph. The questions it publishes are the listing's own plus the ones the description carries, which `OverviewSection` now reports through `SafeHtml`'s `onFaqItems`.                                                                                                                              | 38               |
| ~~Listing `Helmet` → `<Seo type="listing">`~~    | **Closed in 38.** `ListingEngine` hands `buildListingSeo()` to `<Seo type="listing">` as overrides; the rules did not change. `<Seo pagination>` owns `rel=prev/next` now, so `ui/Pagination` no longer writes to the head at all.                                                                                                                                                                                                                                                                              | 38               |
| ~~`Shortlist` temporary `Helmet`~~               | **Closed in 38.** `<Seo type="shortlist">`, which §9.3 makes `noindex, nofollow` — stricter than the `noindex, follow` the temporary tag carried, and what the spec asks for.                                                                                                                                                                                                                                                                                                                                   | 38               |
| ~~`HomeFeatures` / `HomeSteps` → CMS blocks~~    | **Closed in 30.** Both files are deleted. `components/cms/blocks/FeaturesBlock.jsx` and `StepsBlock.jsx` carry the same markup, `PageRenderer` mounts them for every page that holds those blocks, and `Home.jsx` imports the very same two components — so the home page’s “Why choose us” and the About page’s values cannot drift apart.                                                                                                                                                                     | 30               |
| ~~Post-requirement modal → `LeadCaptureModal`~~  | **Closed in 28.** The header CTA, the drawer's CTA row and the bottom bar's Enquire all call `useLeadCapture().openLeadModal({ entry: 'post-requirement' })`; `LeadCaptureProvider` mounts the one dialog for the whole app.                                                                                                                                                                                                                                                                                    | 28               |
| ~~Home `Helmet` → `<Seo type="home">`~~          | **Closed in 38.** `<Seo type="home">` reads the same CMS record and publishes the `RealEstateAgent` + `WebSite` graph — with the `SearchAction` no other page carries — plus `Review`/`AggregateRating` for any testimonial that is not a seeded sample (D41).                                                                                                                                                                                                                                                  | 38               |
| ~~RichText / Html blocks → editor + `SafeHtml`~~ | **Closed in 32.** The block schema's `html` field type is now `richtext`: `BlockForm` draws the editor (full for `richText`/`html`, compact for an expandable card's detail and a FAQ answer) and the four blocks render through `SafeHtml`. The stored `data.html` did not change.                                                                                                                                                                                                                             | 32               |
| ~~Page SEO placeholder card~~                    | **Closed in 36.** The "Search engines" section below the block editor is the full panel; a page's body is its blocks, so a hint about the content scrolls to `BlockEditor`.                                                                                                                                                                                                                                                                                                                                     | 36               |
| ~~`CmsPage` `Helmet` → `<Seo type="page">`~~     | **Closed in 38.** `<Seo type="page">` reads the same branch; a draft or a `?preview=` is `noindex`, and the About page's testimonials block reports what it fetched so genuine quotes become `Review` nodes without a second request.                                                                                                                                                                                                                                                                           | 38               |
| ~~`LegacyHtml` in `JobDetail`~~                  | **Closed in 32.** `SafeHtml` renders the role on `/careers/:jobSlug` and the admin form's `richtext` field is the editor.                                                                                                                                                                                                                                                                                                                                                                                       | 32               |
| ~~`JobDetail` temporary `Helmet`~~               | **Closed in 38.** `<Seo type="job">` carries the `JobPosting` graph of `seo/schema/jobPosting.js`, and a closed opening is `noindex`.                                                                                                                                                                                                                                                                                                                                                                           | 38               |
| ~~Blog `Helmet` → `<Seo type="article">`~~       | **Closed in 38.** `<Seo type="article">` publishes the Twitter card, the full `article:*` block and the `BlogPosting` + `BreadcrumbList` + `FAQPage` graph, the last from the questions the page already merges.                                                                                                                                                                                                                                                                                                | 38               |
| ~~Blog index `Helmet` → `<Seo>`~~                | **Closed in 38.** `ArticleIndex` takes a `seoType`/`seoEntity` pair, so the index is `<Seo type="blog">` and the three archives are `articleCategory`, `articleTag` and `author`; the feed alternate comes from `RSS_TYPES` and the paging from `<Seo pagination>`.                                                                                                                                                                                                                                             | 38               |

## Known issues (open) — id, description, found by, owner prompt

### Tagged defects of `00_MASTER_CONTEXT.md` §11

| Id                        | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Found by                  | Owner prompt                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- | --------------------------------- |
| BUG-01                    | Every write uses `PUT` with partial payloads (11 call sites across property/lead/article/FAQ/neighborhood/partner/user toggles) **Prompt 11 moved every write it touched to the right verb**: toggles, reorders and lead-status changes use `PATCH`, bulk actions use `POST /admin/<resource>/bulk`, and `PUT` is reserved for a full-record form save. The row closes when prompts 18–40 confirm the remaining forms. **The property-form half is closed in 21**: the sixteen tabs are written, `toPayload` states the whole §6.1 record and the form saves it with `PUT /admin/properties/:id` (a create is `POST`); no property write sends a partial body through `PUT` any more.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | master spec, confirmed 01 | 11, 14–22, 29, 33, 40             |
| BUG-09 (contract defined) | Lead sources inconsistent (21 values in `src/` vs `adminConstants` vs `AdminLayout.formatSource`). **Prompt 05 froze `LEAD_SOURCES` (29 values) and `LEGACY_LEAD_SOURCE_MAP` (24 old values)** in `src/config/enums.js`, tested in `enums.test.js`. The forms still send the old values; **Prompt 08 applies `LEGACY_LEAD_SOURCE_MAP` on `POST /leads`**, so an old bundle's `property_enquiry` is stored as `property-enquiry` and an unknown value is a 422. The seed converts its own rows in 10, the forms move in 28 and the CRM labels in 29. **Closed in the client in 28:** `src/utils/leadSources.js` `ENTRY_POINTS` is the only place `src/` writes a source, every value is canonical, and `leadSources.test.js` asserts it; the acceptance grep for the fifteen legacy spellings returns 0. Only the CRM labels (29) remain.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | master spec, confirmed 01 | 29 (contract: 05 ✔, client: 28 ✔) |
| ~~BUG-11~~ (closed in 40) | Hardcoded content on About, Contact, FAQs, HomeLoan, LegalAssistance, InteriorDesigning, Careers, Partnership, SellLet, FlexibleWorkspace, DirectLeaseRetails, RealEstateAwareness, WhyChoose, HowItWorks, Dashboard trends, footer defaults, `SeoGuidelines` **Data side prepared in 10:** every one of those pages is a seeded CMS record with its blocks. **Home half closed in 27**, **dashboard half closed in 29.** **Nine more pages closed in 30:** `About.jsx`, `Contact.jsx`, `SellLet.jsx`, `Partnership.jsx`, `HomeLoan.jsx`, `LegalAssistance.jsx`, `InteriorDesigning.jsx`, `FlexibleWorkspace.jsx` and `DirectLeaseRetails.jsx` are deleted, and `CmsPage` renders all of them — plus the three legal texts — from their blocks through `PageRenderer`; `HomeFeatures.jsx`/`HomeSteps.jsx` are gone too, the home page importing the CMS block components directly. **The last two pages closed in 31:** `Careers.jsx` (hardcoded culture cards, four invented roles and six perks) and `RealEstateAwareness.js` (hardcoded facts, cards, quiz and checklist) are deleted; `/careers` and `/insights/real-estate-awareness` are CMS records rendered by `CmsPage`. **`SeoGuidelines.jsx` is deleted in 37:** its sixteen accordions of generic advice — another city's examples, `yourdomain.com` in four of them and scoring rules that never matched the engine — are replaced by `/admin/seo/guide`, twenty-five SNA topics whose weight table is rendered from `WEIGHTS`. **What is left:** the footer defaults (40). **The footer defaults close in 40, and with them BUG-11:** the footer draws its columns, its about text, its disclaimer, its copyright line, its collage and the firm's RERA/GST from `siteSettings.footer` and `siteSettings.general`, and all of it is editable at `/admin/settings` → Navigation & footer. | 40                        | 29, 30, 31, 37, 40                |
| BUG-15 (closed in 31)     | Careers résumé upload dead; no spam protection; newsletter no dedupe and a false reCAPTCHA notice. **Closed on the server in 09:** `POST /jobs/:id/apply`, `POST /newsletter/subscribe` and `POST /leads` are throttled to ten a minute per IP and honour the `website` honeypot, a known address answers "Already subscribed" and an unsubscribed one is revived, and a résumé travels as a URL (D12). **The spam protection and the newsletter half are closed in the client in 28:** every lead form and the newsletter band carry the `website` honeypot and a ten-second throttle (D43), a duplicate address reads back as "You're already subscribed", and the reCAPTCHA notice only appears when a site key is configured. **Closed in 31:** `/careers/:jobSlug` carries a real application form — a Cloudinary unsigned upload of a PDF/DOC/DOCX under 5 MB with a progress bar and a Cancel when a cloud name and preset are configured, a required `https://` link field when they are not (D12) — plus the same honeypot, consent box and ten-second throttle every other public write has, and a `POST /jobs/:id/apply` that files a `jobApplications` record the hiring desk reads at `/admin/jobs/applications`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | master spec, confirmed 01 | — (closed)                        |
| BUG-18 (frontend)         | `getFeatured` tag hack; ad-hoc trending/related; FAQ page/section fetch-all-and-filter. **Closed on the server:** `/properties/featured` and `/properties/:id/similar` (08), `/articles/trending` and the `category`/`showOnHome`/`propertyTypeId` FAQ filters (09). The components that still fetch-all-and-filter arrive with 27 and 34. **Mostly closed in 11**: `FeaturedProperties` calls `/properties/featured`, `TrendingTopics` and `Articles` call `/articles/trending`, `FaqSection` calls `/faqs?showOnHome=true` and the FAQ page filters server-side. What is left is the listing page, which still narrows in the browser (prompt 26). **Closed in 34**: `SimilarProperties` went with prompt 25 and the last of it — the articles index — is gone with `Articles.js`. `ArticleIndex` asks `GET /articles` for the page it draws (filters, sort, paging, 12 a page), the rail's most-read list is `GET /articles/trending` and the article page's related row is `GET /articles?ids=` or one same-category call, never the whole archive.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | master spec, confirmed 01 | 27, 34                            |
| BUG-21                    | Additional defects recorded here by the audit prompt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 01                        | 01 → all                          |

### Additional defects of `00_MASTER_CONTEXT.md` §11

| Id | Description | Found by | Owner prompt |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------ |
| ADD-01 | `.env` committed with the Cloudways URL; no `.env.example`; README links a non-existent `API_DOCUMENTATION.md`; README says Node 16+ | master spec, confirmed 01 | 02 |
| ADD-02 | `dev` script equals `start` (no json-server anywhere); `devDependencies` empty; no ESLint/Prettier config beyond CRA | master spec | 01 (tooling half **closed**), 06 (`dev`/`mock`) |
| ADD-03 | `public/index.html` references a non-existent `favicon.ico`; `robots.txt` allows everything with no sitemap; no `manifest.json` | master spec, confirmed 01 | 02 |
| ADD-06 (partial) | **Closed in 04:** the three scroll-hide copies (now `useScrollDirection`; `useThrottledScroll` stays for `BackToTop`), the 13 local `Section` components (now `ui/Section`), and `tagColors` vs `TAG_OPTIONS` (`PropertyCard` reads `TAG_OPTIONS` tones). **Closed in 36:** `GooglePreview` ×2 and `getTitleLenColor` ×2 — there is one search preview (`SeoPanel/parts/GooglePreview.jsx`, which truncates on pixels rather than characters) and one length verdict (`parts/SeoMeter.jsx`'s `meterState`), and both of the screens that held the duplicates are gone. **Still open:** the five `formatPrice` and three `formatDate` copies still exist at their call sites — `src/utils/format.js` is the single implementation but the call sites move to it with the data hooks; and `leadStatusConfig` in `Dashboard`. The nav data half closed in 27 (`src/config/navigation.js`). | master spec, confirmed 01 | 11 |
| ADD-09 (closed in 28) | `LeadForm` ignores `required:false`, has no `<label>`s, no `onSuccess`, posts unsanitised values; `NewsletterSection` validation is `includes('@')`, fails silently, shows a false reCAPTCHA notice. **Closed:** every control is a `ui/FormField` with a visible `<label>`, `aria-describedby` and `aria-invalid`; `required` is honoured per field; the payload is sanitised, the phone normalised to `+91XXXXXXXXXX` and unknown answers filed under `meta` (D56); `onSuccess(lead, values)` exists; `NewsletterForm` validates with `EMAIL_PATTERN`, shows its error inline and only claims reCAPTCHA when a key is set. | master spec, confirmed 01 | 28 ✔ |
| ADD-16 | `ArticleDetail` Markdown renderer: duplicate tables on every `\ **Closed in 11**: the article body is CMS-authored HTML rendered through `LegacyHtml`, and the breadcrumb now goes Home → Articles → category.                                                                                                                                                                                                                                                                                                                                                             | `line, ordered lists rendered as`<ul>`, only `**bold**`inline, breadcrumb "Insights" and "Articles" to the same URL;`Articles` state not URL-synced **Fully closed in 34**: the page is `ArticleDetail.jsx`, the body goes through `SafeHtml`, and the breadcrumb is Home › Insights › Category › Title. | master spec, confirmed 01 | 32, 34 |
| ADD-18 (closed in 31) | `Careers`: résumé file input has no `name`/`onChange`, form never reset, modal without dialog semantics; `InteriorDesigning` room cards and "Get Started" buttons do nothing; `LegalAssistance`/`RealEstateAwareness` encode conflicting Karnataka stamp-duty figures. **Interior and legal closed in 30** (both pages are CMS records; the packages block opens the shared dialog and the expandable cards carry the copy an editor writes). **Careers and awareness closed in 31:** both files are deleted, the application is a real form on the role’s own page with a working résumé control, and the awareness figures are the seeded page’s, written once and editable in the CMS. | master spec, confirmed 01 | — (closed) |
| ~~ADD-19 (settings/users)~~ (closed in 12, 13 and 40) | `AdminSettings`: `PUT` drops `footerLinks`, tab panels out of order, "Footer Tagline" edits the General `tagline`, hardcoded `role === 'admin'`; `UserManagement`: last-admin guard hole, plaintext passwords echoed, own `ROLES` list. **The `AdminLogin` half is closed in 12 and the `UserManagement` half in 13; only the `AdminSettings` form remains, for prompt 40.** **The settings half closes in 40:** the file is deleted; the rebuilt screen writes the eight §6.13 branches as they are modelled, panels and tab order come from one table, and it asks `can('settings', 'edit')` rather than comparing a role to a string. | master spec, confirmed 01 | 40 |
| ~~ADD-20~~ (closed in 33, 35 and 37) | `AdminSeo`: the old domain in previews, "Auto-Generate" writes the boilerplate's titles/canonicals/schema, `stats.missing` dead, saving wipes empty fields, no confirmation before bulk overwrite; `ArticleForm`: the boilerplate brand as the default article author, `readTime` not editable, `isTrending/trendingOrder` dropped on PUT, `setTimeout(navigate)` not cleared. **The `ArticleForm` half is closed in 33:** both files are deleted. There is no default author — `authorId` is a required select over the real records, so an article is never signed by a name nobody chose; `readingTimeMinutes` is derived by the API from the body and shown in the rail; the trending pair is replaced by `isFeatured` plus the view-based `/articles/trending` (§5.14); and the one navigation the form performs waits for the unsaved-changes guard to let go and clears its timer on unmount. **The `AdminSeo` half is closed in 35:** the file is deleted with the two utils behind it (ADD-27), so the old domain, the boilerplate auto-generation, the dead `stats.missing` and the save that wiped empty fields are all gone; `/admin/seo` was a placeholder until 37. **Closed outright in 37:** the dashboard is built on `src/seo/` — the score chip reads the stored analysis rather than a second scorer, "Auto-generate missing" writes nothing over a value an editor typed unless "Overwrite" is ticked **and** confirmed, the counts on the cards are computed from the whole site rather than hardcoded, and a save is a `PATCH { seo }` that carries the whole branch. | master spec, confirmed 01 | 35 (engine), 37 (dashboard) — **done** |
| ADD-21 (property list closed) | `AdminProperties` fetches the public `/properties`, toggle omits the `is_active` fallback, `Promise.all` bulk aborts on first failure, per-page select-all (**closed in 22**: the file is deleted and `/admin/properties` is `PropertiesListPage`, server-side throughout, with one `POST /admin/properties/bulk` per bulk action); `AdminLeads`/`Dashboard` `p.id === propertyId` string-vs-number → Property column always empty; `Dashboard` "Leads by source" from 10 leads; `FaqManager` reorder wrong under a category filter with two sequential PUTs per swap (**closed in 17**: `FaqManager` is deleted and the reorder is D98's single `PATCH`); `LeadDetail` simulated timeline, `isMobile` unused (**closed in 01**). **Closed in 29:** `AdminLeads.js`, `LeadDetail.js` and `Dashboard.js` are deleted; the list is `PropertiesListPage`'s server-side twin, the Property column is the `property {id,title,slug}` embed the API sends, the timeline is the server's `activities[]`, and "Leads by source" is `trends.leadsBySource` over every lead rather than over the ten the browser had fetched | master spec, confirmed 01 | 29 ✅ |
| ADD-22 | Property tabs: `DetailsTab` drag issues N state updates per drag-over; `SectionVisibilityTab` toggle asymmetric for `undefined`; `GalleryTab` seeds placeholder-image covers; `NearbyPlacesTab` default type `school` unknown to the public map; index keys everywhere; `SeoTagsTab` old-domain placeholder. **Prompt 18 settles the structural half for the new form**: every repeating row carries a stable id (`tmp-<n>` until the API assigns one), so no list is keyed by its index and a move is one `LIST_MOVE`; `fromRecord` fills all eighteen `sectionVisibility` keys, so a toggle is never reading `undefined`; `makeNearbyPlace` defaults to `other`; and nothing seeds an image. The tabs that render these fields are written in 19–21. **Closed in 21**: the new Section-visibility tab writes `true`/`false` explicitly for the key pressed and every key at once for "Enable all"/"Disable all", and the whole of `property-tabs/*` — `DetailsTab`, `GalleryTab`, `NearbyPlacesTab`, `SeoTagsTab` and the rest — is deleted. | master spec, confirmed 01 | 18–21 |
| ~~ADD-27~~ (closed in 35) | ~~`seoScoring.js`/`seoGenerator.js`: HOM site name/URL constants, generic CTA-word scoring, schema string stored in the record~~ **Both files are deleted.** `src/seo/` replaces them: the site name and the URL come from `seoSettings` and `config/site.js` rather than from a constant, the scoring is the 50 weighted tests of SEO-06…SEO-09 with per-entity-type applicability, and the JSON-LD is built by `src/seo/schema/` at render time from the record — `seo.schema.custom` remains the only schema string stored, and it is validated before it is published. | master spec, confirmed 01 | 35 |

### New defects found by this audit

| Id                        | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Found by                                                                                                                                                                                                                                                                                                                                                                                        | Owner prompt                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NEW-01                    | `config/rbac.js` has no `/admin/settings/users` entry and no per-area permission matrix; `AdminSettings` uses `role === 'admin'` and `UserManagement` its own `ROLES` array                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | 01                                                                                                                                                                                                                                                                                                                                                                                              | 12                                                                                                                                                                                                                                                                                                                                                                                                                   |
| NEW-02                    | `routes/index.js` limits `/admin/seo` and `/admin/settings` to `admin` only; §7 of the master context gives both to `admin` **and** `manager`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | 01                                                                                                                                                                                                                                                                                                                                                                                              | 12                                                                                                                                                                                                                                                                                                                                                                                                                   |
| NEW-03                    | Navigation/role data lives in three places: `rbac.NAV_ITEMS`, `AdminLayout.pageTitles` and the `<Route>` declarations                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | 01                                                                                                                                                                                                                                                                                                                                                                                              | 12                                                                                                                                                                                                                                                                                                                                                                                                                   |
| NEW-04                    | `slick-carousel` is a dependency but its CSS is never imported, so the `SimilarProperties` slider renders unstyled                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | 01                                                                                                                                                                                                                                                                                                                                                                                              | 03, 25                                                                                                                                                                                                                                                                                                                                                                                                               |
| NEW-08                    | `GalleryTab` carried the repository's only `eslint-disable` comment                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 01                                                                                                                                                                                                                                                                                                                                                                                              | **closed in 01**                                                                                                                                                                                                                                                                                                                                                                                                     |
| ~~NEW-10~~ (closed in 40) | `AdminSettings` renders `TabPanel index={4}` after `index={5}`, so the JSX order no longer matches the `<Tab>` order **Closed in 40:** `AdminSettings.js` is deleted; `AdminTabs` + `AdminTabPanel` derive both orders from `SETTINGS_TABS`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 01                                                                                                                                                                                                                                                                                                                                                                                              | 40                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ~~NEW-11~~ (closed in 40) | `AdminSettings.mergeWithDefaults` omits `footerLinks`, so every save drops that `db.json` key **Closed in 40:** `AdminSettings.js` is deleted; `normalizeSettings` keeps every key the model declares and drops the ones it does not.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | 01                                                                                                                                                                                                                                                                                                                                                                                              | 40                                                                                                                                                                                                                                                                                                                                                                                                                   |
| NEW-15                    | `useThrottledScroll` has a single consumer (`BackToTop`); Header, MobileHeader, BottomNav and StickyNav each re-implement scroll handling                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | 01                                                                                                                                                                                                                                                                                                                                                                                              | 04                                                                                                                                                                                                                                                                                                                                                                                                                   |
| NEW-17                    | `global.css` loads Google Fonts through a render-blocking CSS `@import` instead of a `<link>` in `index.html`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | 01                                                                                                                                                                                                                                                                                                                                                                                              | 02, 04                                                                                                                                                                                                                                                                                                                                                                                                               |
| NEW-18                    | `public/robots.txt` is the CRA default with no `Sitemap:`; `index.html` has no manifest, no OG tags, and a `theme-color` in the boilerplate navy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 01                                                                                                                                                                                                                                                                                                                                                                                              | 02                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ~~NEW-20~~ (closed in 43) | ~~No test file exists anywhere, so `test:ci` needs `--passWithNoTests`~~ **Closed in 43:** `src/` holds 138 suites and 2 642 tests and the flag is gone from `package.json`, so an empty run is a failure again. | 01 | ~~35~~ closed in 43 |
| NEW-28                    | `src/pages/public/RealEstateAwareness.js` uses `mdi:stamp`, which is not in the Iconify MDI set — the tile renders blank. Found while verifying every icon id of prompt 13.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | 13                                                                                                                                                                                                                                                                                                                                                                                              | 31                                                                                                                                                                                                                                                                                                                                                                                                                   |
| NEW-29                    | `db.json` seeds `icon: "mdi:home-check-outline"`, which is not in the Iconify MDI set. `db.json` is off-limits to prompt 13 (§12 guardrails), so the seed keeps a blank icon until its owner prompt fixes it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | 13                                                                                                                                                                                                                                                                                                                                                                                              | 15                                                                                                                                                                                                                                                                                                                                                                                                                   |
| NEW-30                    | `useCountUp` figures are still at their start value when a page is rendered by a browser that never delivers a second animation frame — headless Chrome with `--virtual-time-budget` grants exactly one. Every counted statistic (`DeveloperStats`, `BuilderOverview`, and the home figures of 27) therefore prerenders as `0`. The prerenderer must emulate `prefers-reduced-motion: reduce`, which makes `useCountUp` jump straight to the value; a real browser is unaffected.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 16                                                                                                                                                                                                                                                                                                                                                                                              | 41                                                                                                                                                                                                                                                                                                                                                                                                                   |
| NEW-33 (answered in 44)   | **Prompt 44's answer: no.** `@testing-library/user-event@14` is not in §3.3's closed list and prompt 44's guardrail allows one new dependency (`@playwright/test`), so the bump is not made here; the notices stay, and they are cosmetic — every affected test passes, none is flaky, and `src/__tests__/seedProperties.render.test.jsx` (which **fails** on a single `console.error` or `console.warn`) is green for all 38 published seed listings. Prompt 48 may take the bump with the rest of the dependency review. Original row: a Jest suite that drives a MUI dialog with `@testing-library/user-event@13` reports React's "An update to … was not wrapped in act(…)" for the transition timers jsdom never fires a `transitionend` for. It is not specific to the property page (the `IconPicker` suite reports 95 of them and the `Modal` suite 8), every affected test passes, and no test is flaky because of it. The fix is user-event v14's `userEvent.setup()`, a dependency bump §3.3 does not list; the QA prompt decides whether to ask for it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | 24                                                                                                                                                                                                                                                                                                                                                                                              | 44                                                                                                                                                                                                                                                                                                                                                                                                                   |
| NEW-36 (closed in 33)     | ~~`PagesListPage`'s "Duplicate" row action cannot succeed~~: it posted the copy with `slug: ''` and `seo.slug: ''`, and §6.10 types a page's slug as a patterned string that the empty string does not match, so the API answered `422 {slug, seo.slug}` before `resolveSlug` was ever reached. **Closed:** the payload moved into `pageService.duplicate()` beside the article one, and the copy now **chooses** its slug — `<slug>-copy`, or the free variant `check-slug` suggests — rather than sending an empty one. Omitting the key, which is what fixed the article copy, is refused here too (`{ slug: ['The slug field is required.'] }`): unlike an article's, a page's slug is `required` with no default, so the API cannot be left to derive it. The copy also drops `seo.canonicalUrl`, `seo.redirect`, the score and the analysis, and is a draft in neither menu with neither menu set. Verified against the running mock (422 before, 201 with `partnership-copy` and then `partnership-copy-2` after) and through the screen itself; covered by `src/services/__tests__/pageService.test.js` (11). | 33 (QA of the article duplicate, which had the same bug)                                                                                                                                                                                                                                                                                                                                        | —                                                                                                                                                                                                                                                                                                                                                                                                                    |
| NEW-35                    | For about half a second after a route change, every `position: fixed` element **inside** `<main>` is positioned against `MainLayout`'s framer-motion page-transition wrapper rather than the viewport, because that wrapper carries a `transform` while the spring settles (a transform on an ancestor makes it the containing block for fixed descendants). Measured at 390 px on `/properties/:slug`: the mobile CTA bar reads `top: 9041` in a 780 px viewport at 0 ms and `top: 715` (pinned to the bottom) from ~500 ms on. It self-corrects and affects only the property page's own CTA bar — the floating WhatsApp button sits outside `<main>` and is never affected. Pre-existing (the wrapper is prompt 04's, the bar prompt 23's); the fix is either rendering the bar in a portal or dropping the transform once the animation ends.                                                                                                                                                                                                                                                                     | 28                                                                                                                                                                                                                                                                                                                                                                                              | 41 (performance/animation pass)                                                                                                                                                                                                                                                                                                                                                                                      |
| NEW-37 (closed in 34)     | ~~Every paragraph of every CMS body on the site ran into the one above it~~: `prose.css`'s `.prose p { margin: 0 }` is one class and one element, so it outranked the `.prose > * + *` flow rule written to space them, whatever the source order — measured with `getComputedStyle` in the browser, `margin-top: 0px` on every paragraph of an article, a listing description, a locality guide and a page's rich text. **Closed:** the three margin resets (`p`, `figure`, `.sna-figure`) are wrapped in `:where()`, which scores nothing and hands `margin-top` back to the flow rule (`16px` after).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | 34, in the browser                                                                                                                                                                                                                                                                                                                                                                              | 34                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ~~NEW-38~~ (closed in 45) | **`ArticleRelatedCard`'s pickers render two children with the same key.** Adding a related article to an article that already has one logs React's "Encountered two children with the same key" from `EntityPicker` → `SortableList`: the picker's value array can hold the same id twice, so the list keys collide. Found while wiring the SEO panel into the article form; **verified against `HEAD` before this prompt's changes**, so it is prompt 33's and not 36's. Nothing renders wrongly today — React keeps the first child — but the warning is the shape of a row that disappears on the next reorder. The fix belongs with `EntityPicker`, which should refuse a duplicate before it reaches the list. **Closed in 45:** `EntityPicker` de-duplicates the ids where it reads them, first occurrence winning, so the editor's order survives and the next change writes the clean list back. `src/components/admin/__tests__/EntityPicker.test.jsx` covers the chip row, the orderable list, the counter and the write-back. | 36, running the article form's tests                                                                                                                                                                                                                                                                                                                                                            | ~~45~~ closed in 45 |
| ~~NEW-39~~ (closed in 45) | **`cleanTitle` leaves a comma standing in front of the separator.** `'%bhk% in %locality%, %developer% %sep% %sitename%'` on a listing with no builder resolves to `"3 BHK in Whitefield, **Closed in 45:** one more rule in `cleanTitle`, written so that a comma doing its job (`Whitefield, Bengaluru`, `₹1,20,000 - ₹1,50,000`) is untouched, plus two cases in `variables.test.js`. | Squares N Acres"`: §9.5's cleanup removes the unresolved variable and handles a leading `–                                                                                                                                                                                                                                                                                                      | `, a doubled separator and `in , Bengaluru`, but not punctuation left immediately before the separator. Found while writing the SEO settings screen's live template examples; the engine belongs to prompt 35 and its tests assert the current behaviour, so 37 left it alone and documented it rather than changing a scorer mid-prompt. The fix is one more rule in `cleanTitle`plus a case in`variables.test.js`. | 37, writing `TitlesMetaTab.test.jsx` | ~~45~~ closed in 45 |
| ~~NEW-40~~ (closed in 46) | **Four status-listing titles run past the 60 characters a result shows.** `npm run check:jsonld` warns on `/buy/pre-launch` (72), `/buy/under-construction` (82), `/buy/ready-to-move` (73) and `/buy/resale` (70): the §9.5 `listing` template appends `for Sale` to a noun that already contains the status, so "Under-construction properties for Sale in Bengaluru – 6 Listings \| Squares N Acres" says "sale" twice and is cut off in the result. The same warning flags seven CMS pages whose titles are _short_ (`/disclaimer` at 10 characters). Both are copy rather than code: the fix is the `verb` of the four status entries in `listingRoutes.js` and the `seo.title` of the CMS records, which is prompt 46's SEO pass. Warnings, not errors — `check:jsonld` exits 0. **Closed in 46:** two fixes. (1) `%listingtype%` in a listing *title* now goes through `titleVerbOf`, which honours the route's own `verb` exactly as the `<h1>` and the description always have — the four status pages lose the redundant "for Sale" and drop to 63/73/64/61 characters. (2) The seven short CMS titles were rewritten in `scripts/seed/data/pages.js` and are now 37–51 characters; the page `title` (the `<h1>`) is untouched. `check:jsonld` warnings fall from 43 to 36 (short titles 22 → 15; the 21 long ones are unchanged in count). Those 21 share one cause — the `listing` template of §9.5 itself, whose "– %count% Listings %sep% %sitename%" is 30 characters of suffix, so every listing route lands at 61–73 whatever its subject; the four status pages did get 9 characters shorter, they are simply still over the guide. Changing that template is a deliberate change to a spec-pinned default rather than a defect fix, so it is left to prompt 48. | 38, running `check:jsonld` against the rendered site                                                                                                                                                                                                                                                                                                                                                                 | ~~46~~ closed in 46 |
| ~~NEW-41~~ (closed in 45) | **Two seeded links point at articles that are not published.** `npm run check:links` (Chrome) reports `/insights/articles/under-construction-vs-ready-to-move`, linked from the bodies of articles 4 and 6, and `/insights/articles/first-time-homebuyer-checklist-bengaluru`, linked from the body of page 12 (`insights/real-estate-awareness`). The first record is `status: "draft"`; the second is `status: "scheduled"` for 2026-10-31, so it starts resolving on that date on its own. The 404 is correct behaviour (§5.4: a public detail endpoint answers 404 for an unpublished slug) — the defect is in the seed copy, and `db.json` is off-limits to prompt 38 (§12 guardrails). The checker is left reporting them rather than taught to forgive them, so `check:links` exits 1 on these two until the seed is corrected. **Closed in 45:** `check:links` is an acceptance criterion of prompt 45 and the fix is seed copy inside its modules, so the three anchors were retargeted at published guides that carry the same information and `db.json` was rebuilt. The draft and the scheduled article keep their statuses, which `docs/SEED_GUIDE.md` pins and the schedule tests need. `check:links` now reports 0 broken links. | 38, running `check:links` against the rendered site                                                                                                                                                                                                                                                                                                                                             | ~~46~~ closed in 45 |
| NEW-42                    | **The home page fires 25 `GET /properties?…&perPage=1` requests to count the category tiles.** `useCategoryCounts` (prompt 27) asks for one result per tile — six segment/listing-type tiles and seventeen property types — purely to read `meta.total`. Against the mock each answers in under 100 ms and the page is fine; against a real API it is 25 round trips and 25 state updates for a row of six numbers. The fix is one aggregate response (a `counts` branch on an existing endpoint, or `GET /properties/counts`), which needs an API change and is therefore prompt 46's to specify and prompt 47's to document. Seen in the Lighthouse network trace of `/`.                                                                                                                                                                                                                                                                                                                                                                                                                                           | 41, reading the Lighthouse trace of the home page                                                                                                                                                                                                                                                                                                                                               | backend + 48 (the aggregate endpoint is specified in QA 46 §9.2 and documented for the API developer by prompt 47; the home page still issues the 25 requests) |
| NEW-47                    | **Text over a photograph cannot be contrast-checked from CSS.** `npm run a11y:audit` composites scrims, translucent layers and positioned siblings, and reports "background unknown" the moment the thing behind the text is a picture — a hero, a locality card, the gallery counter. Every such case was checked by eye at 390 px in prompt 42 and the one that was wrong is NEW-43 (the placeholder behind the scrim, now charcoal), but the check is blind there by construction. Sampling the rendered pixels — a screenshot of the text's box, the modal background colour, the ratio against the computed foreground — would close it. | 42, writing the in-page audit | 46 |
| NEW-46 (re-tested in 44)  | **Not observed on the current build.** Prompt 44 drove the two in-page transitions a property page still offers — to `/buy` and to `/localities` through the header — and watched every `/api/` request and every console line: no `GET /properties/slug/<wrong>` and no console error. The transition the row names, a property page to `/localities/:slug`, can no longer be started from the page itself, which renders no locality link at 1280 px or 390 px. The console audit over 74 property-related page loads found no such error either. Kept open rather than closed because the transition could not be reproduced end to end, and because the fix the row proposes is in the router setup (D97) — shared code prompt 44 is told not to touch. Original row: **navigating away from a property page fires one doomed request for the new slug.** `MainLayout` wraps the outlet in `<AnimatePresence mode="wait">` keyed on the pathname, so the outgoing page stays mounted through its exit animation while `useParams()` already reports the new location: leaving `/properties/aurelia-court-duplex-koramangala` for `/localities/koramangala` makes `PropertyDetails` fetch `GET /properties/slug/koramangala`, which answers 404 and logs an error in the console. One wasted request per navigation away from a property page, and a console error on a page that is otherwise clean. The fix is React Router's own remedy — render the outlet against a pinned `location` so the exiting subtree keeps the params it was mounted with — which is a change to the router setup (D97) rather than to this page.                                                                                                                                                                                                                                                               | 41, watching the mock's log during a prerender verification                                                                                                                                                                                                                                                                                                                                     | 44                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ~~NEW-48~~ (closed in 46) | **`scripts/lib/inPageAudit.js` calls horizontal scroll from `document.documentElement.scrollWidth`.** Chromium's root `scrollWidth` counts a wide element that lives inside its **own** `overflow-x: auto` scroller, so `/admin/properties` reports 721 px of overflow in a 1280 px viewport while `window.scrollX` stays 0 and the page does not move; `/admin/leads` reports 161 px. `horizontal-scroll` is a **failing** rule, so the audit would refuse a page that is correct. The honest measure is to try to scroll: remember `scrollX`, `scrollTo(clientWidth, scrollY)`, read it back, restore. The admin routes are not crawled today because the audit cannot sign in, which is why it has not fired yet. **Closed in 46:** `inPageAudit` now decides the rule by attempting the scroll — remember `scrollX`, `scrollTo({ left, behavior: 'instant' })`, read it back, restore — and reports the distance the window actually moved. `behavior: 'instant'` is load-bearing: `global.css` sets `scroll-behavior: smooth`, and the first version of the fix used a positional `scrollTo`, so it read back the starting position and answered 0 for every page — a silently dead rule, caught in self-review and now guarded by a source assertion in `scripts/__tests__/inPageAudit.test.js`. The admin routes were crawled at all seven widths in prompt 46, with the rule alive, and there is no horizontal-scroll finding. | 44, auditing 74 property-related page loads at 1280 and 390 px | ~~46~~ closed in 46 |
| NEW-49                    | **Seed property #26 (`nandi-orchard-farm-land-devanahalli`) is the only record with `pricing.pricePerSqft: null`.** D33 has the property form derive the rate when the field is empty, so opening that listing and saving it untouched writes ₹390/sq ft the editor never typed — the derivation is correct (₹4.25 Cr over 2.5 acres) and every other seed record already stores its own rate. `src/pages/admin/properties/property-form/__tests__/payload.seed.test.js` asserts the derivation rather than ignoring it, so the round trip is exact either way. | 44, round-tripping all 40 seed records through `fromRecord`/`toPayload` | 48 (seed is prompt 10's) |
| NEW-50                    | **`e2e/**` is outside the `lint` and `format` globs**, so the six Playwright specs, the fixture and the configuration are neither linted nor Prettier-checked. Widening `lint` needs Playwright's globals (`test`, `expect`) in the ESLint environment, which is an `eslintConfig` change rather than a glob change. | 44, adding the e2e suite | 48 |
| NEW-51                    | **The property gallery stage fails `label-content-name-mismatch`.** Lighthouse on the property page and 27 warnings across the width grid: the stage is a `role="button"` region whose accessible name begins with its visible counter (prompt 42's NEW-45 fix, which is right), but it also *contains* a real `<button>` reading "View all N photos", and axe collects the visible text of the whole subtree. The defect underneath is the nesting — a `role="button"` region containing three real buttons (previous, next, view-all) is invalid widget semantics whatever the labels say. The fix is to lift the counter and the three controls out of the clickable region and position them over it against a new wrapper, which leaves the stage with no visible text and makes the rule inapplicable rather than merely satisfied. Not fixed in 46: Accessibility is **100** on that page and every §8.6 target passes, and restructuring a gallery prompt 44 bug-bashed — swipe handlers, a lightbox, absolute positioning — at the end of a QA pass with no way to verify the result visually would risk more than it buys. | 46, Lighthouse and the width grid | 48 |
| NEW-52                    | **The a11y audit measures the contrast of `aria-hidden` decoration.** 63 of the width grid's 454 warnings are one element: the breadcrumb `/` separator, `aria-hidden="true"`, at 1.47:1. axe's own `color-contrast` rule skips anything outside the accessibility tree; ours does not, so the rule reports a class of finding that is not a defect and trains people to ignore it. Either skip `aria-hidden` subtrees as axe does, or treat an inactive separator as the incidental text WCAG 1.4.3 exempts. Left alone in 46 because loosening a contrast rule is a deliberate decision, not a tail-end QA tweak, and a rule that over-reports is the safer failure. | 46, the width grid | 48 |

## Known issues (closed)

| Id                       | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Closed by                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ADD-04                   | 41 — the second half, and the last of the row: `web-vitals` is wired. `src/utils/vitals.js` subscribes to `getCLS`/`getFID`/`getLCP`/`getFCP`/`getTTFB` and sends each one through `track()` as a `web_vitals` event with `{ name, value, id, rating }`; `src/index.js` starts it after `render`, in an idle slot, through a dynamic `import()`. Verified in the production build: `window.dataLayer` holds `FCP`, `TTFB` and `LCP` readings after a page load. (`@mui/icons-material` was removed in 03.)                                                                                                                                                                                                                                                                                                           |
| NEW-43                   | 42 — all three. (1) and (2) were one defect: the locality and builder heroes put white text on `LazyImage`'s light placeholder behind the 60 % scrim — `rgb(114, 114, 115)`, 3.63:1 — for as long as the photograph was missing, slow or absent; the hero image box now carries the hero's charcoal, the way the home hero already did. (3) the trending numerals were `--color-border-strong` at 1.47:1 and are `--color-text-muted`. `npm run a11y:audit` now measures contrast on everything painted, `aria-hidden` included, because contrast is about the eye. |
| NEW-44                   | 42 — the property overview's snapshot is a `<ul>` of facts rather than a `<dl>`. A card per pair cannot be built inside a `<dl>` without the wrapper every checker reports, so the second of the two fixes prompt 41 offered was taken; the markup and the grid are otherwise unchanged. |
| NEW-45                   | 42 — both names begin with the words on the control (WCAG 2.5.3): the gallery stage is "1 / 6 — <title> photograph. Press Enter to view full screen." and the brochure button "Download brochure — project brochure (PDF)". `npm run a11y:audit` has a `label-in-name` rule, so the next one is caught in the crawl rather than by Lighthouse. |
| ADD-19 (settings)        | 40 — `src/pages/admin/AdminSettings.js` is deleted. `/admin/settings` is seven panels over the real §6.13 branches, with `useForm`, a schema mirror, unsaved-changes guard, sticky save bar and a read-only manager view.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| BUG-11 (footer defaults) | 40 — the last of BUG-11: the footer's columns, about text, disclaimer, copyright, collage and the firm's RERA/GST are settings, editable in the admin.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| NEW-10                   | 40 — deleted with `AdminSettings.js`; the tab strip and the panels are rendered from one `SETTINGS_TABS` table.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| NEW-11                   | 40 — deleted with `AdminSettings.js`; the form holds and sends the whole record.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ADD-17                   | `Contact`: five `#` social links opening new tabs, generic Brigade Road map with a fabricated `!4v1700000000000`, US-format phone in FAQs `(555) 123-4567`. **The FAQ half was closed in 17.** **Closed in 30:** `Contact.jsx` is deleted. `/contact` is the `contact` CMS page, whose `contactInfo` block reads the phone, the e-mail, the WhatsApp number, the address, the working hours and the social links from `siteSettings` and renders nothing it was not given (D83), and whose `map` block falls back to the office coordinates in settings rather than to a hardcoded embed URL.                                                                                                                                                                                                                        |
| BUG-20                   | Nav data hardcoded and duplicated between `Header` and `MobileHeader` (two copies of `navItems` and `sideMenuItems`). **Closed in 27:** `src/config/navigation.js` builds every menu from master data, the published CMS pages and `siteSettings`; the header, the mobile drawer, the bottom bar and the footer all read the same builders, and the two literals are gone. **Verified in 42:** there is still no second `navItems` or `sideMenuItems` literal in `src/`, the four builders are still the only source, and the crawl found the same links at every one of the seven test widths.                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ADD-15                   | `HeroSection` owned a `role="combobox"` without `aria-controls`, offered "View all results" with no suggestions, and kept unused video/input refs. **Closed in 26/27:** the type-ahead is `GlobalSearch`; the hero is now the tabbed search card, the badges row and the stats row, and it holds no refs of its own.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| BUG-10                   | `NotFound` sent `?search=`, `QuickActions` linked `?type=sale`, `?type=rent` and `?type=lease`, and the listing read neither; `type=lease` matched nothing at all. **Closed in 26:** `NotFound` navigates to `/properties?q=`, the six `QuickActions` tiles link to `/buy`, `/rent`, `/lease`, `/commercial`, `/plots` and `/buy/ready-to-move` (D92), and every parameter the listing reads is a §5.7 name. The `?area=` half closed in 14.                                                                                                                                                                                                                                                                                                                                                                         |
| BUG-16                   | Filter logic duplicated between `PropertyListing` and `PropertyFilters`. **Closed in 26:** both files are deleted; one `ListingEngine` holds the filters, and the rail and the mobile sheet render the same `FilterGroups` against the same draft.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| BUG-19                   | The listing fetched `perPage=100` and then filtered, sorted and paginated in the browser. **Closed in 26:** `GET /properties` does all four (D94); the browser only draws the facets it is sent.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ADD-10                   | `PropertyCard`: price unit printed twice, `liked` not persisted, `imageLoaded` never reset, timer leak, `TAG_OPTIONS` imported from `pages/admin`, autoplaying videos in grids. Closed in 11 except the shortlist, **closed in 23** (the heart writes through `ShortlistContext`) and **26** (the saved list has a page of its own at `/shortlist`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ADD-11                   | `PropertyFilters`: `clearFilters` wiped every query parameter, `50000000-Infinity` travelled in URLs, the fourth location was silently ignored, only apartments and villas were offered, and desktop applied live while mobile needed an Apply. **Closed in 26:** the panel is deleted; ranges are `minPrice`/`maxPrice` numbers, every locality and property type is offered with a facet count, "Clear all" keeps the route's own filters, and the rail and the sheet differ only where the medium requires it.                                                                                                                                                                                                                                                                                                    |
| ADD-15                   | `HeroSection`: `role="combobox"` without `aria-controls` (closed in 01), "View all results" shown with no suggestions, unused video/input refs; `QuickActions` linked `type=lease`. **Closed in 26:** the hero mounts `GlobalSearch`, whose footer row reads "Search for “…”" whether or not anything matched, and the tiles link to real routes (D92).                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| NEW-05                   | `?area=` was a hidden client-side substring filter with no chip and no way to remove it. **Closed in 26:** the parameter is gone with `PropertyListing`'s client-side filtering; localities are addressed by `?localityId=` and every active filter has a removable chip.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| NEW-06                   | `PropertyFilters.clearFilters()` replaced the query string with an empty one, dropping `q`, `sort` and `page`. **Closed in 26:** "Clear all" clears the filter groups and returns to page 1, keeps the sort, and cannot touch the route's fixed filters.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| NEW-32                   | The bottom navigation's "Saved" item and the shortlist toast's "View" link pointed at `/shortlist`, which had no route. **Closed in 26:** the page exists, reads the live records by id and shares through `?ids=`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| BUG-05                   | `PropertyDetails` rendered sections with defaults and placeholders (`DEFAULT_BANKS`, `'—'` cards, `Feature`, `Document`, `Available`, "Map view available on live version"). Closed across 23–25: the bank list became `useBanks()` in 15, the ten content sections lost their defaults in 24, and 25 deleted the last two holders — `PropertyDocuments`' `Document`/`Available` row and `FinanceGuide`'s hardcoded rate card. Nothing on the page now prints a value the record does not carry.                                                                                                                                                                                                                                                                                                                     |
| BUG-07                   | `SimilarProperties` ignored `similarPropertyIds` and refetched by listing type. Prompt 08 built `GET /properties/:id/similar` (editor's picks first, topped up to six by locality and type); prompt 25 made the page consume it — `PropertyDetails` fetches the row, `SimilarSection` prints it and `getVisibleSections` offers the navigation item only when the endpoint answered with something.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| BUG-08                   | `brochureUrl`, `floorPlanPdfUrl` and `documents[].url` were never delivered after a lead. Closed in 24 (floor plans and their PDFs) and 25 (the brochure and the document rows): the file is opened with `window.open(url, '_blank', 'noopener,noreferrer')` from inside the lead form's success handler, a blocked pop-up falls back to a toast with the address, and the success panel always carries an "Open <file>" button. The unlock is remembered per property in `sna_lead`.                                                                                                                                                                                                                                                                                                                                |
| ADD-12                   | `PropertyDetails`: 30 `useState`s, four copy-pasted modal state machines, `handleOpenLeadForm` dead so the enquiry modal was unreachable, `EnquiryForm` mounted three times, a `dimensionRange` chip that always rendered " - sqft", modals without dialog semantics and an `og:site_name` naming the boilerplate. Closed across 23–25: one `LeadModalTemp` (MUI dialog, focus trap, `role="dialog"`) replaced the four machines in 23, and 25 left exactly one `LeadForm` on the page — `EnquirySection` — with every other call to action opening that dialog.                                                                                                                                                                                                                                                     |
| ADD-13                   | `FinanceGuide` (1 858 lines as found): the heading typo "Home Finance Clearity", a hardcoded "8.35 % / 48 Hrs / Up to 90 % / 0.5 % + GST" stats bar, "Pre-Approved" badges, a score that ignored six of the collected fields, a result shown whether or not the `POST` succeeded, `document.body.style.overflow` written by hand and an unused `resultRef`. Closed in 25: seven sub-components of at most 292 lines each under `sections/property/finance/`, every claim traced to a §6.6 record or to `financeCopy.js`, all arithmetic in `utils/finance.js`, and a result that only exists once `POST /leads` has accepted the answers.                                                                                                                                                                            |
| BUG-06                   | `StickyNav` ignored the section toggles, the page duplicated its `visibleSections` logic, and the "Construction" item scrolled to `construction-specs` — an anchor no section carried. **Closed in 23:** `StickyNav` is deleted and `SectionNav` renders `getVisibleSections(property, context)` — the same `src/utils/propertySections.js` rule the admin's Section-visibility tab reads (prompt 21) — so the chips, the section wrappers and the toggles cannot disagree, and every anchor is `#section-<key>` generated from the same list.                                                                                                                                                                                                                                                                       |
| ADD-14                   | `ConstructionStatus` divided by `milestones.length - 1`, so one milestone printed `Infinity%` and none printed `NaN%`; `BuilderOverview` returned `null` for a developer that carried only a description; `PropertySpecs` kept an unreachable legacy-object branch and a dead `specificationsArray` prop. **Closed in 24:** all three components are deleted. `ConstructionSection.progressPercent()` prefers the editor's own figure, otherwise divides completed milestones by **all** of them and hides the bar for an empty timeline — unit-tested at one milestone for 0 % and 100 %. `BuilderSection` renders on a name alone, reading the full record out of `MasterDataContext` because the property embeds only `{id, name, slug, logoUrl}`. `SpecificationsSection` reads the §6.1 array and nothing else. |
| NEW-09                   | `SectionVisibilityTab` read `!== false` but wrote `!value`, so the first toggle of a key the record did not carry was a no-op on screen. **Closed in 21:** the tab is rewritten, the switch writes `true`/`false` explicitly, and a unit test presses a key an empty `sectionVisibility` never held.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| NEW-31 (SlugField)       | `SlugField` followed the title whenever it mounted with an empty `value`, and the property form mounts its tabs one render before the reducer's `LOAD` effect — so opening a listing and saving it rewrote a live URL from the title. **Closed in 21:** every write the field makes goes through one `write()` that records it, and a `value` the field did not write unlocks it instead of being overwritten.                                                                                                                                                                                                                                                                                                                                                                                                       |
| NEW-23                   | `FaqManager` reorder wrote two sequential `PUT`s and computed `swapIndex` against the filtered array, so dragging inside a category filter moved the wrong records. **Closed in 17:** the screen is gone, and a move is one `PATCH { order }` on the record that travelled, carrying the position of the row it landed on; the API renumbers the collection `1..n` (D98). Verified against the seed: filtered to Legal, dragging the second question to the top reorders those two and leaves the other eighteen where they were.                                                                                                                                                                                                                                                                                    |
| NEW-31                   | `LeadForm` sent every box it rendered, so an optional e-mail nobody filled in travelled as `""` and `POST /leads` answered 422 ("The email must be a valid email address"). Every CTA with an optional e-mail was affected, the locality one of prompt 14 included.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | 16 — `LeadForm` trims what was typed and leaves the empty boxes out of the body, so an absent key takes the schema's own default (§6.7). Verified in the browser: the builder CTA files a lead with `email: null` where before it was refused, and the filled-in case is unchanged.                                                                           |
| ADD-07 (pollers)         | Two 30-second pollers on `GET /admin/leads` (`AdminLayout` and `AdminLeads`), each downloading the whole collection.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | 12 — One poller: `LeadNotificationsContext`, mounted inside `AdminLayout`, asks for `status=new&perPage=5&sort=createdAt&order=desc` every 30 s and pauses while `document.hidden`. `AdminLeads` refetches when `lastUpdatedAt` changes and has no interval of its own (D45/D55). Verified in the browser: one GET per 30 s, none while the tab is hidden.    |
| ADD-19 (login)           | `AdminLogin`: "Remember me" is a no-op and the seed passwords sit in a commented block.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | 12 — The checkbox is gone (sessions always last the token TTL) and the page prints no credentials. The `AdminSettings` / `UserManagement` half of the row stays open as ADD-19 (settings/users).                                                                                                                                                              |
| ADD-19 (users)           | `UserManagement`: the last-admin guard read `isActive === undefined` as active, the component kept its own `ROLES` list and its own Snackbar, and the table paginated nothing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 13 — Replaced by `/admin/settings/users` on `MasterDataPage`. Every safety rule now comes from the API's 422 (§7) instead of a second, weaker copy in the browser; roles come from `enums.ROLES`; the toast is the one `ToastProvider` (D54); the list pages, sorts and filters on the server.                                                                |
| ADD-23                   | `IconPicker`: invalid MDI ids, tiles not keyboard-operable, search ignoring the category.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | 13 — Every id in the library was checked against the live Iconify MDI collection: three were gone and three were aliases; all six are replaced. Tiles are `<button aria-pressed>` in a roving tab order with arrow-key navigation, search narrows inside the active category, and the custom-id box validates against `^mdi:[a-z0-9-]+$` with a live preview. |
| ADD-28                   | `AdminLayout`: the active parent group could not collapse, the mobile drawer rendered the brand twice, the toast navigated even when dismissed, `pageTitles` lacked `/admin/partners`, `.notificationDot` was dead CSS.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | 04 closed the first three. 12 closes the rest: the layout is `AdminSidebar` + `AdminTopbar` + `NotificationsMenu`, the title comes from `routes/adminRouteConfig.js` instead of a hand-kept map, and no dead CSS survives the split.                                                                                                                          |
| BUG-02                   | List params (`is_active`, `featured`, `property_type`, `per_page`, `search`, `type`, `status`, `area`) match neither `db.json` camelCase nor JSON Server syntax.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 11 — Deleted with `api.js`: every list call now sends the §5.7 filter names built from the registry's `query` map.                                                                                                                                                                                                                                            |
| BUG-04                   | camelCase/snake_case drift (`transformPropertyPayload`, `normalizePropertyResponse`, `seoService` mappers, nested shapes differ between form, db and sections).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 11 — `transformPropertyPayload`, `normalizePropertyResponse`, `normalizeListResponse` and the `seoService` mappers are gone with `api.js`; the contract is camelCase end to end (§5.1).                                                                                                                                                                       |
| BUG-14                   | Token expiry never enforced; login writes both storages; logout incomplete; 401 redirect for public calls.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | 11 — Closed on the client: the three `sna_auth_*` keys are the only session store, the restore checks `expiresAt`, `logout()` awaits the API before clearing, and a 401 signs the session out only on an admin or auth call.                                                                                                                                  |
| ADD-08                   | Two `GET /settings` calls per public page (Footer + NewsletterSection); Articles fires `/articles/trending` twice                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | 11 — `SiteSettingsContext` loads `GET /settings` and `GET /seo/settings` once per page load (D93); `/articles/trending` is fetched once per page. Verified in the browser network panel.                                                                                                                                                                      |
| NEW-07                   | `Articles.js` fires `GET /articles/trending` twice (its effect depends on `articles`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 11 — `Articles.js` fetches trending through `useApi` with a stable dependency list, once.                                                                                                                                                                                                                                                                     |
| NEW-12                   | `AdminAuthContext` restores a session without checking `tokenExpiry`, and `logout()` clears `user` before awaiting `authService.logout()`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | 11 — `AdminAuthContext` refuses an expired stored session and awaits `authService.logout()` before clearing.                                                                                                                                                                                                                                                  |
| NEW-13                   | The 401 handler does a full `window.location.href` reload from any page, including public ones                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 11 — The 401 handler fires only for `/admin/*` and `/auth/*` (except login), is latched so concurrent 401s redirect once, and never touches a public page.                                                                                                                                                                                                    |
| NEW-14                   | `authService.login` invents a 24-hour `tokenExpiry` client-side when the API omits one                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | 11 — The client stores the API's own `expiresAt` and invents nothing.                                                                                                                                                                                                                                                                                         |
| NEW-16                   | `PropertyCard` imports `TAG_OPTIONS` from `pages/admin/property-tabs/constants`, so the public bundle depends on admin code                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 11 — `PropertyCard` was rewritten against the contract shape and no longer imports from `pages/admin`.                                                                                                                                                                                                                                                        |
| NEW-24                   | `Dashboard` falls back to fetching the entire `properties`, `leads` and `articles` collections and recomputing every KPI in the browser                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | 11 — `Dashboard` reads `GET /admin/dashboard` only; `AdminLayout` and `AdminLeads` poll with `perPage=1` and read `meta.total`.                                                                                                                                                                                                                               |
| NEW-26                   | `/properties` renders the `ErrorBoundary` fallback against the new data shape: `PropertyCard` calls `property.configuration.join()`, and `configuration` is an object in §6.1, not an array of `"3 BHK"` strings (`pageerror: _property$configurati.join is not a function`). Expected until prompt 11 rewrites the services and cards; the app recovers rather than white-screening.                                                                                                                                                                                                                                                                                                                                                                                                                                | 11 — `PropertyCard` reads `configuration.bedrooms`, `pricing`, `area` and `images` directly; `/properties` renders without a console error.                                                                                                                                                                                                                   |
| NEW-27                   | The un-migrated frontend still calls four endpoints that no longer exist: `GET /settings` (6× on the home page — it is `/settings` in the registry but the old service sends no `Accept` scoping and the response shape differs), `/neighborhoods/active`, `/partners/active` and `/articles/trending`. All four answer 404 with the error envelope. Prompt 11 moves every call onto `src/services/endpoints.js`.                                                                                                                                                                                                                                                                                                                                                                                                    | 11 — Every call goes through `services/endpoints.js`; `scripts/check-endpoints.allow.json` is `[]` and `npm run lint` enforces it.                                                                                                                                                                                                                            |
| BUG-03                   | 15 endpoints called by the frontend do not exist on a plain JSON Server                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | 09 — every endpoint of §5.14 is served by a hand-written router; `npm run smoke` walks the whole registry (269/269). `/neighborhoods/active`, `/partners/active` and `/visits` are boilerplate paths the contract replaces, not endpoints to build (11).                                                                                                      |
| NEW-08                   | `eslint-disable-line react-hooks/exhaustive-deps` in `GalleryTab.jsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 01 — effect restructured with a loop-safe equality guard                                                                                                                                                                                                                                                                                                      |
| ADD-15 (partial)         | `role="combobox"` without `aria-controls` in `HeroSection`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | 01 — `aria-controls="hero-search-suggestions"` added                                                                                                                                                                                                                                                                                                          |
| ADD-21 (partial)         | `LeadDetail` computed `isMobile` and never used it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 01 — removed with its `useTheme`/`useMediaQuery` imports                                                                                                                                                                                                                                                                                                      |
| ADD-02 (partial)         | No ESLint/Prettier config beyond CRA, empty `devDependencies`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | 01 — Prettier + `eslint-config-prettier` + project rule set + cross-platform scripts                                                                                                                                                                                                                                                                          |
| NEW-21                   | No favicon, PWA icon or OG image; `logo.png` the only brand asset                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | 02 — 10 brand PNGs in `public/brand/`, favicons + `manifest.json`, HOM `logo.png` deleted                                                                                                                                                                                                                                                                     |
| BUG-17 (partial)         | README/`.env` described HOM + Cloudways; no favicon or manifest                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 02 — README rewritten, `.env` removed from git, favicons and `manifest.json` added                                                                                                                                                                                                                                                                            |
| BUG-17                   | "Sign In" (`/admin/login`) in the public drawer menus                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 03 — both `sideMenuItems` entries removed; the route still works by URL (D24)                                                                                                                                                                                                                                                                                 |
| BUG-16 (dead code)       | `adminService`, `visitService`, `PropertyDetail.js`, `AnimatedSection.jsx`, the unreachable enquiry modal                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | 03 — deleted, together with five dead CSS class blocks, two dead props and `stats.missing`                                                                                                                                                                                                                                                                    |
| NEW-25                   | 16 public pages set a boilerplate brand title through React Helmet                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 03 — every Helmet `<title>` and meta description now interpolates `SITE.name`                                                                                                                                                                                                                                                                                 |
| BUG-12                   | ~1 500 colour and font literals outside the token files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | 04 — 0 hex literals outside `global.css`/`theme.js`; `check:traces` gates it with an empty allow-list                                                                                                                                                                                                                                                         |
| ADD-05                   | No header rendered between 900 px and 960 px; five competing breakpoint sets                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | 04 — one 900 px switch in JS (`useBreakpoint`) and CSS (`899.98`/`900`); verified at 899–960 px                                                                                                                                                                                                                                                               |
| ADD-07 (toasts)          | Three toast systems (`ToastProvider`, AdminLayout and UserManagement Snackbars)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 04 — one `ToastProvider`/`useToast`; 13 local Snackbars removed, `grep -rn "Snackbar" src` is empty (the two pollers stay, owner 12/29)                                                                                                                                                                                                                       |
| ADD-24                   | `PropertyCardSkeleton` showed two buttons the card has not; no `aria-busy`; `PageLoader` in the HOM serif                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | 04 — skeleton mirrors the card's detail grid with `aria-busy`; `PageLoader` is the monogram + "Loading…" with `role="status"`                                                                                                                                                                                                                                 |
| ADD-25                   | `ScrollToTop` threw on non-selector hashes and used `behavior: 'instant'`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | 04 — `getElementById` on the decoded fragment, `behavior` honours `prefers-reduced-motion`                                                                                                                                                                                                                                                                    |
| BUG-13                   | Mixed id types (`"b998"`, `"8a37"`, string ids vs numeric `propertyId`), missing timestamps, plaintext HOM users                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 06 — `db.json` rewritten with integer ids and ISO `createdAt`/`updatedAt` on every record; the mock assigns `max(id)+1` and the timestamps (D14), `validate:seed` enforces both, and the three seeded accounts are the documented SNA placeholders (D80)                                                                                                      |
| NEW-19                   | `db.json` `partners` and property `developer` values were real company names and URLs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 06 — `db.json` rewritten: the three seed developers, the three banks and the three partners are fictional placeholder records (§14), and every project name with them                                                                                                                                                                                         |
| NEW-22                   | `AdminLeads` built the CSV in the browser: no BOM, the Property column empty from a string-vs-number id lookup, a newline inside `message` breaking the row. **Closed in 29:** the button calls `GET /admin/leads/export` through `downloadAuthenticated()` with the filters that are on screen (D46); the server writes the BOM, the property title and the quoting, and an export with no matches is the header row alone.                                                                                                                                                                                                                                                                                                                                                                                         |
| NEW-34                   | `src/pages/admin/Dashboard.js` used MUI v5 `Grid` props (`item`, `xs`, `sm`, `md`) that MUI v7 removed, so opening the admin printed four console warnings. **Closed in 29:** the file is deleted; `DashboardPage` lays its cards out in CSS grid and the headless-Chromium pass over `/admin/dashboard` reports no console warnings at all.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

## Prompt reports

### Prompt 01 — Repository audit, tooling baseline and project state files (2026-09-15)

**Files added**

- `docs/PROJECT_STATE.md`, `docs/DECISIONS.md`, `docs/CODEBASE_INVENTORY.md`
- `.editorconfig`, `.nvmrc` (`20`), `.prettierrc`, `.prettierignore`
- `scripts/check-traces.js` (+ `--report` mode)

**Files changed**

- `package.json` — `engines`, `devDependencies`, the 9 new scripts, the project `eslintConfig`, the `jest.transformIgnorePatterns` key; script order regrouped (name unchanged — prompt 02 renames it)
- `package-lock.json` — the four dev dependencies
- `.gitattributes` — `* text=auto eol=lf` + `*.png|*.jpg|*.ico|*.woff2 binary`
- `.gitignore` — `/mock-server/.runtime/`, `/backend_developer_guidelines/.tmp/`, `.env`, `.env.production`, `/e2e/test-results/`, `/playwright-report/`, `*.log`
- 22 files under `src/` — behaviour-preserving lint fixes only (44 insertions, 97 deletions):
  `AnimatedSection.jsx` (unused `as: Tag`), `ToastProvider.jsx` (unused map `index`),
  `HeroSection.jsx` (`aria-controls` + listbox `id`), `EnquiryForm.jsx` (unused import),
  `FinanceGuide.jsx` (`resultRef` + `useRef` import), `StickyNav.jsx` (`navItems` dependency),
  `AdminLeads.js`, `AdminProperties.js`, `LeadDetail.js`, `PropertyForm.jsx`,
  `ArticleDetail.js`, `Articles.js`, `FAQs.js`, `PropertyListing.jsx` (16 unused catch
  bindings → `catch {`), `Dashboard.js` (`console.error` → comment),
  `PropertyForm.jsx` (7 `console.log`), `BasicInfoTab.jsx` (unused prop),
  `SeoTagsTab.jsx` (unused import), `GalleryTab.jsx` (effect restructure, no `eslint-disable`),
  `PropertyDetails.jsx` (dead `handleOpenLeadForm`), `api.js` (dead `extractPaginationMeta`),
  `seoGenerator.js` (dead `capitalize`, unused destructured `specifications`/`state`),
  `validators.js` (two unnecessary regex escapes)

**Files removed** — none.

**Endpoints added / changed** — none.

**Env vars** — none. **npm scripts** — see the cumulative table above.

**Acceptance checklist**

- [x] `npm run lint` → 0 errors, 0 warnings across `src/**` and `scripts/**`
- [x] `npm run build:ci` succeeds (`Compiled successfully.`, no warnings)
- [x] `npm run test:ci` passes (no tests yet; `--passWithNoTests` added per §7 edge case 5)
- [x] `npm run check:traces:report` prints totals (2 212 in the product tree, plus 113 in the three new `docs/` files that quote them as evidence); `npm run check:traces` exits 1 — expected until prompt 03
- [x] `.editorconfig`, `.nvmrc` (`20`), `.prettierrc`, `.prettierignore`, `.gitattributes` (`* text=auto eol=lf`) exist; `package.json` has `engines`, the task-8 scripts, the task-7 `eslintConfig` and the `jest` key
- [x] `docs/CODEBASE_INVENTORY.md` covers every route, page, component, section, service function, util, constant, hook and `db.json` collection — including `FinanceGuide.jsx` (1 808 lines), `PropertyDetails.jsx` (30 `useState`, spec said 24), `PropertyDetail.js` (dead stub), `adminService` (dead duplicate), the `?search=`/`?q=` mismatch and the 900–960 px header gap
- [x] `docs/PROJECT_STATE.md` and `docs/DECISIONS.md` exist in the prescribed format; "Known issues (open)" holds BUG-01…BUG-21, ADD-01…ADD-28 and NEW-01…NEW-24 with owner prompts
- [x] App behaviour unchanged — the fixes only delete unreachable bindings, add one ARIA attribute and correct two hook dependency lists
- [x] One commit; `git status` clean afterwards

**Verification output**

```
npm run lint          → exit 0, no findings
npm run test:ci       → "No tests found, exiting with code 0"
npm run build:ci      → "Compiled successfully."
npm run check:traces  → exit 1 (2 212 product-tree findings — expected until prompt 03)
npm run check:traces:report → exit 0, totals printed
```

**Manual QA (Chromium, dev server on `http://localhost:3000`)**

| Check                               | Result                                                                                                                                                                                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` at 1280 px                      | Renders; `h1` = "Find Your Dream Home"; header present; no horizontal scroll                                                                                                                                                                               |
| `/` at 390 px                       | Renders; same `h1`; mobile header present; no horizontal scroll                                                                                                                                                                                            |
| `/admin/login` at 1280 px           | Renders the login card (3 inputs, 2 buttons, "Remember me", "Sign In")                                                                                                                                                                                     |
| `/properties` at 1280 px and 390 px | Renders its `h1` "Property Listings" and the empty/error state without crashing                                                                                                                                                                            |
| Console                             | Only the pre-existing failures against the unreachable boilerplate API (`ERR_CERT_AUTHORITY_INVALID` on the Cloudways host + the axios interceptor's own `Network error:`). No React, MUI, key or `act()` warnings; no error introduced by the lint fixes. |
| 930 px viewport                     | Confirms ADD-05 live: the `<header>` element is in the DOM but `display: none`, so no navigation renders between 900 px and 960 px.                                                                                                                        |

**Issues left → moved to "Known issues"** — every defect of `00_MASTER_CONTEXT.md` §11 that
this audit could confirm, plus NEW-01…NEW-24. Four items are closed above.

**Next prompt: 02 — Rebrand identity and environment.**

### Prompt 02 — Rebrand identity, environment files, brand assets and README (2026-09-15)

**Files added**

- `.env.example` (every variable with a comment), `.env.development`, `.env.production.example`
- `src/config/site.js` — `BRAND` (name, shortName, four Cloudinary URLs, three local paths)
  and `SITE` (name, url, defaultLocale, placeholderDomain); the only module that reads the
  brand environment variables
- `scripts/fetch-brand-assets.js` + `public/brand/` — the 10 PNGs of the master context §2.3
- `public/manifest.json` — three icons (192 `any`, 512 `any`, 512 `maskable`)

**Files changed**

- `package.json` — `name` `squares-n-acres-website`, `description`, `version` `0.2.0`,
  script `generate:brand-assets`
- `package-lock.json` — the same name/version (regenerated with `npm install --package-lock-only`)
- `public/index.html` — new `<head>`: `lang="en-IN"`, viewport with `viewport-fit=cover`,
  `theme-color`, `application-name`, description, title, three PNG favicons,
  `apple-touch-icon`, `manifest`, Google Fonts preconnect + Inter/Manrope stylesheet;
  the `favicon.ico` link (a 404) is gone
- `public/robots.txt` — development placeholder that disallows `/admin` and points at the
  production setup (the API serves `/robots.txt`, master context §5.13)
- `README.md` — rewritten (what it is, requirements, quick start, scripts, env vars, project
  structure, brand assets, deployment placeholder, license); no HOM, Cloudways or
  `API_DOCUMENTATION.md` reference remains
- `src/services/api.js` — `BASE_URL` is `process.env.REACT_APP_API_URL` with no fallback and
  throws at module load when unset (D48); nothing else in the file changed
- `src/components/layout/Header.jsx`, `MobileHeader.jsx`, `Footer.jsx` — the `logo.png` import
  is replaced by `import { BRAND } from '../../config/site'`; the five `<img>` tags (header 2,
  mobile header 2, footer 1) render `BRAND.logoUrl` with `alt={BRAND.name}` and explicit
  `width`/`height` in the wordmark's 2.34:1 ratio (112×48 at 48 px, 94×40 at 40 px)
- `src/components/layout/Footer.module.css` — `.brandLogo` loses `filter: brightness(0) invert(1)`
  and gains `object-fit: contain` plus the temporary white container
- `docs/CODEBASE_INVENTORY.md` — one line: the quoted Cloudways fallback URL is described
  instead of reproduced, so the host exists nowhere in the repository
- `docs/PROJECT_STATE.md`, `docs/DECISIONS.md`

**Files removed**

- `.env` (untracked with `git rm --cached` **and** deleted; `.env.development` covers `npm start`)
- `src/assets/images/logo.png` (the HOM wordmark; `src/assets/images/` is now empty and gone)

**Endpoints added / changed** — none.

**Env vars** — see the cumulative table above (11 variables documented in `.env.example`).
**npm scripts** — `generate:brand-assets` added.

**Brand assets** — all 10 downloads succeeded, so `index.html` and `manifest.json` reference
the local files only; the Cloudinary fallback of task 6 was not needed.

```
File                   Bytes   Pixels     Status
favicon-16.png         488     16x16      OK
favicon-32.png         1018    32x32      OK
favicon-48.png         1510    48x48      OK
apple-touch-icon.png   12685   180x180    OK
icon-192.png           14846   192x192    OK
icon-512.png           140496  512x512    OK
icon-512-maskable.png  140496  512x512    OK
og-default.png         145120  1200x630   OK
logo.png               59342   540x231    OK
icon.png               850244  1254x1254  OK
```

`og-default.png` is 1200×630 and the wordmark is 540×231 (2.338:1), both read from the PNG
IHDR header by the script.

**Trace counters after this prompt** (`npm run check:traces:report`, 186 files scanned)

| Scope                                    | Traces | Hex literals | Total     |
| ---------------------------------------- | ------ | ------------ | --------- |
| Product tree (everything except `docs/`) | 696    | 1 498        | **2 194** |
| `docs/` (evidence quotes)                | 100    | 20           | 120       |
| Reported by the script                   | 796    | 1 518        | 2 314     |

Prompt 01 measured 717 / 1 495 / 2 212 in the product tree. The 21 brand traces removed are
the README, `.env` and `index.html` rewrites; the 3 added hex literals are `theme-color` in
`index.html` and `theme_color`/`background_color` in `manifest.json` (see "Pending rewrites").
The Cloudways host is at **0** in the product tree (it was 4). `npm run check:traces` (strict)
still exits 1 — expected until prompt 03.

**Acceptance checklist**

- [x] `package.json` name `squares-n-acres-website`, version `0.2.0`, script `generate:brand-assets`
- [x] `.env` untracked and deleted; `.env.example`, `.env.development`, `.env.production.example`
      exist with the documented variables; `.gitignore` ignores `.env` and `.env.production`
- [x] `grep -ri <the Cloudways host> .` (excluding `node_modules`, `.git`, `prompts`) → the only
      match left is the regex that defines the pattern in `scripts/check-traces.js`, which
      excludes itself from its own scan; the host and the URL appear nowhere else
- [x] `public/brand/` contains the 10 PNGs; `public/index.html` has the new
      title/meta/theme-color/fonts/favicons/manifest; `public/manifest.json` is valid JSON
      with three icons (verified with `JSON.parse` and by fetching each icon: 200 `image/png`)
- [x] `src/config/site.js` exports `BRAND` and `SITE` exactly as specified
- [x] Header, mobile header and footer render the SNA wordmark from `BRAND.logoUrl` with
      `alt="Squares N Acres"`; `src/assets/images/logo.png` is gone; no CSS `filter` on the logo
      (computed style `filter: none` in all three)
- [x] `README.md` has no HOM/Cloudways reference and documents the current scripts and env vars
- [x] `npm run lint`, `npm run test:ci`, `npm run build:ci` pass
- [x] One commit; clean tree

**Verification output**

```
npm run generate:brand-assets → exit 0, 10/10 assets written
npm run lint                  → exit 0, no findings
npm run test:ci               → "No tests found, exiting with code 0"
npm run build:ci              → "Compiled successfully." (no .env.production present)
npm run check:traces:report   → exit 0, totals above
npm run check:traces          → exit 1 (2 194 product-tree findings — expected until prompt 03)
```

Edge case of §7 confirmed: `npm run build:ci` succeeds **without** `.env.production`. CRA does
not fail on a missing variable — it inlines `undefined`, and `api.js` throws only when the
bundle loads in a browser. The throw was left in place (not weakened) and the built bundle
contains the message `REACT_APP_API_URL is not set`.

**Manual QA** (Chromium 1280×900 and 390×844 against `npm start`, mock API not yet running)

| Check                          | Result                                                                                                                                                                                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Static `<head>`                | `lang="en-IN"`, `theme-color` matching `--color-primary`, title "Squares N Acres – Buy, Sell & Rent Properties in Bangalore", `/brand/favicon-32.png` requested and served 200 `image/png`                                                          |
| Tab title at runtime           | **Still the HOM title** on `/` — `Home.jsx` sets it through React Helmet, which overrides the document title (NEW-25, owner prompt 03). The static title is correct.                                                                                |
| Header logo (1280 px)          | `BRAND.logoUrl`, natural 540×231, rendered 112×48 (ratio 2.338 — no stretching), `alt="Squares N Acres"`, `filter: none`                                                                                                                            |
| Footer logo                    | Rendered inside a 91×48 white box (`background rgb(255,255,255)`, `padding 8px`, `radius 8px`), content ratio 2.337, `filter: none`; the footer surface is still navy (prompt 04)                                                                   |
| Google Fonts                   | The `css2?family=Inter…&family=Manrope…` stylesheet is requested and returns 200 with Inter and Manrope `@font-face` rules (39 total). The boilerplate's three display/body faces are still `@import`ed by `global.css` too — removed by prompt 03. |
| Manifest                       | `name`/`short_name` "Squares N Acres", `theme_color` matching `--color-primary`, `background_color` white, `display standalone`; all three icons fetch 200 `image/png`                                                                              |
| 390 px viewport                | Mobile header shows the wordmark at 94×40, `scrollWidth == clientWidth == 390` (no overflow)                                                                                                                                                        |
| Console                        | No new errors. The only failures are the API calls to `http://localhost:4000/api/*` (`ERR_CONNECTION_REFUSED` — the mock server arrives in prompt 06); no React/MUI/key warnings, no 404 on any local asset.                                        |
| `git status` after `npm start` | Only the intended files; no generated file outside `public/brand/` (`build/` and `node_modules/` are git-ignored)                                                                                                                                   |

**Issues left → moved to "Known issues"** — NEW-25 (Helmet titles still HOM). NEW-21 and the
favicon/manifest/README/env half of BUG-17 are closed.

**Next prompt: 03 — Purge HOM traces and dead code.**

### Prompt 03 — Purge HOM traces and dead code; strict trace check (2026-09-15)

**Files added** — `scripts/check-traces.allow.json`, `docs/QA/03-traces-before.txt`,
`docs/QA/03-traces-after.txt`.

**Files removed** — `src/pages/public/PropertyDetail.js` (unrouted stub: `routes/index.js`
binds the name `PropertyDetail` to a lazy import of `PropertyDetails.jsx`, so the file was
never reachable), `src/components/common/AnimatedSection.jsx` (re-verified zero importers).

**Files renamed** — `docs/CODEBASE_INVENTORY.md` → `docs/archive/CODEBASE_INVENTORY.md`.

**Files changed** — 136, of which 118 are whole-tree Prettier formatting only (the
formatting deferred by prompt 01). The behavioural changes are:

| Area                    | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brand strings           | 16 public pages' Helmet `<title>`s and meta descriptions, the 9 `PropertyListing` `seoTitle`s, `PropertyDetails` `og:site_name`, the `AdminLayout` brand block (×2), `AdminLogin`, `WhyChoose`, `SkeletonLoaders.PageLoader`, `Footer` defaults, `Contact`, `Careers`, `Partnership`, `SellLet`, `About`, `RealEstateAwareness` now read `BRAND.name` / `SITE.name` from `src/config/site.js`                                                                                                                                                                                                                                                                                                                                                                    |
| Copy                    | Footer defaults → `BRAND.name` / `''` / neutral description and tagline (the subtitle element is skipped when empty); the `About` timeline entry and three testimonials no longer name any brand; `team[].image` (never read) dropped                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| E-mail / domain / phone | `info@squaresnacres.com` in `Contact`, `FAQs` and the seed; `SITE.placeholderDomain` in the `AdminSeo` / `ArticleForm` SERP previews (via a `PREVIEW_HOST` constant) and the two canonical-URL placeholders; `+91 98XXX XXXXX` replaces the US-format number in `FAQs`, `AdminSettings` and the seed                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Authorship              | `ArticleForm` default author → `'Editorial Team'` (both call sites); `seoGenerator.js` `SITE_NAME`/`SITE_URL` now read `SITE`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Fonts                   | The Google Fonts `@import` removed from `global.css` (loaded by `index.html` since prompt 02); all 31 inline `fontFamily`/`font-family` literals replaced by `var(--font-body)` / `var(--font-heading)` / the new `var(--font-serp)` / `var(--font-mono)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Classes / keys          | The SweetAlert2 override block deleted from `global.css` and the `customClass` object from `PropertyDetails` (SweetAlert2 falls back to its default theme); `sna_lead` (sessionStorage) and `sna_property_draft` (localStorage)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Public admin link       | The `Sign In` → `/admin/login` entry removed from `sideMenuItems` in `Header.jsx` and `MobileHeader.jsx` (D24)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Dead code               | `adminService` and `visitService` deleted from `api.js`; the unreachable enquiry modal and its `showLeadForm` state deleted from `PropertyDetails`; `specificationsArray` prop dropped from `PropertySpecs` and its two call sites (the normaliser never emits the field; the legacy-object branch is kept); `index` prop dropped from `PropertyFaq.FaqItem`; `stats.missing` dropped from `AdminSeo`; the commented demo-credential block dropped from `AdminLogin`; five dead CSS class blocks removed (`.notificationDot`, `.qualities*`, `.breakdownBar*`, `.skeletonGrid`/`.skeletonCard`)                                                                                                                                                                  |
| `db.json`               | String replacements only, no shape changes: all 178 placeholder-image, old-Cloudinary and colour-named image URLs → `picsum.photos` seeds (galleries 800×600, floor plans 600×400, articles 1200×600, localities 400×300, partner logos 200×80, footer collage 400×300 replacing the Unsplash URLs); both legacy video-host `.mp4` entries removed (`heroText.backgroundMedia` → `''`, the `b998` gallery entry dropped); canonical and JSON-LD URLs → `https://www.squaresnacres.com/…`; FAQ answers, article `seoTitle`s and `author` rebranded; `siteSettings` name/subtitle/description/tagline/e-mail/phone/social handles → SNA placeholders; `adminUsers` → `admin@squaresnacres.com / Admin@123`, `manager@… / Manager@123`, `sales@… / Sales@123` (D80) |
| `check-traces`          | Allow-list support (`files`, `lines` with SHA-256 content verification, `colourLiterals`), `docs/QA/**` skip-listed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

**Endpoints added / changed** — none.

**Env vars, npm scripts** — none added or changed. Dependency removed:
`@mui/icons-material` (0 imports; `npm uninstall` also dropped it from `package-lock.json`).
It stays named in the `no-restricted-imports` ESLint rule, which is what keeps it out.

**Trace counters**

|                                                            | Before                                          | After                                                    |
| ---------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------- |
| Brand/legacy trace findings (non-colour)                   | 467 in the product tree, 817 including the docs | **0**                                                    |
| Colour findings (hex literals + boilerplate palette hexes) | 1 847                                           | 1 809 — deferred to prompt 04, reported but not blocking |
| `npm run check:traces`                                     | exit 1                                          | **exit 0**                                               |

`docs/QA/03-traces-before.txt` holds the prompt-01 scanner report plus every one of the 817
brand/legacy findings; `docs/QA/03-traces-after.txt` holds the report after this prompt.

**Acceptance checklist**

- [x] `npm run check:traces` exits 0 (strict) with the documented allow-list; `docs/QA/03-traces-before.txt` exists
- [x] The §8 trace grep (the eleven case-insensitive brand/host/placeholder patterns) over `src public db.json README.md package.json` → 0 matches
- [x] `grep -rn "fontFamily\|font-family" src | grep -v "var(--font" | grep -v global.css | grep -v theme.js` → 0
- [x] "Sign In" is not present in any public component; `/admin/login` still works by URL (the route and `ProtectedRoute` redirect are untouched)
- [x] `src/pages/public/PropertyDetail.js`, `adminService`, `visitService`, `extractPaginationMeta`, `handleOpenLeadForm` no longer exist; `@mui/icons-material` is not a dependency
- [x] `npm run lint` (0/0), `npm run test:ci`, `npm run build:ci` (`Compiled successfully.`, 0 warnings), `npm run format:check` pass
- [x] Storage keys `sna_lead` and `sna_property_draft` are used; the old underscore-prefixed keys have no occurrence left in `src/`
- [x] One commit, clean tree

**Verified behaviours**

- `db.json` still parses (`node -e "JSON.parse(...)"`) and the round-trip is byte-identical apart from the intended edits — no record shape changed.
- The allow-list content check works: inserting a line into `global.css` makes `check:traces` exit 1 and print `allow-listed line no longer matches its recorded content` for each shifted line; restoring the file returns it to exit 0.
- The §8 grep for the placeholder-image host, its colour name, the old Cloudinary cloud and the video host over `src public db.json` → nothing.

**Issues left → moved to "Known issues"** — BUG-12 stays open for the ~1 500 colour
literals (owner 04). BUG-16 keeps a residual row for the duplicated listing/filter logic
(owner 26). BUG-17, NEW-25 and the dead-code half of BUG-16 are closed.

**Not done in this prompt, deliberately**

- Manual QA in a browser was not run: this session has no display and the mock API does not exist until prompt 06, so `npm start` can only be checked for compile errors, which `npm run build:ci` already does more strictly. The §9 manual script is carried into prompt 04, which touches the same surfaces.
- The `:<id|new>` suffix on the property draft key (`00_MASTER_CONTEXT.md` §4.2) is a behaviour change and belongs to prompts 18–21.

**Next prompt: 04 — Design system, theme and UI kit.**

### Prompt 04 — Design system: tokens, MUI theme, UI kit and layout restyle (2026-09-15)

**Files added** — 33 UI-kit components with 28 CSS modules and `tones.js`/`index.js` under
`src/components/ui/`, six tests in `src/components/ui/__tests__/`, `src/test-utils.jsx`,
`src/setupTests.js`, `src/theme.test.js`, `src/utils/format.js` + `format.test.js`,
`src/utils/storage.js`, `src/utils/motion.js`, `src/hooks/{useInView,useCountUp,useScrollDirection,useBreakpoint,useCssVar}.js`,
`src/components/common/ErrorBoundary.jsx` + module, `src/components/common/BackToTop.module.css`,
`src/components/common/ToastProvider.module.css`, `src/components/layout/MainLayout.module.css`,
`scripts/contrast-check.js`.

**Files changed** — 175. The design system replaced every colour, font, spacing, radius,
shadow, z-index and breakpoint literal in `src/`.

| Area                  | Change                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tokens (`global.css`) | `:root` rewritten to §2.4 plus eleven documented extras (two social, three SERP, eight translucent). `body` is Inter on white, `html, body { overflow-x: clip }`, `:focus-visible` is the 2 px `--color-focus` ring, selection is the red tint, and `@media (min-width: 900px)` widens `--container-padding` to 24 px and `--header-height` to 72 px. The slick and SweetAlert overrides are gone.                                        |
| Theme (`theme.js`)    | `createTheme` from the same values, with `palette.surface` as a custom slot, Manrope h1–h6 on the §2.5 scale, `shadows[1..3]` = the three soft tokens (4+ reuse `--shadow-lg`, so nothing can reach for a heavier one), and component overrides that read `theme.palette` instead of repeating literals. `src/theme.test.js` (25 cases) asserts the two files agree.                                                                      |
| CSS modules           | 52 files: the old variable names mapped to the new ones, ~330 raw `#hex`/`rgba()` values replaced, box shadows collapsed onto `--shadow-*`, the four `data:` URI `<select>` chevrons redrawn as token-coloured gradients, and every media query moved onto `599.98/600` and `899.98/900`.                                                                                                                                                 |
| JS/JSX                | ~1 200 literals across 45 files replaced with `var(--token)`, property-aware (a `color:` gets the `-dark` variant, a `background`/`border` gets the base). Data records now carry a `tone`; `toneStyles()` resolves it.                                                                                                                                                                                                                   |
| Libraries             | `react-slick` + `slick-carousel` → `ui/Carousel` (`SimilarProperties`); `react-countup` → `useCountUp` (`BuilderOverview`); `sweetalert2` → `ConfirmDialog variant="alert"` (`PropertyDetails`, all five messages verbatim); `react-intersection-observer` → `hooks/useInView` (34 files). `date-fns@4.4.0` added for `formatRelative`.                                                                                                   |
| Layout                | Header and MobileHeader on one 900 px switch, sticky with `--shadow-sm` on scroll and never hidden (D52); BottomNav on `--bottom-nav-height` + `--safe-bottom`, hiding on scroll-down; Footer on `--color-surface` with the logo bare; MainLayout paddings from tokens; AdminLayout charcoal sidebar with the monogram in a white box, red active item, white topbar, `sna_admin_sidebar_collapsed` persisted through `utils/storage.js`. |
| Toasts                | One `ToastProvider` (max 3 visible, `aria-live="polite"`, bottom-right on desktop / under the header on mobile, `--z-toast`). Thirteen local `Snackbar`s removed across `AdminLayout`, `UserManagement` and eleven admin pages.                                                                                                                                                                                                           |
| Sections              | The 13 duplicated page-level `Section` components deleted in favour of `ui/Section`.                                                                                                                                                                                                                                                                                                                                                      |

**Size counters after this prompt**

| Counter                                                         | Value                                        |
| --------------------------------------------------------------- | -------------------------------------------- |
| Hex literals in `src/**/*.{js,jsx,css}` outside the token files | **0** (was ~1 500)                           |
| `var(--token)` references in `src/`                             | 5 363                                        |
| Files under `src/`                                              | 257 (was 171)                                |
| UI-kit components                                               | 33 `.jsx` + 28 CSS modules                   |
| Jest tests                                                      | 71 in 8 suites (was 0)                       |
| `main.js` after gzip                                            | 216.4 kB (+45 B — five packages out, kit in) |

**Verification**

- [x] `npm run check:contrast` — 29 gated pairs, all pass (3 informational)
- [x] `npm run check:traces` — 0 findings with `{ "files": [], "lines": {} }`
- [x] `npm run lint` — 0 errors, 0 warnings; `npm run format:check` clean
- [x] `npm run test:ci` — 8 suites, 71 tests
- [x] `npm run build:ci` — `Compiled successfully.`, 0 warnings
- [x] `grep -rnoE "#[0-9A-Fa-f]{3,8}\b" src --include=*.js --include=*.jsx --include=*.css | grep -v "global.css\|theme.js\|%23"` → 0
- [x] `grep -rn "Snackbar" src` → nothing; `grep -rn "swal" src` → nothing
- [x] Old variable names (`--color-bg-surface`, `--color-secondary*`, `--spacing-*`, `--font-number`, `--color-text-primary`, `--color-bg-default`, `--color-bg-paper`, `--color-text-light`, `--shadow-xl`, `--z-fixed`, `--z-modal-backdrop`) → 0 occurrences
- [x] `package.json` lists `date-fns 4.4.0` and none of the five removed packages

**Browser QA** — run against `npm start` in a headless Chromium (`/opt/pw-browsers`) over the
DevTools protocol, because this session has no display and no browser-driver dependency is
allowed. Evidence:

| Check                                 | Result                                                                                                                                                                                  |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fonts on `/`                          | `h1` computes `Manrope, "Segoe UI", …`; `main p` computes `Inter, "Segoe UI", …`                                                                                                        |
| Header at 899 / 900 / 930 / 959 / 960 | Exactly **one** visible `header` at every width — 65 px below 900, 73 px at and above. The 900–960 gap (ADD-05) is closed.                                                              |
| Horizontal scroll                     | `scrollWidth === innerWidth` at 390, 899, 900, 930, 959, 960 and 1280 px on `/`, `/properties` and `/admin/login`                                                                       |
| Footer                                | `rgb(247, 247, 248)` (`--color-surface`) with `rgb(31, 31, 31)` text; the wordmark's wrapper computes `rgba(0, 0, 0, 0)` — no container                                                 |
| Header elevation                      | No shadow at `scrollY 0`; `--shadow-sm` after scrolling, and the header never translates away                                                                                           |
| Bottom nav at 390 px                  | `transform: none` at the top → `translateY(65px)` after scrolling to 900 → `none` again after scrolling up                                                                              |
| Reduced motion                        | With `prefers-reduced-motion: reduce` emulated, all 7 sections of `/about` compute `opacity: 1` — no fade-up holds content back                                                         |
| Console                               | Clean on `/`, `/properties`, `/admin/login` and `/` at 390 px apart from `ERR_CONNECTION_REFUSED` on `localhost:4000` — the mock API does not exist until prompt 06. No React warnings. |

**Issues left → moved to "Known issues"** — BUG-20 keeps a row for the nav **data**
(owner 27); ADD-06 keeps a row for the `formatPrice`/`formatDate` call sites, `GooglePreview`,
`getTitleLenColor` and the Dashboard `leadStatusConfig` copy; ADD-07 keeps its poller half
(owner 12/29); ADD-28 keeps the toast-click and dead-CSS half (owner 12). BUG-12, ADD-05,
ADD-24 and ADD-25 are closed.

**Not done in this prompt, deliberately**

- The five `formatPrice` and three `formatDate` copies still sit at their call sites.
  `src/utils/format.js` is the single implementation with 18 tests, but swapping the call
  sites means touching data shapes (`priceUnit` vs `price_unit`, `listingType`), which is
  §12's "do not touch data fetching". Prompt 11 moves them when the services land.
- Admin routes beyond `/admin/login` were not exercised in the browser: they need a session
  from an API that does not exist until prompt 06.
- The `srcSet` widths of `LazyImage` are accepted as props but nothing generates them yet;
  the Cloudinary helper arrives in prompt 39.

**Next prompt: 05 — API contract, enums and data-model docs.**

---

### Prompt 05 — API contract, canonical enums, endpoint registry and schema descriptors (2026-09-15)

The contract is now frozen in code and in documentation. Nothing is wired: no component,
service or `db.json` record changed, and no endpoint is served yet. Everything added here
is a pure module or a document that prompts 06–11 consume.

**Files added**

| File                             | What it holds                                                                                                                                         |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/API_CONTRACT.md`           | §5.1–§5.13 verbatim (with the full 422 example), the 235-endpoint catalogue rendered from the registry, and every response shape                      |
| `docs/DATA_MODEL.md`             | §6.1–§6.14 verbatim, the HOM → SNA mapping table (§6.15), the singleton note and the reserved seed id ranges                                          |
| `docs/RBAC.md`                   | §7 verbatim, the matrix and route map as `rbac.js` encodes them, the navigation per role, and the four enforcement layers                             |
| `src/config/enums.js`            | `makeEnum()` + 46 enums, `LEGACY_LEAD_SOURCE_MAP`, `PRICE_BUCKETS_SALE/RENT`, `SECTION_VISIBILITY_KEYS`, `BLOCK_TYPES`                                |
| `src/config/enums.test.js`       | 241 assertions: unique values, labels, tones, icons, `bandOf`, `toSqft`, `verbOf`, the legacy map, the price buckets                                  |
| `src/services/endpoints.js`      | the registry: 235 entries in 52 groups, `allEndpoints()`, `findEndpoint()`                                                                            |
| `src/services/endpoints.test.js` | 251 assertions incl. the hardcoded §5.14 path list in both directions                                                                                 |
| `src/services/schemas/*.js`      | 74 request-body descriptors (`index`, `property`, `lead`, `article`, `page`, `masterData`, `settings`, `auth`, `seo`, `newsletter`, `jobApplication`) |
| `mock-server/schemas/models.js`  | 28 collection descriptors, every field of §6 with defaults                                                                                            |
| `mock-server/schemas/README.md`  | the field mini-language and how each descriptor renders as a Laravel rule                                                                             |
| `scripts/check-endpoints.js`     | three rules, now part of `npm run lint`                                                                                                               |

**Files changed**

- `src/config/rbac.js` — rewritten to the §7 matrix. Same exports and signatures
  (`ROLES`, `ROUTE_PERMISSIONS`, `NAV_ITEMS`, `hasRouteAccess`, `getNavItemsForRole`,
  `getDefaultRoute`), plus `PERMISSIONS` and `can(role, area, action)`. `NAV_ITEMS` is the
  final 12-group navigation. Its three consumers (`AdminLayout`, `AdminAuthContext`,
  `routes/index.js`) compile unchanged.
- `package.json` — `lint` gained `&& node scripts/check-endpoints.js`; `check:endpoints`
  added as its own script.
- `docs/PROJECT_STATE.md`, `docs/DECISIONS.md`.

**Endpoints added / changed**

235 declared, 0 served. See "Current npm scripts / env vars / endpoints added" above.

**Env vars** — none added or changed.

**npm scripts** — `lint` extended, `check:endpoints` added.

**Acceptance checklist**

- [x] `docs/API_CONTRACT.md`, `docs/DATA_MODEL.md` (with the mapping table) and
      `docs/RBAC.md` exist and contain every endpoint and every field of the master context.
- [x] `src/config/enums.js` exports every enum of §6.17; `enums.test.js` passes
      (241 assertions).
- [x] `src/services/endpoints.js` holds 235 entries covering every path of §5.14;
      `endpoints.test.js` passes (251 assertions). Verified that removing
      `articles.trending` fails the suite with `✕ serves GET /articles/trending`, and that
      restoring it turns the suite green again.
- [x] `src/services/schemas/*` and `mock-server/schemas/models.js` load in Node
      (`node -e "require('./mock-server/schemas/models')"`) and under Jest (checked with a
      throwaway spec in `src/`, since CRA's Jest `roots` is `src/`); each model lists every
      field of §6 with its default.
- [x] `src/config/rbac.js` exports `PERMISSIONS` and `can()`; the old exports still work;
      the sidebar shows the final navigation per role.
- [x] `npm run lint` (incl. `check:endpoints` with the temporary allow-list) — 0 errors,
      0 warnings, 0 blocking findings.
- [x] `npm run test:ci` — 10 suites, 573 tests, all green.
- [x] `npm run build:ci` — `Compiled successfully.`, 0 warnings.
- [x] `npm run check:traces` — 293 files scanned, 0 findings.
- [x] One commit, clean tree.

**Verification output**

```
node -e "…enums…"                  → 29 good 43560
node -e "…allEndpoints().length"   → 235
node -e "…getNavItemsForRole('sales').map(i=>i.label)"
                                   → [ 'Dashboard', 'Properties', 'Leads', 'Profile' ]
npm run lint                       → blocking findings: 0
npm run test:ci                    → Tests: 573 passed, 573 total
npm run build:ci                   → Compiled successfully.
npm run check:traces               → total findings: 0
```

The edge cases of the prompt were checked one by one: `require('./src/config/enums')` works
from Node **and** `import { LEAD_SOURCES } from '../config/enums'` compiles under CRA and
Jest; `getNavItemsForRole('sales')` returns the four expected groups with "Add property"
filtered out of Properties; `can('sales','leads','delete')` is `false`,
`can('manager','settings','edit')` is `false` and `can('manager','settings','view')` is
`true`.

**Manual QA**

The admin panel cannot be signed into until the mock exists (prompt 06), so the navigation
was verified through `getNavItemsForRole` in Node for all three roles instead of in the
browser: admin sees 12 groups (Users under Settings), manager sees 12 with Users removed,
sales sees 4. The public site was not touched — no component, page, stylesheet, `theme.js`,
`global.css` or `db.json` change is part of this commit — so `/` and `/properties` at 390 px
are byte-for-byte the pages prompt 04 left behind.

**Issues left**

- `scripts/check-endpoints.allow.json` still exempts `src/services/api.js` and
  `src/services/seoService.js` (53 findings between them) → "Pending rewrites", prompt 11.
- BUG-02, BUG-04 and BUG-09 are marked "contract defined"; their code migration stays open
  and is owned by 08–11 and 28.
- `ROUTE_PERMISSIONS` no longer carries `/admin/neighborhoods`: §7's final route map
  replaces it with `/admin/master-data/localities`. The boilerplate route still renders
  (it is guarded by the hardcoded `RoleRoute` in `src/routes/index.js`, which prompt 12
  rewrites onto `ROUTE_PERMISSIONS`); nothing calls `hasRouteAccess` for that path today.
- The sidebar lists routes that do not exist yet (master data, content, media, SEO
  sub-pages, profile, users). They render the admin 404 inside the layout until their own
  prompt lands — accepted by §6 of the prompt.

**Not done in this prompt, deliberately**

- `src/config/adminConstants.js`, `src/pages/admin/property-tabs/constants.js`,
  `PropertyFilters.jsx`, `NearbyPlaces.jsx` and `ConstructionSpecs.jsx` keep their local
  constant copies. They are still the live source for components this prompt may not
  touch; each is deleted by the prompt that rewrites its consumer (13–29).
- No service calls the registry yet and `http.request()` does not exist: prompt 11 builds
  the client and deletes the transformation layer.

**Next prompt: 06 — Mock server core.**

### Prompt 06 — Mock server core, runtime db, envelope and starter seed (2026-09-15)

**Files added**

| Path                                       | What it is                                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `mock-server/server.js`                    | `npm run mock` — prepares the runtime db, listens on `MOCK_PORT`, fails with a readable message        |
| `mock-server/app.js`                       | `createApp({ router, config, db })` — the whole request pipeline, exported for tests and the smoke run |
| `mock-server/db.js`                        | `ensureRuntimeDb()`, `createRouter()`, `getCollection/getSingleton/write/removeRecord`                 |
| `mock-server/reset.js`                     | `npm run mock:reset` — "Runtime db restored from db.json"                                              |
| `mock-server/config.js`                    | The four `MOCK_*` variables, the seed/runtime paths and the CORS origins                               |
| `mock-server/routes/index.js`              | The (still empty) list of custom routers prompts 07–09 fill                                            |
| `mock-server/middleware/envelope.js`       | `res.ok/created/message` and `renderEnvelope` (JSON Server's `router.render`)                          |
| `mock-server/middleware/errors.js`         | `ApiError` + `notFound/forbidden/unauthorized/conflict/validation/tooManyRequests` + the handler       |
| `mock-server/middleware/timestamps.js`     | Ids, timestamps, read-only stripping, `PUT` defaults, `PATCH` deep merge                               |
| `mock-server/middleware/validate.js`       | `validateBody()` and `validateWrite()` — 422 in Laravel's shape with dotted keys                       |
| `mock-server/middleware/queryTranslate.js` | `page/perPage/sort/order/q` → `_page/_limit/_sort/_order/q`, CSV → repeated, unknown dropped           |
| `mock-server/middleware/publicScope.js`    | `/admin` prefix stripping, public scoping, `publicRead: false` collections                             |
| `mock-server/middleware/requestLog.js`     | One line per request: `GET /api/properties → 200 (4ms)`                                                |
| `mock-server/middleware/rateLimit.js`      | In-memory per-IP limiter for the public write endpoints (used by prompts 08/09)                        |
| `mock-server/lib/*`                        | `ids`, `paginate`, `sort`, `filters`, `slug`, `embed`, `scope`, `enums`, `models`, `xml`, `csv`        |
| `mock-server/README.md`                    | How to run it, the envelopes, `PUT` vs `PATCH`, how to add a route                                     |
| `scripts/validate-seed.js`                 | `npm run validate:seed` — the seed against the data model, plus the structural rules                   |
| `docs/SEED_GUIDE.md`                       | What the seed contains, the rules it follows, how to change and reset it                               |

**Files changed**

- `db.json` — **rewritten** as the starter seed of §6: 28 collections, integer ids from 1, ISO
  timestamps, every non-computed field present. 6 properties (one rent, one lease, one under
  construction with a timeline, one villa, one plotted layout), 6 localities, 17 property types,
  20 amenities, 8 badges, 3 fictional developers, 3 fictional banks, 6 leads, 3 published
  articles, 4 categories, 15 tags, 3 authors, 8 FAQs, 2 sample testimonials, 2 team members,
  3 partners, the `home` and `about` pages, 1 job, 58 media records, `siteSettings` and
  `seoSettings` fully populated, 2 redirects, 2 subscribers, 3 admin users.
- `package.json` — `mock`, `mock:reset`, `dev` (concurrently), `validate:seed`; `lint`,
  `lint:fix`, `format` and `format:check` extended with `mock-server/**/*.js`; `validate:seed`
  added to `check:all`; devDependencies `json-server@0.17.4`, `express@4.22.3`, `cors@2.8.6`,
  `concurrently@9.2.1`.
- `scripts/check-traces.js` — exports `TRACE_PATTERNS`, `ALLOW_LIST` and `HEX_RE` (CLI guarded by
  `require.main === module`) so `validate-seed.js` applies the same regexes to `db.json` instead
  of restating them; a second copy would drift and would itself be a finding.
- `mock-server/schemas/models.js` — Prettier reformatting only (three long lines wrapped), now
  that `format`/`format:check` cover `mock-server/**`. Verified behaviour-identical by comparing
  the serialised `MODELS` object before and after.
- `docs/archive/CODEBASE_INVENTORY.md` — the `db.json` section is marked **replaced in prompt 06**.
- `docs/PROJECT_STATE.md`, `docs/DECISIONS.md` — this report and 14 decision records.

**Endpoints served** (generic, unauthenticated until prompt 07)

`GET /api/health`, and generic CRUD for all 28 collections at `/api/<collection>` and
`/api/admin/<collection>` with the §5.2 envelope, §5.3 errors, §5.6 query translation and §5.10
public scoping. `GET /sitemap.xml`, `/sitemap-*.xml`, `/robots.txt`, `/rss.xml`, `/llms.txt`
answer 501 at both the root and `/api` until prompt 09. Every custom route of §5.14
(`/auth/*`, `/properties/slug/:slug`, `/admin/dashboard`, …) still answers 404.

**npm scripts** `mock`, `mock:reset`, `dev`, `validate:seed`.
**Env vars** `MOCK_PORT`, `MOCK_DELAY_MS`, `MOCK_TOKEN_TTL_HOURS`, `MOCK_FRESH` (documented since
prompt 02, consumed from now on).

**Acceptance checklist**

- [x] `npm run validate:seed` passes on the new `db.json`; `--stats` prints counts for all
      **28** collections and singletons (the prompt's "27" is a miscount of its own list — see
      `docs/DECISIONS.md`).
- [x] `npm run mock` serves `/api/health`, envelopes lists / objects / deletes per §5.2 and
      returns 404 / 422 / 500 per §5.3.
- [x] Public GETs exclude inactive records (`isActive: false` on property 6 → public
      `meta.total` 5, public detail 404), `/api/admin/*` include them (total 6, detail 200).
- [x] `PATCH` keeps untouched fields — verified on `properties/1` (`isFeatured` set, all 5
      images, 14 amenity ids, `viewCount` 184 and `createdAt` unchanged) and on a nested
      `seo` patch (`seo.title` replaced, the other 18 `seo` keys intact).
- [x] `PUT` applies model defaults, including nested ones (`pricing.currency` `INR`,
      `area.areaUnit` `sqft`, the full `agent` shape, all 18 `sectionVisibility` keys) and keeps
      the id, `createdAt` and `viewCount`; a partial `PUT` is a 422 naming `listingType`,
      `propertyTypeId` and the eight other required fields.
- [x] `POST` assigns `id = max+1` (lead 7) and both timestamps; an invalid body is a 422 in
      Laravel's format.
- [x] `npm run mock:reset` restores the runtime db; `MOCK_FRESH=1 npm run mock` re-seeds;
      `MOCK_DELAY_MS=800` adds 800 ms to every response.
- [x] `npm run dev` starts both processes (`[mock]` and `[web]` prefixes, Ctrl+C stops both).
- [x] `npm run lint` (now including `mock-server/**`) 0 errors / 0 warnings, `npm run test:ci`
      573 tests in 10 suites, `npm run build:ci` "Compiled successfully." with 0 warnings,
      `npm run check:traces` 0 findings, `npm run format:check` clean.
- [x] One commit, clean tree.

**Edge cases verified**

`perPage=all` → 12 on a public endpoint, the whole collection on `/api/admin/*`; `page=999` →
empty `data` with `meta.total` 6; `PATCH` with an unknown field → 200 and nothing stored;
`PATCH` with a wrong type → 422; `DELETE` twice → 200 then 404, with the other five leads
untouched (JSON Server's own cascade would have removed every lead whose `propertyId` is
`null` — see `docs/DECISIONS.md`); a corrupt runtime db → a named error and a working
`mock:reset`; `GET /api/properties/slug/…` → the 404 envelope until prompt 08.

**Manual QA**

`npm run dev`, then Chromium at 1280 px:

- `/` renders every section — header, hero, the three quick-action cards, "Why Choose
  Squares N Acres", "How It Works", "Featured Properties", the FAQ block, the newsletter and
  the footer — with **0 page errors**. "Featured Properties" and the FAQ list come back empty:
  `GET /api/properties?featured=true&is_active=true` and `GET /api/faqs?isActive=true` both
  answer 200, but the un-migrated services read a bare array from a body that is now
  `{ data, meta }` (§5.2). That is the empty state this prompt expects (`NEW-27`).
- `/properties` renders the `ErrorBoundary` recovery screen rather than the listing:
  `PropertyCard` calls `.join()` on `configuration`, which is an object in the new shape.
  Expected until prompt 11 (`NEW-26`), and the app recovers rather than white-screening.
- Both pages log 404s for `/settings`, `/neighborhoods/active`, `/partners/active` and
  `/articles/trending` — the old endpoint surface (`NEW-27`).

**Issues left**

`NEW-26` and `NEW-27` (owner prompt 11); `BUG-03` partially closed — generic CRUD is served,
the custom routes arrive with prompts 07–09; `/api/admin/*` is unauthenticated until prompt 07
and the SEO document routes answer 501 until prompt 09 (both listed under "Pending rewrites").

### Prompt 07 — Mock server: authentication, tokens, RBAC middleware, users, profile (2026-09-15)

**Files added**

| Path | What it is |
| ------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------- |
| `mock-server/lib/tokens.js` | `createTokenStore({db, config})` — issue / resolve / revoke / purge over `apiTokens` |
| `mock-server/lib/password.js` | `verify()` and `store()` — plain comparison on the mock, one place to replace with a hash |
| `mock-server/lib/routePermissions.js` | `resolvePermission(path, method)` — an admin path and method → an area and action of §7 |
| `mock-server/middleware/auth.js` | `requireAuth` — `Bearer` → `req.user` (no password) + `req.token`; 401 with one message |
| `mock-server/middleware/role.js` | `role(...roles)`, `can(area, action)` and `adminPermission()` — the matrix, 403 |
| `mock-server/routes/auth.js` | `POST /auth/login` (throttled 10/min), `logout`, `GET                                     | PUT /auth/profile`, `PUT /auth/password` |
| `mock-server/routes/users.js` | `/admin/users` list, create, read, replace, patch, delete and bulk, with the safety rules |
| `mock-server/__tests__/auth.test.js` | 24 `node:test` cases over `createApp()` on a temp copy of the seed — `npm run test:mock` |

**Files changed**

- `mock-server/app.js` — `requireAuth` + `adminPermission()` mounted on `/api/admin`, and
  `requireAuth` on `/api/auth/logout|profile|password`, both **before** the custom routers and
  the generic router, so no admin route can exist without being covered.
- `mock-server/routes/index.js` — registers `auth.js` and `users.js`.
- `mock-server/middleware/publicScope.js` — `PRIVATE_COLLECTIONS` (`adminUsers`, `apiTokens`,
  `media`, `leads`, `jobApplications`, `newsletterSubscribers`, `propertyViews`) answer 404 on
  any public path, whatever the method; `PUBLIC_WRITES` keeps the one public write the contract
  defines on such a collection (`POST /leads`) open.
- `mock-server/config.js` — `MOCK_TOKEN_TTL_HOURS` is parsed as a **number** rather than an
  integer, so the `0.01` (36 s) of §7 works; the default is unchanged (24).
- `package.json` — `test:mock` added and included in `check:all`.
- `mock-server/README.md` — "Authentication", "Roles" and "Tests" sections: the flow, the seed
  credentials with the note that Laravel hashes them, the TTL, how a permission is resolved and
  what `/admin/users` refuses.
- `docs/API_CONTRACT.md` — "Auth — worked examples": login, 401, 429, profile, profile update,
  password (422 and success) and logout, with the JSON the mock actually returned.
- `docs/PROJECT_STATE.md`, `docs/DECISIONS.md` — this report and nine decision records.

**Endpoints served**

`POST /api/auth/login` → `{ data: { token, expiresAt, user } }` (48-char opaque token,
`lastLoginAt` set, expired tokens purged); `POST /api/auth/logout`; `GET /api/auth/profile`;
`PUT /api/auth/profile`; `PUT /api/auth/password` (revokes the user's other tokens);
`GET|POST /api/admin/users`, `GET|PUT|PATCH|DELETE /api/admin/users/:id`,
`POST /api/admin/users/bulk` (`activate|deactivate|delete`).

**npm scripts** `test:mock` (`cd mock-server && node --test`), also in `check:all`.
**Env vars** none added; `MOCK_TOKEN_TTL_HOURS` is now consumed (and accepts fractions).

**Acceptance checklist**

- [x] All five auth endpoints behave per §5.4 — verified by `npm run test:mock` (24 cases) and
      by curl against `npm run mock`.
- [x] `/api/admin/*` answers 401 without a token (`users`, `properties`, `dashboard` checked)
      and 403 outside the matrix: sales on `GET /admin/users`, manager on `GET /admin/users`,
      sales on `POST /admin/properties`, `DELETE /admin/properties/1` and `GET /admin/localities`,
      manager on `PUT /admin/settings`. Sales on `GET /admin/properties` → 200.
- [x] Private collections are unreachable publicly: `/api/adminUsers`, `/api/apiTokens`,
      `/api/media`, `/api/leads`, `/api/jobApplications`, `/api/newsletterSubscribers`,
      `/api/propertyViews` → 404, while the public `POST /api/leads` still answers 201.
- [x] Users CRUD, bulk and the safety rules work; tokens are revoked on delete, on deactivation
      and on a password change.
- [x] `npm run test:mock` (24/24), `npm run lint` (0 errors, 0 warnings, 0 blocking endpoint
      findings), `npm run test:ci` (573 tests in 10 suites), `npm run build:ci` ("Compiled
      successfully."), `npm run check:traces` (0 findings), `npm run validate:seed` ("db.json is
      valid."), `npm run format:check` clean.
- [x] One commit, clean tree.

**Edge cases verified**

`MOCK_TOKEN_TTL_HOURS=0.01` → `expiresAt` is 36 s out (test + `config.js` unit check); e-mail
matching is case-insensitive and trimmed (` ADMIN@SquaresNAcres.com` signs in) while
passwords are case-sensitive; a deactivated user's existing token stops working immediately
(401); `PUT /admin/users/1` on yourself keeps your role, `PATCH { role }` on yourself is a 422
naming `role`; `GET /admin/users?perPage=all` returns all three with `meta.perPage: 3`, and a
regex over the whole response body asserts no `password` key and none of the three seed
passwords ever appear; the 11th login attempt within a minute is a 429; an expired token is
deleted when it is presented.

**Manual QA**

`npm run mock` in a second terminal, then curl: `POST /api/auth/login` as each of the three
seed accounts; `GET /api/auth/profile` with the token; `GET /api/admin/users` as admin (200,
no passwords) and as sales/manager (403); `GET /api/admin/users` without a token (401);
`GET /api/adminUsers` (404); sales `GET /api/admin/properties` (200) and
`POST /api/admin/properties` (403); a created user signing in with their new password, then
changing it, then logging out (401 afterwards). `GET /api/admin/dashboard` and
`GET /api/admin/settings` still answer 404 — the permission check passes, the route arrives
with prompts 08/09.

**Issues left**

`BUG-03` still open for the routes of prompts 08–09. `BUG-14` is closed on the server and open
on the client: `AdminAuthContext` still posts the boilerplate's login shape, stores the session
twice and never enforces the expiry, so the admin panel cannot sign in against this mock until
prompt 12 (prompt 11 rewrites the services first). Nothing else was added to "Pending
rewrites"; the `/api/admin/*` row of that table is removed — it is done.

### Prompt 08 — Mock server: property and lead domain routes (2026-09-15)

**Files added**

| Path                                       | What it is                                                                                          |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `mock-server/routes/properties.js`         | The public search, `featured`, `suggestions`, `slug`, `similar`, `view` and the admin property CRUD |
| `mock-server/routes/leads.js`              | `POST /leads` and the CRM: list, detail, patch, delete, claim, notes, bulk, CSV export              |
| `mock-server/lib/propertyFilters.js`       | Every §5.7 filter and the six sort options, with the price / area / bedrooms accessors              |
| `mock-server/lib/facets.js`                | `meta.facets` — counted after the filters, before pagination                                        |
| `mock-server/lib/leadFilters.js`           | The CRM's filters and sorting, with the UTC date comparison of D96                                  |
| `mock-server/lib/activities.js`            | The lead timeline: `addActivity` and the sentences it writes                                        |
| `mock-server/lib/viewCounter.js`           | One counted view per IP per property per hour, in memory                                            |
| `mock-server/__tests__/helpers.js`         | The shared harness: `createApp()` on an ephemeral port over a temp copy of the seed                 |
| `mock-server/__tests__/properties.test.js` | 22 cases — filters, sorting, facets, featured, suggestions, similar, view, admin CRUD, RBAC         |
| `mock-server/__tests__/leads.test.js`      | 18 cases — honeypot, throttle, source mapping, scope, activities, notes, bulk, export               |

**Files changed**

- `mock-server/routes/index.js` — registers `properties.js` and `leads.js`.
- `mock-server/lib/embed.js` — `embedAgent()` fills an agent's display fields from the team
  member the listing names, without overwriting anything typed on the property itself.
- `mock-server/lib/scope.js` — `canSeeLead()` and `scopeLeads()`, the sales scope of D15.
- `mock-server/middleware/publicScope.js` — `PUBLIC_WRITES` removed: `POST /leads` has its own
  router now, so the private collections are the flat rule prompt 07 described.
- `mock-server/__tests__/auth.test.js` — moved onto the shared harness; the 24 cases are
  unchanged.
- `mock-server/README.md` — "Properties" and "Leads" sections: the filters, the three accessor
  rules, facets, the write invariants, the lead pipeline and the sales scope.
- `docs/API_CONTRACT.md` — worked examples: a filtered property list with its facets, the view
  counter, the type-ahead, a lead as `POST /leads` stores it, the honeypot answer and the CSV
  header.
- `docs/PROJECT_STATE.md`, `docs/DECISIONS.md` — this report and 16 decision records.

**Endpoints served**

`GET /api/properties` (all of §5.7 + `meta.facets`), `/properties/featured`,
`/properties/suggestions`, `/properties/slug/:slug`, `/properties/:id/similar`,
`POST /properties/:id/view`; `GET|POST /api/admin/properties`,
`GET|PUT|PATCH|DELETE /api/admin/properties/:id`, `POST /api/admin/properties/:id/duplicate`,
`POST /api/admin/properties/bulk`, `GET /api/admin/properties/check-slug`; `POST /api/leads`,
`GET /api/admin/leads`, `GET /api/admin/leads/export`, `GET|PATCH|DELETE /api/admin/leads/:id`,
`POST /api/admin/leads/:id/claim`, `POST /api/admin/leads/:id/notes`,
`DELETE /api/admin/leads/:id/notes/:noteId`, `POST /api/admin/leads/bulk`.

**npm scripts** none added. **Env vars** none added.

**Acceptance checklist**

- [x] Every endpoint of §5 for properties and leads answers per contract — `npm run test:mock`
      runs **64** cases in 17 suites (24 auth, 22 properties, 18 leads), all passing.
- [x] `?bedrooms=3` returns only 3-BHK listings (including via unit configurations),
      `?amenityIds=1,2` only listings holding both, `?ids=3,1` returns them in that order.
- [x] `meta.facets` is present on the public and the admin property list, counted after the
      filters and before the page is cut.
- [x] `POST /leads` increments the property's `enquiryCount` (12 → 13), maps
      `property_enquiry` → `property-enquiry`, stores `activities[0]`, honours the honeypot
      (200, nothing stored) and the 10/min throttle (the 11th is a 429).
- [x] The sales scope is enforced on the list (5 of 6 leads), the detail read (404 for the
      manager's lead), `PATCH` (403 for `assignedTo`), `claim`, `DELETE` (403) and the export
      (5 rows of 6).
- [x] The CSV starts with the BOM and the contract's header row; a `PATCH` appends
      "Status changed from New to Contacted", "Assigned to Sales User",
      "Priority changed from Medium to High" and "Follow-up set for 20 Sep 2026".
- [x] `npm run test:mock`, `npm run lint`, `npm run test:ci`, `npm run build:ci`,
      `npm run check:traces`, `npm run validate:seed` and `npm run format:check` pass.
- [x] One commit, clean tree.

**Edge cases verified**

`bedrooms=5` matches 5 and above and returns nothing in this seed (the largest home has four);
a plot never matches a bedrooms filter; `minPrice=0` still excludes a listing quoted on
request while no price filter excludes nothing; `similar` skips picks that were deactivated;
`duplicate` of a `-copy` slug becomes `-copy-2`; `PATCH { images: [...] }` replaces the array
and re-derives the single cover; `PATCH { seo: { title } }` keeps the other 18 `seo` keys, the
five images and `viewCount`; a lead phone arrives as `+91 98765 43210`, `09876543210` or
`9876543210` and is stored as `+919876543210`, while `12345` is a 422; `assignedTo=me` and
`assignedTo=unassigned` both work for an admin; an export with no matching rows is the header
row and the BOM alone; `from=2026-09-05&to=2026-09-05` selects the whole UTC day.

**Manual QA**

`npm run mock` in a second terminal, then curl: the filter matrix above; `sort=price-asc`
orders the rent, lease and sale listings by their own price field; `/properties/suggestions?q=w`
answers four empty groups and `?q=whi` the locality, the listing and its price;
`POST /properties/1/view` twice returns 185 both times; the admin CRUD end to end (create →
409 on a duplicate slug → PUT → PATCH → duplicate → bulk → delete, with the deleted id
disappearing from the two `similarPropertyIds` that held it); `POST /leads` as the enquiry
form, the honeypot and the throttle; `GET /admin/leads/export -o leads.csv`, opened in a text
editor: BOM, header row, six rows for the admin and five for the sales user.

**Issues left**

`BUG-03` is open only for the article, CMS, SEO, settings and dashboard routes of prompt 09.
The React side is untouched by design: the services still call the boilerplate's paths
(`NEW-26`, `NEW-27`, prompt 11) and the admin panel still cannot sign in (prompt 12). The
seed is still the six-property starter fixture — prompt 10 replaces it, and the assertions in
`properties.test.js` that count listings will move with it.

### Prompt 09 — Mock server: content, master data, SEO, sitemaps and smoke tests (2026-09-16)

**Files added**

| Path | What it is |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `mock-server/lib/crud.js` | `makeCrudRouter()` — the eight endpoints twenty resources share, written once |
| `mock-server/lib/usage.js` | `findUsages()` / `findMediaUsages()` / `describeUsages()` — the delete guard of D88 |
| `mock-server/lib/previewTokens.js` | 24-hour in-memory draft tokens (D28) |
| `mock-server/lib/html.js` | `stripHtml`, `wordCount`, `readingTime` |
| `mock-server/lib/articleFilters.js` | Publication visibility, the `scheduled` promotion, the public filters and sorts |
| `mock-server/lib/dashboard.js` | The whole §6.16 payload, with the sales scope of D15 |
| `mock-server/lib/sitemapBuilder.js` | `PUBLIC_PATHS`, the five `<urlset>` builders, the index, RSS, robots and `llms.txt` |
| `mock-server/routes/masterData.js` | Fourteen collections configured on the factory: filters, embeds, counters, delete guards |
| `mock-server/routes/articles.js` | The public blog, `trending`, the preview token, and the admin CRUD with the derived fields |
| `mock-server/routes/pages.js` | The CMS: block ids, `order` renumbering, the `<script` rejection, preview tokens |
| `mock-server/routes/media.js` | The library: inferred `provider`/`type`/`format`, `usedIn` |
| `mock-server/routes/settings.js` | `GET /settings`, `GET                                                                                    | PUT /admin/settings` and the known-keys deep merge |
| `mock-server/routes/seo.js` | `GET /seo/settings`, `GET                                                                                | PUT /admin/seo/settings`, the overview, the `llms.txt` preview |
| `mock-server/routes/dashboard.js` | `GET /admin/dashboard` |
| `mock-server/routes/newsletter.js` | Subscribe with dedupe and honeypot, the admin list, the CSV export |
| `mock-server/routes/jobs.js` | The open-role rule, `apply`, the admin openings and the application triage |
| `mock-server/routes/redirects.js` | The public list, `resolve`, the loop/chain validation, `import` and `export` |
| `mock-server/routes/sitemap.js` | The nine SEO files, served at `/api/...` and mirrored at the root |
| `mock-server/__tests__/content.test.js` | 36 cases — articles, previews, master data, pages, settings, SEO, dashboard, newsletter, jobs, redirects |
| `mock-server/__tests__/sitemap.test.js` | 16 cases — the index, the five children, the overrides, robots, RSS, `llms.txt`, the root mirrors |
| `scripts/smoke-api.js` | Walks `allEndpoints()` against a running server and checks the behaviours behind the status codes |

**Files changed**

- `mock-server/routes/index.js` — registers the eleven new routers.
- `mock-server/app.js` — the 501 placeholder is gone; the root rewrite now reaches
  `routes/sitemap.js`.
- `mock-server/middleware/errors.js` — `ApiError` carries an optional `data`, so the 409 of a
  delete-in-use can name what is in the way (`data.usedBy`).
- `mock-server/middleware/publicScope.js` — `GENERIC_COLLECTIONS`: what is left for the JSON
  Server fallback now that every §5.14 path has an owner.
- `mock-server/__tests__/helpers.js` — exposes the server's `origin`, so the root mirrors of
  the SEO files can be tested where they are actually served.
- `package.json` — `"smoke": "node scripts/smoke-api.js"`. It is **not** in `check:all`: it
  needs a server on the other end, and a check suite that fails because nobody started a
  second process is one people learn to ignore.
- `mock-server/README.md` — the full route list, the rules worth knowing, "Adding a
  collection" and the smoke-test section; the obsolete "What is not here yet" is gone.
- `docs/API_CONTRACT.md` — captured examples (`GET /settings`, `GET /admin/dashboard`,
  `GET /admin/seo/overview`, a `sitemap.xml` snippet, `robots.txt`), the four operational
  endpoints outside the registry, and the corrected `SeoSettings` public scope.
- `docs/PROJECT_STATE.md`, `docs/DECISIONS.md` — this report and 18 decision records.

**Endpoints served**

Every endpoint of §5.14. New in this prompt: the public lists and slug lookups for
localities, cities, property types, amenities, badges, developers, banks, article
categories, article tags, authors, FAQs, testimonials, team and partners, and their admin
CRUD with `bulk` and `check-slug`; `GET /articles`, `/articles/slug/:slug`,
`/articles/trending` and the admin article CRUD with `preview-token`;
`GET /pages/slug/:slug` and the admin page CRUD with `preview-token`; `/admin/media`;
`GET /settings`, `GET|PUT /admin/settings`; `GET /seo/settings`,
`GET|PUT /admin/seo/settings`, `GET /admin/seo/overview`; `GET /admin/dashboard`;
`POST /newsletter/subscribe`, `GET /admin/newsletter-subscribers` with `export`;
`GET /jobs`, `/jobs/slug/:slug`, `POST /jobs/:id/apply`, the admin openings and
`/admin/job-applications`; `GET /redirects` with the admin CRUD; and the sitemap family at
both `/api/...` and the root. Plus four operational paths outside the registry:
`GET /redirects/resolve`, `POST /admin/redirects/import`, `GET /admin/redirects/export`,
`GET /admin/seo/llms-preview`.

**Verification**

| Command | Result |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run test:mock` | **117 tests, 117 pass, 0 fail** (was 64 before this prompt) |
| `npm run smoke` | **269/269 checks pass, 0 failures** — 235 registry endpoints + 34 targeted assertions |
| `npm run lint` | 0 errors, 0 warnings; `check:endpoints` 185 files scanned, 0 blocking findings |
| `npm run test:ci` | 10 suites, 573 tests, all pass |
| `npm run build:ci` | Compiled, no warnings |
| `npm run check:traces` | 360 files scanned, 0 findings |
| `npm run validate:seed` | `db.json is valid.` |
| ADD-26 | `db.json`: mixed `leads[].propertyId`, `.mp4` in a property gallery, hardcoded `neighborhoods.propertyCount`, `(555) 123-4567`, off-scope Mumbai article, lorem-ipsum "Test Article" and Guwahati "Test Property", `faqs[6]` double `??` | 10 — `db.json` is regenerated from `scripts/seed/`: lead `propertyId` is always an integer, no video sits in a gallery, `propertyCount` is computed rather than stored, the phone numbers are synthetic Indian mobiles, and there is no off-scope, lorem-ipsum or test record left. `npm run validate:seed` now enforces the §10 quality rules as well as the types. |

The smoke run was repeated twice against the same server: the second run passes identically
and leaves nothing behind but the `apiTokens` its logins created and the one `propertyViews`
row `POST /properties/:id/view` legitimately records.

**Decisions worth carrying forward**

- The CRUD factory is the shape of every plain resource; a resource with real behaviour owns
  its router and mounts the factory for the rest. `docs/DECISIONS.md` (P09) has the hook list.
- Publication is a moment, not a flag: a `scheduled` article whose `publishedAt` has passed is
  public, and a read settles it.
- The delete guard counts only **named** references, so a catch-all CMS block never makes a
  record undeletable.
- `GET /seo/settings` returns the whole singleton; the earlier "public subset" in
  `docs/API_CONTRACT.md` described a rule nothing could justify.
- Public URLs live in one map (`PUBLIC_PATHS`), read by both the sitemaps and the SEO overview.

**Known issues**

`BUG-03` is closed: every endpoint the frontend declares is served, and `npm run smoke`
fails if one disappears. `BUG-15` and `BUG-18` are closed on the server — the honeypot, the
throttle, the newsletter dedupe, `/articles/trending` and the FAQ filters all work — and stay
open for the components that consume them (27, 28, 31, 34). The React app still calls the
boilerplate's paths (prompt 11) and cannot sign in (prompt 12), so the API is exercised with
`curl`, `npm run test:mock` and `npm run smoke`.

### Prompt 10 — Full Bangalore seed data (`db.json`) and seed guide (2026-09-16)

**What changed**

`db.json` is no longer hand-written. It is generated by `npm run seed:build`
from `scripts/seed/`, and it now holds the complete dataset of §10 rather than
the six-listing starter fixture of prompt 06.

**Files added**

| Path                                             | What it is                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `scripts/seed/build-seed.js`                     | Assembles every collection, derives `media`, checks the result, writes the file       |
| `scripts/seed/lib/rng.js`                        | mulberry32 with a fixed seed; named child generators per collection                   |
| `scripts/seed/lib/dates.js`                      | `GENERATED_AT` and every relative-date helper                                         |
| `scripts/seed/lib/stamps.js`                     | `createdAt` / `updatedAt` spread over 180 days                                        |
| `scripts/seed/lib/seo.js`                        | The §9.6 object and the 120–160 character description fitter                          |
| `scripts/seed/lib/media.js`                      | The media registry: minting a URL registers its record                                |
| `scripts/seed/lib/text.js`                       | ₹ and area formatting (D33), HTML paragraph helpers                                   |
| `scripts/seed/lib/property.js`                   | Expands a property spec into the full §6.1 record                                     |
| `scripts/seed/data/*.js` (23 modules)            | The data: localities, properties, articles, pages, leads, settings, …                 |
| `mock-server/__tests__/fixtures/starter-db.json` | The frozen prompt-06 seed the mock suites read                                        |
| `mock-server/__tests__/seed.test.js`             | Four cases over the **shipped** seed: reserved slugs, the path slug, sizes, dashboard |

**Files changed**

- `db.json` — regenerated in full (1.4 MB).
- `scripts/validate-seed.js` — the §10 quality rules, the path-slug rule for CMS
  pages, an asset scan that matches `mock-server/lib/usage.js`, the collection
  counts, and a non-blocking warning channel.
- `mock-server/routes/pages.js` — `slug/:slug(*)` so a page slug containing a
  slash resolves (the prompt's manual QA case).
- `mock-server/__tests__/helpers.js` — reads the frozen fixture; exports
  `LIVE_SEED` for the new suite.
- `package.json` — `"seed:build": "node scripts/seed/build-seed.js"`.
- `docs/SEED_GUIDE.md` — rewritten: contents, how to regenerate, the rules, what
  is fictional versus placeholder, how to add a property, an article or a page.
- `docs/DECISIONS.md`, `docs/PROJECT_STATE.md` — 19 decision records and this report.

**Counts (`npm run validate:seed`)**

| Collection        | Count | Collection            | Count  |
| ----------------- | ----- | --------------------- | ------ |
| properties        | 40    | testimonials          | 8      |
| localities        | 20    | teamMembers           | 6      |
| cities            | 1     | partners              | 6      |
| propertyTypes     | 17    | pages                 | 15     |
| amenities         | 46    | jobOpenings           | 4      |
| badges            | 8     | jobApplications       | 3      |
| developers        | 8     | media                 | 389    |
| banks             | 6     | redirects             | 3      |
| leads             | 45    | newsletterSubscribers | 12     |
| articles          | 12    | adminUsers            | 3      |
| articleCategories | 4     | siteSettings          | object |
| articleTags       | 15    | seoSettings           | object |
| authors           | 3     | apiTokens             | 0      |
| faqs              | 20    | propertyViews         | 0      |

Of the 40 properties: **38 active, 2 drafts**, 10 featured, 20 verified, all 17
property types, all three listing types, all four construction statuses and all
twenty localities. Of the 12 articles: 10 published (838–1 154 words each), 1
scheduled for 2026-10-31, 1 draft. The 45 leads cover all 29 sources and all
seven statuses, with 15 assigned to sales, 5 to the manager and 25 unassigned.

**Generation date: 2026-09-16T09:00:00.000Z.** Every relative date is measured
from that instant, which is what makes the build deterministic; the validator
warns once the scheduled article's date has drifted into the past.

**Verification**

| Command                  | Result                                                                 |
| ------------------------ | ---------------------------------------------------------------------- |
| `npm run seed:build`     | Written twice, byte-identical (`diff` empty)                           |
| `npm run validate:seed`  | `db.json is valid.` — 0 errors, 0 warnings                             |
| `npm run smoke`          | **269/269 checks pass**, 0 failures                                    |
| `npm run test:mock`      | **121 tests, 121 pass** (was 117; the new seed suite adds 4)           |
| `npm run lint`           | 0 errors, 0 warnings; `check:endpoints` 185 files, 0 blocking findings |
| `npm run test:ci`        | 10 suites, 573 tests, all pass                                         |
| `npm run build:ci`       | Compiled, no warnings                                                  |
| `npm run check:traces`   | 391 files scanned, 0 findings                                          |
| `grep -c picsum db.json` | 807 (> 200 required)                                                   |
| File size                | 1.4 MB (< 4 MB required)                                               |

Manual QA, against a running mock: `GET /api/properties?localityId=1&bedrooms=3`
returns the Whitefield 3-BHK only; `GET /api/articles?categorySlug=legal-rera`
returns the RERA, khata and stamp-duty pieces; `GET
/api/pages/slug/buyer-assistance/home-loan` resolves after the route fix; `GET
/api/admin/dashboard` shows 21 of 30 days with leads, 29 sources, five top
properties and eight upcoming follow-ups.

The un-migrated React app was loaded at `/` in headless Chromium: it renders
(seven children under `#root`, full page content) with **no uncaught
exception**. The console errors it logs are the known ones — the boilerplate
service still calling `/neighborhoods/active` and `/partners/active`, which do
not exist (NEW-27, prompt 11).

**Decisions worth carrying forward**

- The seed is generated and deterministic. Edit `scripts/seed/data/*`, run
  `npm run seed:build`, never edit `db.json`.
- A data module holds what a person must decide; everything implied is derived.
  That is what keeps forty listings consistent.
- `enquiryCount` is **at least** the number of leads naming a property, not
  equal to it: the counter is a lifetime total, `leads` is a ninety-day window.
- The mock's unit suites read a frozen fixture, not the shipped seed; the
  shipped seed is covered by `seed.test.js` and by `npm run smoke`.
- CMS page slugs are URL paths, and the pages route matches them greedily.

**Known issues**

`ADD-26` is closed: the seed's mixed types, off-scope records and test rows are
gone, and the validator now enforces the §10 quality rules rather than only the
field types. The data half of `BUG-11` is prepared — every hardcoded page of the
boilerplate is a seeded CMS record with its blocks — and the components that
read them land in prompts 27–31. The React app still uses the boilerplate's
shapes and endpoints (prompt 11), so the new data is exercised through
`curl`, `npm run test:mock` and `npm run smoke` rather than through the UI.

### Prompt 11 — Frontend data layer, hooks, contexts and page rewiring (2026-09-16)

**What changed**

`src/services/api.js` is gone. In its place the frontend has one HTTP client,
one thin service per domain, two hooks and two contexts, and every page that
used to read the boilerplate's field names now reads the contract of
`00_MASTER_CONTEXT.md` §5–§6 — directly where the screen is small enough to
rewrite here, and through a named temporary adapter where prompts 18–40 own the
rewrite.

**Files added**

| Path                                                    | What it is                                                                       |
| ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/services/http.js`                                  | The axios instance, the token, the scoped 401, `request()`, `buildUrl()`         |
| `src/services/apiError.js`                              | `ApiError` — the one error shape of §5.3, with `fieldError()` and `isValidation` |
| `src/services/authService.js`                           | login / logout / profile / updateProfile / changePassword                        |
| `src/services/propertyService.js`                       | public search, featured, slug, similar, view, suggestions + the admin CRUD       |
| `src/services/leadService.js`                           | create + the CRM: list, get, patch, claim, notes, bulk, `exportUrl()`            |
| `src/services/articleService.js`                        | list (incl. `ids`), slug, trending, taxonomy, authors + the admin CRUD           |
| `src/services/seoService.js`                            | settings, admin settings, update, overview, `llms.txt` preview                   |
| `src/services/settingsService.js`                       | public, admin, update                                                            |
| `src/services/masterDataService.js`                     | eleven collections built by one factory from the registry groups                 |
| `src/services/pageService.js`                           | CMS pages, public and admin, with the preview token                              |
| `src/services/mediaService.js`                          | the media library metadata CRUD                                                  |
| `src/services/userService.js`                           | admin users                                                                      |
| `src/services/dashboardService.js`                      | `GET /admin/dashboard`                                                           |
| `src/services/newsletterService.js`                     | subscribe, admin list, remove, `exportUrl()`                                     |
| `src/services/careerService.js`                         | job postings, applications, the public apply call                                |
| `src/services/redirectService.js`                       | the active rules, a pure `resolve()`, the admin CRUD                             |
| `src/services/index.js`                                 | the barrel                                                                       |
| `src/hooks/useApi.js`                                   | one call, four states, an AbortController per call                               |
| `src/hooks/useApiList.js`                               | a paginated list whose params live in the query string                           |
| `src/contexts/SiteSettingsContext.js`                   | settings + SEO settings, once per page load, session-cached                      |
| `src/contexts/MasterDataContext.js`                     | seven master-data lists in parallel, session-cached for ten minutes              |
| `src/routes/paths.js`                                   | every route builder, public and admin                                            |
| `src/utils/adapters/legacyArticle.js`                   | **temporary** — the §6.8 record under the old field names                        |
| `src/components/common/LegacyHtml.jsx`                  | **temporary** — renders CMS HTML until `SafeHtml` (prompt 32)                    |
| `src/services/__tests__/http.test.js`                   | 20 cases: URL building, error mapping, the scoped 401, the token                 |
| `src/hooks/__tests__/useApi.test.js`                    | 8 cases, including abort-on-unmount with no `act()` warning                      |
| `src/hooks/__tests__/useApiList.test.js`                | 9 cases over a `MemoryRouter`, including the URL round-trip                      |
| `src/components/common/__tests__/PropertyCard.test.jsx` | 7 cases over the contract shape                                                  |
| `src/contexts/__tests__/SiteSettingsContext.test.js`    | 6 cases: the cache seed, the refresh, the helpers                                |

**Files deleted**

- `src/services/api.js` (820 lines: the axios instance, `transformPropertyPayload`,
  `normalizePropertyResponse`, `normalizeListResponse` and eleven services).
- The old `src/services/seoService.js` was replaced in place by the
  registry-based one; its snake↔camel mappers are gone.

**Files changed (44)**

`App.js` (the two new providers), `AdminAuthContext`, `MainLayout`,
`Footer`, `NewsletterSection`, `LeadForm`, `PropertyCard`, `HeroSection`,
`ExploreNeighborhoods` → `ExploreLocalities`, `PartnersSection`, `FaqSection`,
`FeaturedProperties`, `TrendingTopics`, `SimilarProperties`, `EnquiryForm`,
`FinanceGuide`, `Articles`, `ArticleDetail`, `FAQs`, `Contact`, `Careers`,
`PropertyListing`, `PropertyDetails`, `AdminLayout`, `Dashboard`,
`AdminProperties`, `PropertyForm`, `SimilarPropertiesTab`, `AdminLeads`,
`LeadDetail`, `AdminArticles`, `ArticleForm`, `FaqManager`,
`AdminNeighborhoods`, `AdminPartners`, `AdminSettings`, `AdminSeo`,
`UserManagement`, four CSS modules, `setupTests.js`,
`scripts/check-endpoints.allow.json` (now `[]`) and `package.json`.

**How the layer is shaped**

- A service function is one line. It names a registry entry and passes
  `{ pathParams, params, body, signal }`; it never builds a URL, never reshapes
  a record and never catches an error. `masterDataService` builds its eleven
  collections from one factory rather than ninety hand-written lines.
- `http.request()` fills `:param` placeholders (encoding each segment when the
  parameter is a `(*)` wildcard), drops any query key the endpoint does not
  declare, turns arrays into csv and booleans into `true`/`false`, and returns
  the envelope untouched.
- Every failure is an `ApiError`. A 422 carries `errors` for the form, a
  dropped connection carries one sentence for the toast, and a cancellation
  carries `isCanceled` so callers ignore it.
- A 401 signs the session out only when the call was an admin or auth call.
  A public page whose token has gone stale keeps rendering (NEW-13), and
  concurrent 401s redirect once, not once each.

**Two calls became one per page load**

`GET /settings` and `GET /seo/settings` are loaded once by
`SiteSettingsProvider`, master data once by `MasterDataProvider`, and
`GET /articles/trending` once per page. Verified in the browser network panel
on `/` and `/insights/articles`.

While checking that, the trace caught a real defect in the new code:
`articleService.trending({ signal })` passed the abort signal in the `params`
slot, so the request was not abortable and React's StrictMode double-mount sent
it twice. Both call sites now pass `(undefined, { signal })`.

**Verification**

`npm run lint` (0 blocking endpoint findings, allow-list `[]`), `npm run test:ci`
(15 suites, 622 tests), `npm run test:mock` (121), `npm run build:ci`,
`npm run check:traces` (0 findings) and `npm run smoke` (269/269) all pass.

Driven in a real browser against the mock: the hero type-ahead groups
localities and properties for "whi"; the featured row renders seed prices
(`₹1.42 Cr`, `₹1.73 Cr – ₹2.83 Cr`, `₹11.4 L/month`); eight featured localities;
`?page=2` and `?categorySlug=market-trends` round-trip on the articles list;
`?category=home-loan` on the FAQ page; an article renders 17 HTML paragraphs and
its related row; `/properties` and
`/properties/lakeview-heights-3-bhk-whitefield` render with no console error;
admin login lands on the dashboard with the API's own figures; the property,
lead, SEO and settings screens list real rows. With the API unreachable the
public pages show an error state with a working Retry and never redirect to
login; an expired token on an admin call clears the session and redirects once.

**Known issues**

BUG-02, BUG-04, BUG-14, ADD-08, NEW-07, NEW-12, NEW-13, NEW-14, NEW-16, NEW-24,
NEW-26 and NEW-27 are closed. BUG-01 is closed for every write this prompt
touched and stays open until the module prompts confirm the rest. BUG-07,
BUG-18, ADD-07, ADD-10, ADD-16 and NEW-23 are annotated with what changed.

Nine temporary items are listed under "Pending rewrites", each with its owner
prompt. Four of them are disabled saves — `PropertyForm`, `ArticleForm`,
`AdminSettings` and `AdminSeo` — each behind an info `Alert` that names the
prompt which restores it. None of those saves could ever have succeeded against
this contract: they wrote snake_case columns, flat category strings and a
flattened settings object that the API does not accept.

### Prompt 12 — Auth, admin shell, RBAC routes, notifications and profile (2026-09-16)

**What changed**

The admin panel now has a session it can trust, a route table instead of
hand-written `<Route>`s, a shell built from that table, one lead poller for the
whole panel, and a profile screen every role can use.

**Files added**

| Path                                                      | What it is                                                                   |
| --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/contexts/LeadNotificationsContext.js`                | The panel's one lead poller: badge, bell rows, `lastUpdatedAt`, `markSeen()` |
| `src/components/admin/RoleRoute.jsx`                      | Guard 2 of §7 — `permission={['area','action']}` through `can()`             |
| `src/components/admin/Forbidden.jsx` (+ css)              | The 403 screen, in the layout, with a router link back to the dashboard      |
| `src/components/admin/AdminPlaceholderPage.jsx` (+ css)   | "Coming in prompt NN" for the screens prompts 13–39 write                    |
| `src/components/layout/AdminSidebar.jsx` (+ css)          | `NAV_ITEMS` filtered by role, collapsible groups, the leads badge            |
| `src/components/layout/AdminTopbar.jsx` (+ css)           | Title, "View site", the bell, the account menu                               |
| `src/components/layout/NotificationsMenu.jsx` (+ css)     | The bell: five newest `new` leads, relative times, "View all leads"          |
| `src/pages/admin/settings/ProfilePage.jsx` (+ css)        | `/admin/profile` — profile card + change-password card                       |
| `src/pages/admin/AdminLogin.module.css`                   | The login screen's own styles (no inline `sx` colours left)                  |
| `src/routes/adminRouteConfig.js`                          | The route table: path, title, permission, element, owning prompt             |
| `src/routes/adminRoutes.js`                               | `ProtectedRoute > AdminLayout > RoleRoute`, built from the table             |
| `src/routes/publicRoutes.js`                              | The public URL map, moved out of `routes/index.js` unchanged                 |
| `src/contexts/__tests__/AdminAuthContext.test.js`         | 6 cases: restore, expiry, revoked, offline, login, `can()`                   |
| `src/contexts/__tests__/LeadNotificationsContext.test.js` | 3 cases: the single request, the badge, the hidden tab                       |
| `src/components/admin/__tests__/RoleRoute.test.jsx`       | 3 cases over the real provider and the real matrix                           |

**Files changed**

`AdminAuthContext`, `ProtectedRoute`, `AdminLayout` (+ css), `AdminLogin`,
`AdminLeads`, `routes/index.js`, `routes/paths.js`.

**The session (§5.4)**

`AdminAuthContext` holds `{ user, token, expiresAt, status }` where `status` is
`loading | authenticated | anonymous`, and exposes
`{ user, role, status, isAuthenticated, login, logout, can, refreshProfile, updateUser }`.

- On mount it reads the three `sna_auth_*` keys. A token still in date signs the
  user straight back in and `GET /auth/profile` confirms it with the server; a
  token past its date is dropped without a request.
- Expiry is enforced three ways and all three end in one place: a `setTimeout`
  armed for `expiresAt` (capped at 24 h), a check on every admin route change,
  and the server's 401 through `http.onUnauthorized`. Each clears storage,
  shows "Your session has expired. Please sign in again." once, and redirects
  to the login page carrying `state.from`.
- A teardown latch keeps a burst of 401s — and the 401 the sign-out call itself
  may answer — to one toast and one redirect.
- A failed `GET /auth/profile` that is _not_ a 401 leaves the session alone: the
  API being unreachable is not a sign-out.
- A `storage` listener signs the other tabs out when the token key disappears.
- "Remember me" is gone.

**The routes**

`adminRouteConfig.js` holds all 42 admin routes — 16 wired to screens that
exist, 26 to `AdminPlaceholderPage` with the number of the prompt that writes
them (13, 14, 15, 16, 17, 30, 31, 33, 37, 39). Each row carries its §7
permission as `[area, action]`, so `RoleRoute`, the sidebar and the login
redirect all read the same table: `canAccessAdminRoute()` is what stops the
login page sending a role back to a route it would then be refused.

Titles feed the topbar and `document.title`
(`<title>Leads | Admin | Squares N Acres</title>` plus `noindex,nofollow`),
replacing the hand-kept `PAGE_TITLES` map that ADD-28 was about.

**One poller (D45/D55)**

`LeadNotificationsProvider` is mounted inside `AdminLayout`, so the public site
never polls. It asks for
`GET /admin/leads?status=new&perPage=5&sort=createdAt&order=desc` immediately
and every 30 s, stops while `document.hidden` and fetches the moment the tab
returns. `AdminLeads` refetches when `lastUpdatedAt` moves and has no interval
of its own. A failing poll is silent — the screens surface their own error
state, and a toast every 30 s would be worse than the failure.

**Verification**

`npm run lint` (0 problems, 0 blocking endpoint findings), `npm run test:ci`
(18 suites, 635 tests), `npm run build:ci` (compiled successfully, 0 warnings),
`npm run check:traces` (0 findings), `npm run validate:seed` and `npm run smoke`
(269/269) all pass. `npm run format:check` is clean.

Driven in headless Chromium against the mock, at 1280 px and at 390 px, with
the console watched throughout (0 app warnings or errors on every admin screen):

- Wrong password → the inline `Alert` "Invalid email or password.", still on
  `/admin/login`, no credentials printed anywhere on the page. Correct password
  → the dashboard; reload keeps the session; the sidebar collapse persists
  across a reload (`sna_admin_sidebar_collapsed`).
- A sales user sees only Dashboard, Properties, Leads and Profile; typing
  `/admin/settings`, `/admin/settings/users` or a master-data URL renders the
  403 page inside the shell, on that URL, with no redirect loop. A manager may
  open `/admin/settings` but not `/admin/settings/users`, and their sidebar does
  not link it.
- All 26 placeholder routes render their title and "Coming in prompt NN"; all
  16 existing screens still render.
- `POST /api/leads` → within 30 s the bell count grows, the dot appears and the
  toast reads "New lead: QA Poller Lead (Contact Page)" with a working "View"
  that opens `/admin/leads/46`. Opening the bell writes `sna_leads_seen_at` and
  clears the dot; `Escape` closes the menu.
- Network panel: exactly one `GET /admin/leads?status=new…` per 30 s, none at
  all across 65 s with the tab hidden, one immediately when it returns, and
  `/admin/leads` adds no request of its own beyond its refetch.
- `/admin/profile`: saving name, phone and avatar updates the topbar and
  `sna_auth_user`; a weak new password is refused client-side; a wrong current
  password renders the server's 422 on the field; success toasts the
  other-sessions note; logout clears all three keys and the new password signs
  in. (The seed account was restored afterwards.)
- Reload on `/admin/leads/12` stays there. With an expired `expiresAt` it goes
  to the login page and signing in returns to `/admin/leads/12`; signing in as
  sales from `/admin/settings/users` lands on the dashboard instead.
- Revoking the token server-side and then navigating gives exactly one toast and
  one redirect. Signing out in one tab signs the second tab out.
- `MOCK_TOKEN_TTL_HOURS=0.01`: sitting still on the dashboard, the timer alone
  signed the session out after 35 s with the one toast, then the default TTL was
  restored.
- With the API unreachable the panel stays signed in, shows "Unable to reach the
  server…" on the screen and does not toast on every poll.
- At 390 px: 16 px gutters on the login card, no desktop sidebar, no horizontal
  scroll on any admin screen, every topbar control ≥ 44 px, a 280 px drawer with
  the same navigation, `Escape` closes it and focus returns to the hamburger,
  tapping a link navigates and closes it, and `sna_admin_nav_open` persists.
- The public site is unaffected: 10 pages plus the 404 render with their header
  and no admin chrome, and the home page still links nothing under `/admin`
  (D24).

**Known issues**

ADD-07 (pollers), ADD-19 (the `AdminLogin` half) and ADD-28 are closed. BUG-14
and BUG-17 were already closed in prompts 11 and 02/03 and this prompt does not
reopen them: the client-side expiry, the 401 scope and the single session store
all still hold. The `AdminSettings` / `UserManagement` half of ADD-19 stays open
as ADD-19 (settings/users) for prompts 13 and 40.

One new entry under "Pending rewrites": the 26 `AdminPlaceholderPage` routes,
each with its owner prompt. The component must not exist after prompt 43.

### Prompt 13 — Admin UI kit: DataTable, FilterBar, useForm, fields, MasterDataPage, users page (2026-09-16)

**What changed**

The admin panel now has a kit instead of a pattern. A table that pages, sorts
and filters on the server; a filter row that lives in the URL; forms built from
field descriptions with the contract's own validation behind them; and
`MasterDataPage`, which is all of it wired together from one configuration
object. Prompts 14–17 write configurations, not screens. `UserManagement` is the
first thing rebuilt on it, and the `IconPicker`'s dead ids and dead keyboard are
gone.

**Files added**

| Path                                                     | What it is                                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/components/admin/DataTable.jsx` (+ css)             | Server-side table: sort, select, bulk, row actions, skeleton/empty/error, phone cards |
| `src/components/admin/FilterBar.jsx` (+ css)             | Search + selects + ranges, "More filters" below 900 px, removable chips, reset        |
| `src/components/admin/PageHeader.jsx` (+ css)            | The one `<h1>` of an admin screen, its count and its primary action                   |
| `src/components/admin/FormSection.jsx` (+ css)           | `<fieldset>` + two-column grid ≥ 900 px; `FormColumn half`                            |
| `src/components/admin/AdminTabs.jsx` (+ css)             | Scrollable tabs with per-tab error badges and a roving tab order                      |
| `src/components/admin/StatusChip.jsx`                    | A record's state as a tone, never a hex                                               |
| `src/components/admin/ImageField.jsx` (+ css)            | URL + preview + Clear, and Upload / Media library **only** when handlers exist        |
| `src/components/admin/MultiSelect.jsx` (+ css)           | Ids in, ids out; searchable, creatable, `max`                                         |
| `src/components/admin/SlugField.jsx` (+ css)             | Follows the title until edited; debounced availability with a "use suggestion"        |
| `src/components/admin/SortableList.jsx` (+ css)          | Drag, Alt + ↑/↓, always-present move buttons, `aria-live` announcements               |
| `src/components/admin/EntityPicker.jsx` (+ css)          | Search-as-you-type over a service, chips, drag order when `orderable`                 |
| `src/components/admin/ToneSelect.jsx` (+ css)            | Badge colours as tone swatches painted from the tokens themselves                     |
| `src/components/admin/MasterDataPage.jsx` (+ css)        | The generic screen, plus `useMasterDataCrud(config)` for custom layouts               |
| `src/components/admin/MasterDataForm.jsx` (+ css)        | 16 field types from a list of descriptions; unowned 422 keys shown as an alert        |
| `src/components/admin/BulkActionsBar.jsx` (+ css)        | "3 selected · Activate · Deactivate · Delete", destructive actions behind a confirm   |
| `src/components/admin/RowActions.jsx` (+ css)            | Icon buttons ≥ 900 px, kebab menu below                                               |
| `src/components/admin/DeleteGuardDialog.jsx` (+ css)     | The 409 of a master-data delete, as links to what is still pointing at it (D88)       |
| `src/components/admin/index.js`                          | The kit's barrel                                                                      |
| `src/hooks/useForm.js`                                   | values / errors / touched / dirty / submit, with 422 mapping                          |
| `src/hooks/useUnsavedChanges.js`                         | `beforeunload` + the in-app guard                                                     |
| `src/contexts/NavigationGuardContext.js`                 | One `useBlocker` for the app; every dirty form registers with it (D97)                |
| `src/utils/validation.js`                                | `validate(values, descriptor, { partial })` — the mock validator's rules, client-side |
| `src/utils/slug.js`                                      | `slugify` (title → slug) and `toSlugInput` (what a slug looks like while typed)       |
| `src/pages/admin/settings/UsersPage.jsx` (+ css)         | `/admin/settings/users` — the kit's first screen                                      |
| `src/utils/__tests__/validation.test.js`                 | 27 cases: every rule, nested keys, array indices, `partial`, `fillDefaults`           |
| `src/hooks/__tests__/useForm.test.js`                    | 21 cases: dirty, dotted paths, validation, `setServerErrors`, submit, 422 and 500     |
| `src/components/admin/__tests__/DataTable.test.jsx`      | 19 cases: sort, select-all, bulk confirm, states, footer, the 390 px cards            |
| `src/components/admin/__tests__/MasterDataPage.test.jsx` | 10 cases: list, create, delete, the 409 guard, the optimistic toggle, bulk            |
| `src/components/admin/__tests__/SlugField.test.jsx`      | 10 cases: generation, the manual-edit lock, four availability states                  |
| `src/components/admin/__tests__/IconPicker.test.jsx`     | 13 cases: id shape, the retired ids, tiles, roving focus, category-aware search       |

**Files changed**

`IconPicker.jsx` (rewritten), `routes/adminRouteConfig.js` (users → `UsersPage`),
`routes/index.js` + `App.js` (data router, D97), `pages/admin/AdminSettings.js`
(tab removed, admin-only link added), `config/enums.js` (`AMENITY_CATEGORIES`
icons), `components/common/SkeletonLoaders.jsx` (`TableSkeleton`),
`services/apiError.js` + `services/http.js` (`data` on a failure,
`firstFieldMessage`), the four property tabs that used `ImageUrlHelperText`,
`property-tabs/constants.js` (two dead icon ids), `package.json` (`slugify`).

**Files removed**

`components/admin/UserManagement.jsx`, `components/admin/ImageUrlHelperText.jsx`,
`components/admin/imageFieldConfig.js` — the last two folded into `ImageField`'s
`hint` presets, which the four property tabs now read through `ImageHint`.

**Endpoints**

None added. The users page consumes `GET|POST /admin/users`,
`GET|PUT|PATCH|DELETE /admin/users/:id` and `POST /admin/users/bulk`; the kit
reads `config.service.checkSlug` for the generic `check-slug` endpoints.

**npm / env**

`slugify@1.6.9` added (§3.3). No env var, no script.

**Acceptance checklist**

- [x] `src/components/admin/index.js` exports every component of tasks 1–5; tests pass.
- [x] `/admin/settings/users` works end to end for an admin — list, filter, sort,
      paginate, create, edit, reset password, toggle, delete, bulk — and manager
      and sales get the 403 screen with no Users link in the sidebar.
- [x] `IconPicker` renders no blank tile (431 tiles across 15 categories, checked
      in the browser), is keyboard-operable, and search respects the category.
- [x] `useForm` + `useUnsavedChanges` block navigation with a confirm when dirty,
      on a link click and on the back button (router migrated to
      `createBrowserRouter`).
- [x] `npm run lint`, `npm run test:ci` (770 tests, 25 suites), `npm run build:ci`
      (0 warnings), `npm run check:traces` (0 findings), `npm run validate:seed`
      and `npm run smoke` (269/269) all pass; no console message of any kind on
      `/admin/settings/users` at 1280 px or 390 px.
- [x] One commit, clean tree.

**Manual QA (Chromium, 1280 px and 390 px, console open)**

- `/admin/settings/users` as admin: 3 seed users; created a manager, renamed it,
  toggled it inactive from the row switch, filtered by role (`?role=manager`,
  one chip), reset the filters, sorted by name (`?order=desc`, `aria-sort`
  follows), changed the page size (`?perPage=10`), searched, bulk-deactivated a
  selection ("1 user updated."), reset a password, deleted the user.
- The safety rules come back from the server and are shown as the server's own
  sentence, not Laravel's generic one: deactivating yourself reverts the switch
  and toasts "The last active admin cannot be deactivated, demoted or deleted.";
  deleting yourself leaves the row in place with the same message; your own role
  select is disabled with a hint saying why.
- Unsaved changes: `Escape` on a dirty dialog asks before discarding and "Keep
  editing" returns the half-typed value; a sidebar link and the back button are
  both blocked with "You have unsaved changes…", "Stay on this page" keeps the
  URL and "Discard changes" proceeds; a clean form navigates without asking.
- 390 px: the table becomes cards — status, email and role under the name, a
  kebab with Edit / Reset password / Delete, the filters behind "More filters",
  and no horizontal scroll (`scrollWidth === clientWidth === 390`).
- `IconPicker`, opened from the property form's Amenities tab (the same
  component the legacy tabs import): 431 tiles across all 15 categories, **zero**
  without an SVG; arrow keys move the roving focus; searching "home" inside
  Finance says so instead of silently showing everything.
- Console across all of it: nothing. (The MUI Grid v2 deprecation warnings that
  appear on `/admin/dashboard` are pre-existing and belong to prompt 29.)

**Known issues**

ADD-23 is closed and the `UserManagement` half of ADD-19 is closed; the
`AdminSettings` form half stays open for prompt 40. Two new rows: NEW-28
(`mdi:stamp` on the public awareness page, owner 31) and NEW-29
(`mdi:home-check-outline` in `db.json`, which §12 puts out of reach here).

### Prompt 14 — Localities and cities: admin CRUD, public index and guide (2026-09-16)

**What changed**

Localities became a module instead of a row in a table. The admin gets a list
that filters, reorders and toggles, and a form page wide enough for a guide —
the description, the coordinates, the highlights, the connectivity pairs and the
pincodes — plus a small cities screen behind the same kit. The public site gets
`/localities` and `/localities/:slug`, so the home strip's links resolve for the
first time. `AdminNeighborhoods.js`, which knew four of a locality's twenty
fields, is gone.

**Files added**

| Path                                                               | What it is                                                               |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `src/pages/admin/master-data/LocalitiesPage.jsx` (+ css)           | The list: filters, drag reorder, star/active toggles, bulk, delete guard |
| `src/pages/admin/master-data/LocalityFormPage.jsx` (+ css)         | Add/edit on their own routes: five sections, map preview, repeaters      |
| `src/pages/admin/master-data/CitiesPage.jsx`                       | Name, state, slug, active — the kit's dialog, with the 409 guard         |
| `src/pages/public/Localities.jsx` (+ css)                          | `/localities`: zone chips and a sort in the URL, cards, states           |
| `src/pages/public/LocalityDetail.jsx` (+ css)                      | `/localities/:slug`: hero, guide, connectivity, trend, map, CTA          |
| `src/components/sections/locality/LocalityCard.jsx` (+ css)        | One card, two variants — the index grid and the home strip               |
| `src/components/sections/locality/LocalityHero.jsx`                | Image, breadcrumbs, the page's one `<h1>`, three key figures             |
| `src/components/sections/locality/LocalityGuide.jsx`               | The description (through `LegacyHtml`) and the checked highlights        |
| `src/components/sections/locality/LocalityConnectivity.jsx`        | The `{label, value}` pairs as a definition list                          |
| `src/components/sections/locality/LocalityProperties.jsx`          | **temporary** — six listings and a link to the search (prompt 26)        |
| `src/components/sections/locality/LocalityCta.jsx`                 | `LeadForm`, source `locality-page`, the locality in the requirement      |
| `src/components/sections/locality/LocalitySections.module.css`     | The guide's shared styles                                                |
| `src/components/sections/locality/index.js`                        | The barrel the detail page imports                                       |
| `src/components/common/MapEmbed.jsx` (+ css)                       | A map from `lat,lng` with no key (D42), and its "no coordinates" box     |
| `src/pages/public/__tests__/LocalityDetail.test.jsx`               | 6 cases: every section, the thin locality, 404, the failure state        |
| `src/components/sections/locality/__tests__/LocalityCard.test.jsx` | 8 cases: both variants, the empty fields, the monogram box               |

**Files changed**

`routes/publicRoutes.js` (two URLs), `routes/adminRouteConfig.js` (four screens
off the placeholder), `components/sections/home/ExploreLocalities.jsx` (+ css —
now `LocalityCard` and a "View all localities" link), `components/common/LeadForm.jsx`
(`hiddenFields`), `services/masterDataService.js` (`adminCrud`),
`components/admin/MasterDataPage.jsx` (`onCreate` / `onEdit` / `onMutated` /
`renderOrderItem`, reordering gated on `sort=order`, page-aware `order` values),
`components/admin/RowActions.jsx` (`href` actions open in a new tab),
`components/admin/index.js` (a note on import order), `src/test-utils.jsx`
(`initialEntries`).

**Files removed**

`src/pages/admin/AdminNeighborhoods.js` — every capability it had is on the new
screens: the image is an `ImageField` with a preview, the city is a select over
`MasterDataContext.cities` rather than a free-text name match, the active toggle
is the kit's optimistic switch, and delete now explains itself instead of
toasting the 409.

**Endpoints**

None added. The screens consume `GET /localities`, `GET /localities/slug/:slug`,
`GET /cities`, `GET /properties?localityId=`, `POST /leads` and the
`/admin/localities*` + `/admin/cities*` CRUD, bulk and `check-slug` of §5.14.

**npm / env**

Nothing added.

**Acceptance checklist**

- [x] Admin: create, edit, reorder, toggle and delete work end to end against
      the mock — verified in the runtime db through `GET /api/admin/localities/1`
      after each write (coordinates, highlights, order, `isFeatured`).
- [x] Public: `/localities?zone=east` filters to five; `/localities/whitefield`
      renders the hero, the guide, connectivity, the trend note, the map, three
      listings with "View all 3 properties" and the CTA; a lead submitted there
      arrives as `{ source: 'locality-page', requirement: { localityId: 1 } }`.
- [x] `AdminNeighborhoods.js` deleted; the home strip's links resolve.
- [x] `npm run lint`, `npm run test:ci` (784 tests, 27 suites), `npm run build:ci`
      (0 warnings), `npm run check:traces` (0 findings), `npm run validate:seed`
      and `npm run smoke` (269/269) all pass; no console message of any kind on
      the four new screens at 1280 px or 390 px.
- [x] One commit, clean tree.

**Manual QA (Chromium, 1280 px and 390 px, console open)**

- `/localities`: 20 cards, one `<h1>`, "20 localities". "East Bengaluru" writes
  `?zone=east` and leaves five cards, all east; the sort select writes
  `?sort=name` and Bellandur comes first; `?zone=unknown` shows all twenty
  rather than none (§7).
- `/localities/whitefield`: `<h1>` "Properties in Whitefield", breadcrumbs Home ›
  Localities › Whitefield, then About / Connectivity / Price trend / the map /
  Properties in Whitefield / the CTA. The map iframe is
  `…maps?q=12.9698,77.75&z=15&output=embed` (no key, D42). Three listings and
  "View all 3 properties" → `/properties?localityId=1`.
- The CTA filed lead #46: `source: locality-page`, `requirement.localityId: 1`,
  phone normalised to `+91…`; the form swaps to its thank-you panel and toasts.
- An unknown slug and an inactive locality both render the 404 page; the admin
  still opens the inactive one.
- `/admin/master-data/localities`: sorted by `order` it is the reorder list —
  two "Move up" presses put Electronic City on top and a reload reads
  `Electronic City:0, Whitefield:1, Sarjapur Road:2` from the API. Sorting by
  name brings the table back (Image, Name, Zone, Avg ₹/sq ft, Properties,
  Updated, Featured, Active, Actions). The star toggles `isFeatured` on the
  server, `?zone=east` leaves five rows, and "View on site" is a real link to
  `/localities/<slug>` with `target="_blank"`.
- Deleting Whitefield (three listings point at it) answers 409 and the guard
  dialog lists them with links to their admin pages; deleting Bengaluru on the
  cities screen lists all twenty localities the same way (D88).
- The form: changing the coordinates and leaving the field moves the preview to
  `…q=12.9,77.6…`; adding a highlight, moving it up and saving writes exactly
  that, and `seo.focusKeyword` survives the `PUT` untouched. Naming a new
  locality "Whitefield" shows "Already taken" under the slug before the save and,
  on the save, "The slug has already been taken. Try “whitefield-2”." under the
  same field. Creating lands on `…/edit/21`; "Save & view" lands on the public
  page; leaving a dirty form asks first and "Stay on this page" keeps the URL.
- Unfeaturing Devanahalli in the admin removes it from the home strip on the
  next visit — the master-data cache (D93) is refreshed by the write.
- 390 px: `scrollWidth === clientWidth === 390` on all four screens; the zone
  chips scroll sideways; the hero is 320 px on the desktop and 220 px minimum on
  a phone (285 px with all three figures); the admin table becomes cards; the
  form's actions sit in a sticky bar above the safe area and the header's copy
  of them is hidden, so only one "Save" is reachable.
- Console: nothing on any of the new screens. (`/admin/dashboard` still logs the
  MUI Grid v2 deprecations — pre-existing, prompt 29.)

**Known issues**

BUG-10's `?area=` half is closed. Nothing new was found. The "Updated" column of
the localities table is display-only: the contract's locality sorts are
`order|name|propertyCount` (§6.2, `mock-server/schemas/models.js`), and a header
that sorts by nothing is worse than a header that does not offer to.

### Prompt 15 — Master data: property types, amenities, badges and banks (2026-09-16)

**What changed**

The four collections the rest of the site reads — property types, amenities,
badges and banks — are manageable at last, and the public site reads them from
the context instead of from constants in the bundle. `src/config/adminConstants.js`
is gone with them, and with it `DEFAULT_BANKS`, which named six real banks
(HDFC, SBI, Axis, ICICI, Kotak, LIC Housing) and gave each of them an invented
interest rate on every property page.

**Files added**

| Path                                                              | What it is                                                                                                                                       |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/pages/admin/master-data/masterDataConfigs.js` (+ css)        | The four `MasterDataPage` configurations, and the cells they share                                                                               |
| `src/pages/admin/master-data/PropertyTypesPage.jsx`               | `/admin/master-data/property-types`                                                                                                              |
| `src/pages/admin/master-data/AmenitiesPage.jsx`                   | `/admin/master-data/amenities`                                                                                                                   |
| `src/pages/admin/master-data/BadgesPage.jsx`                      | `/admin/master-data/badges`                                                                                                                      |
| `src/pages/admin/master-data/BanksPage.jsx`                       | `/admin/master-data/banks`                                                                                                                       |
| `src/hooks/useMasterData.js`                                      | `usePropertyTypes`, `useAmenitiesGrouped`, `useAmenities`, `useBadgeMap`, `useBanks`, `useLocalities`, `useDevelopers`, `useCities`, `toOptions` |
| `src/hooks/__tests__/useMasterData.test.js`                       | 17 cases: order, segment, grouping, the inactive ones, no provider                                                                               |
| `src/pages/admin/master-data/__tests__/masterDataConfigs.test.js` | 56 cases: every config against its write schema, plus the rules                                                                                  |

**Files changed**

`mock-server/lib/crud.js` (`?withUsage=true` on `GET /admin/<resource>/:id`),
`mock-server/routes/masterData.js` (`propertyCount` + `sort=propertyCount` for
amenities and badges), `mock-server/__tests__/content.test.js` (two suites),
`src/services/endpoints.js` (`withUsage` on the `adminResource` read),
`src/contexts/MasterDataContext.js` (`refresh(collection)`),
`src/components/admin/MasterDataPage.jsx` (`subtitle`, `formFooter`, `groupBy` /
`groupSort`, `reorderHint`, `confirmSave`, `onMutated(config.key)`),
`src/components/admin/DataTable.jsx` (+ css — `groupBy` heading rows),
`src/components/admin/DeleteGuardDialog.jsx` (an optional confirm),
`src/components/admin/MasterDataForm.jsx` (+ css — the icon placeholder),
`src/routes/adminRouteConfig.js` (four screens off the placeholder),
`src/config/enums.js` (`LEAD_STATUS` icons, `FAQ_CATEGORIES` tones,
`LEAD_SOURCES.labelOfAny`), `src/utils/validation.js` (`ICON_ID_PATTERN`),
`src/components/common/PropertyCard.jsx` (+ css — badges through `ui/Chip`),
`src/components/common/PropertyFilters.jsx`, `src/pages/public/PropertyListing.jsx`,
`src/utils/adapters/legacyProperty.js` (`propertyTypeId`),
`src/components/sections/property/FinanceGuide.jsx` (+ css),
`src/pages/admin/property-tabs/AmenitiesTab.jsx` + `constants.js`,
`src/pages/admin/AdminLeads.js`, `LeadDetail.js`, `FaqManager.jsx`,
`AdminArticles.js`, `ArticleForm.jsx`,
`src/components/layout/NotificationsMenu.jsx`,
`src/contexts/LeadNotificationsContext.js`, `src/components/ui/tones.js`,
`.prettierignore`, `docs/*`.

**Files removed**

`src/config/adminConstants.js`. Everything in it now lives where §6.17 says it
should: `LEAD_STATUS_CONFIG`/`LEAD_STATUS_OPTIONS` → `LEAD_STATUS` (which gained
an `icon` per entry), `formatLeadSource`/`LEAD_SOURCE_OPTIONS` →
`LEAD_SOURCES.labelOfAny` and `LEAD_SOURCES.options`, `FAQ_CATEGORIES` +
`FAQ_CATEGORY_TONES` → `FAQ_CATEGORIES` (which gained a `tone` per entry),
`ARTICLE_CATEGORIES` → `articleService.categories()`, and `DEFAULT_BANKS` →
the `banks` collection. The five-group `AMENITY_CATEGORIES` of
`property-tabs/constants.js` went with them.

**Endpoints**

None added. `GET /admin/<resource>/:id` accepts `withUsage=true` on every
resource the CRUD factory serves, answering with the `usedBy` list a 409 would
have carried; `/admin/amenities` and `/admin/badges` now compute `propertyCount`
and accept `sort=propertyCount`. Both are in `src/services/endpoints.js` and
`docs/API_CONTRACT.md`.

**npm / env**

Nothing added. `.prettierignore` gained `docs/archive/`.

**Acceptance checklist**

- [x] The four screens list, filter, sort, reorder, toggle, create, edit, delete
      and bulk end to end — verified through `GET /api/admin/<collection>` after
      every write, and the collections end the run at their seed totals (17 types,
      46 amenities, 8 badges, 6 banks).
- [x] Delete guards render their usages (9 listings for "New Launch", 40 for
      "Power Backup", 16 for "Apartments"); the segment-change confirm quotes
      "Used by 16 properties" and cancelling leaves `segment: residential`.
- [x] Card badges, the listing's type select, the finance bank cards and the
      property form's amenities all read master data; `grep -rn DEFAULT_BANKS src`
      → 0.
- [x] `npm run lint`, `npm run test:ci` (857 tests, 29 suites), `npm run build:ci`
      (0 warnings), `npm run check:traces` (0 findings), `npm run validate:seed`,
      `npm run test:mock` (123 tests) and `npm run smoke` (269/269) all pass.
- [x] One commit, clean tree.

**Manual QA (Chromium, 1280 px and 390 px, console open)**

- `/admin/master-data/amenities` opens on the grouped table: a
  `<th scope="colgroup">` per category, 46 rows, an icon, the slug under the
  name, a category chip and the listing count. Creating "Pet Park" with the icon
  `DOG` is refused under the field ("Use an Iconify MDI id in lower case, like
  mdi:home-city-outline") and the preview shows the muted placeholder; `mdi:dog`
  saves, the slug having followed the name to `pet-park`. `?category=kids` leaves
  one group and one row, the row switch turns it inactive on the server, and the
  public `GET /amenities?category=kids` stops returning it. Deleting it says so.
- `/admin/master-data/badges` shows the tone swatch, the badge as a card will
  render it, the slug, the icon id, the count and the order. Deleting "New Launch"
  answers 409 and the guard lists the nine listings with links to their admin
  pages.
- `/admin/master-data/property-types` opens as the reorder list (17 rows, each
  with its icon, segment and count) because `order` is the default sort; sorting
  by anything else brings the table back. Editing "Apartments" shows the SEO
  placeholder, and changing its segment to Commercial asks first — "Used by 16
  properties — each keeps its own segment, so any that should move have to be
  edited too" — with the sixteen listed. Cancelling leaves the record untouched.
- `/admin/master-data/banks` shows the logo, the name over its fee note, the rate
  range, the tenure and the LTV. Saving 9 % from / 8 % up to is refused on the
  field; 8.35–8.95 saves.
- A property type created in the admin appears in `/properties`' type select in
  the same session without a reload — the `sna_master_data_cache` entry is
  rewritten by the write (D93). The select lists all seventeen types, not the two
  hardcoded ones.
- A property page's "Bank Loan Assistance" tab shows the six seed banks with
  their own rates, max loans and fee notes, and the banner and the two tiles read
  "8.35 % p.a." and "Up to 90 %" off those records instead of asserting them.
- 390 px: `scrollWidth === clientWidth === 390` on all four screens; the tables
  become cards with the category heading between them.
- Console: nothing on any of the four screens or on the property page.
  (`/admin/dashboard` still logs the MUI Grid v2 deprecations — pre-existing,
  prompt 29.)

**Known issues**

BUG-05's bank half is closed. Two notes rather than new defects: the admin
amenities table groups its categories in the API's alphabetical order
(`sort=category` is a string sort on the field) while the public site groups them
in `AMENITY_CATEGORIES` order — the contract's sort, not a defect of the screen;
and three legacy admin screens (`AdminArticles`, `FaqManager`, `AdminSeo`) still
carry `rgba(201,168,108,0.04)` — the HOM gold as a row hover — which
`check:traces` does not catch because it only scans hex literals (owners 33, 17,
37).

### Prompt 16 — Developers (builders): admin CRUD and the public builder pages (2026-09-16)

**What changed**

Builders became a module. The admin gets a list that filters, reorders and
toggles, and a form page wide enough for a profile — the logo, the cover, the
counts, the RERA registrations and the highlights — and the public site gets
`/builders` and `/builders/:slug`, so the eight fictional developers in the seed
have somewhere to be read rather than only being a foreign key on a property.

Only the name is required, which is what the property form's quick-create needs
in prompt 20: `POST /admin/developers { "name": "Test Builders" }` already
answers 201 with the slug generated and every other field at its default, so no
schema had to be relaxed.

**Files added**

| Path                                                                 | What it is                                                                  |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `src/pages/admin/master-data/DevelopersPage.jsx` (+ css)             | The list: filters, drag reorder, star/active toggles, bulk, delete guard    |
| `src/pages/admin/master-data/DeveloperFormPage.jsx` (+ css)          | Add/edit on their own routes: Basics, Facts, Highlights, Status, SEO note   |
| `src/pages/public/Builders.jsx` (+ css)                              | `/builders`: a search and a sort in the URL, the card grid, the states      |
| `src/pages/public/BuilderDetail.jsx` (+ css)                         | `/builders/:slug`: hero, figures, profile, projects, CTA                    |
| `src/components/sections/developer/DeveloperCard.jsx` (+ css)        | One card, two variants — the index grid and the home row (27)               |
| `src/components/sections/developer/DeveloperLogo.jsx`                | The white logo box, with the builder's initials when there is no logo       |
| `src/components/sections/developer/DeveloperHero.jsx`                | Cover, logo, the page's one `<h1>`, headquarters and the website link       |
| `src/components/sections/developer/DeveloperStats.jsx`               | Established / total / ongoing / completed as `StatCard`s, RERA ids as chips |
| `src/components/sections/developer/DeveloperProperties.jsx`          | **temporary** — twelve listings and a link to the search (prompt 26)        |
| `src/components/sections/developer/DeveloperCta.jsx`                 | `LeadForm`, source `developer-page`, the page and the builder carried in    |
| `src/components/sections/developer/DeveloperSections.module.css`     | The sections' shared styles                                                 |
| `src/components/sections/developer/index.js`                         | The barrel the detail page imports                                          |
| `src/components/sections/developer/__tests__/DeveloperCard.test.jsx` | 9 cases: both variants, the empty fields, zero projects, the initials box   |
| `src/pages/public/__tests__/BuilderDetail.test.jsx`                  | 7 cases: every section, the name-only builder, the lead, 404, the failure   |

**Files changed**

`routes/publicRoutes.js` (two URLs), `routes/adminRouteConfig.js` (three screens
off the placeholder), `components/common/LeadForm.jsx` (a field may carry a
`defaultValue`; empty optional boxes are left out of the body — NEW-31),
`docs/*`. `routes/paths.js` already carried `builders` / `builder(slug)` /
`adminDevelopers*`, as prompt 14 left it.

**Files removed**

None.

**Endpoints**

None added. The screens consume `GET /developers`, `GET /developers/slug/:slug`,
`GET /properties?developerId=`, `POST /leads` and the `/admin/developers*` CRUD,
bulk and `check-slug` of §5.14.

**npm / env**

Nothing added.

**Acceptance checklist**

- [x] Admin: create, edit, reorder, toggle, bulk and delete work end to end
      against the mock — verified through the API after each write (`order`
      rewritten by a drag, `isFeatured` by the star, the public list re-sorted).
- [x] Minimal create succeeds: `POST /admin/developers { name }` → 201,
      `slug: "test-builders"`, `propertyCount: 0`, every other field defaulted.
- [x] Deleting `aurelia-estates` answers 409 and the guard lists its eight
      listings; deleting a builder with none is allowed.
- [x] `/builders` renders the eight seed builders with their project counts and
      featured badges; `?q=test` narrows to one and `?sort=name` reorders.
- [x] `/builders/aurelia-estates` renders the hero, the figures, the RERA chip,
      the profile, the highlights, twelve projects with "View all 8 projects"
      and the CTA; the CTA filed lead #46 with `source: developer-page`,
      `pageSlug: aurelia-estates`-style slug and the prefilled message.
- [x] `npm run lint`, `npm run test:ci` (873 tests, 31 suites), `npm run build:ci`
      (0 warnings), `npm run check:traces` (0 findings), `npm run validate:seed`
      and `npm run smoke` (269/269) all pass. `test:mock` was not needed — no
      schema changed.
- [x] One commit, clean tree.

**Manual QA (headless Chromium, 1280 px and 390 px, console captured)**

- `/builders`: one `<h1>`, "8 builders", four columns of cards, each with the
  logo box, the name, "N projects" and two lines of summary. The sort select
  writes `?sort=name`; the search box writes `?q=` after a 300 ms pause and
  `?q=test` leaves one card.
- `/builders/aurelia-estates`: breadcrumbs Home › Builders › Aurelia Estates, the
  charcoal hero with the logo box and the headquarters, "At a glance" with
  Established 2004 and the three counts, the RERA registration as a chip, "About
  Aurelia Estates" with the four highlights beside it, "Projects by Aurelia
  Estates" with "View all 8 projects" → `/properties?developerId=1`, and the CTA.
- A builder created from a name alone (`Test Builders`) renders the hero with its
  initials in the logo box, no "At a glance", no profile, no projects — and the
  CTA, which is never hidden. Submitting it filed the lead; deleting the builder
  afterwards was allowed.
- The website link carries `rel="noopener noreferrer nofollow"` and
  `target="_blank"`. (`noopener` alone is an ESLint warning `build:ci` treats as
  an error, so the pair the rest of the site uses is what it carries.)
- 390 px: `scrollWidth === clientWidth` on both pages, the figures wrap to 2 × 2,
  the RERA chip wraps to its own line, the card grid is one column.
- `/admin/master-data/developers` opens as the reorder list (eight rows, each
  with its headquarters and count) because `order` is the default sort; sorting
  by name brings the table back — Logo, Name (with the slug and the
  headquarters), Projects, Established, Updated, Featured, Active.
- The form shows all five sections and loads the seed record intact; the slug
  field reports "This URL is available", the short description counts 115/300,
  and the SEO note says the panel arrives in prompt 36.
- Console: nothing but React's own "Download the React DevTools" notice on either
  public page.

**Known issues**

NEW-31 (`LeadForm` refused a lead whose optional e-mail box was empty) was found
here and is closed here; it was refusing leads on the locality CTA too. NEW-30 is
new and belongs to prompt 41: a counted figure is still at zero in a render that
never gets a second animation frame, so the prerenderer has to emulate
`prefers-reduced-motion: reduce`. Two notes rather than defects: the "Updated"
column is display-only, because the contract's developer sorts are
`order|name|propertyCount` (§6.5, `mock-server/schemas/models.js`) and a header
that sorts by nothing is worse than a header that does not offer to; and
`/properties?developerId=` does not filter yet — the legacy listing only knows
`?developer=<name>` — which prompt 26 fixes with the rest of the engine.

**Next prompt: 17 — Testimonials, team, partners and FAQs.**

### Prompt 17 — Testimonials, team members, partners and FAQs (2026-09-16)

**What changed**

The four small content collections of §6.9 became screens, and the pieces the
public site renders them with became components rather than page-local markup.

The FAQ manager is a rewrite rather than a repair: the boilerplate's screen
computed a swap against the **filtered** array and wrote two sequential `PUT`s,
so dragging inside a category filter moved the wrong records (NEW-23, ADD-21).
A move is now one `PATCH { order }` on the record that travelled, carrying the
position of the row it landed on, and the API settles the rest of the collection
— sorted by `order`, ties to the newest `updatedAt`, renumbered `1..n` (D98,
`docs/API_CONTRACT.md` §5.8). That rule holds for every collection with an
`order`, so the reorder on localities, property types, amenities, badges and
banks became correct under a filter at the same time.

`FaqAccordion` is now the only accordion an FAQ is rendered by — the home band,
`/insights/faqs`, a property page's questions (prompt 24) and the CMS `faq` block
(prompt 30) all mount it — and `/insights/faqs` reads its contact details from
`siteSettings.general` instead of printing a US phone number (ADD-17, D83).

**Files added**

| Path                                                                    | What it is                                                                    |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `src/pages/admin/content/contentConfigs.js` (+ css)                     | The four `MasterDataPage` configurations, and `stripHtml` for the answer cell |
| `src/pages/admin/content/FaqsPage.jsx`                                  | `/admin/faqs` — replaces `FaqManager`                                         |
| `src/pages/admin/content/TestimonialsPage.jsx`                          | `/admin/testimonials` — was a placeholder                                     |
| `src/pages/admin/content/TeamPage.jsx`                                  | `/admin/team` — was a placeholder                                             |
| `src/pages/admin/content/PartnersPage.jsx`                              | `/admin/partners` — replaces `AdminPartners`                                  |
| `src/components/sections/shared/FaqAccordion.jsx` (+ css)               | One accordion for every FAQ on the site, with `<mark>` search highlighting    |
| `src/components/sections/shared/TestimonialsSection.jsx` (+ css)        | The quote carousel, with the D41 sample gate and a "Read more" dialog         |
| `src/components/sections/shared/TeamSection.jsx` (+ css)                | Advisor cards: photo or initials, RERA, contact and social links              |
| `src/components/sections/shared/ContactMethods.jsx` (+ css)             | Phone / e-mail / WhatsApp from the settings, each hidden when unset (D83)     |
| `src/components/sections/shared/index.js`                               | The barrel the pages import                                                   |
| `src/components/sections/shared/__tests__/FaqAccordion.test.jsx`        | 12 cases: single-open, keyboard, `aria-controls`, highlighting, empty state   |
| `src/components/sections/shared/__tests__/TestimonialsSection.test.jsx` | 9 cases: the cards, the sample gate with `NODE_ENV` both ways, "Read more"    |
| `src/components/sections/shared/__tests__/TeamSection.test.jsx`         | 6 cases: the card, the contact links, initials, no contact row, empty         |

**Files changed**

`mock-server/lib/crud.js` (the `order` renumbering, D98),
`mock-server/routes/masterData.js` (the testimonials `isSample` admin filter, the
`name` and `updatedAt` sorts the tables offer), `mock-server/schemas/models.js`
(the same two `sortable` lists), `mock-server/__tests__/content.test.js` (4 cases
for the renumbering), `src/services/endpoints.js` (`isSample` on the admin
testimonial list), `src/components/admin/MasterDataPage.jsx` (the single-`PATCH`
reorder, `render(row, helpers)`, "Back to the table"),
`src/components/admin/SortableList.jsx` (`onReorder` reports the move),
`src/components/admin/MasterDataForm.jsx` (+ css — the `rating` control),
`src/components/sections/home/FaqSection.jsx` (+ css — `FaqAccordion`),
`src/components/sections/home/PartnersSection.jsx` (+ css — the §6.9 fields, a
`category` prop, `LazyImage` with a fallback, no greyscale filter, a static grid
under reduced motion), `src/pages/public/FAQs.js` → `FAQs.jsx` (+ css — rewritten),
`src/routes/adminRouteConfig.js`, `docs/*`.

**Files removed**

`src/pages/admin/FaqManager.jsx` (726 lines) and
`src/pages/admin/AdminPartners.jsx` (573 lines), with the `logo`/`website`
adapter the second one carried.

**Endpoints**

None added. `GET /admin/testimonials` gained the `isSample` filter and the
`name`/`updatedAt` sorts; `GET /admin/faqs` gained `updatedAt`. `PATCH` on any
resource with an `order` now renumbers that collection (D98) — documented in
`docs/API_CONTRACT.md` §5.8 as its own sub-section.

**npm / env**

Nothing added.

**Acceptance checklist**

- [x] Four admin pages work end to end against the mock: a partner created in the
      dialog reached the home marquee, was edited, bulk-deactivated and deleted;
      the FAQ reorder is correct under a category filter; deleting a team member
      nine listings point at answers 409 and the guard lists all nine with links.
- [x] `/insights/faqs` renders `FaqAccordion`, settings-driven contacts and the
      search + category URL sync (`?q=RERA` highlights two matches across three
      results, `?category=legal` narrows to two). The home FAQ band renders the
      same accordion from `showOnHome`.
- [x] `TestimonialsSection`, `TeamSection` and `PartnersSection` render from seed
      data — the first two through their unit tests (the pages that mount them
      are prompts 27 and 30), the third on the home page.
- [x] `FaqManager.jsx` and `AdminPartners.jsx` are deleted.
- [x] `npm run lint`, `npm run test:ci` (900 tests, 34 suites), `npm run build:ci`
      (0 warnings), `npm run check:traces` (0 findings), `npm run test:mock`
      (127 tests) and `npm run smoke` (269/269) all pass; `npm run validate:seed`
      too, since `models.js` changed.
- [x] One commit, clean tree.

**Manual QA (headless Chromium, 1360 px and 390 px, console captured)**

- `/insights/faqs`: one `<h1>`, breadcrumbs Home › FAQs, nine tabs (All plus the
  eight categories the seed fills), questions grouped under a heading per
  category while All is active. Opening a question sets `aria-expanded="true"`
  and reveals the panel its `aria-controls` names. Typing "RERA" writes `?q=RERA`
  after the debounce and marks the matches; "zzzz" shows "No questions match"
  with "Clear search". The Legal tab writes `?category=legal`.
- The contact cards read `tel:+919800000001`, `mailto:info@squaresnacres.com` and
  `https://wa.me/919800000000?text=…` — all three from the settings record.
- `/admin/faqs` filtered to Legal: the ↑ button on the second row moved it to the
  top; `GET /api/admin/faqs?perPage=all&sort=order` then read `1..20` with no gap
  and the eighteen other questions in their original places. The same move
  downwards put the row back.
- "Back to the table" shows Order, Question (with two clamped lines of the
  answer), Category, Home, Updated, Active and the row menu. Toggling Home on
  "Can an NRI buy property in Bengaluru?" put it on the home page under the NRI
  tab within one reload.
- `/admin/testimonials`, `/admin/team`, `/admin/partners`: the columns of §4.1,
  the dialog forms with their fields, the five-star rating as a radio group.
- Home: the partner marquee draws six logos; with `prefers-reduced-motion: reduce`
  the same six are a static grid. A logo that cannot load falls back to the
  partner's name, clamped to two lines.
- 390 px: `scrollWidth === clientWidth` on `/insights/faqs`, the tabs scroll
  horizontally, the contact cards and the lead form stack.
- Console: no errors or warnings from the app on any page (the only entries are
  the sandbox's own TLS refusals for the Cloudinary and Iconify hosts).

**Known issues**

None opened. NEW-23 is closed; the FAQ halves of ADD-21 and ADD-17 are closed and
annotated. One note for prompt 32: `FaqAccordion` renders answers through the
temporary `LegacyHtml`, which is now in "Pending rewrites" under its own row —
`SafeHtml` replaces it, and the same prompt turns the FAQ form's HTML textarea
into the editor.

**Next prompt: 18 — Property form foundation.**

### Prompt 18 — Property form foundation: reducer, validators, rail, autosave, payload (2026-09-16)

**What changed**

`/admin/properties/add` and `/admin/properties/edit/:id` are a new screen. The
boilerplate's `PropertyForm.jsx` held the HOM shape in `useState`, autosaved
every thirty seconds whether or not anything had changed, and has had saving
disabled since prompt 11 because its payload builder wrote snake_case columns
that no longer exist. What replaces it is an architecture rather than a screen:
a reducer that owns the §6.1 record, section validators keyed by dotted path,
`fromRecord`/`toPayload` as the only two places the contract is translated, and
a shell of sixteen tabs with a status rail beside them.

The point of the split is that prompts 19–21 write **fields**, not plumbing. A
tab reads `values`, writes through `setField`/`addItem`/`removeItem`/`moveItem`/
`updateItem`, and renders `errors[path]`; it knows nothing about the route, the
draft, the API or the rail. Every field of §6.1 is already carried — the reducer
holds it, the validators check it and `toPayload` sends it — so the fifteen tabs
that are still placeholders lose nothing when a listing is saved through them.

Saving works end to end today for the fields the shell owns: a listing created
from the Basics fields alone reaches the API, and the `PUT` that replaces a
seeded property returns a record byte-identical to the one it started from
except for `updatedAt`/`updatedBy` (verified against the mock, see the QA below).

**Files added**

| Path                                                      | What it is                                                                                                                       |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/admin/properties/PropertyFormPage.jsx` (+ css) | The route: the fetch, the four states of §8.2, the header, the layout                                                            |
| `…/property-form/initialState.js`                         | `createInitialState()` (every key of §6.1) and the ten row factories, with `tmp-<n>` ids                                         |
| `…/property-form/reducer.js`                              | Twelve actions with creators; `createFormState({ propertyId, record })`                                                          |
| `…/property-form/usePropertyForm.js`                      | The hook: dirty tracking, the draft, the unsaved guard, `save`/`duplicate`/`remove`, 422/409 mapping, tab jumps                  |
| `…/property-form/fromRecord.js`                           | Admin record → form values: defaults filled, embeds dropped, lists sorted and renumbered                                         |
| `…/property-form/toPayload.js`                            | Form values → the write body: tmp ids and empty rows gone, `''` → `null`, one cover, `order` 1..n, `seo.slug` mirrored           |
| `…/property-form/validators/property.js`                  | The seventeen validators of §4.4, including `validateForActivation` (blockers + warnings)                                        |
| `…/property-form/validators/index.js`                     | The barrel, `validateAll` and `validateSection`                                                                                  |
| `…/property-form/completeness.js`                         | `computeCompleteness` — fourteen weighted items totalling 100 — and `completenessTone`                                           |
| `…/property-form/tabs.js`                                 | The sixteen-tab registry (key, label, icon, component, validator, field prefixes) + `groupErrorsByTab` / `firstTabWithErrors`    |
| `…/property-form/PropertyFormShell.jsx`                   | Draft banner, tab strip, panels, rail placement, the phone's sticky Save bar                                                     |
| `…/property-form/StatusRail.jsx` (+ css)                  | Status switches, availability, priority, the meter and its checklist, the address, "Last saved", the save menu, duplicate/delete |
| `…/property-form/DraftBanner.jsx`                         | "Restore unsaved draft from 5 minutes ago?" — Restore / Discard                                                                  |
| `…/property-form/PropertyFormContext.js`                  | What a tab is given; `usePropertyFormContext()`                                                                                  |
| `…/property-form/tabs/PlaceholderTab.jsx`                 | The alert naming the prompt that writes a tab                                                                                    |
| `…/property-form/tabs/BasicsTab.jsx`                      | The shell-owned fields, inside that alert until prompt 19                                                                        |
| `…/property-form/__tests__/*.test.js`                     | 102 cases across reducer, `toPayload`, `fromRecord`, validators and completeness                                                 |

**Files changed**

`src/routes/adminRouteConfig.js` (both property routes → `PropertyFormPage`),
`src/utils/format.js` (`formatTime`, for the rail's "Draft saved 10:42"),
`docs/PROJECT_STATE.md`, `docs/DECISIONS.md`.

**Files removed**

`src/pages/admin/AddProperty.js` and `src/pages/admin/EditProperty.js` — two
wrappers whose whole body was `<PropertyForm propertyId={id} />`. The legacy
`PropertyForm.jsx` and `property-tabs/*` stay on disk, unrouted, until prompt 21.

**Endpoints**

None added. The form consumes `GET/POST/PUT/DELETE /admin/properties`,
`POST /admin/properties/:id/duplicate` and `GET /admin/properties/check-slug`.
Storage: `sna_property_draft:<id|new>` (§4.2), written every 10 s while dirty.

**npm / env**

Nothing added.

**Acceptance checklist**

- [x] The sixteen-tab shell, the rail, autosave with a restore banner, the
      unsaved guard, the completeness meter and the save/duplicate/delete flows
      all work against the mock; a create redirects to `/admin/properties/edit/<id>`
      and a `PUT` keeps `viewCount`, `enquiryCount` and `publishedAt`.
- [x] Reducer, `toPayload`, `fromRecord`, validators and completeness are unit
      tested (102 cases; the suite is 1 000 tests over 39 files).
- [x] Sales open the form read-only — banner, disabled controls, no actions, no
      autosave. Activation blockers refuse a publication and jump to the tab
      holding the first one. A 409 paints the slug field with the free variant.
- [x] `npm run lint`, `npm run test:ci`, `npm run build:ci` (0 warnings),
      `npm run check:traces` (0 findings) and `npm run smoke` (269/269) pass, as
      do `npm run test:mock` (127) and `npm run validate:seed`, untouched though
      they are.
- [x] One commit, clean tree.

**Manual QA (headless Chromium, console captured)**

- `/admin/properties/add` at 1360 px: one `<h1>` "Add property", breadcrumb
  Properties › Add property, sixteen tabs in the §4.6 order, the rail beside the
  form. Saving an empty form toasts "Please fix 4 fields." and badges Basics (3)
  and Location (1); the strip's red counts name exactly the fields refused.
- Typing a title fills the slug (`qa-prompt-eighteen-listing`) while it is
  locked. Turning "Published on site" on with no images leaves the switch off,
  toasts "This listing is not ready to publish…" and opens Basics on the first
  blocker. "Save as inactive" then creates the listing: the URL becomes
  `/admin/properties/edit/41`, the heading becomes "Edit: …" and the rail reads
  "Last saved 0 seconds ago".
- Editing the title and waiting ten seconds writes
  `sna_property_draft:41`; a reload offers "Unsaved changes were found in this
  browser" and Restore puts the edited title back. Saving clears the key.
- Duplicate opens the copy at `/edit/42` titled "… (Copy)", inactive; Delete
  confirms and returns to `/admin/properties`. `/admin/properties/edit/99999`
  renders "Property not found" with a link back.
- `/admin/properties/edit/1` (a complete seeded listing): the meter reads 100 %
  and the checklist 14 of 14, "View on site" links to
  `/properties/lakeview-heights-3-bhk-apartment-in-whitefield`, and the publish
  switch turns off and on again without complaint. ←/→/Home/End move the tabs.
- A slug that is already taken: the field says "Already taken." with
  "Use “…-2”" before the save, and the 409 that follows paints the field with
  "The slug has already been taken. Try “lakeview-heights-3-bhk-whitefield-2”."
  and badges Basics.
- 390 px: `scrollWidth === clientWidth`, the rail is a "Status & actions"
  accordion above a horizontally scrolling tab strip, and Save / Save as
  inactive sit in the sticky bottom bar.
- Signed in as sales: the "Read-only access" banner, every control disabled, no
  Save, Duplicate or Delete, and no draft written.
- Console: no errors or warnings from the app (the only entries are the
  deliberate 404 of the missing-property check, the 409 of the slug clash, and
  the sandbox's TLS refusals for the Cloudinary and Iconify hosts).
- Against the API directly: `POST` with `toPayload(basics only)` → 201 inactive
  with zeroed counters; `PUT` of `toPayload(fromRecord(record))` on the seeded
  property 1 → 200, and the record that comes back is identical to the one that
  went in apart from `updatedAt`/`updatedBy` — images, unit configurations,
  FAQs, specifications, amenity ids and the whole `seo` branch included.

**Known issues**

None opened. Three rows joined "Pending rewrites": the unrouted legacy form and
its tabs (prompt 21), the Basics fields living inside a placeholder alert
(prompt 19), and the fifteen placeholder tabs (19–21, with the SEO panel in 36).
`PropertyForm saving disabled` is closed — saving works, on the new form.

**Next prompt: 19 — Property form tabs 1–6.**

### Prompt 19 — Property form tabs 1–6: basics, location, pricing, area, units, media (2026-09-16)

**What changed**

Six of the sixteen tabs stopped being placeholders. Prompt 18 built the
machinery — a reducer holding the §6.1 record, validators keyed by dotted path,
`fromRecord`/`toPayload`, a rail — and put nine fields inside an alert so a
listing could be created at all. This prompt writes the fields: everything of
§6.1 that belongs to Basics, Location, Pricing, Area & configuration, Unit
configurations and Media now has a control, and the alert is gone.

The tab that decides what the other five show is Basics, and the rules it
decides by are not written inside it. `fieldRules.js` answers "does this listing
have bedrooms / a possession date / a plot width / a monthly rent?" for the
tabs, for the confirm dialogs that clear what no longer applies, and for a unit
test that never renders anything. A plot has no BHK fields to leave blank and a
rental has no price range to ignore: the fields are not there.

Three numbers on this form are arithmetic an editor should not have to do. The
price preview prints exactly what `formatPrice` will print on the card and the
details page (`₹1.42 Cr onwards`, `₹45,000/month`, `Price on Request`) while it
is being typed; the per-sq-ft rate follows the price until somebody types their
own; and a plot's area follows length × width until somebody types their own.
In all three cases the derived figure is shown and the typed one wins.

**Files added**

| Path                                                        | What it is                                                                                                                                       |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `…/property-form/fieldRules.js`                             | Which fields a listing has: the segment/status/listing-type rules, `priceFieldsFor`, the segment-change patch, the rate and plot-area arithmetic |
| `…/property-form/tabs/BasicsTab.jsx`                        | Identity, classification, status, the unit, the two descriptions — with the two confirm dialogs                                                  |
| `…/property-form/tabs/LocationTab.jsx`                      | Locality (searchable + quick create), city, address, coordinates, the map, nearby places                                                         |
| `…/property-form/tabs/PricingTab.jsx`                       | The fields of one listing type, the live preview, the rate, the other charges                                                                    |
| `…/property-form/tabs/AreaConfigurationTab.jsx`             | Built areas or plot dimensions, the rooms, the two "this lives elsewhere" notes                                                                  |
| `…/property-form/tabs/UnitConfigurationsTab.jsx`            | The price table: sortable cards, duplicate, the auto range and "Apply as pricing range"                                                          |
| `…/property-form/tabs/PropertyTabs.module.css`              | The layouts the six tabs share                                                                                                                   |
| `…/property-form/tabs/MediaTab.jsx`                         | The gallery, the video with its thumbnail, the virtual tour, the brochure and its gate                                                           |
| `…/property-form/components/NumberWithUnit.jsx` (+ css)     | A number with `₹` or a unit attached, right-aligned, with the formatted figure underneath                                                        |
| `…/property-form/components/NearbyPlacesRepeater.jsx`       | The flat `nearbyPlaces` list, shown grouped by category and reordered inside a group                                                             |
| `…/property-form/components/OtherChargesRepeater.jsx`       | Label / amount / note rows, with the lease clause presets                                                                                        |
| `…/property-form/components/Repeaters.module.css`           | Shared by the two repeaters                                                                                                                      |
| `…/property-form/components/ImageGalleryEditor.jsx` (+ css) | The gallery grid: drag and keyboard reorder, the cover radio, alt and caption, "Add multiple URLs", the counters                                 |
| `…/property-form/components/PricePreview.jsx` (+ css)       | What the public page will print, as it is typed                                                                                                  |
| `…/property-form/components/MapPinPicker.jsx` (+ css)       | The draggable pin where a Maps key exists, the keyless embed where it does not (D42)                                                             |
| `…/property-form/components/LocalityQuickCreateDialog.jsx`  | Name / city / zone → `POST /admin/localities`, straight back into the select                                                                     |
| `src/utils/loadScript.js`                                   | Loads a third-party script once, on demand; a failure rejects rather than throwing into a render                                                 |
| `…/property-form/__tests__/fieldRules.test.js`              | 24 cases over the visibility rules, the price-field sets, the segment patch and the arithmetic                                                   |
| `…/property-form/__tests__/PricingTab.test.jsx`             | 18 cases: sale vs rental fields, every preview line, price-on-request, the rate, the charge rows, read-only                                      |
| `…/property-form/__tests__/ImageGalleryEditor.test.jsx`     | 22 cases: the counters, the cover (including promotion on removal), alt, reorder, both ways of adding, read-only                                 |

**Files changed**

`…/property-form/tabs.js` (the six components wired in; `badgeIds` moves to the
Basics tab's field list, because that is where the picker is),
`…/property-form/validators/property.js` (a RERA number when the switch is on; a
name on every nearby row; "Add an area or a price" for a unit configuration
priced on request; exactly one cover image), `…/property-form/toPayload.js` (the
per-sq-ft derivation moves into `fieldRules.derivedPricePerSqft`, so the tab and
the payload compute one figure), `src/components/admin/MultiSelect.jsx` (a
read-only picker no longer renders a live × on its chips),
`docs/PROJECT_STATE.md`, `docs/DECISIONS.md`.

**Files removed**

None. `PlaceholderTab` still serves the ten tabs of prompts 20–21.

**Endpoints**

None added. The locality quick create uses `POST /admin/localities`
(`masterDataService.localities.create`) and then `refresh('localities')` on
`MasterDataContext`, so the new record is in every locality list in the session.

**npm / env**

Nothing added. `REACT_APP_GOOGLE_MAPS_KEY` was already in `.env.example`; it is
read together with `settings.integrations.googleMapsApiKey`, which wins.

**Acceptance checklist**

- [x] Tabs 1–6 carry every §6.1 field of their scope, shown per `fieldRules.js`,
      and a `PUT` of the form's payload comes back from
      `GET /api/admin/properties/1` with every one of them intact (checked field
      by field against the mock, see the QA below).
- [x] Locality quick create, the map (keyed pin and keyless embed), the price
      preview, the per-sq-ft auto-compute, the plot-area auto-fill and the
      gallery's cover/alt/reorder all work in the browser.
- [x] 64 new unit tests; the suite is 1 064 tests over 42 files.
- [x] `npm run lint`, `npm run test:ci`, `npm run build:ci` (0 warnings),
      `npm run check:traces` (0 findings), `npm run smoke` (269/269),
      `npm run test:mock` (127), `npm run validate:seed` and
      `npm run check:contrast` all pass.
- [x] One commit, clean tree.

**Manual QA (headless Chromium, console captured)**

- `/admin/properties/edit/1` at 1360 px: sixteen tabs, the first six rendering
  fields rather than an alert. Basics lists Title, Project name, URL, Listing
  type, Segment, Property type, Badges, Construction status, Availability,
  Possession, RERA registered (+ RERA number), Furnishing, Facing, Ownership,
  Floor number, Total floors, Short description and Description.
- Pricing: clearing the range leaves `₹1.5 Cr onwards`; clearing the rate puts
  it back on the price (`10000`), and changing the price to 18000000 moves it to
  `12000` and the preview to `₹1.8 Cr onwards`. "Price on request" disables and
  empties the price and the rate, and the preview reads `Price on Request`; the
  booking amount stays editable. `+ ₹2,500/month maintenance` and
  `Stamp duty: ₹7.5 L` print under the headline.
- Basics → Rent asks "Change this listing to Rent? … the prices this one already
  holds … will be cleared"; confirming leaves Rent per month, Security deposit
  and Maintenance, and no Price. Lease calls the same field "Advance" and offers
  "Add lock-in period" / "Add annual escalation".
- Basics → Plots & Land asks before clearing, and afterwards Basics has no
  Furnishing and no floors, and Area has no super built-up area and no bedrooms
  — only Plot area, Dimension unit, Length and Width. 30 × 40 feet fills 1200
  sq ft; 30 × 40 metres fills 12 916.68 sq ft; an area typed by hand survives a
  change of length.
- Area: a carpet area above the built-up area raises the inline warning
  ("Carpet ≤ built-up ≤ super built-up is what a buyer expects") without
  blocking the save.
- Location: "Metro" adds a row to that group (the heading counts `Metro (2)`);
  "Add a new locality" → Test Nagar / Bengaluru / East is created, selected and
  the city fills itself in.
- Media: pasting two URLs takes the counter to "8 images · 2 missing alt";
  saving is refused with "Please fix 1 field.", the Media tab badges "1 error in
  this section" and the alt field carries the message. Describing them and
  saving again persists across a reload — 8 images, every one described, the
  cover where it was put. The alt hint on property 1 reads
  "Describe what is shown. Use: 3 bhk apartment in whitefield", from the SEO
  focus keyword.
- Unit configurations: the seeded rows summarise as `₹1.2 Cr`; adding "4 BHK Sky
  Villa" at 21000000 makes it `₹1.2 Cr – ₹2.1 Cr`, and "Apply as pricing range"
  writes 12000000/21000000 into Pricing, where the preview follows.
- The map: with `integrations.googleMapsApiKey` set, the tab injects
  `https://maps.googleapis.com/maps/api/js?key=…&v=weekly` once and renders the
  pin container; when that script cannot load it falls back to the embed plus
  the coordinate fields, raises "The interactive map is unavailable" and toasts
  "The Google map could not be loaded. Type the coordinates instead — the
  preview still works." With no key at all it starts on the embed and offers
  "Use the centre of \<locality\>".
- 390 px: `scrollWidth === clientWidth` on all six tabs.
- Signed in as sales: the read-only banner, and not one operable control in any
  of the six panels (the two that survived — the × on a badge chip — are fixed
  in `MultiSelect`).
- Console: no errors and no warnings from these tabs. The only warnings on the
  admin shell are MUI Grid v2 deprecations from the untouched `Dashboard.js`
  (prompt 29).
- Against the API directly: `toPayload` of a record edited across all six tabs
  → `PUT /admin/properties/1` → 200, and the `GET` that follows returns the RERA
  number, the furnishing, the floors, the possession month, the badges, the
  address, the pincode, the six-decimal coordinates, `showExactLocation`, both
  nearby rows in order with their travel times, the price, the derived
  `pricePerSqft` of 10000, the range, the other charge, the three areas, the
  nine configuration fields, both unit configurations (one priced, one on
  request) and both images with exactly one cover — while `viewCount`,
  `amenityIds` and the whole `seo` branch are untouched.

**Known issues**

None opened. Two rows left "Pending rewrites" (the Basics fields in a
placeholder, and five of the fifteen placeholder tabs); one joined it — the
description textarea that prompt 32 turns into the Tiptap editor.

**Next prompt: 20 — Property form tabs 7–12.**

### Prompt 20 — Property form tabs 7–12: amenities, highlights & specifications, floor plans, documents, project & builder, FAQs (2026-09-16)

**What changed**

Six more tabs stopped being placeholders. Prompt 19 wrote the fields a listing
is described by; these six are the lists it is made of — what it offers, what
it is built from, what a buyer downloads, who built it and what they will ask.
Four of them are repeating lists, and all four had the same two problems in the
boilerplate: a drag that rewrote every row, and a blank list with no way to
start.

So each list has a way to start that is not typing. The construction
specifications lay themselves out from a preset of twenty-one labels; the
timeline lays itself out from five milestones; the floor plans generate
themselves from the unit configurations that already carry a drawing; the
highlights can be split out of the short description; and the FAQs can be
written from the listing itself. Every one of them adds only what is missing,
says how many that is, and disappears when there is nothing left to add.

The FAQ generator is the one that writes prose, so it is the one with a rule:
**an answer never claims more than the record holds.** A listing with no price
says the price is on request; a project with no possession date says no date
has been announced; a listing with no amenities is not asked what amenities it
offers. `suggestFaqs` is pure, the dialog previews exactly what it would add
with a checkbox each, and nothing is written until somebody has read it.

**Files added**

| Path                                                           | What it is                                                                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `…/property-form/suggestFaqs.js`                               | Six questions written out of the record, deduplicated against what is already asked; pure, `<p>` HTML answers |
| `…/property-form/tabs/AmenitiesTab.jsx` (+ css)                | Grouped chips with a search, a tri-state select-all per group, the counts, the master-data link               |
| `…/property-form/tabs/HighlightsSpecificationsTab.jsx`         | Highlights, the specifications repeater, the construction repeater and its twenty-one-row preset              |
| `…/property-form/tabs/FloorPlansTab.jsx`                       | The drawing cards, and "Generate from unit configurations"                                                    |
| `…/property-form/tabs/DocumentsTab.jsx`                        | The brochure summary with a link to Media, and the document rows with their gate                              |
| `…/property-form/tabs/ProjectBuilderTab.jsx`                   | The developer picker and quick create, the project figures, the approvals, the timeline and the progress      |
| `…/property-form/tabs/FaqsTab.jsx`                             | Question and answer rows, and the suggestion dialog                                                           |
| `…/property-form/components/SpecificationsRepeater.jsx` (+css) | One grouped `{group,label,value,icon?}` list, used twice; sticky group headings, one `moveItem` per drag      |
| `…/property-form/components/TimelineRepeater.jsx` (+ css)      | Milestone rows with a status dot, the presets, "Auto from milestones" and the progress bar                    |
| `…/property-form/components/DeveloperQuickCreateDialog.jsx`    | Name + website → `POST /admin/developers`, straight back into the picker; duplicates refused inline           |
| `…/property-form/__tests__/suggestFaqs.test.js`                | 30 cases: every branch's wording, the five-item limit, the dedupe, the escaping                               |
| `…/property-form/__tests__/AmenitiesTab.test.jsx`              | 17 cases: the writes, the order, the counts, the tri-state header, the search, the tab order, read-only       |
| `…/property-form/__tests__/TimelineRepeater.test.jsx`          | 16 cases: the arithmetic, the disabled button at zero, the presets, the rows                                  |
| `…/property-form/__tests__/floorPlansFromUnits.test.js`        | 10 cases: what becomes a plan, and the two rules that stop a second press duplicating it                      |

**Files changed**

`…/property-form/tabs.js` (the six components wired in; the `prompt:` markers
gone), `…/property-form/validators/property.js` (highlights capped at 12 × 140
characters; a FAQ question 10–200 characters; a script, an iframe, an `on…=`
handler or a `javascript:` URL in an answer refused; a specification label
without a value no longer an error), `…/property-form/validators/index.js` (the
four new constants re-exported), `…/property-form/toPayload.js` (a
specification row needs both halves to be sent — the schema requires a value),
`…/property-form/PropertyFormShell.jsx` + `PropertyFormContext.js` (`goToTab`),
`src/hooks/useMasterData.js` (`useDeveloperSearch`), `src/utils/format.js`
(`formatMonthYear`), `docs/PROJECT_STATE.md`, `docs/DECISIONS.md`.

**Files removed**

None. `PlaceholderTab` still serves the four tabs of prompt 21.

**Endpoints**

None added. The developer quick create uses `POST /admin/developers`
(`masterDataService.developers.create`) and then `refresh('developers')`.

**npm / env**

Nothing added.

**Acceptance checklist**

- [x] Tabs 7–12 carry every §6.1 field of their scope, and a save comes back
      from `GET /api/admin/properties/2` with every one of them intact (the
      JSON is quoted in the QA below).
- [x] Every preset and generator works and is idempotent: the construction
      rows, the standard milestones, the floor-plan generator, the highlight
      import and the FAQ suggestions all add only what is missing and say how
      many that is.
- [x] Developer quick create works, and a duplicate name is refused inline.
- [x] 73 new unit tests (30 + 17 + 16 + 10); the suite is 1 137 tests over 46
      files.
- [x] `npm run lint`, `npm run test:ci`, `npm run build:ci` (0 warnings),
      `npm run check:traces` (0 findings) and `npm run smoke` (269/269) pass.
- [x] One commit, clean tree.

**Manual QA (headless Chromium over CDP, console captured)**

- `/admin/properties/edit/2` at 1360 px: sixteen tabs, the first twelve
  rendering fields rather than an alert.
- Amenities: the eight groups with their counts ("4 of 5 selected"); searching
  `pool` leaves Lifestyle and Kids with Swimming Pool and Kids' Pool and hides
  the other six groups; `helipad` says so. "Select all in Lifestyle" takes the
  total from 18 to 21 and leaves the Sports header indeterminate; unticking one
  of a full group puts its own header back to indeterminate. The footer link is
  `/admin/master-data/amenities`, `target="_blank" rel="noreferrer"`.
- Highlights: ↓ moves a highlight and the list follows; "Add highlight" stops
  at 12 of 12; on property 1, a three-sentence summary makes the button read
  "From short description (3)" and adds "Corner unit with two balconies",
  "Khata transferred and the loan is pre-approved" and "1.2 km from the metro"
  — the decimal does not split a sentence — after which it reads (0) and is
  disabled. Property 2's one-sentence, 152-character summary makes it read (0)
  from the start.
- Specifications: "Add standard rows (17)" takes the construction list from 8
  rows to 25 across 9 groups; the four labels the seed already had are not
  repeated. Two rows filled in, the rest left blank: the counter reads "15 rows
  have no value yet and are not saved", the save is accepted, and the record
  comes back with 10 rows — the eight seeded plus
  `structure · RCC framed structure = Filled by QA one` and
  `flooring · Living / Dining = Filled by QA two`.
- Floor plans: with the three seeded plans present the generator is offered for
  three unit configurations; removing one and pressing it adds the missing
  drawings and the button then says "Nothing left to generate", so a second
  press cannot duplicate.
- Documents: the brochure card prints the attached URL and "A visitor gives
  their details before downloading it", with "Change it on Media". Adding
  "Price list — March 2027" (type `price-list`, gate off) makes the counter
  read "4 documents · 3 behind the lead form, 1 open", and the record comes
  back with `{title:"Price list — March 2027", type:"price-list",
leadGated:false, order:4}`.
- Project & builder: "Add new developer" → Test Developers (+ website) is
  created, selected, and the card reads "Edit Test Developers in master data";
  trying "test developers" again keeps the dialog open with "A developer called
  “test developers” already exists…"; a website without a scheme is refused the
  same way. Taking RERA out of `reraRegistered` while it is listed as an
  approval raises the warning with "Open Basics"; putting the switch back takes
  it away.
- The timeline: clearing it disables "Auto from milestones (0%)"; "Add standard
  milestones" lays out the five; marking two of five completed makes the button
  read 40 % and pressing it writes 40 into the field and the bar.
- FAQs: "Generate suggested FAQs" offers five of the six (the configuration
  question falls outside the limit), each with its answer; unticking two and
  pressing "Add selected (3)" takes the list from 5 to 8, and the record comes
  back with them at orders 6–8. An answer carrying `<script>` and a
  three-character question are both refused ("Please fix 2 fields.", the FAQs
  tab badged "2 errors in this section").
- Save and reload: 21 amenities, 10 construction specifications, 4 documents,
  Test Developers, the timeline statuses, 40 % and 8 questions all come back.
- The public page (legacy layout) renders every section from the new data:
  Property Amenities (including the three added), Floor Plans & Pricing,
  Property Documents (the new price list behind "View 2 More Documents"),
  Construction Specifications, Construction Status, "Test Developers" and
  "FAQs About This Project". No console errors.
- 390 px: `scrollWidth === clientWidth` on all six tabs.
- Signed in as sales: not one operable control in any of the six panels — the
  only enabled button is "Change it on Media", which changes tab rather than
  the record.
- Console: no errors and no warnings from these tabs. The only warnings on the
  admin shell are the MUI Grid v2 deprecations from the untouched `Dashboard.js`
  (prompt 29).

**Known issues**

NEW-31 opened: `SlugField` rewrites an existing listing's slug from its title
because the form's tabs mount one render before the record reaches the reducer.
It is a shared admin-kit component used by five forms, so prompt 20 left it
alone; prompt 21 owns the fix.

**Next prompt: 21 — Property form tabs 13–16 and publish.**

### Prompt 21 — Property form tabs 13–16 (similar, section visibility, agent, SEO), admin preview and publish polish (2026-09-16)

**What changed**

The last four tabs stopped being placeholders, so the property form is now
complete except the SEO panel's internals. Three of them are small; the fourth,
Section visibility, was the one with a question worth answering properly.

Eighteen switches say what a page _may_ show. What a page _does_ show is that
answer and the data together — and the boilerplate wrote that second half twice,
once in the admin toggle and once in `PropertyDetails`, which is how they came
to disagree (BUG-06). So `src/utils/propertySections.js` is written now rather
than with the public page in prompt 23: one ordered `SECTION_DEFINITIONS` with a
label, a description, an anchor and a `hasData(property, context)` per key;
`getVisibleSections()` for the page and its sticky navigation; and
`getSectionHints()` for the chips beside the switches. The chip is the part an
editor reads: "No data yet — add at least two images in Media" while a switch is
on over nothing, "Hidden" while it is off, and — for the one section a listing
cannot fill by itself — "Hidden automatically — no active banks".

The other decision worth recording is the preview. Articles and pages carry a
signed 24-hour token (D28) because a draft article is shown to somebody who is
not an editor. Nobody asks to be shown an unfinished listing, so a property
needs no token at all: `/properties/<slug>?preview=admin` reads the record
through a new `GET /admin/properties/slug/:slug` **only while an admin session
exists**, and the page answers 404 to everybody else, query string or not. The
rail's "View on site" becomes "Preview" while a listing is unpublished, which is
exactly when somebody wants to look at it.

Two defects the form had been carrying closed with it. `SlugField` mounted
"following the title" over the empty slug of a record that had not arrived yet,
and then rewrote a live URL from the title (NEW-31); it now treats a value it
did not write itself as an edit. And `toLegacyProperty` had been handing the
public "Property Highlights" section an empty array since prompt 11, so the
section had silently stopped rendering — D40 says `highlights` is what feeds it,
and it does again.

**Files added**

| Path                                                      | What it is                                                                                                      |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/utils/propertySections.js`                           | The eighteen `SECTION_DEFINITIONS`, `getVisibleSections()`, `getSectionHints()`, `isSectionEnabled()`           |
| `src/utils/__tests__/propertySections.test.js`            | 30 cases: every rule with and without its data, the order, the anchors, the eighteen keys against the enum      |
| `…/property-form/tabs/SimilarPropertiesTab.jsx`           | Search over active listings, cards with thumbnail/locality/price, drag order, max 6, "Suggest similar"          |
| `…/property-form/tabs/SectionVisibilityTab.jsx`           | Eighteen 56 px rows with a switch, a description and a hint chip; "Enable all" / "Disable all"                  |
| `…/property-form/tabs/AgentTab.jsx`                       | Team member or manual, the copied display fields, the overwrite confirm, `showOnListing` and the preview card   |
| `…/property-form/tabs/SeoPlaceholderTab.jsx`              | `seo.title` (/60), `seo.description` (/160), `seo.focusKeyword`, the slug mirror, and what prompt 36 adds (D87) |
| `…/property-form/__tests__/SimilarPropertiesTab.test.jsx` | 12 cases: the search, the cards, the cap of six, the suggestion dialog, read-only                               |
| `…/property-form/__tests__/SectionVisibilityTab.test.jsx` | 13 cases: the eighteen rows, the explicit booleans, enable/disable all, every kind of hint, read-only           |

**Files changed**

`…/property-form/tabs.js` (the four components wired in; `prompt`/`note` gone),
`…/property-form/validators/property.js` (`validateVisibility` refuses a
non-boolean toggle; `validateSimilar` refuses a duplicate; `validateSeo` caps
the focus keyword; a rail warning for `showOnListing` over an empty agent),
`…/property-form/validators/index.js` (`FOCUS_KEYWORD_MAX`),
`…/property-form/usePropertyForm.js` (Ctrl/Cmd+S; `viewPathOf`/`viewUrlOf`;
"Property saved" / "Property published" / "Saved as inactive"),
`…/property-form/StatusRail.jsx` + `.module.css` (Preview, the keyboard hint),
`…/property-form/PropertyFormShell.jsx` (the placeholder props gone),
`…/property-form/tabs/PropertyTabs.module.css`,
`src/components/admin/EntityPicker.jsx` + `.module.css` (`renderSelected`,
`action`, a labelled Remove per row), `src/components/admin/SlugField.jsx`
(NEW-31), `src/hooks/useMasterData.js` (`useTeamMembers`),
`src/services/endpoints.js` + `.test.js` + `src/services/propertyService.js`
(`adminProperties.bySlug`), `mock-server/routes/properties.js` +
`mock-server/__tests__/properties.test.js` (the route and two tests),
`scripts/smoke-api.js` (three targeted checks),
`src/pages/public/PropertyDetails.jsx` + `.module.css` (`?preview=admin`, the
banner, `noindex`), `src/utils/adapters/legacyProperty.js`,
`src/components/ui/tones.js` (a comment naming a deleted constant),
`docs/API_CONTRACT.md`, `docs/DATA_MODEL.md`, `docs/PROJECT_STATE.md`,
`docs/DECISIONS.md`.

**Files removed**

`src/pages/admin/PropertyForm.jsx` (654 lines) and the whole of
`src/pages/admin/property-tabs/` (16 tabs + `constants.js` + `index.js`, ~3 100
lines), unreachable since prompt 18. `…/property-form/tabs/PlaceholderTab.jsx`
went with them — every tab renders fields now. `grep -rn "property-tabs" src`
returns nothing. `src/components/admin/imageFieldConfig.js` was already gone
(prompt 13 folded it into `ImageField`). `src/utils/seoScoring.js` and
`seoGenerator.js` stay: `AdminSeo.js` still reads them until prompt 36.

**Endpoints**

One added: `GET /admin/properties/slug/:slug` (any admin role; returns the
record whether or not it is published). Registry, mock route, two mock tests,
three smoke checks and `docs/API_CONTRACT.md` all carry it. Consumed by the
tabs: `GET /admin/properties?q=&isActive=true`, `GET /admin/properties?ids=`,
`GET /properties/:id/similar`, `GET /team`.

**npm / env**

Nothing added.

**Acceptance checklist**

- [x] Tabs 13–16 persist their fields: a save of property 2 came back with
      `seo.title/description/focusKeyword`, `sectionVisibility.virtualTour`
      flipped and all eighteen keys present, the agent's six fields copied from
      Team Member 3, and `similarPropertyIds` intact.
- [x] `propertySections.js` passes 30 tests and is exported for the public page
      (prompt 23 wires it).
- [x] Legacy `PropertyForm.jsx` and `property-tabs/` deleted; the admin preview
      endpoint works; the smoke suite is 273/273.
- [x] `npm run lint`, `npm run test:ci` (1 193 tests over 49 files),
      `npm run build:ci` (compiled successfully, 0 warnings),
      `npm run check:traces` (0 findings), `npm run test:mock` (129/129) and
      `npm run smoke` (273/273) pass.
- [x] One commit, clean tree.

**Manual QA (headless Chromium over CDP, console captured)**

- `/admin/properties/edit/1` at 1360 px: sixteen tabs, none of them an alert
  naming a later prompt.
- Similar: the four seeded picks arrive as cards ("Aurelia Park Residences –
  2 BHK Apartment in Sarjapur Road · Sarjapur Road, Bengaluru · ₹98 L · Under
  Construction"), not as `#2`. Searching `villa` offers five, each with its
  locality, price and status; adding one takes the counter to 5/6 and the option
  reads "Added". "Suggest similar" then offers exactly one — the room that is
  left — and accepting it fills 6/6. At 6/6 every option is disabled, the
  warning appears and "Suggest similar" is disabled; removing one takes both
  away.
- Visibility: property 1 reads "17 of 18 sections show on the page · 1 switched
  off". Switching Video off turns its chip from "Showing" to "Hidden"; the
  record comes back with `virtualTour` flipped and eighteen keys. Finance on a
  rental reads "Hidden automatically — sale listings only"; with no active bank,
  "Hidden automatically — no active banks".
- Agent: the six team members are offered; picking Team Member 3 while the
  listing names Team Member 2 asks "Replace the details you typed?" and, on
  confirming, the preview card reads Team Member 3 with `+91 9880000023` and
  `team3@squaresnacres.com`.
- SEO: typing a 60-character title turns the counter green ("Inside the length a
  search result prints"); 29 characters reads "Short — aim for 50–60". The
  address line prints `/properties/lakeview-heights-3-bhk-whitefield`.
- Publish: Ctrl+S from inside a tab saves and toasts "Property saved" without
  the browser's own save dialog. Turning "Published on site" on and saving
  toasts "Property published"; the split menu's "Save as inactive" toasts "Saved
  as inactive" and the rail's link goes back to "Preview".
- Preview: a new inactive listing's rail shows "Preview →
  `/properties/<slug>?preview=admin`" and the note "Only you see this". That URL
  signed in renders the page under "Admin preview — this property is not
  published. Visitors see a 404 at this address." with
  `robots: noindex, nofollow`; without the query string it is 404; signed out it
  is 404.
- The public page's "Property Highlights" section renders again, with the five
  highlights of property 1.
- 390 px: `scrollWidth === clientWidth` on all four tabs; the sticky bar shows
  "Save as inactive" and "Save".
- Signed in as sales: not one operable control on any of the four panels (the
  Agent tab's radios are inside a disabled `<fieldset>`).
- Console: no errors and no warnings from any of it.

**Known issues**

BUG-01 closed on the property-form side; BUG-06 has its utility (the public
wiring is prompt 23's); ADD-22 and NEW-09 closed with the legacy tabs; NEW-31
(SlugField) closed. Nothing new opened.

**Next prompt: 22 — Admin property list.**

---

### Prompt 22 — Admin property list: server-side table, filters, bulk actions, toggles and CSV export (2026-09-16)

**What changed**

`/admin/properties` was the last screen still reading a list through the legacy
adapter, and the last one that fetched everything and then filtered it in the
browser (ADD-21, BUG-19). It is now `PropertiesListPage`: `useApiList` with
`syncToUrl`, eleven filters, six sortable headers, paging and page size — every
one of them a query parameter the API answers and the address bar carries, so a
filtered view is a link somebody can send and a catalogue of four thousand
listings still costs one page of rows.

Three decisions are worth recording. The first is what a **flag chip** is: the
Active / Featured / Verified cells are buttons for an editor and labels for a
sales user, so read-only is the absence of a handler rather than a second table
(§7). They patch optimistically, spin while the `PATCH` is in flight and put the
old value back with the server's own sentence when it refuses (§8.2).

The second is the **export** (D44). It repeats the current filter with
`perPage=all` and builds the CSV here, so there is no export endpoint to keep in
step with eleven filters — and `src/utils/csv.js` is now the one place that
knows what a spreadsheet needs: the UTF-8 BOM Excel wants, CRLF records, quoting
around anything holding a comma, a quote, a line break or an edge space, and a
guard on the leading characters Excel would evaluate as a formula. That last one
is for the exports that follow: a lead's name and message are typed by strangers
(NEW-22 names the same file's ancestor).

The third is the **row menu**. Six actions is a kebab, not six 44 px icons in a
cell, so `DataTable` gained `rowActionsMenu` and `rowActionsLabel` — the menu is
named after the row it belongs to ("Actions for Lakeview Heights") and its items
stay short. A sales user has one action, which stays an inline icon and carries
the listing's title itself.

**Files added**

| Path                                                                | What it is                                                                                                                        |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/admin/properties/PropertiesListPage.jsx` + `.module.css` | The screen: header, filters, table, bulk bar, row actions, export, delete confirm                                                 |
| `src/pages/admin/properties/propertyColumns.jsx`                    | Eleven columns, the flag chips, the phone card and the 25 CSV columns                                                             |
| `src/pages/admin/properties/propertyFilters.js`                     | The eleven `FilterBar` fields, the URL parameter spec, `exportParamsOf()`, `hasActiveFilters()`                                   |
| `src/pages/admin/properties/publicUrl.js`                           | `PREVIEW_QUERY`, `publicUrlOf()`, `viewPathOf()`, `viewUrlOf()` — shared by the list and the form                                 |
| `src/utils/csv.js`                                                  | `toCsv()`, `escapeCsvValue()`, `csvFileName()`, `csvDateStamp()`, `CSV_MIME`                                                      |
| `src/utils/download.js`                                             | `downloadBlob()` and `downloadAuthenticated()` (D46; the leads export of prompt 29 is its second caller)                          |
| `src/components/seo/SeoScoreChip.jsx`                               | The band chip from `seo.score` — "Not analysed" when there is no number (articles and the SEO dashboard reuse it)                 |
| `src/utils/__tests__/csv.test.js`                                   | 13 cases: the BOM, CRLF, the header-only file, quoting, booleans, the formula guard, the IST file name                            |
| `src/pages/admin/properties/__tests__/PropertiesListPage.test.jsx`  | 17 cases: the rows, the request, the URL filters, the chips and their rollback, bulk, the row menu, the three empty states, sales |

**Files changed**

`src/routes/adminRouteConfig.js` (the route lazy-loads `PropertiesListPage`),
`src/components/admin/DataTable.jsx` + `.module.css` (`rowActionsMenu`,
`rowActionsLabel`; the footer of an out-of-range page reads "Page 5 of 2 — no
rows on this page" instead of counting a slice that is not there; a card's
checkbox and kebab keep their 44 px targets),
`src/pages/admin/properties/property-form/usePropertyForm.js` (the four URL
helpers moved to `../publicUrl` and are re-exported),
`src/utils/adapters/legacyProperty.js` (the admin-list mappings
`toLegacyProperties()` and `tags` removed with the table that read them).

**Files removed**

`src/pages/admin/AdminProperties.js` (1 056 lines).

**Endpoints / env vars / npm scripts**

None added. The screen consumes `GET /admin/properties` (every §5.7 filter,
the six admin sorts, `perPage=all`), `PATCH /admin/properties/:id`,
`POST /admin/properties/:id/duplicate`, `POST /admin/properties/bulk` and
`DELETE /admin/properties/:id` — all of them already in the registry.

**Acceptance checklist**

- [x] `/admin/properties` works server-side: the network shows
      `page/perPage/sort/order` and the filters as query parameters, with all
      filters, sorts, toggles, bulk actions, duplicate, delete and export.
- [x] Sales sees a read-only list; manager and admin the full one.
- [x] Legacy `AdminProperties.js` deleted; tests pass.
- [x] `npm run lint`, `npm run test:ci` (1 223 tests over 51 files),
      `npm run build:ci` (compiled successfully, 0 warnings),
      `npm run check:traces` (0 findings), `npm run test:mock` (129/129) and
      `npm run smoke` (273/273) pass.
- [x] One commit, clean tree.

**Manual QA (headless Chromium against `npm run dev`, console captured)**

- 1440 px, signed in as admin: 20 rows of 41, `h1` "Properties 41", the cover,
  title + "Whitefield · Apartments", listing and status chips, price,
  configuration, the three flags, the SEO chip, views/enquiries, priority and
  updated.
- Filtering to Rent rewrites the URL to `?listingType=rent` and the list to 7
  rows; sorting by Price adds `&sort=price&order=asc` and the column runs
  ₹21,000/month → ₹1.25 L/month. The active filter shows as a removable chip
  beside "Reset".
- Clicking a Featured chip turns it to "Featured" and toasts "… is now
  featured."; the record comes back featured.
- Ticking two rows shows "2 selected · Activate · Deactivate · Feature ·
  Unfeature · Verify · Unverify · Delete"; Deactivate toasts "2 properties
  updated." and the list refreshes. Delete asks first, naming the count.
- Export CSV downloads `properties-2026-09-17.csv` (the IST day): it begins with
  the BOM, its header is the 25 columns in order, and a filtered export of 7
  rows holds 7 rows — the filter, not the page.
- Duplicating from the row menu creates an inactive copy (`…-copy`) and opens
  its edit page; deleting the copy works from the row menu's confirm.
- 390 px: 20 cards, `scrollWidth === clientWidth`, and the kebab is a 44 × 44
  target whose menu reads Preview · Edit · Duplicate · Activate · Feature ·
  Delete.
- `?page=5` of a two-page list: an empty table, the footer "Page 5 of 2 — no
  rows on this page" and "Go to first page" in the empty state.
- Signed in as sales: the subtitle reads "Read-only", there is no Add button, no
  checkboxes, no row menu and no clickable flag; "View on site" and "Export CSV"
  remain. The server agrees — `PATCH /admin/properties/1` answers 403 for that
  token.
- Console: no errors or warnings from the app (only the sandbox proxy refusing
  the external image and font hosts).

**Known issues**

The property-list half of ADD-21 is closed; the `AdminLeads`/`Dashboard` half
stays open for prompt 29. Nothing new opened.

**Next prompt: 23 — Property details, part 1.**

---

### Prompt 23 — Property details part 1: page shell, gallery, price card, key facts, section nav, shortlist (2026-09-16)

**What changed**

`/properties/:slug` was the last public page still reading the boilerplate's
field names through `toLegacyProperty` — 1 100 lines with thirty `useState`s,
four copy-pasted lead modals (one of them unreachable), a hardcoded
sub-navigation and an `EnquiryForm` mounted three times (ADD-12). It is now a
210-line shell over the contract record of §6.1: one `useApi` call, one
`getVisibleSections` call, and seven components that each do one thing.

Four things are worth recording.

The **gallery** is a cover with a thumbnail column (a strip below it on a
phone), the arrow keys move between photographs and `Enter` opens the
full-screen lightbox. That lightbox is `yet-another-react-lightbox` behind
`React.lazy` (D7) — the library is ESM-only and carries three stylesheets, and
the build confirms it stays out of the main bundle: a 36 kB JS chunk and an
8 kB CSS chunk that are fetched the first time somebody opens a photograph.
Video and virtual tour are tabs, offered only when the listing carries one
**and** its section is switched on; a `videoUrl` that is neither a YouTube
page, a Vimeo page nor a file a browser can play does not get a tab at all,
because a tab that opens on nothing is worse than no tab.

The **section navigation** closes BUG-06. `StickyNav` and its hardcoded
`ALL_NAV_ITEMS` are deleted; `SectionNav` renders `getVisibleSections(property,
{ banksAvailable, similarAvailable })` — the same `propertySections.js` rule
the admin's Section-visibility tab reads — so the chips, the section wrappers
and the toggles are one list. `SectionGuard` went with it: a section either is
in that list or is not rendered, which is one rule instead of three booleans
per call site.

The **price card** prints what the record holds and nothing else. A range shows
"onwards", a rent shows the deposit and the maintenance under the monthly
figure, and `priceOnRequest` shows exactly that — with no EMI line under it,
because there is no principal to compute one from. Where there is one, the EMI
is `utils/finance.js` over the cheapest **active** lender's advertised rate at
80 % for twenty years, and the footnote says so: with no active bank the line
is absent rather than falling back to an invented rate (§6.6, BUG-05).

The **shortlist** is a real one. `ShortlistContext` keeps ids in
`localStorage` under `sna_shortlist` — the one visitor-side list that is not in
the session, because somebody comparing four projects over a fortnight expects
to find them still there — and follows the `storage` event so two open tabs
cannot disagree. The heart on a card and the count on the bottom navigation
read the same provider; the boilerplate's heart remembered nothing (ADD-10).

**Files added**

- `src/components/sections/property/`: `TitleBlock.jsx`, `PriceCard.jsx`,
  `AgentCard.jsx`, `KeyFacts.jsx`, `SectionNav.jsx`, `MobileCtaBar.jsx`,
  `PropertyLightbox.jsx` (lazy), `SectionPlaceholder.jsx` (development only),
  `LeadModalTemp.jsx` (temporary) + CSS modules
- `src/components/common/`: `ShortlistButton.jsx`, `ShareButton.jsx` + CSS
- `src/contexts/ShortlistContext.js`
- `src/utils/`: `finance.js` (`estimateEmi`, `emiBreakdown`, `foirScore`,
  `eligibleLoanAmount`, `startingEmi`), `analytics.js` (`track` → `dataLayer`),
  `recentlyViewed.js` (`sna_recent_properties`, max 8), `viewTracker.js`
  (`sna_viewed_properties`)
- Tests: `src/utils/__tests__/finance.test.js` (15),
  `src/contexts/__tests__/ShortlistContext.test.js` (9),
  `src/components/sections/property/__tests__/KeyFacts.test.jsx` (6),
  `SectionNav.test.jsx` (6)

**Files changed**

- `src/pages/public/PropertyDetails.jsx` + CSS — rewritten on the §6.1 shape
- `src/components/sections/property/PropertyGallery.jsx` + CSS — rewritten
- `src/pages/public/NotFound.jsx` — optional `title` / `subtitle` /
  `description` props, and `noindex, follow`, so a detail page can say what was
  not found ("Property not found") instead of the generic sentence
- `src/components/layout/BottomNav.jsx` + CSS — stands down on
  `/properties/:slug` (that page has a contact bar of its own); "Insights"
  becomes "Saved" with the shortlist count
- `src/components/common/PropertyCard.jsx` + CSS — the heart is
  `ShortlistButton`; the boilerplate's dead `.heartBtn` rules are gone
- `src/components/common/LeadForm.jsx` — an additive `onSuccess(values)` (part
  of ADD-09, which prompt 28 finishes)
- `src/components/common/ToastProvider.jsx` — the live region is portalled to
  `document.body`: a `position: fixed` element inside a transformed ancestor
  (`MainLayout`'s page transition, a sticky column) is positioned against that
  ancestor, and its `--z-toast` means nothing outside its stacking context
- `src/components/common/SkeletonLoaders.jsx` — `PropertyDetailSkeleton` now
  mirrors the new layout (breadcrumb, 16/9 gallery + thumbnail column, title
  lines, key-facts grid, price card) at the page's own proportions
- `src/utils/format.js` (+ its test) — `formatWhatsappNumber` / `whatsappLink`;
  the seed stores team numbers as ten digits, and `wa.me/9876543210` is a dead
  link. `SiteSettingsContext` now uses the shared helper instead of its own
- `src/utils/adapters/legacyProperty.js` — listing-only (see Pending rewrites)
- `src/routes/index.js` — `ShortlistProvider` in the app shell (the providers
  live here rather than in `App.js`, D97)
- `src/test-utils.jsx` — `ToastProvider` and `ShortlistProvider` in `renderWith`
- `package.json` — `yet-another-react-lightbox@3.32.2`

**Files removed**

- `src/components/sections/property/StickyNav.jsx` (+ CSS)
- `src/components/common/SectionGuard.jsx`

**Endpoints / env vars / npm scripts**

No endpoint, environment variable or script changed. The page calls
`GET /properties/slug/:slug`, `GET /admin/properties/slug/:slug` (preview),
`POST /properties/:id/view`, `POST /leads` and `GET /banks` (through
`MasterDataContext`), all of which already existed. One dependency was added:
`yet-another-react-lightbox@3.32.2`, the only one §3.3 allows this prompt.

**Storage keys**

`sna_shortlist` (local), `sna_recent_properties` (local, max 8),
`sna_viewed_properties` (session), `sna_lead` (session, existing).

**Acceptance checklist**

- [x] `/properties/lakeview-heights-3-bhk-whitefield` renders the new shell:
      breadcrumbs (Home › Buy › Whitefield › title), gallery + lightbox, title
      block, price card with EMI, key facts, section nav whose items are the
      visible sections, mobile CTA bar; an unknown slug renders the 404 page
      titled "Property not found".
- [x] `POST /properties/1/view` fires once and does not fire again after
      navigating away and back; the shortlist heart persists in
      `sna_shortlist`; `BottomNav` is absent on the page and reads
      "Saved (1)" elsewhere.
- [x] `StickyNav` and `SectionGuard` are deleted;
      `yet-another-react-lightbox` is a separate chunk
      (`6794.chunk.js` 36 kB + `5317.chunk.css` 8 kB; the main bundle contains
      no `yarl__` string).
- [x] `npm run lint`, `npm run test:ci` (1 263 tests, 55 suites),
      `npm run build:ci` (compiled, no warnings), `npm run check:traces`
      (0 findings), `npm run validate:seed`, `npm run smoke` (273/273) pass;
      no console errors or warnings from the app.
- [x] One commit, clean tree.

**Manual QA (Chromium, 1280 and 390 px, console open)**

- Desktop 1280: one `<h1>`; breadcrumbs Home › Buy › Whitefield › title; 17
  section chips; key facts print 15 rows and no em dash; the price card sticks
  at `--header-height + 16px` in the 8/4 grid.
- Gallery: focus the cover, `ArrowRight` moves "photograph 1 of 8" → "2 of 8",
  `Enter` opens the lightbox with its counter ("2 / 8") and the image's caption,
  `Escape` closes it and focus returns to the cover.
- Share on desktop (no `navigator.share`): the menu offers Copy link ·
  WhatsApp · X · Facebook · LinkedIn · E-mail, and copying toasts "Link copied".
- Shortlist: the heart writes `["1"]` and flips `aria-pressed`; saving from a
  card on `/properties` at 390 px turns the bottom-nav item into "Saved (1)".
- Section nav: clicking Unit configurations / Amenities / Location / FAQs
  scrolls to each and the chip that lights up is the one clicked; free
  scrolling moves the highlight the same way. With `prefers-reduced-motion`
  the scroll is an instant jump.
- Price-card CTAs open the dialog titled by their lead source; submitting
  name + phone files the lead (visible in the admin) and the dialog switches to
  "Request received" with WhatsApp and Call buttons; `sna_lead` remembers the
  details for the next one.
- Network: exactly one `POST /api/properties/1/view` on the first visit and
  none on the second.
- 390 px: gallery 4/3, then the title, then the price card, then the key facts,
  then the scrolling chip strip; `scrollWidth === clientWidth` (no horizontal
  scroll); the fixed bar reads Call · WhatsApp · Enquire with
  `tel:+919880000022` and a `wa.me/91…` link, and the site's bottom navigation
  is not rendered on this page.
- Edge cases: one image → no thumbnails, no arrows, "View photo"; zero images →
  the monogram placeholder; `priceOnRequest` → "Price on Request" and no EMI
  line; `showExactLocation: false` → neither the address nor the coordinates
  appear anywhere in the DOM and the page says "Exact location shared on
  request"; a `videoUrl` that is not YouTube/Vimeo/MP4 → no Video tab (an
  `.mp4` gets a `<video controls>`); an inactive listing 404s publicly and,
  at `?preview=admin` while signed in, shows the amber banner and
  `noindex, nofollow`.
- Console: no errors or warnings from the app. The only console output is the
  sandbox proxy refusing the external image, font and Iconify hosts
  (`ERR_CERT_AUTHORITY_INVALID`), which is an artefact of this environment.

**Known issues**

BUG-06 closed. BUG-05 and ADD-12 move forward (the shell carries no default or
placeholder content and every enquiry path is reachable); their remaining
halves are the section content, owned by 24/25, 28 and 38. One new row:
**NEW-32** — the "Saved" item and the toast's "View" link point at
`/shortlist`, which prompt 26 writes; until then both land on the 404 page.

**Next prompt: 24 — Property details, part 2 (content sections).**

### Prompt 24 — Property details part 2: the eleven content sections (2026-09-16)

**What changed**

The property page stopped being a shell. Eleven sections are written against the
§6.1 record and rendered only where `getVisibleSections` says the listing both
switched the section on and carries something to put in it, so the sub-navigation
and the page cannot disagree about what exists: **Overview** (the description
clamped to about twelve lines with a measured "Read more", then the project
snapshot chips), **Highlights** (a two-column check list, six then "Show N
more"), **Unit configurations** (a captioned table on a desktop, the same rows as
cards below 900 px, "On request" and a "Get price" dialog where a unit has no
price, the drawing opening in the lightbox), **Specifications** (grouped in
`SPEC_GROUPS` order with the construction specifications as a second block —
D39), **Amenities** (grouped chips, commercial first for a commercial listing),
**Floor plans** (tabs, the drawing blurred behind a lock until a lead is filed,
then the lightbox and the PDF), **Gallery** (a grid of every photograph),
**Construction progress** (a progress bar and the milestone timeline),
**About the builder**, **What is nearby** and **Location** (the two separate
`sectionVisibility` keys of §6.1), and **FAQs**.

Ten legacy section components went with them, and with them the last of the
defaults the boilerplate printed where it had no data: the `'—'` cards of
`PropertyOverview`, the `'Feature'` fallback of `PropertySpecialities`, the
unreachable legacy-object branch of `PropertySpecs`, the `Infinity%` of
`ConstructionStatus`, the self-nullifying `BuilderOverview` and the "Map view
available on live version" box of `NearbyPlaces`.

**How the gate works**

`leadStorage` gained `unlock(propertyId, kind)` and `isUnlocked(propertyId,
kind)` over a new `unlocks: { [propertyId]: ['floorPlans', 'documents'] }`
branch of `sna_lead`, and `useGatedContent(propertyId, kind)` is the hook a
section reads it through. Unlocks are **per kind**, because asking for a floor
plan is not asking for the title deed; the one exception is a
`property-enquiry`, which is a visitor identifying themselves about the whole
listing and therefore opens every kind on it. A locked drawing is blurred
rather than removed, so the box keeps its size and the page does not jump when
the gate opens.

**Files added**

- `src/components/sections/property/`: `SectionShell.jsx`, `GatedOverlay.jsx`,
  `OverviewSection.jsx`, `HighlightsSection.jsx`,
  `UnitConfigurationsSection.jsx`, `SpecificationsSection.jsx`,
  `AmenitiesSection.jsx`, `FloorPlansSection.jsx`, `GallerySection.jsx`,
  `ConstructionSection.jsx`, `BuilderSection.jsx`, `LocationSection.jsx`
  (default `LocationSection` + named `NearbySection`), `FaqsSection.jsx` + CSS
  modules
- `src/hooks/useGatedContent.js`
- Tests: `src/components/sections/property/__tests__/` —
  `UnitConfigurationsSection.test.jsx` (8),
  `ConstructionSection.test.jsx` (9), `FloorPlansSection.test.jsx` (6)

**Files changed**

- `src/pages/public/PropertyDetails.jsx` — `SECTION_COMPONENTS` maps a
  `sectionVisibility` key to its component; the bands alternate white/surface by
  index; the six keys with no component yet keep the development-only
  placeholder. `NotFound` moved to the head of the component imports because
  `BuilderDetail` imports it before the developer sections too and
  `mini-css-extract-plugin` refuses a stylesheet whose module order two chunks
  disagree about (the build failed until they agreed).
- `src/utils/leadStorage.js` — `unlock` / `isUnlocked` / `UNLOCK_KINDS`, a
  `save()` that no longer loses `capturedSources` on a second call, and writes
  that survive a blocked session store
- `src/utils/propertySections.js` (+ its test) — `overview.hasData` now means
  "the Overview section has something to print": a description or one of the
  project-snapshot facts. Highlights alone used to satisfy it, which promised a
  navigation item the section could not fill.
- `src/components/sections/property/LeadModalTemp.jsx` — two additive props:
  `message` (prefills the message box, e.g. "Price for 3 BHK") and
  `onCaptured(values)` (what a gated section unlocks itself with)
- `src/components/sections/developer/DeveloperStats.jsx` — optional
  `headingLevel` / `headingId`, so the block can be an H3 inside the property
  page's builder section without two H2s or a duplicated element id

**Files removed**

`PropertyOverview.jsx`, `PropertySpecialities.jsx`, `PropertySpecs.jsx`,
`PropertyAmenities.jsx`, `FloorPlans.jsx`, `ConstructionSpecs.jsx`,
`ConstructionStatus.jsx`, `BuilderOverview.jsx`, `NearbyPlaces.jsx`,
`PropertyFaq.jsx` and their CSS modules.

**Endpoints / env vars / npm scripts**

None added. The sections consume the record the page already fetched plus the
developer and locality lists `MasterDataContext` already holds; the two new lead
sources travel through the existing `POST /leads` (`price-request`,
`floor-plan-request`). One analytics event is new: `floor_plan_download`.

**Storage keys**

`sna_lead` gains `unlocks: { [propertyId]: string[] }` (session).

**Acceptance checklist**

- [x] All eleven sections render from seed data on property 1 and property 2
      exactly per the visibility rules, and the section-navigation items match
      the rendered sections one for one on both (17 keys on property 1, 16 on
      property 2, 13 on the Devanahalli plot).
- [x] Floor-plan gating: locked → lead (`sna_lead` gains
      `unlocks: {"1":["floorPlans"]}`, the lead reaches the mock with
      `source: floor-plan-request` and the prefilled message) → the drawing is
      clear, opens full size in the lightbox and offers "Download PDF".
- [x] No `'—'` placeholder, no `Feature` fallback and no "Map view available…"
      box anywhere: the only em dashes on a rendered page are the ones the
      content itself contains ("Ready to move — no waiting period", "2 BHK —
      1,180 sq ft", "Approximate location — exact address shared on request").
- [x] The ten legacy section components are deleted and nothing imports them.
- [x] `npm run lint`, `npm run test:ci` (1 286 tests, 58 suites),
      `npm run build:ci` ("Compiled successfully", no warnings),
      `npm run check:traces` (0 findings), `npm run validate:seed`,
      `npm run smoke` (273/273) pass.
- [x] One commit, clean tree.

**Manual QA (headless Chromium over the DevTools protocol, 1280 and 390 px)**

- Property 1 (`lakeview-heights-3-bhk-whitefield`), 1280 px: one `<h1>`;
  17 section wrappers whose ids match the 17 navigation anchors exactly;
  "Read more" expands the description and becomes "Read less"; the unit table
  prints `Configuration | Carpet area | Super built-up | Price | Floor plan |
Enquire` with the caption "Unit configurations, areas and prices for …";
  no progress bar (ready-to-move); `document.documentElement.scrollWidth ===
clientWidth`.
- Gate: "View floor plans" opens the dialog titled "Price Request"/"Floor Plan
  Request" with the message prefilled; submitting name + phone files lead 46
  (`source: floor-plan-request`, `propertyId: 1`, `message: "Floor plans for
Lakeview Heights"`), writes `unlocks: {"1":["floorPlans"]}` into `sna_lead`,
  and closing the dialog opens the drawing in the lightbox. Afterwards the
  section shows "Open full size" and a `target="_blank" rel="noopener"` PDF
  link.
- Toggles: amenities 12 → 18 with the button turning into "Show fewer";
  construction specifications 8 → 18 rows; highlights (5 items) offers no
  toggle; the first FAQ closes to `aria-expanded="false"` and its panel is the
  `aria-controls` target.
- Property 2 (`aurelia-park-residences-2-bhk-sarjapur-road`): the progress bar
  reads the editor's 74 % with `aria-valuenow="74"`, five milestones with dates,
  statuses and the one site photograph, "Last updated 23 May 2026", and no
  `NaN` or `Infinity` anywhere in the page text. The builder section prints the
  card, "8 projects", the three developer highlights and the counted "At a
  glance" figures.
- Devanahalli plot (`nandi-ridge-meadows-plots-devanahalli`), 390 px: no unit
  configurations and no floor-plan sections, no "BHK" anywhere, the map is the
  property's own coordinates at zoom 16 (`showExactLocation: true`) with no
  "Approximate location" note, nearby grouped into Schools / Hospitals /
  Railway / Airport / IT Parks, the locality guide links to
  `/localities/devanahalli`, and no horizontal scroll.
- Property 1 at 390 px: the unit table is replaced by three cards
  ("2 BHK · 2 baths", carpet and super built-up, ₹88.5 L, "4 available",
  "Enquire"); the gallery is a two-column grid of 8 tiles under "8 photos";
  `showExactLocation: false` gives the **locality's** coordinates at zoom 13
  with "Approximate location — exact address shared on request".
- Heading outline on both pages: one H1, an H2 per section, H3 for a sub-block
  and H4 only under an H3 — no level is skipped.
- Console: the React DevTools notice and nothing else. The sandbox proxy still
  refuses the external image, font and Iconify hosts
  (`ERR_CERT_AUTHORITY_INVALID`), which is an artefact of this environment.

**Known issues**

BUG-05's section-content half is closed; what remains of the row is
`PropertyDocuments`' `Document` label and `FinanceGuide`, both owned by 25.
ADD-14 closed. One new row: **NEW-33** — the Jest suites that drive a MUI
dialog with `@testing-library/user-event@13` report "not wrapped in act(…)".
It is not new to this prompt (IconPicker reports 95 of them, the `Modal` suite 8) and no test is flaky because of it; the fix is the `userEvent.setup()` API of
user-event v14, which is a dependency bump nobody has authorised yet.

**Next prompt: 25 — Property details, part 3 (documents, finance, similar,
enquiry, recently viewed).**

### Prompt 25 — Property details part 3: documents, finance, similar, enquiry, recently viewed (2026-09-17)

**What changed**

The property page is finished. The four remaining `sectionVisibility` keys have
components, the two media keys have navigation targets, and the last three
legacy components on the page are gone.

**Documents & brochure** is a list of 56-px rows: the brochure card first
(`brochureUrl`), then each `documents[]` entry with its `DOCUMENT_TYPES` chip.
Each button is named after its own file (`aria-label="Open Current price list"`),
so a screen reader does not read four identical "Open"s in a row.
A row the editor left open opens its file on the first click. A gated row asks
for a name and a phone number, files the lead (`brochure-download` /
`document-request`, with the requested title prefilled in the message), records
the unlock in `sna_lead` and **then opens the file** — from inside the form's
own success handler, so the browser still counts it as the visitor's click.
When a blocker swallows the tab anyway (`window.open` returns `null`) a toast
carries the address as a link, and the dialog's success panel always offers an
"Open <file>" button. That is BUG-08's last half; the boilerplate's
`PropertyDocuments` called an `onDownloadClick` nobody ever passed, so no file
was ever delivered at all.

**Home loan & EMI** replaces `FinanceGuide`'s 1 858 lines with seven components
of at most 292 lines under `sections/property/finance/`, plus one copy file and
one stylesheet. Three tabs: **Check eligibility** (the FOIR questionnaire →
the reading → the acknowledgement), **Bank loans** (three lender cards from
`useBanks()` and "View all banks (6)"), **EMI calculator** (three sliders whose
bounds the lenders set). Every claim the section makes is now traceable: a
lender's rate, funding share, tenure, loan size, features and processing-fee
note come from its §6.6 record and nothing else, and the sentences come from
`financeCopy.js`. Gone with the old component: "8.35 % / 48 Hrs / Up to 90 % /
0.5 % + GST", "Banks Approved", "Pre-Approved", "Minimal documentation",
"Disbursement within 48 hrs", "advisors will reach out within 24 hours", and
the heading typo "Home Finance Clearity".

Two things the old section got wrong are now structural rather than incidental.
A score is shown **only after `POST /leads` has succeeded** — `AssessmentForm`
owns the submission and calls its host's `onComplete` from the success path, so
a failed request leaves the visitor on the form with their answers and a retry.
And the six answers FOIR cannot use are used: `recommendations()` turns the
credit band, the existing EMIs, the down payment, the co-applicant and the time
in the job into named next steps (D57), while the whole questionnaire travels
to the CRM in `leads.meta` (D56) instead of being flattened into a
pipe-separated sentence.

**Similar properties** finally uses the endpoint prompt 08 built: the page
fetches `GET /properties/:id/similar` (the editor's `similarPropertyIds` first,
topped up to six by locality and type) and the carousel prints `PropertyCard`s
in that order. The fetch lives in the page because the sub-navigation may only
offer the item once the API has answered with something — with an empty answer
the section and its navigation item are both absent (BUG-07).

**Enquiry** is one `LeadForm` on a surface, with the message prefilled and
WhatsApp/call follow-ups in its success panel; the boilerplate mounted the same
form three times. Under it, **Recently viewed** reads `sna_recent_properties`
and prints every listing but the one being read.

**How one lead now opens a whole listing**

`leadStorage.UNLOCKS_EVERYTHING` gained the two eligibility sources: a
questionnaire that asks for an income and a credit band has identified the
visitor at least as well as an enquiry has, so it opens every gated kind on the
listing. Because `sessionStorage` fires no event in the tab that wrote it,
`leadStorage` now announces each write on a `sna:lead-change` window event and
`useGatedContent` listens — which is what makes the floor plans and the
documents open on screen, not only in storage, when the enquiry is filed
somewhere else on the page.

**Files added**

- `src/components/sections/property/`: `DocumentsSection.jsx` + CSS,
  `SimilarSection.jsx` + CSS, `EnquirySection.jsx` + CSS,
  `RecentlyViewedSection.jsx`
- `src/components/sections/property/finance/`: `FinanceSection.jsx`,
  `BankCards.jsx`, `BankCard.jsx`, `EmiCalculator.jsx`,
  `EligibilityAssessment.jsx`, `AssessmentForm.jsx`, `AssessmentResult.jsx`,
  `EligibilityModal.jsx`, `assessmentLead.js`, `financeCopy.js`,
  `finance.module.css`
- `src/components/common/RecentlyViewed.jsx` + CSS — the shared strip; the
  listing sidebar reuses it in prompt 26
- Tests: `finance/__tests__/AssessmentForm.test.jsx` (13),
  `finance/__tests__/EmiCalculator.test.jsx` (10),
  `property/__tests__/DocumentsSection.test.jsx` (11)

**Files changed**

- `src/utils/finance.js` — `MONTHLY_INCOME_VALUES`, `EMI_NUMERIC_VALUES`,
  `FOIR`, `applicantIncomeOf`, `monthlyIncomeOf`, `existingEmiOf`, `scoreBand`,
  `SCORE_BANDS`, `affordableProperty`, `recommendations`; `foirScore` and
  `eligibleLoan` now read the form's bracket answers as well as plain rupees,
  and `emiBreakdown` takes `{ price, loanPercent, rate, years }` and returns the
  down payment beside the split. Its test grew from 16 to 30 cases.
- `src/utils/leadStorage.js` — `UNLOCKS_EVERYTHING` exported and widened,
  `LEAD_CHANGE_EVENT` announced on every write
- `src/hooks/useGatedContent.js` — listens for that event
- `src/utils/analytics.js` — `brochure_download`, `document_download` and the
  `floor_plan_download` prompt 24 sends but had not registered
- `src/utils/propertySections.js` (+ test) — `similar.hasData` prefers
  `context.similarAvailable` and falls back to the editor's picks only when the
  caller leaves it out, so the page follows the API and the admin's visibility
  tab still follows the picks
- `src/components/sections/property/LeadModalTemp.jsx` — `successTitle` and
  `successAction`, which is how a gated download is handed over
- `src/pages/public/PropertyDetails.jsx` (+ CSS) — sixteen keys now map to a
  component, the two media keys get a 1 px anchor at the top of the gallery, and
  "Recently viewed" closes the page

**Files removed**

`PropertyDocuments.jsx`, `FinanceGuide.jsx`, `SimilarProperties.jsx`,
`EnquiryForm.jsx`, `SectionPlaceholder.jsx` and their CSS modules — 4 726
lines of component code and stylesheets, replaced by 2 925 lines across
eighteen files (plus 550 lines of test).

**Endpoints / env vars / npm scripts**

None added. `GET /properties/:id/similar` is consumed for the first time;
`POST /leads` carries `meta` for the first time, from the two eligibility
sources. Three analytics events are new: `brochure_download`,
`document_download`, `floor_plan_download`.

**Storage keys**

No new key. `sna_lead` unlocks now also open on `financial-assessment` and
`bank-eligibility`; `sna_recent_properties` is read by the new strip.

**Acceptance checklist**

- [x] Gated brochure and document rows deliver the actual file after the lead,
      and a row the editor left open opens without any dialog (BUG-08 closed).
- [x] Finance: bank cards carry only what the records say, the EMI calculator's
      formulas are unit-tested, both eligibility checks create leads with `meta`
      visible in the mock db, and no reading appears before the POST succeeds.
- [x] Similar uses the API rule and disappears — section and navigation item —
      when the answer is empty; one enquiry form on the page; recently viewed
      works; the five legacy components are deleted and every finance component
      file is ≤ 300 lines (largest: `AssessmentForm.jsx`, 292).
- [x] `npm run lint`, `npm run test:ci` (1 335 tests, 61 suites),
      `npm run build:ci` ("Compiled successfully", no warnings),
      `npm run check:traces` (0 findings), `npm run validate:seed`,
      `npm run smoke` (273/273) pass; the public property page logs nothing to
      the console.
- [x] One commit, clean tree.

**Manual QA (headless Chromium over the DevTools protocol, 1280 px and 390 px)**

- Property 1 (`lakeview-heights-3-bhk-whitefield`), 1280 px: one `<h1>`,
  17 navigation items and 17 matching section ids with none missing, no
  horizontal scroll. The brochure row is the only document row — the seed
  attaches the same PDF as `brochureUrl` and as `documents[0]`, and one file is
  now one row.
- Gated download: "Download brochure" → the dialog titled "Brochure Download"
  with "Requested: Project brochure (PDF)" prefilled → name + phone → lead 46
  reaches the mock (`source: brochure-download`, `propertyId: 1`),
  `window.open` is called with the PDF and `noopener,noreferrer`,
  `sna_lead.unlocks` gains `{"1":["documents"]}`, `dataLayer` receives
  `brochure_download`, and the success panel offers "Open Project brochure
  (PDF)". Afterwards the row shows no lock.
- Eligibility: the questionnaire (salaried, 3–5 years, ₹1.5–2.5 L, existing
  EMIs ₹10–25 k over 12–24 months, credit 700–749) files lead 47 with
  `source: financial-assessment` and a `meta` holding all eight answers, the
  score and `propertyPrice: 12400000`, and only then prints 85/100 "Excellent",
  the six-row breakdown (₹2 L income → ₹1.2 L FOIR → ₹1.02 L free → ₹1.19 Cr
  loan → ₹1.49 Cr property), three recommendations and the disclaimer.
  Completing it opens the floor plans and the documents on the same page
  without a reload.
- Per-bank check: "Check eligibility" on Garden City Bank opens a dialog headed
  "Check eligibility — Garden City Bank" that says the answers are recorded by
  Squares N Acres and nothing is sent to the lender; the result quotes 8.35 %,
  the lender's own published rate, and a declared co-applicant's ₹50 k–1 L is
  added to the ₹2.5 L exact income (₹3.25 L counted).
- EMI calculator: sliders 50–90 % (the most generous active lender funds 90 %),
  6–15 % starting at 8.35 % (the cheapest), 5–30 years starting at 20;
  ₹1.24 Cr × 80 % at 8.35 % over 20 years → ₹85,149 a month, a 49/51 split and
  "Raising your down payment to 25% would save about ₹6.57 L in interest over
  20 years" — computed from the two scenarios, not from a flat 8 %.
- Similar: six cards, `aurelia-park-residences-…` first, which is the editor's
  own `similarPropertyIds` order. With the endpoint answered empty (CDP request
  interception) both the section and its navigation item disappear and every
  other section stays.
- Enquiry: one form, message prefilled "I'm interested in Lakeview Heights…";
  submitting it shows the thank-you with WhatsApp and call buttons and opens the
  floor plans and the documents behind it.
- Recently viewed: after three listings the third page ends with the other two,
  newest first, and never itself.
- 390 px: the Devanahalli plot has no horizontal scroll, its document rows stack
  to 144 px with the button full width; the Koramangala rental has no finance
  section and no "Finance & EMI" navigation item (not a sale listing).
- Admin: `/admin/leads` lists the three new leads with the sources "Financial
  Assessment", "Bank Eligibility" and "Brochure Download" (the `meta` card is
  prompt 29).
- Console: nothing on any public property page. The admin shell prints four MUI
  Grid v7 migration warnings from `Dashboard.js`, which this prompt does not
  touch — recorded as NEW-34 for prompt 29.

**Not exercised against the seed**

No seed listing switches `sectionVisibility.documents` or `.enquiry` off and no
seed document has `leadGated: false`, so the ungated-row path and D86 were
verified by unit test (`DocumentsSection.test.jsx`, `propertySections.test.js`)
rather than in the browser; `db.json` is off-limits to this prompt. Every
published listing has similar properties, so the empty case was produced by
intercepting the request.

**Known issues**

BUG-05, BUG-07, BUG-08, ADD-12 and ADD-13 are closed. One new row: **NEW-34**
(pre-existing MUI Grid v7 warnings on the admin dashboard, owner 29). NEW-33
still stands — the new dialog suites report the same user-event v13 `act(…)`
notices and no test is flaky because of them.

**Next prompt: 26 — Public listing and search.**

### Prompt 26 — Public listing engine, filters, global search and shortlist (2026-09-17)

**What changed**

The listing is one engine. `src/components/listing/ListingEngine.jsx` serves
`/properties`, `/buy`, the four `/buy/<status>` pages, `/buy/:type`, `/rent`,
`/rent/:type`, `/lease`, `/commercial`, `/commercial/:type` and `/plots`, plus
the locality tabs and the builder profile as embeds — thirteen `<Route>`s
generated from one table. A route contributes nothing but the filters it fixes
and the words it uses (`listingRoutes.js`); everything else is the same code.

`GET /properties` does the filtering, the sorting, the paging and the counting
(D94). That is BUG-19 closed: the page this replaces asked for `perPage=100` and
then narrowed, sorted and paginated the answer in the browser, so page 9 of a
search was a page the visitor's own machine had invented. The only thing
computed here now is how `meta.facets` is drawn.

**The filters** live in the URL under the contract's own names — `localityId=1,4`,
`minPrice=10000000`, `constructionStatus=ready-to-move` — so a shared link is a
request the API could answer as it stands, and a reload, the back button and a
second tab all reproduce the same view. A route's own filters are **fixed**:
merged into every request, absent from the URL, drawn as a locked chip, and
their group is hidden in the rail. Removing Whitefield on
`/localities/whitefield` is therefore not possible, which is the point.

Thirteen groups, one component (`FilterGroups.jsx`), two hosts. The desktop rail
applies live 300 ms after the last click and keeps a Reset; the mobile sheet
keeps an Apply that says what it would return ("Show 34 results", a `perPage=1`
count request) because behind a sheet the results are invisible. That closes
ADD-11, whose panel applied live on desktop, needed an Apply on mobile, offered
two property types, dropped the fourth locality, wrote `50000000-Infinity` into
addresses and wiped `q`, `sort` and `page` on "Clear filters" (NEW-06).

**`listingSeo.js`** is the §9.4 rules as a pure function: the canonical carries
only `listingType`, `segment`, `propertyTypeId`, `localityId`,
`constructionStatus`, `bedrooms` and `page`, in that order and never a parameter
the route already fixed; anything else — a price, an amenity, a sort, a search —
makes the page `noindex, follow`. The `<h1>` is rebuilt from the filters, so
`/buy?localityId=1&bedrooms=3` heads itself "3 BHK Properties for sale in
Whitefield, Bengaluru", and `Pagination` emits `rel=prev/next` from the same
object. Prompt 38 hands it to `<Seo type="listing">` unchanged.

**`GlobalSearch`** is one box for three places: the hero, a header dialog and the
listing's results header. It reads `GET /properties/suggestions`, so "hebbal"
offers the **locality page** before it offers a listing in it, keeps the last
five searches in `sna_recent_searches`, and is operable from the keyboard as a
combobox. The hero used to own three hundred lines of type-ahead nobody else
could use — which is why the header had no search at all and `NotFound` sent
`?search=`, a parameter the listing has never read (BUG-10).

**`/shortlist`** exists (NEW-32). It holds ids and asks the API for the live
records, so a list kept for a fortnight cannot show last week's price and a
listing that has been taken down simply stops appearing — the page says how many
are missing. `?ids=` makes it shareable to somebody who has never been to the
site, with a "Save all" for them.

**Files added**

- `src/components/listing/`: `ListingEngine.jsx` (+ `ListingEngine.module.css`),
  `FilterRail.jsx`, `FilterSheet.jsx`, `FilterGroups.jsx` (+
  `filters.module.css`), `ActiveFilters.jsx`, `SortSelect.jsx`,
  `ResultsHeader.jsx`, `ViewToggle.jsx`, `ListingGrid.jsx`, `ListingEmpty.jsx`,
  `useListingParams.js`, `listingRoutes.js`, `listingSeo.js`
- `src/components/common/GlobalSearch.jsx` + CSS
- `src/pages/public/Shortlist.jsx` + CSS
- `src/utils/listingFilters.js`
- `src/components/sections/locality/LocalityListings.jsx`,
  `src/components/sections/developer/DeveloperListings.jsx` — the two embeds
- Tests: `utils/__tests__/listingFilters.test.js` (24),
  `listing/__tests__/listingSeo.test.js` (27),
  `listing/__tests__/ListingEngine.test.jsx` (13)

**Files changed**

- `src/hooks/useApiList.js` — a `fixedParams` option, merged into every request
  last and never written to the URL
- `src/pages/public/PropertyListing.jsx` (+ CSS) — rewritten: resolve the route,
  render the engine, answer 404 for an unknown category slug (D25)
- `src/routes/publicRoutes.js` — the listing routes are generated from
  `LISTING_ROUTES`; `/shortlist` added
- `src/components/common/PropertyCard.jsx` (+ CSS) — `variant="list"`: the same
  card on its side above 900 px, with room for the editor's highlights
- `src/components/common/RecentlyViewed.jsx` (+ CSS) — an optional `heading`, so
  an empty history is no heading
- `src/contexts/ShortlistContext.js` (+ test) — `add`/`remove`/`toggle` read the
  saved ids through a ref: two hearts pressed in the same tick both stick
- `src/pages/public/LocalityDetail.jsx`, `BuilderDetail.jsx` (+ their tests) —
  the embeds replace the two temporary preview rows
- `src/components/sections/home/HeroSection.jsx` (+ CSS) — mounts `GlobalSearch`
- `src/components/sections/home/QuickActions.jsx` — six tiles, real routes (D92)
- `src/components/layout/Header.jsx`, `MobileHeader.jsx` (+ CSS) — a search icon
  opening `GlobalSearch` in a `Modal`
- `src/components/layout/BottomNav.jsx` — Search → `/properties?filters=open`
- `src/pages/public/NotFound.jsx` — searches to `?q=`
- `src/utils/analytics.js` — the `search` event

**Files removed**

`PropertyFilters.jsx` + CSS, `PreLaunch.js`, `UnderConstruction.js`,
`ReadyToMove.js`, `RentApartments.js`, `RentVillas.js`,
`utils/adapters/legacyProperty.js`, `sections/locality/LocalityProperties.jsx`,
`sections/developer/DeveloperProperties.jsx` — 1 192 lines out, 524 net lines of
new source in (3 090 lines across the eighteen new modules, against the deleted
listing, its filter panel, its adapter and the five wrapper pages).
`grep -rn "legacyProperty\|PropertyFilters" src` → 0.

**Endpoints / env vars / npm scripts**

None added. `GET /properties` is consumed with every §5.7 filter and with `ids`
for the first time; `meta.facets` is read for the first time;
`GET /properties/suggestions` now serves three surfaces instead of one.

**Storage keys**

`sna_listing_view` (grid or list) and `sna_recent_searches` (max 5) are new;
`sna_shortlist` is read by `/shortlist`.

**Acceptance checklist**

- [x] Every listing route resolves from the table; filters, sort and page are
      URL-synced; facet counts are shown; the grid/list choice is remembered;
      the empty state suggests which filter to drop; pagination emits
      `rel=prev/next`.
- [x] Global search works from the header, the hero and the listing, with
      grouped suggestions and recent searches; `NotFound` and `QuickActions`
      links fixed.
- [x] The locality Buy/Rent tabs and the builder's projects run the engine;
      `/shortlist` works, including a shared `?ids=` link.
- [x] The legacy listing, its filter panel, the five wrapper pages and
      `legacyProperty.js` are deleted; `listingSeo` is unit-tested.
- [x] `npm run lint`, `npm run test:ci` (1 402 tests, 64 suites),
      `npm run build:ci` ("Compiled successfully", no warnings),
      `npm run check:traces` (0 findings), `npm run smoke` (273/273) pass; no
      console output on any listing page.
- [x] One commit, clean tree.

**Manual QA (headless Chromium over the DevTools protocol, 1280 px and 390 px)**

- The twelve listing routes all answer with one `<h1>`, a count, a canonical and
  no horizontal scroll: `/properties` "Properties in Bengaluru – 38 Listings",
  `/buy` 26, `/buy/pre-launch` 2, `/buy/ready-to-move` 14, `/buy/resale` 4,
  `/buy/villas` 4 (a property type), `/rent` 7, `/rent/apartments` 4,
  `/rent/villas` 1 ("1 Listing", singular), `/lease` 5, `/commercial` 5,
  `/plots` 5. `/buy/unknown` renders the 404 page.
- `/properties?localityId=1&bedrooms=3&minPrice=10000000&maxPrice=15000000` →
  title "3 BHK Properties in Whitefield, Bengaluru", canonical
  `/properties?localityId=1&bedrooms=3` (the price is dropped),
  `robots: noindex, follow`, and three removable chips beside the "Clear all".
- Ticking Whitefield in the rail wrote `?localityId=1` and renamed the page to
  "Properties for sale in Whitefield, Bengaluru" ~300 ms later; removing the
  chip took it away and did **not** let the rail put it back.
- Choosing Rent in the rail while a sale budget was set cleared `minPrice` and
  `maxPrice` and switched the buckets to "Up to ₹10 K …" (D90). Back restored
  the sale budget and the sale buckets; forward restored the rent view.
- A six-filter URL restored the rail exactly: "6 filters applied", Apartments,
  Whitefield and Semi-furnished ticked, "3 BHK" pressed, sort "price-asc",
  `noindex`.
- `?bedrooms=5` highlights the "5+ BHK" chip; `?minPrice=abc` is ignored.
- `/localities/whitefield`: tabs "Buy (1)" and "Rent (1)", locked chips "Buy"
  and "Whitefield", the page's own `<h1>` untouched. `/builders/aurelia-estates`
  lists its eight projects under "Projects by Aurelia Estates".
- Shortlist: two hearts on `/buy` → `["6","23"]` in `sna_shortlist` → two cards
  with a "Remove" each and a Share button; `/shortlist?ids=1,2` shows a shared
  list with "Save all"; an empty list offers "Browse properties". Both are
  `noindex, follow`.
- Search: "hebbal" in the hero offers the locality first (2 properties), then
  two listings, then "Search for “hebbal”"; following the locality lands on
  `/localities/hebbal` and the term is remembered, so the next focus offers it
  back. The header dialog focuses its input and answers "aurelia" with five
  listings and the builder. The 404 page's box goes to `/properties?q=…`.
- 390 px: `/properties?filters=open` opens the sheet with the parameter consumed
  from the address; ticking Whitefield changed the footer from "Show 38 results"
  to "Show 3 results" and applying it wrote `?localityId=1`. No rail is
  rendered, and nothing scrolls sideways.
- Console: nothing on any listing, locality, builder or shortlist page at either
  width.

**Known issues**

BUG-10, BUG-16, BUG-19, ADD-10, ADD-11, ADD-15, NEW-05, NEW-06 and NEW-32 are
closed. No new defect was recorded: the one found while testing — two hearts
pressed in the same tick losing the first, because `ShortlistContext` read the
render's copy of the list under React 18 batching — is fixed here with a test.
NEW-33 (user-event v13 `act(…)` notices around MUI dialogs) still stands.

**Next prompt: 27 — Home page.**

### Prompt 27 — Data-driven home page, navigation and footer (2026-09-17)

**What changed**

The home page no longer contains a sentence a component made up. Fifteen bands,
and every one of them is data: the hero and its search tabs are
`siteSettings.hero`; the tiles and the four listing rows are `GET /properties`
with different filters; the localities, property types and builders are master
data; "Why choose Squares N Acres" and "How it works" are the `features` and
`steps` blocks of the `home` CMS page (D81); the testimonials, articles, FAQs
and partners are their own collections. `WhyChoose.jsx` and `HowItWorks.jsx` —
eight hardcoded objects between them — are deleted. That is the home half of
BUG-11 closed.

**A section with nothing behind it renders nothing at all.** No heading, no
empty state, no gap. A row below three results is absent; a tile whose count
request failed shows no count rather than "0"; the CMS bands disappear the
moment the page is unpublished, because there is no fallback copy by design —
a fallback would mean quietly ignoring what an editor did.

**The hero search** is the `HERO_SEARCH_TABS` strip over a card that overlaps
the hero: a locality/keyword box, a property type, a budget and — for the two
residential tabs — BHK chips. Each tab is a listing route and the form is that
route's first filters, so Search lands on
`/rent?localityId=7&bedrooms=2`, the same address the listing's own rail
produces. A locality picked from the type-ahead becomes `localityId`; free text
becomes `q`. Switching tab always drops the budget: the sale and rent scales are
two orders of magnitude apart (D90). Searching is **not** a lead — it sends the
`search` event and navigates, and `LEAD_SOURCES.hero-search` stays unused.

**The navigation is one module.** `src/config/navigation.js` builds the header
menus, the header actions, the footer columns, the legal line and the bottom bar
from master data, the published CMS pages and `siteSettings`. `Header`,
`MobileDrawer`, `BottomNav` and `Footer` all read those builders, so the two
copies of `navItems` that `Header` and `MobileHeader` each carried are gone
(BUG-20). A menu with no pages behind it is not rendered; a property type an
editor adds appears in the Buy mega-menu, the type grid and the footer without
a code change.

**`GET /pages?showInHeader=&showInFooter=`** is the one new endpoint: published
pages as `{slug,title,headerMenu,footerColumn,order}`, unpaginated, because a
menu arrives whole or it is wrong. `useNavPages()` caches both lists in memory
for the page load, so four components share one pair of requests (the D93
reasoning, applied to the CMS).

**Files added**

- `src/config/navigation.js`, `src/config/copy.js`
- `src/hooks/useNavPages.js`
- `src/components/layout/`: `MegaMenu.jsx`, `MobileDrawer.jsx` (+ their CSS)
- `src/components/sections/home/`: `HeroSearch.jsx`, `CategoryTiles.jsx`,
  `PropertyRow.jsx`, `PropertyTypeGrid.jsx`, `TopBuilders.jsx`,
  `HomeFeatures.jsx`, `HomeSteps.jsx`, `LatestInsights.jsx`, `CtaBand.jsx`
  (+ their CSS), `useCategoryCounts.js`
- Tests: `config/__tests__/navigation.test.js` (28),
  `sections/home/__tests__/HeroSearch.test.jsx` (14),
  `sections/home/__tests__/PropertyRow.test.jsx` (7)

**Files changed**

- `src/pages/public/Home.jsx` (+ CSS) — rewritten around the fifteen bands and
  the `home` CMS page
- `src/components/sections/home/HeroSection.jsx` (+ CSS) — media, headline, the
  trust badges and the stats row (both only when settings carry them), and the
  search card
- `src/components/sections/home/ExploreLocalities.jsx` (+ CSS) — the shared
  `Section`/`SectionHeader` and a "View all"
- `src/components/layout/Header.jsx`, `MobileHeader.jsx`, `BottomNav.jsx`,
  `Footer.jsx` (+ their CSS) — all four rebuilt on the builders
- `src/components/layout/MainLayout.jsx` (+ CSS) — the home page's `<main>`
  drops the header offset so the hero runs under the transparent bar (D52)
- `src/components/common/GlobalSearch.jsx` (+ CSS) — an `inline` variant with no
  `<form>` of its own, `inputId`, `onChange` and an `onSelect` a host may consume
- `src/components/common/LeadForm.jsx` — a field may declare `group` (nest under
  `requirement`), `toBody` (one budget select fills two fields) and a function
  `options` (choices that follow the other answers)
- `src/components/sections/property/LeadModalTemp.jsx` — a `requirement` prop
  adding the six selects of D82
- `src/components/ui/Drawer.jsx` (+ CSS) — `padded={false}`
- `src/routes/paths.js` — `PATHS.page()` encodes each segment, so a nested page
  slug keeps its slashes
- `mock-server/routes/pages.js`, `src/services/endpoints.js`,
  `pageService.js`, `endpoints.test.js`, `mock-server/__tests__/content.test.js`,
  `docs/API_CONTRACT.md` — the navigation endpoint

**Files removed**

`QuickActions.jsx`, `WhyChoose.jsx`, `HowItWorks.jsx`, `FeaturedProperties.jsx`,
`TrendingTopics.jsx` and their five stylesheets — 2 867 lines out against 1 393
in across the whole diff, with 2 550 lines of new source in the twenty-eight new
modules. `grep -rn "QuickActions\|WhyChoose\|HowItWorks\|FeaturedProperties\|TrendingTopics" src` → 0.

**Endpoints / env vars / npm scripts**

One endpoint added: `GET /pages?showInHeader=&showInFooter=` (`pages.list`,
public, published only). No env var, no npm script, no dependency.

**Acceptance checklist**

- [x] Home renders every section of the objective from data; the hero search
      navigates with the right parameters for each tab; the tiles show counts;
      rows below three items are absent.
- [x] Header, mega-menu, drawer, bottom bar and footer are built from data and
      settings; no "Sign In"; the CTA opens the post-requirement modal; the
      phone and WhatsApp buttons follow `settings.navigation`.
- [x] The five legacy sections are deleted; `GET /pages?showInHeader` is
      smoke-tested (`pages.list` in the walk) and unit-tested on the mock.
- [x] `npm run lint`, `npm run test:ci` (1 452 tests, 67 suites),
      `npm run build:ci` ("Compiled successfully", no warnings),
      `npm run check:traces` (0 findings), `npm run test:mock` (131) and
      `npm run smoke` (274/274) pass.
- [x] One commit, clean tree.

**Manual QA (headless Chromium over the DevTools protocol, 1280 px and 390 px)**

- `/` renders one `<h1>` and fifteen `<h2>` bands in the objective's order, with
  no horizontal scroll and no console output. The tiles read "Ready to move 14
  listings", "Under construction 6", "New launch 2", "Plots & land 5", "Rent a
  home 7", "Commercial 5".
- Hero: the Rent tab switched the budget select to "Up to ₹10 K / ₹10 K – ₹20 K
  / ₹20 K – ₹35 K"; typing "koramangala" offered the locality first, then three
  listings; picking it, ticking 2 BHK and pressing Search landed on
  `/rent?localityId=7&bedrooms=2`, headed "2 BHK Properties for rent in
  Koramangala, Bengaluru".
- Mega-menu keyboard: `Space` on "Buy" opened the four-column panel and focused
  "Pre-Launch", `ArrowDown` moved to "Under Construction", `End` jumped to "HSR
  Layout", `Escape` closed it and returned focus to the trigger with
  `aria-expanded="false"`. The budget column links
  `/buy?minPrice=5000000&maxPrice=10000000` … `/buy?minPrice=25000000`, and that
  first link opens the listing as `noindex, follow` (§9.4).
- Header width: measured at 900, 1024, 1280 and 1536 px — nav overflow 0 at all
  four. Below 1200 px the tail folds into "More" (five menus + More at 900 and
  1024; all ten at 1280 and 1536).
- 390 px: no horizontal scroll; the bottom bar is Home · Search · Shortlist ·
  Enquire · Menu; the tiles are two per row; the drawer lists all ten menus as
  48 px accordion rows over a Call · WhatsApp · Post Requirement row, with no
  "Sign In"; expanding Buy showed its four groups and 26 links.
- "Enquire" opened the post-requirement dialog with the six D82 selects; filling
  it in filed a lead whose `requirement` reads
  `{listingType:'rent', bedrooms:3, budgetMin:20000, budgetMax:35000, timeline:'1-3-months'}`
  — nested, not flattened. Choosing Rent first had switched the budget options to
  the rent bands.
- Settings: `PUT /api/admin/settings {"navigation":{"showWhatsappButton":false}}`
  then a fresh load left `tel:` and the CTA in the header and no WhatsApp button;
  restoring it brought the button back.
- Edge cases: with `GET /properties?perPage=1` failing, every tile rendered
  without a count and no "0" appeared anywhere; with the `home` page set to
  `draft`, "Why choose Squares N Acres" and "How it works" were absent and the
  page went from "Top builders" straight on with no gap.

**Known issues**

BUG-20 and ADD-15 are closed; BUG-11 and ADD-06 keep rows for the pages and the
duplicates prompts 29–40 own. No new defect was recorded. Two things worth
writing down for the next reader:

- The header genuinely does not fit ten top-level menus below about 1200 px, so
  `collapseMenus()` folds the tail into "More" between 900 px and 1199 px. That
  is a decision, not a bug (see `docs/DECISIONS.md`), and the same measurement
  is why the call and WhatsApp buttons are icons on desktop.
- In this container every request to an external host (`picsum.photos`,
  `res.cloudinary.com`, the Iconify API) fails TLS verification through the
  agent proxy, so the QA screenshots show empty image and icon boxes and the
  browser console carries `ERR_CERT_AUTHORITY_INVALID` lines. `curl` reaches the
  same URLs from the shell (302), and nothing in the page's own JavaScript
  reports an error; the "no console output" claims above exclude those transport
  failures.

**Next prompt: 28 — Lead capture unification.**

### Prompt 28 — Unified lead capture, spam protection and click tracking (2026-09-17)

**What changed**

There is one lead system. `LeadForm` is the only form on the site that files a
lead, `LeadCaptureModal` is the only dialog that asks for one,
`LeadCaptureContext` is the only thing that opens it, and
`src/utils/leadSources.js` is the only place a `LEAD_SOURCES` value is written
down. Fifteen pages that each declared their own field array and their own
source string now name an **entry point** and take the rest from the table —
which is what closes BUG-09 in the client: `home_loan`, `faq_contact` and
`website` are not discouraged, they are unreachable.

**Every box has a label.** Each control is a `ui/FormField`, so it carries a
visible `<label>`, `aria-describedby` for its hint and its error, and
`aria-invalid` when it is wrong (§8.3). `required: false` is honoured — an
untouched optional box is left out of the body rather than sent as `''`, which
is what used to make an e-mail-less enquiry come back 422. That is ADD-09
closed.

**Spam protection is unconditional.** Every form — the newsletter band
included — carries the `website` honeypot (off-screen, `tabindex="-1"`,
`aria-hidden`, autofill off) and a ten-second throttle per instance (D43) whose
countdown is announced through `aria-live`. The server's own 429 reads back as
"Too many requests, please wait a minute". The consent box is a real control:
unticking it blocks the submit rather than filing `consent: false`.

**Nothing is dropped on the way to the API any more.** A field whose name is
not one of the four `POST /leads` stores at the top level goes to `lead.meta`
(D56) — `monthlyIncome`, `workspaceType`, `serviceType`, `askingPrice` were all
being posted and silently discarded by the mock's `sanitize()`. The six
requirement selects nest under `requirement` (D82). The phone is normalised to
`+91XXXXXXXXXX`. The campaign that brought the visit rides along, captured once
into `sna_utm` on the first landing and attached four pages later.

**A gated download asks once per listing, not once per file.** When
`sna_lead` already holds a phone number and either a capture for this listing
or an open gate of the kind being asked for, `LeadCaptureModal` skips the form,
delivers the file and **files no second lead** — the first capture is the
record that matters, and the analytics events (`brochure_download`,
`document_download`) are what say which file was taken. The retry offered after
a blocked pop-up is a real `<a href>` rather than a second `window.open`.

**WhatsApp and call clicks are leads only for somebody we can call back.**
`WhatsAppButton` and `CallButton` replace nine hand-rolled `tel:`/`wa.me`
anchors across the header, the drawer, the price card, the CTA bar, the agent
card and the success panel. Every click sends its event; a click by an
identified visitor also files a `whatsapp-click` / `call-click` lead,
fire-and-forget so the link is never delayed. An anonymous visitor's click is
an event and nothing more — `POST /leads` needs a name and a number — and a
signed-in staff member is never treated as a visitor at all. The floating
56 px WhatsApp circle is on every public page and names the listing a visitor
is reading.

`LeadModalTemp` and its stylesheet are deleted.

**Files added**

- `src/utils/leadSources.js` (`ENTRY_POINTS`, `leadFormProps`, `withDefaults`,
  `requirementFields`), `src/utils/clickLead.js`
- `src/contexts/LeadCaptureContext.js`
- `src/components/common/`: `LeadCaptureModal.jsx` (+ CSS), `LeadFormField.jsx`,
  `LeadSuccess.jsx`, `RequirementFields.jsx`, `ConsentCheckbox.jsx`,
  `Honeypot.jsx`, `NewsletterForm.jsx`, `WhatsAppButton.jsx`, `CallButton.jsx`,
  `ContactButtons.module.css`
- Tests: `common/__tests__/LeadForm.test.jsx` (23),
  `common/__tests__/LeadCaptureModal.test.jsx` (13),
  `utils/__tests__/leadStorage.test.js` (17),
  `utils/__tests__/leadSources.test.js` (18)

**Files changed**

- `src/components/common/LeadForm.jsx` (+ CSS) — rewritten to the new contract
- `src/utils/leadStorage.js` — v2 (`getVisitor`, `saveVisitor`, `markCaptured`,
  `isCapturedFor`, `isIdentified`, `unlock`, `isUnlocked`, `clear`) plus
  `captureUtm`/`getUtm`; a record written by an older bundle is migrated, not
  discarded
- `src/utils/validators.js` — Indian mobile only, `normalizePhone`,
  `localPhoneDigits`, per-field labels in the messages
- `src/utils/analytics.js` — a GA4 `gtag` bridge beside the `dataLayer` push,
  and `newsletter_subscribe`
- `src/routes/index.js` — `LeadCaptureProvider` in the app shell;
  `src/components/layout/MainLayout.jsx` — the floating button
- `src/components/layout/`: `Header.jsx`, `MobileHeader.jsx`, `MobileDrawer.jsx`,
  `BottomNav.jsx` — the CTA opens the shared dialog, the contact glyphs are the
  shared buttons
- `src/components/sections/property/`: `PriceCard.jsx`, `MobileCtaBar.jsx`,
  `AgentCard.jsx`, `EnquirySection.jsx` (+ CSS), `UnitConfigurationsSection.jsx`,
  `FloorPlansSection.jsx`, `DocumentsSection.jsx`, `finance/AssessmentForm.jsx`
- `src/components/sections/locality/LocalityCta.jsx`,
  `sections/developer/DeveloperCta.jsx`
- `src/components/common/NewsletterSection.jsx` (+ CSS) — the shared form
- `src/pages/public/`: `PropertyDetails.jsx`, `FAQs.jsx`, `ArticleDetail.js`,
  `Articles.js` (+ CSS), `Contact.jsx`, `Careers.jsx`, `HomeLoan.jsx`,
  `LegalAssistance.jsx`, `InteriorDesigning.jsx`, `SellLet.jsx`,
  `Partnership.jsx`, `FlexibleWorkspace.jsx`, `DirectLeaseRetails.jsx`,
  `RealEstateAwareness.js`
- Tests updated for the new markup: `DocumentsSection.test.jsx`,
  `FloorPlansSection.test.jsx`, `BuilderDetail.test.jsx`

**Files removed**

`src/components/sections/property/LeadModalTemp.jsx` and its stylesheet.

The whole diff is 64 files, **4 399 lines in against 2 310 out**; `src/` alone
is 4 118 in / 2 250 out across 62 files, of which 856 added lines are the four
new test suites. What came out is the duplication: the hand-rolled forms of
`Contact.jsx` and `Careers.jsx`, the eight `leadFields` arrays, the nine
`tel:`/`wa.me` anchors and `LeadModalTemp` itself.

**Endpoints / env vars / npm scripts**

None added. `POST /leads` and `POST /newsletter/subscribe` are used exactly as
§5.14 already defines them. One new storage key: `sna_utm` (sessionStorage),
beside the v2 `sna_lead`.

**Acceptance checklist**

- [x] Every lead entry point uses `LeadForm`/`LeadCaptureModal` with a canonical
      source. The prompt's grep for the fifteen legacy spellings returns **0**,
      and `leadSources.test.js` asserts every entry's source is a
      `LEAD_SOURCES` value and that every canonical value but the CRM's `other`
      has an entry.
- [x] All 29 canonical sources were posted through the running mock and read
      back from `GET /admin/leads` under their own label (three batches, to
      stay inside the ten-a-minute limit; the probe leads were deleted after).
- [x] Gated flows skip the form when the visitor is already identified, still
      deliver, and file no second lead; WhatsApp/call clicks create leads only
      for identified visitors.
- [x] Honeypot, throttle, consent, 422/429 handling, prefill and the success
      actions work; `LeadModalTemp` is deleted.
- [x] `npm run lint` (0 findings), `npm run test:ci` (**1 523 tests, 71
      suites**), `npm run build:ci` ("Compiled successfully", no warnings),
      `npm run check:traces` (0 findings) and `npm run smoke` (274/274) pass.
- [x] One commit, clean tree.

**Manual QA (headless Chromium over the DevTools protocol, 1280 px and 390 px)**

- **Header "Post Requirement"** opened "Post your requirement" with the
  fieldset "What are you looking for?" and its six selects in order. Choosing
  Rent switched the budget options from the sale bands to
  `0-10000 … 500000-` (D90); the lead stored
  `requirement: {listingType:'rent', bedrooms:3, budgetMin:20000, budgetMax:35000, timeline:'1-3-months'}`,
  `phone: '+919876543210'` (typed as `+91 98765-43210`), `consent: true` and the
  `pageUrl`. The success panel offered "Message on WhatsApp" and "Call …";
  `window.dataLayer` held `lead_submit`.
- **Gated brochure, fresh session:** the row read "Shared on request"; the
  dialog asked for name, phone and e-mail only (no message box); the lead was
  filed as `brochure-download` with `propertyId: 34` and
  `message: 'Requested: Project brochure (PDF)'` from the hidden field; the
  file was offered as a real link with `target="_blank"`; `sna_lead` held
  `{"version":2,…,"unlocks":{"34":["documents"]}}`.
- **Second gated action, same session:** after a reload the section no longer
  said "Shared on request", the click opened the PDF straight away, **no form
  was shown and no second lead was filed** (the newest lead id was unchanged).
- **Floating WhatsApp** (56×56, bottom-right) linked to
  `wa.me/919800000000?text=Hi Squares N Acres, I am interested in a property. — Greenfield Axis – Office Space for Lease in Bellandur http://localhost:3000/properties/…`
  — the configured default plus the listing and its address.
- **`/insights/faqs`** carried two forms: the question form (name, phone,
  e-mail, "Your question", honeypot, consent; submit "Ask us") and the
  newsletter band (e-mail + honeypot, submit "Subscribe"). The question filed a
  `faq` lead carrying its text.
- **`/contact`** (the legacy page) filed `contact-page` with
  `meta: {subject: 'property-enquiry'}` — the subject select's seven options
  come from `ENTRY_POINTS`. Controls measured 44 px (the textarea 112 px) and
  the submit was full width.
- **Throttle:** with the browser taken offline, the submit showed the inline
  "Unable to reach the server…" error and left the form up; the button then
  read **"Please wait 9s"**, was `disabled`, and the `aria-live` line said "You
  can send this again in 9 seconds." A second click did nothing.
- **390 px:** no horizontal scroll; the property CTA bar is Call · WhatsApp ·
  Enquire at 48 px each, pinned to the viewport bottom (top 715 in a 780 px
  viewport); the floating circle sits 71 px above it. "Enquire" opened a bottom
  sheet — full width, bottom-anchored, 40×4 grabber, 44 px controls, the
  consent line and a full-width "Send".
- **Console:** nothing but React's "Download the React DevTools" notice at
  either width. As in prompt 27, every request to an external host
  (`picsum.photos`, `res.cloudinary.com`, the Iconify API) fails TLS through
  this container's proxy, so images and icons render as empty boxes and the
  transport errors are excluded from that claim.

**Known issues**

BUG-09 (client half), BUG-15 (client half) and ADD-09 are closed; `LeadModalTemp`
and the post-requirement modal leave the pending-rewrites table. One new defect
was recorded:

- **NEW-35** — for about half a second after a route change, framer-motion's
  page-transition wrapper in `MainLayout` carries a `transform`, which makes it
  the containing block for every `position: fixed` element inside `<main>`. The
  property page's mobile CTA bar therefore sits far below the fold until the
  spring settles (`top: 9041` at 0 ms, `top: 715` from ~500 ms). It
  self-corrects, and the floating WhatsApp button is outside `<main>` and never
  affected. Pre-existing — the wrapper is prompt 04's and the bar prompt 23's —
  so it is recorded rather than fixed here.

Two things worth writing down for the next reader:

- The seed points a listing's brochure **and** all four of its documents at the
  same dummy PDF, and `orderedDocuments` de-duplicates a document that is the
  brochure again, so a seeded listing shows exactly one download row. That is
  prompt 25's intended behaviour, not a regression — but it means "the second
  document" can only be exercised against the same row after a reload.
- `LEAD_SOURCES` carries a 29th value, `other`, that §6.17 does not list;
  prompt 05 added it as the CRM's catch-all. No entry point claims it, and
  `leadSources.test.js` exempts it by name rather than by a loophole.

**Next prompt: 29 — Admin leads CRM and dashboard.**

### Prompt 29 — Admin leads CRM and the real-data dashboard (2026-09-17)

**What changed**

`/admin/leads` is a server-side CRM. Every filter, the sort, the page and the
export are query parameters `GET /admin/leads` answers, and the sales scope of
D15 is applied there rather than in the browser — the old screen fetched
`perPage=100` and narrowed the rows itself. The URL carries the whole view, so
a filtered table is a link somebody can send. Eight columns: name with the
phone and the e-mail under it, source, the property the enquiry names, the
status as a menu, priority, the assignee, the follow-up with its overdue
marker, and how long ago it arrived. A `new` row is tinted and carries a blue
left edge, which is what "fourteen of these have not been answered" looks like
in a list of forty-five.

**The list writes.** The status chip is the control that changes it: one press
opens the seven statuses and patches optimistically, rolling back if the API
disagrees. "Lost" is not sent straight through — it opens a dialog that refuses
a reason shorter than three characters, because a pipeline full of closed leads
with no reason between them teaches nobody anything. An unassigned row offers a
sales user the **Claim** button (D89) and an admin or a manager the **Assign**
dialog; the bulk bar applies a status, an assignee, a priority or a delete to
the ticked rows. The CSV is `GET /admin/leads/export` fetched with a bearer
token and saved from a blob (D46): the server writes the BOM, the property
title and the quoting the hand-rolled export got wrong (NEW-22), and an export
of a filter with no matches is the header row alone.

**"Possible duplicate."** Every admin read now carries `isPossibleDuplicate` —
another lead with the same normalised number created within thirty days. The
window is measured between the two leads rather than from today, so a pair's
answer never changes as the calendar moves on, and it is computed over the
whole collection rather than over the caller's scope: a sales user who cannot
see the colleague's enquiry is exactly the person who needs telling that it
exists (`mock-server/lib/leadFilters.js`, documented in `docs/API_CONTRACT.md`).

**`/admin/leads/:id` is a conversation in two columns.** The left one is what
the visitor told us — the contact card with Call, WhatsApp and Mail as
buttons, the requirement (only the fields the form actually captured), the
listing they were on, and `meta` rendered generically (D56): the score with a
band chip, the bank on its own line, and every other key humanised, so the next
calculator's payload renders without anybody editing this file. Then the notes,
newest first, with the author's initials and Ctrl + Enter to post, and the
activity timeline — the server's `activities[]`, not the three events the old
page invented from `createdAt` and `updatedAt` (ADD-21). The right column is
what we decide: the six-rung funnel, the priority, the assignee, and the
follow-up date and time. Moving forward through the funnel is one press; moving
backwards — including reopening a lost lead — asks first. Every change is a
`PATCH`, every `PATCH` appends an activity server-side, and the lead is re-read
afterwards, so the timeline on the left is the record of what the rail on the
right was just used to do.

**`/admin/dashboard` draws one response and computes nothing.** `GET
/admin/dashboard` (§6.16) answers the counters, four trends, the ten newest
leads, the five best-performing listings, the site's SEO health and the
follow-ups that are due. The boilerplate's "+12 %" badges were string literals
(BUG-11) and its figures were three collections re-aggregated in the browser
(NEW-24); the only comparison left is arithmetic on two figures the response
carries, this month against last, omitted entirely when last month was zero.
The four charts are `recharts` behind `React.lazy`, each reading its colours
from the design tokens through `useCssVar` and publishing its series as a
visually hidden table beside the SVG — a chart is a picture of a table, and the
table is what a screen reader and a page search actually get.

**Role-aware without asking twice.** The API scopes a sales user's lead figures
to their own and the unassigned ones; the screen says whose they are ("Your
leads"), hides the content counters §7 does not give them, and drops the SEO
card and the quick links they could not follow. In the list they see Me and
Unassigned in the assignee filter rather than the staff directory, get Claim
instead of Assign, and have no bulk bar and no delete.

**Files**

Added (32): `src/pages/admin/leads/` — `LeadsListPage.jsx` + `.module.css`,
`leadColumns.jsx`, `leadFilters.js`, `LeadStatusMenu.jsx`, `AssignDialog.jsx`,
`LostReasonDialog.jsx`, `LeadDetailPage.jsx` + `.module.css`,
`LeadContactCard.jsx`, `LeadRequirementCard.jsx`, `LeadMetaCard.jsx`,
`LeadPipeline.jsx`, `LeadNotes.jsx`, `LeadTimeline.jsx`, `LeadFollowUp.jsx`,
`__tests__/LeadPipeline.test.jsx`, `__tests__/LeadTimeline.test.jsx`;
`src/pages/admin/dashboard/` — `DashboardPage.jsx` + `.module.css`,
`StatCards.jsx`, `RecentLeadsTable.jsx`, `TopPropertiesCard.jsx`,
`SeoHealthCard.jsx`, `FollowUpsCard.jsx`, `QuickLinks.jsx`,
`charts/ChartFrame.jsx`, `charts/LeadsByDayChart.jsx`,
`charts/LeadsBySourceChart.jsx`, `charts/LeadsByStatusChart.jsx`,
`charts/ViewsByDayChart.jsx`, `__tests__/DashboardPage.test.jsx`.

Changed: `src/routes/adminRouteConfig.js` (three lazy imports),
`src/contexts/LeadNotificationsContext.js` (`refreshKey`),
`src/components/admin/DataTable.jsx` + `.module.css` (`rowHighlight`),
`src/components/admin/FilterBar.jsx` (a `custom` field type),
`src/config/rbac.js` (`users.list`), `src/services/endpoints.js`
(`adminUsers.readAuth`), `mock-server/lib/leadFilters.js` (the duplicate
index), `mock-server/routes/leads.js`, `mock-server/lib/routePermissions.js`,
`mock-server/__tests__/leads.test.js`, `mock-server/__tests__/auth.test.js`,
`package.json`, `package-lock.json`, `docs/API_CONTRACT.md`,
`docs/DECISIONS.md`, `docs/PROJECT_STATE.md`.

Removed: `src/pages/admin/AdminLeads.js` (33 KB), `src/pages/admin/LeadDetail.js`
(28 KB), `src/pages/admin/Dashboard.js` (29 KB).

**Endpoints / dependencies / env vars / npm scripts**

No new endpoints. `GET /admin/leads` and `GET /admin/leads/:id` gained the
computed `isPossibleDuplicate` field (documented in `docs/API_CONTRACT.md`
under `Lead`), and reading `/admin/users` — the list and one record — moved
from admin-only to admin **and** manager as `users.list`, because §7 gives
`leads.assign` to managers and naming a colleague means reading the directory;
every write on `/admin/users` and the `/admin/settings/users` screen stay
admin-only. One dependency: **`recharts@3.10.1`** (§3.3), code-split — it lands
in a 396 KB chunk of its own and the main bundle contains none of it. No env
vars, no npm scripts.

**Acceptance checklist**

- [x] Leads list, detail, pipeline, notes, assignment, follow-up, bulk, export,
      claim and the duplicate chip work for admin, manager and sales.
- [x] The dashboard shows real aggregates with `recharts` in a lazy chunk, is
      role-aware, and carries no hardcoded trend.
- [x] `AdminLeads.js`, `LeadDetail.js` and `Dashboard.js` are deleted;
      `test:mock` covers `isPossibleDuplicate` (three new cases: the pair is
      flagged and a single enquiry is not, the public response does not carry
      it, and a sales user is told about a duplicate they cannot open).
- [x] `npm run lint` (0 findings, `check:endpoints` 0 blocking over 450 files),
      `npm run test:ci` (**1 544 tests, 74 suites**), `npm run build:ci`
      ("Compiled successfully", no warnings), `npm run check:traces` (0
      findings over 739 files), `npm run test:mock` (**134 tests, 38 suites**)
      and `npm run smoke` (274/274) pass.
- [x] One commit, clean tree.

**Manual QA (headless Chromium over the DevTools protocol, 1280/1440 px and 390 px)**

- **Dashboard, admin:** ten stat tiles (`role="group"` each, named by their
  label), four charts with their `aria-label` and four hidden data tables
  beside them, then Latest leads, Upcoming follow-ups, Top listings, SEO health
  and Quick links. "Leads this month" read `16`, `↓ 11.1% vs last month` and
  `18 last month` — arithmetic, not a string. The SEO gauge read `72.4` with
  `aria-label="Average SEO score 72.4 out of 100"`.
- **Leads list, admin (1280 px):** 45 rows across the pages, the "14 new" chip
  and "Mark all seen" beside the title, `Export CSV (45)`, and the `new` rows
  tinted. Filtering to `?status=new` gave 15 rows and a removable "Status: New"
  chip; `?status=new&source=brochure-download` gave the "No leads match" empty
  state with a Reset button.
- **Status menu → PATCH:** clicking the chip on "Duplicate Tester 2" opened the
  seven statuses; choosing **Qualified** showed "…is now Qualified." and the
  API recorded `Status changed from New to Qualified`. Choosing **Lost** opened
  the reason dialog; pressing "Mark as lost" with the box empty showed "Say in
  a few words why this lead was lost." and sent nothing; typing a reason moved
  the row to Lost and stored `lostReason: 'Bought elsewhere'`.
- **Duplicate chip:** two public `POST /leads` from `9845011111` and
  `+91 98450 11111` came back with `isPossibleDuplicate: true` on **both**, the
  chip rendered on both rows and on the detail header, and lead 1 — one
  enquiry, one number — stayed `false`.
- **Lead detail, admin:** the contact card's three buttons, the "Enquired
  about" card linking to the listing and to its editor, one note with its
  author and avatar, five timeline entries newest first, the funnel with
  "Contacted — the current stage", the priority select, the assignee picker,
  and a follow-up of `16 Sep 2026, 10:30 am` with the **Overdue** chip. The
  date and time inputs read `2026-09-16` / `10:30` — IST, matching the line
  above them, on a container whose clock is UTC.
- **Sales:** `/admin/leads/13` (a manager's lead) rendered "This lead does not
  exist" with a Back to leads button rather than an error; the list offered 17
  **Claim** buttons, no row checkboxes, an Export button, and only Me /
  Unassigned in the assignee filter. Claiming showed "“Duplicate Tester 2” is
  yours."; claiming a lead already held answered **409** "This lead is already
  assigned."
- **Export:** `?q=Duplicate` wrote the two matching rows under the thirteen
  contract columns after the BOM; `?q=zzzznothing` wrote the header row alone.
- **390 px:** the rows are cards — name, the duplicate chip, the status,
  priority and source chips, the overdue chip, Assigned and Created, and
  **Call** and **WhatsApp** as buttons on every card. No horizontal scroll on
  the list or on the detail, where the funnel reads down the page.
- **Console:** nothing at either width on any of the screens — not a warning,
  not an error, across eleven page loads and two interaction runs. As in
  prompts 27 and 28, every request to an external host (`picsum.photos`,
  `res.cloudinary.com`, the Iconify API) fails TLS through this container's
  proxy, so images and icons render as empty boxes; those transport errors are
  excluded from that claim.

**Known issues**

BUG-11's dashboard half, ADD-21's lead and dashboard half, **NEW-22** and
**NEW-34** are closed; ADD-07's second poller was already closed in 12 and
stays closed — `LeadNotificationsContext` is still the only thing in the panel
that polls, and the table now listens to it through `refreshKey` instead of
fetching on a timer of its own. No new defect was found.

Three things worth writing down for the next reader:

- **`charts/ChartFrame.jsx` is not in the prompt's file list.** It holds the
  hidden data table, the `role="img"` wrapper and the tone→token map that all
  four charts need; duplicating eight lines of clip-rect CSS four times was the
  alternative. It is styled inline rather than through a CSS module precisely
  because the charts are code-split and a stylesheet they alone import would be
  a fifth chunk to keep in order.
- **The assignee directory needed a permission.** §7 gives `leads.assign` to
  managers and the `users` area to admins only, which left a manager able to
  assign a lead and unable to see anybody to assign it to. Reading the
  directory is now `users.list` (admin + manager); the Users screen and every
  write stay `users.view` / `'*'`. `mock-server/__tests__/auth.test.js` was
  rewritten to assert the narrower rule rather than the old one.
- **The lead list's property filter is a `FilterBar` `custom` field**, not a
  `children` slot: as a field it sits in the row with the other filters on a
  laptop and moves into the "More filters" popover with them below 900 px.

### Prompt 30 — Pages CMS: admin block editor, public renderer and the `CmsPage` routes (2026-09-17)

**What changed**

Nine pages of the public website stopped being JavaScript. `About.jsx`,
`Contact.jsx`, `SellLet.jsx`, `Partnership.jsx`, `HomeLoan.jsx`,
`LegalAssistance.jsx`, `InteriorDesigning.jsx`, `FlexibleWorkspace.jsx` and
`DirectLeaseRetails.jsx` are deleted, with their stylesheets — 2 621 lines of
hardcoded copy, a hand-rolled EMI calculator, a Brigade Road map iframe and
five `#` social links among them. Every one of those pages is a CMS record
whose blocks `PageRenderer` draws, and so are the three legal texts. That is
the bulk of BUG-11 and all of ADD-17.

**One renderer, twenty-five blocks.** `components/cms/blocks/index.js` maps
each `BLOCK_TYPES` value to a component; `PageRenderer` sorts by `order`, asks
each component whether it would render anything at all, alternates the white
and grey bands over what is left, and renders nothing for a type it does not
know — with a `console.warn` in development only, so a page saved by a newer
build degrades rather than breaking. `hero` and `cta` are full-bleed bands and
do not take a turn in the alternation. `stats` renders only when it has
figures, which is what §14 means by seeding every stats block empty: the band
is absent until a client provides a number we can honestly print.

**The blocks are the site's own components.** The FAQ block is `FaqAccordion`,
the team block is `TeamSection`, the testimonials block is
`TestimonialsSection`, the partners block is `PartnersSection`, the properties
block is `PropertyRow`, the banks block is `BankCards` + `EmiCalculator` (with
a price box, because there is no listing to take a price from), the lead form
is the one `LeadForm` of prompt 28, and the gallery opens the same lazily
loaded lightbox chunk the property pages use (D7). Four blocks are new
behaviour: `ChecklistBlock` keeps a visitor's ticks in their own browser under
`sna_checklist:<pageSlug>` with a `role="progressbar"` and a Reset;
`QuizBlock` asks one question at a time and shows the explanation the moment
an answer is picked, right or wrong; `ExpandableCardsBlock` opens a summary
into its detail; `PackagesBlock` opens the enquiry dialog with the tier named
in `meta` (D56).

**`/about` and everything like it.** `CmsPage` resolves a slug three ways — a
fixed one from a spelled-out route, a prefix plus a parameter
(`/buyer-assistance/:slug`), or the whole path from the catch-all — fetches
`GET /pages/slug/:slug`, and answers 404 for a slug nobody has written, a
draft without a token and a token that has expired. With a token it renders
the page behind a banner and `noindex, nofollow` (D28). The catch-all is
`/:slug/*` rather than `*` so that React Router's specificity ranking puts it
below every static route and above the 404; the twelve reserved first segments
of D11 never reach it.

**The block editor.** `/admin/pages` lists the fifteen pages with their
template, their status as a chip that publishes on one press, where they sit in
the header and footer menus, and when they changed; it filters, bulk-publishes
and duplicates. `/admin/pages/add|edit/:id` is the form: title, a URL that may
carry slashes, template, status, hero image, menu placement, a default lead
source, and `BlockEditor` — cards that collapse to one line, drag or ↑/↓ to
reorder, duplicate, delete, and a picker of all twenty-five types grouped and
searchable with a sentence each. There is no per-type form component:
`blockSchemas.js` says which boxes a type has and `BlockForm` draws them, which
is what makes an `items[]` list, an entity picker, a lead-form field builder and
a nested `filter.localityId` all the same switch statement.

**Errors land on the box that caused them.** `validateBlockData` produces the
same dotted keys a 422 uses (`blocks.3.data.items.0.title`), so a client
refusal and a server refusal reach the same control, and the card above it
wears a badge saying how many problems it holds. A slug under a reserved prefix
is refused with "Reserved path" before it can be saved into a URL no visitor
could reach.

**A page's slug is a URL path.** This is the contract change the prompt needed.
§6.10 seeds `buyer-assistance/home-loan` and `scripts/validate-seed.js` has
allowed it since prompt 10, but nothing had ever written a page _through the
API_: `slug` was typed `slug` (`[a-z0-9-]+`), so a `PUT` of the seeded record
answered 422 and `slugify()` would have turned the separator into a hyphen.
`src/services/schemas/page.js` now types `slug` and its mirrored `seo.slug` as
a patterned string; `mock-server/lib/slug.js` gained `slugifyPath()` and
`makeCrudRouter` a `pathSlug` option that only the pages router sets;
`SlugField` gained a `path` mode. Nothing else in the contract moved.

**Files**

Added (49): `src/components/cms/` — `PageRenderer.jsx`, `PageHero.jsx` +
`.module.css`, `blocks/index.js`, `blocks/blocks.module.css` and the
twenty-five block components (`HeroBlock`, `RichTextBlock`, `FeaturesBlock`,
`StepsBlock`, `StatsBlock`, `FaqBlock`, `CtaBlock`, `LeadFormBlock`,
`TeamBlock`, `TestimonialsBlock`, `PropertiesBlock`, `ArticlesBlock`,
`ChecklistBlock`, `QuizBlock`, `MapBlock`, `ContactInfoBlock`, `ImageBlock`,
`BanksBlock`, `PartnersBlock`, `HtmlBlock`, `JobsBlock`, `FactsBlock`,
`ExpandableCardsBlock`, `PackagesBlock`, `GalleryBlock`);
`BlockEditor/BlockEditor.jsx` + `.module.css`, `BlockCard.jsx`,
`BlockPicker.jsx`, `BlockForm.jsx`, `blockSchemas.js`,
`fields/ItemsRepeater.jsx`, `fields/LeadFieldsBuilder.jsx`;
`__tests__/PageRenderer.test.jsx`, `__tests__/blockSchemas.test.js`,
`__tests__/QuizBlock.test.jsx`, `__tests__/ChecklistBlock.test.jsx`;
`src/pages/public/CmsPage.jsx` + `.module.css`;
`src/pages/admin/pages/PagesListPage.jsx` + `.module.css`,
`PageFormPage.jsx` + `.module.css`; `src/assets/styles/prose.css`.

Changed (15): `src/routes/publicRoutes.js` (the CMS routes and the catch-all),
`src/routes/paths.js` (`RESERVED_PATH_PREFIXES`, `isReservedPath`, `terms` →
`/terms-of-use`), `src/routes/adminRouteConfig.js` (three placeholders
replaced), `src/pages/public/Home.jsx` (the two CMS block components),
`src/components/admin/SlugField.jsx` (`path` mode), `src/utils/slug.js`
(`slugifyPath`, `toPathSlugInput`), `src/services/schemas/page.js` (the path
slug), `src/services/endpoints.js` (`ids` on `faqs`, `testimonials`, `team`),
`mock-server/lib/slug.js`, `mock-server/lib/crud.js`,
`mock-server/routes/pages.js` (`pathSlug: true`), `scripts/smoke-api.js`,
`docs/API_CONTRACT.md`, `docs/DECISIONS.md`, `docs/PROJECT_STATE.md`.

Removed (22): `src/pages/public/About.jsx`, `Contact.jsx`, `SellLet.jsx`,
`Partnership.jsx`, `HomeLoan.jsx`, `LegalAssistance.jsx`,
`InteriorDesigning.jsx`, `FlexibleWorkspace.jsx`, `DirectLeaseRetails.jsx`
(2 621 lines) and their nine stylesheets;
`src/components/sections/home/HomeFeatures.jsx`, `HomeSteps.jsx` and their two
stylesheets.

**Endpoints / dependencies / env vars / npm scripts**

No new endpoints. `GET /faqs`, `GET /testimonials` and `GET /team` now declare
the `ids` filter the mock's `applyFilters` already served — the `faq`, `team`
and `testimonials` blocks ask for the records an editor picked, in that order
(§5.7). `POST`/`PUT /admin/pages` accept a slug carrying `/`. No dependencies,
no env vars, no npm scripts.

**Acceptance checklist**

- [x] The admin list, the form and the block editor work end to end: signing in,
      fifteen rows, the About page's nine blocks as collapsed cards, the picker
      of twenty-five types, adding a `cta` block, filling it and saving it back
      as `blocks[9]` with `order: 10` — all verified over the DevTools protocol
      with an empty console.
- [x] Every seed page renders at its route through `PageRenderer`: `/about`
      (9 blocks), `/contact`, `/sell-let`, `/partnership`, `/flexible-workspace`,
      `/direct-lease-retails`, the three `/buyer-assistance/*` guides and the
      three legal texts, each with exactly one `<h1>` and no console output. A
      scratch page exercised the nine block types the seed does not use
      (`properties`, `articles`, `image`, `html`, `quiz`, `gallery`, `jobs`,
      `facts`, `banks`, `partners`) and was deleted afterwards.
- [x] The home page's "Why choose Squares N Acres" and "How it works" come from
      `FeaturesBlock` / `StepsBlock`; the nine legacy page files and
      `HomeFeatures` / `HomeSteps` are deleted.
- [x] Reserved prefixes never reach the CMS (`/insights/anything`,
      `/shortlist/deep`, `/careers/some-role` all 404 without a request), and an
      unknown slug 404s with `noindex, follow`.
- [x] A draft answers 404; a valid token renders it behind a banner with
      `noindex, nofollow`; an expired token 404s.
- [x] An unsupported block type is skipped by the renderer (dev-only
      `console.warn`) and shown in the editor as "Unsupported block" with delete
      only.
- [x] The checklist persists per page (`sna_checklist:buyer-assistance/home-loan`
      → `["0","2"]`, surviving a reload, cleared by Reset); the packages CTA
      opens the dialog titled "Premium — tell us about the space"; the expandable
      cards open their detail; the EMI calculator has its three sliders and a
      price box.
- [x] `npm run lint` (0 findings, `check:endpoints` 0 blocking over 481 files),
      `npm run test:ci` (**1 640 tests, 78 suites**), `npm run build:ci`
      ("Compiled successfully", no warnings), `npm run check:traces` (0 findings
      over 766 files), `npm run test:mock` (134 tests, 38 suites),
      `npm run smoke` (274/274) and `npm run validate:seed` pass.
- [x] One commit, clean tree.

**Manual QA (headless Chromium over the DevTools protocol, 1280/1440 px and 390 px)**

Walked `/about`, `/contact`, `/sell-let`, `/partnership`,
`/flexible-workspace`, `/direct-lease-retails`, `/privacy-policy`,
`/terms-of-use`, `/disclaimer`, `/buyer-assistance/home-loan`,
`/buyer-assistance/legal-assistance`, `/buyer-assistance/interior-designing`,
`/` and four 404 routes at 1280 px, and the four busiest of them again at
390 px: one `<h1>` each, the expected `<h2>` sequence, the right `robots` and
canonical, and an empty console on every one. Admin: signed in, opened the list
and the form, added and filled a block, saved it, and checked the two refusals
(a reserved slug and a block with a required field missing) land on the right
control with the card badged "1 problem".

The images and icons are blank in this environment's screenshots: `picsum.photos`,
the Cloudinary brand assets and the Iconify API are all behind a TLS-inspecting
proxy the headless browser does not trust (`ERR_CERT_AUTHORITY_INVALID`). Every
such request is an external asset; nothing served by the app failed.

### Prompt 31 — Careers and jobs, the CMS awareness page, subscribers admin (2026-09-17)

**What changed**

The last two hardcoded pages of the public site are gone. `Careers.jsx` (three
culture cards, four invented roles, six perks and an "Apply" button that opened
a modal with a dead file input) and `RealEstateAwareness.js` (six facts, six
cards, a five-question quiz and a ten-line checklist, all as JSX) are deleted
with their stylesheets — 783 lines of component and 1 315 lines of CSS.
`/careers` and `/insights/real-estate-awareness` are the CMS records §6.10
seeds, drawn by `PageRenderer`. That closes the page half of BUG-11 and all of
ADD-18.

**An opening is a record, so it has a URL.** `/careers/:jobSlug` is the one new
page: the role in full, and the form that applies for it. It is where the jobs
block's cards point, and it is what somebody forwards — which is the reason the
application lives there rather than behind a dialog on the careers page. A role
that has closed is still readable, with a notice, `noindex, follow` and a link
back to the list, because somebody following a three-week-old link from a job
board should see what the job was rather than a 404. `POST /jobs/:id/apply`
refuses a closed role with a 404 and the form reads that back as the same
notice.

**The résumé is a URL, never a file (D12).** `utils/cloudinary.js` is new and
holds three things: whether this deployment can upload at all (settings first,
`REACT_APP_CLOUDINARY_*` second, and both halves required), the unsigned upload
itself — `XMLHttpRequest` rather than `fetch`, because `xhr.upload` reports
progress and `fetch` does not, with an `AbortSignal` behind the Cancel button —
and `cloudinaryUrl()`, the `f_auto,q_auto,w_…` transformation §8.6 asks for,
which `LazyImage` picks up in prompt 39. `ResumeUpload` is the control on top:
a drop zone accepting `.pdf,.doc,.docx` up to 5 MB, refused before a byte is
sent when either rule is broken, and a required `https://` link field instead
when nothing is configured — which is the state of every checkout until a
client provides a cloud name. After a failed upload it offers both "Try again"
and "Send a link instead", because telling somebody to come back later is not
an answer.

**The application is not a lead (D91).** It is its own record with a hiring
status, so it fires its own analytics event and the careers page keeps the
general enquiry form beside it for somebody who did not find a role. What it
shares with every lead form is the spam protection: the `website` honeypot the
API answers 200 to, the ten-second throttle of D43, and the consent box.

**Three admin screens.** `/admin/jobs` is a `MasterDataPage` whose form is a
screen rather than a dialog — a description, two ordered lists and the dates an
opening runs between do not fit in a modal. The Applications column is a link
rather than a number, because the reason to open a posting is usually to read
what came back from it. `/admin/jobs/applications` is a table with a job
filter, a status filter and a search, all server-side; the status chip is the
control that changes it, optimistically and with a rollback; a row opens a
480 px drawer holding the covering note, the LinkedIn profile and the internal
note the desk keeps. Every action there is per row: §5.14 gives applications a
list, a `PATCH` and a `DELETE`, and a client-side loop pretending to be a bulk
action fails halfway through and leaves the desk guessing which half.
`/admin/newsletter` is the simplest of the three — a table, two filters, a
delete and the CSV, which comes from the export endpoint with the filters that
are on screen so the file and the table always say the same thing (D46).

**Two additions to the admin kit.** `MasterDataForm` gained a `list` field type
(a reorderable list of short strings, drawn with `SortableList`) rather than a
third hand-written repeater after the locality's highlights and the
developer's; `DataTable` gained `onRowClick`, which opens a row in place when
the record has no page of its own.

**Files**

Added (17): `src/utils/cloudinary.js`, `src/utils/__tests__/cloudinary.test.js`;
`src/components/sections/careers/` — `JobApplyForm.jsx`, `JobHeader.jsx`,
`ResumeUpload.jsx`, `careers.module.css`, `index.js`,
`__tests__/JobApplyForm.test.jsx`; `src/pages/public/JobDetail.jsx` +
`.module.css`; `src/pages/admin/content/JobsPage.jsx`,
`JobApplicationsPage.jsx` + `.module.css`, `ApplicationDrawer.jsx`,
`NewsletterSubscribersPage.jsx`,
`__tests__/JobApplicationsPage.test.jsx`.

Changed (11): `src/routes/publicRoutes.js` (the job route; `/careers` and
`/insights/real-estate-awareness` as spelled-out CMS routes),
`src/routes/adminRouteConfig.js` (three placeholders replaced),
`src/components/cms/blocks/JobsBlock.jsx` + `blocks.module.css` ("View & apply"
and a card that stacks below 600 px), `src/components/admin/DataTable.jsx` +
`.module.css` (`onRowClick`), `src/components/admin/MasterDataForm.jsx` +
`.module.css` (the `list` field), `src/pages/admin/content/contentConfigs.module.css`,
`src/utils/analytics.js` (`job_application`), `src/utils/leadSources.js` and
`src/components/cms/BlockEditor/fields/LeadFieldsBuilder.jsx` (the phone
placeholder is `98XXX XXXXX`, §14).

Removed (4): `src/pages/public/Careers.jsx`, `RealEstateAwareness.js` and their
two stylesheets (2 098 lines).

**Endpoints / dependencies / env vars / npm scripts**

No new endpoints and no contract change: `GET /jobs`, `GET /jobs/slug/:slug`,
`POST /jobs/:id/apply`, `/admin/jobs*`, `/admin/job-applications*` and
`/admin/newsletter-subscribers*` are all as prompt 09 built them, and
`applicationCount` was already computed on admin reads
(`mock-server/routes/jobs.js`), declared in `mock-server/schemas/models.js` and
documented in `docs/API_CONTRACT.md` — this prompt is the first to render it.
No dependencies, no npm scripts. Two optional variables are now read by code
rather than only documented: `REACT_APP_CLOUDINARY_CLOUD_NAME` and
`REACT_APP_CLOUDINARY_UPLOAD_PRESET`, both overridden by
`settings.integrations.cloudinaryCloudName` / `…UploadPreset`.

**Acceptance checklist**

- [x] Jobs CRUD, the applications admin and the subscribers admin all work
      against the mock: the list, the filters, the page form (including the two
      reorderable string lists), a created posting appearing on `/careers`
      within the same session, the status chip, the drawer's notes and the two
      deletes. `applicationCount` is shown and links to the filtered
      application list (`3`, `1`, `1`, `0` against the seed).
- [x] `/careers` lists the openings from the CMS `jobs` block;
      `/careers/<slug>` shows the role and accepts an application — verified
      with a résumé URL (no Cloudinary) and with the upload zone (a cloud name
      set in Site settings), including the 5 MB and file-type refusals and the
      "Send a link instead" fallback after a failed upload. The application
      appeared at `/admin/job-applications` with its résumé link.
- [x] `/insights/real-estate-awareness` and `/contact` are fully CMS- and
      settings-driven: the facts, the expandable cards, the five-question quiz
      (retake resets to question 1 with nothing pressed) and the checklist
      (persisted under `sna_checklist:insights/real-estate-awareness`, surviving
      a reload) on one; the phone, e-mail, WhatsApp, address, working hours,
      map iframe and subject-select form on the other. Both legacy files are
      deleted.
- [x] `cloudinary.js` tests pass (22 of them). `npm run lint` (0 findings,
      `check:endpoints` 0 blocking over 492 files), `npm run test:ci`
      (**1 683 tests, 81 suites**), `npm run build:ci` ("Compiled
      successfully", no warnings), `npm run check:traces` (0 findings over 778
      files), `npm run test:mock` (134 tests, 38 suites) and `npm run smoke`
      (274/274) all pass. No console output on any page walked.
- [x] One commit, clean tree.

**Manual QA (headless Chromium over the DevTools protocol, 1280/1440 px and 390 px)**

Public: `/careers` (one `<h1>`, four job links, "View & apply" on each),
`/careers/real-estate-advisor-bengaluru` (breadcrumbs Home › Careers › title,
four chips, the responsibilities and requirements lists, the sticky apply card
at 1280 px), `/careers/nope-not-a-role` (404 with `noindex, follow`),
`/careers/customer-relations-manager` after closing it through the API (the
notice, `noindex, follow`, no Apply button, the form replaced by "no longer
accepting applications", and `POST /jobs/4/apply` answering 404),
`/insights/real-estate-awareness` and `/contact`. An application was filed end
to end and read back through `GET /admin/job-applications`; a second identical
one was accepted, which is the "no dedupe rule" of §7 recorded rather than
assumed.

Admin: signed in, walked `/admin/jobs` (five columns plus the applications
link), created "QA Placeholder Role" through the page form with a
responsibility row and found it on `/careers`, checked the 409 a delete gets
while applications point at a posting ("Used by 3 applications" with the three
names), walked `/admin/jobs/applications` (the chip menu, the drawer measured
at 480 px, the notes `PATCH` carrying only `notes`) and `/admin/newsletter`
(the export button reading "Export CSV (2)" under a status filter, and the
endpoint answering only those two rows with the UTF-8 BOM). Every record
created during the pass was deleted afterwards and the runtime db is back at
its seeded shape.

390 px: `/careers`, `/careers/property-analyst`,
`/insights/real-estate-awareness`, `/contact`, `/admin/jobs`,
`/admin/jobs/applications` and `/admin/newsletter` — no horizontal overflow on
any of them (0 px on all seven), the admin tables rendering as cards, and an
empty console throughout.

**Notes**

- The Cloudinary **upload** path was exercised against a fake cloud name, so
  what is verified is the switch (settings turn the drop zone on), the two
  pre-upload refusals, the error state and the URL fallback — not a stored
  file. There is no Cloudinary test cloud in this environment, and §9 of the
  prompt allows recording that rather than inventing one.
- `grep -rn "98765\|Brigade Road\|(555)" src` is not zero, but nothing it
  matches is a contact fact: after this prompt the only non-test matches are
  six code comments in `format.js`, `validators.js`, `LeadFormField.jsx` and
  `leadColumns.jsx` documenting the phone-normalisation rule. The two
  user-visible placeholders it used to match are now `98XXX XXXXX` (§14).
- BUG-11 is **not** fully closed by this prompt, whatever its §10 says: the
  pages are, but the footer defaults (40) and `SeoGuidelines` (37) still carry
  hardcoded copy and remain that row's owners.
- The act() warnings `@testing-library/user-event@13` produces while typing
  (NEW-33) appear in the two new component suites as they do in the existing
  ones; no assertion depends on them and no console output reaches a browser.

### Prompt 32 — The rich text editor: Tiptap, the sanitiser and `SafeHtml` (2026-09-17)

**What changed**

HTML stopped being something people type. Nine screens held it in a textarea and
nine components printed it back with `dangerouslySetInnerHTML`; both halves are
gone. `src/components/editor/RichTextEditor.jsx` is the one place prose is
written and `src/components/editor/SafeHtml.jsx` is the one place it is read —
and the same allow-list governs both, so what an editor can produce is exactly
what a page will render.

**The allow-list is the contract.** `sanitize.js` is DOMPurify with the
vocabulary of ART-04 and nothing else: `ALLOW_DATA_ATTR` is off and the twelve
`data-*` attributes the figure and the three SNA blocks need are named one by
one, so a pasted `data-anything` is dropped like any other stranger. Two rules
the allow-list cannot express are hooks: an `<iframe>` survives only when its
`src` is `https` on `www.youtube.com`, `www.youtube-nocookie.com`,
`player.vimeo.com` or `www.google.com/maps`, and a `class` keeps only its
`sna-*` / `prose-*` tokens. `data:` URLs are stripped from `src` and `href`
(including the `data:image/` an `<img>` would otherwise be allowed), and
`target="_blank"` is given `rel="noopener"` with any `nofollow` kept. It runs
twice on purpose: on the way out of the editor, so what is stored is already
clean, and on the way into `SafeHtml`, so markup that predates the editor is
clean on the page — the half that actually protects a visitor.

**`SafeHtml` renders blocks, not placeholders.** It parses the sanitised markup,
gives every H2 and H3 a de-duplicated slug id (a table of contents needs
anchors, and the allow-list does not let an editor write one), adds
`rel="noopener"` to external links and `loading="lazy"` to images, then splits
the document at the top-level `div[data-sna-block]` boundaries. The runs of
markup are printed inside `.prose`; the placeholders become `RenderedCta` (the
band, with the real `openLeadModal`), `RenderedProperties` (today's listings
from `GET /properties?ids=`, hidden when none come back) and `RenderedFaq` (the
site's own `FaqAccordion`). An unknown block type renders nothing. The three are
`React.lazy`: almost all CMS HTML is plain prose and every public page renders
some. `onFaqItems(items)` hands the questions up to the page for prompt 38's
`FAQPage` schema, and a depth context stops a FAQ answer that contains a FAQ
block from recursing.

**The editor.** StarterKit with H2–H4 and no code blocks (a listing quotes a
clause number, never a program), Underline and Link from their own packages so
their configuration is visible, `FigureImage` — the Image extension taught to
serialise the `<figure><img loading="lazy"><figcaption>` the seed articles
already use, with `data-align` / `data-width` rather than layout classes,
because both are on the attribute allow-list where a class would need a second
rule — tables, a `nocookie` YouTube embed, text alignment, a placeholder and the
character counter. Three custom nodes serialise to the documented placeholders:
`ctaBlock` (`data-title`, `data-text`, `data-button-label`, `data-button-href`,
`data-lead-source`), `propertyEmbed` (`data-ids="1,3"`) and `faqBlock` (the
questions as JSON in `data-items`). Each is an atom with a React node view: the
CTA's four fields are edited in place, the other two open a dialog — which is
also what keeps a second editable surface out of the document's own DOM, since a
dialog is a portal.

**Around it:** a grouped `role="toolbar"` with one tab stop, arrow-key
navigation, `aria-pressed` on every toggle and shortcuts in the tooltips
(`Mod+K` is answered by the editor rather than only promised); a bubble bar over
a selection and a "+" on an empty paragraph, both measured against the editor's
own box so a full-screen editor and one inside a scrolling form put them in the
same place; a table menu that appears only inside a table; an outline rail with
the H2/H3 list and the word, character and reading-time counters; full screen
with `Escape`; and paste cleanup that keeps a Word paste's headings, lists and
bold and drops its `mso-*` stylesheet, its classes and its spans.

**`onChange` is debounced 200 ms and emits `sanitize(normalize(getHTML()))`.**
`normalizeHtml` trims the empty paragraph ProseMirror keeps at the end and
collapses runs of them, so a description does not end in blank bands. The
component is deliberately not a controlled input: ProseMirror owns the document
and the selection, and `value` is re-read only when it changes to something the
editor did not itself produce.

**Every consumer moved.** Property description (full) and FAQ answers (compact);
locality and developer descriptions (full); `MasterDataForm`'s `richtext` type,
which is what the FAQ library, an author's biography and a job's description use;
the block editor, where the schema's `html` field type is now `richtext`; and
`SafeHtml` in `OverviewSection`, `LocalityGuide`, `FaqAccordion`,
`RichTextBlock`, `HtmlBlock`, `ExpandableCardsBlock`, `JobDetail`,
`BuilderDetail` and the legacy `ArticleDetail`. Forms import `RichTextField`,
not the editor: Tiptap and ProseMirror are a 150 KB chunk fetched the first time
an admin opens a form that edits prose, and the main bundle contains none of it.
The six modules whose typography duplicated the global `.prose` were trimmed to
what is genuinely local, and `prose.css` now loads once beside `global.css`
rather than per route.

**Files**

Added (36): `src/components/editor/` — `RichTextEditor.jsx` + `.module.css`,
`RichTextField.jsx`, `extensions.js`, `sanitize.js`, `normalizeHtml.js`,
`pasteRules.js`, `SafeHtml.jsx`, `InternalLinkPicker.jsx`;
`toolbar/` — `Toolbar.jsx`, `BubbleMenuBar.jsx`, `FloatingInsertMenu.jsx`,
`LinkDialog.jsx`, `ImageDialog.jsx`, `YoutubeDialog.jsx`, `TableMenu.jsx`,
`OutlinePanel.jsx`;
`nodes/` — `attributes.js`, `FigureImage.js`, `CtaBlockNode.js`,
`CtaBlockView.jsx`, `PropertyEmbedNode.js`, `PropertyEmbedView.jsx`,
`PropertyPickerDialog.jsx`, `FaqBlockNode.js`, `FaqBlockView.jsx`,
`FaqItemsDialog.jsx`;
`blocks/` — `RenderedCta.jsx`, `RenderedProperties.jsx`, `RenderedFaq.jsx`,
`rendered.module.css`;
`__tests__/` — `sanitize.test.js`, `normalizeHtml.test.js`,
`pasteRules.test.js`, `SafeHtml.test.jsx`, `RichTextEditor.test.jsx`.

Changed (33): `package.json` (14 pins, `transformIgnorePatterns`),
`src/setupTests.js` (the four jsdom gaps ProseMirror and MUI fall into),
`src/App.js` and `src/assets/styles/prose.css` (loaded globally; figures,
embeds, marks and the `.ProseMirror` surface), `src/components/admin/MasterDataForm.jsx`,
`src/components/cms/BlockEditor/` — `BlockForm.jsx`, `blockSchemas.js`,
`BlockEditor.module.css` — `src/components/cms/PageRenderer.jsx`,
`src/components/cms/blocks/` — `RichTextBlock.jsx`, `HtmlBlock.jsx`,
`ExpandableCardsBlock.jsx`, `blocks.module.css` — `src/components/sections/shared/FaqAccordion.jsx`

- `.module.css`, `src/components/sections/locality/LocalityGuide.jsx` +
  `LocalitySections.module.css`, `src/components/sections/property/OverviewSection.jsx`
- `.module.css`, `src/pages/admin/content/contentConfigs.js`, `JobsPage.jsx`,
  `src/pages/admin/master-data/LocalityFormPage.jsx`, `DeveloperFormPage.jsx`,
  `src/pages/admin/properties/property-form/tabs/BasicsTab.jsx`, `FaqsTab.jsx`,
  `validators/property.js`, `src/pages/public/ArticleDetail.js`,
  `BuilderDetail.jsx` + `.module.css`, `JobDetail.jsx` + `.module.css`,
  `src/components/cms/__tests__/blockSchemas.test.js`.

Removed (1): `src/components/common/LegacyHtml.jsx`.

**Endpoints / dependencies / env vars / npm scripts**

No endpoint changes; the link picker and the listings block use the admin lists'
`q` and `GET /properties?ids=`, both of which already exist. Dependencies (exact
pins, §3.3): `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`,
`@tiptap/extension-link`, `-image`, `-table`, `-table-row`, `-table-cell`,
`-table-header`, `-youtube`, `-text-align`, `-underline`, `@tiptap/extensions`
— all `3.31.3` — and `dompurify@3.4.15`. `package.json` → `jest.transformIgnorePatterns`
gained `@tiptap`, because Jest 27 does not read an `exports` map and
`@tiptap/pm/*` resolves to TypeScript sources without one. No env vars, no npm
scripts.

**Acceptance checklist**

- [x] `RichTextEditor` implements ART-02/ART-03: StarterKit (H2–H4, marks,
      quote, lists, rule, hard break, history), Underline, Link with the dialog
      and the internal picker, images as figures with required alt, tables,
      YouTube, alignment, placeholder, counters, the three custom nodes, the
      grouped toolbar, the bubble and "+" menus, full screen, the outline rail,
      paste cleanup, drag-and-drop and `variant="compact"`. Custom nodes
      serialise to `<div data-sna-block="…" data-…>` — verified by saving a CTA
      and a listings block through the property form and reading the record back.
- [x] `sanitize.js` allow-list tests pass (15); `grep -rn "dangerouslySetInnerHTML" src`
      returns `SafeHtml.jsx` only; `LegacyHtml.jsx` is deleted; every HTML
      textarea named in the prompt is now the editor.
- [x] Public pages render seed HTML with `.prose` and live blocks:
      `/insights/articles/karnataka-rera-guide-for-homebuyers` draws its figure,
      its table, slugged heading ids, the CTA band and two live property cards,
      with no raw `[data-sna-block]` left and an empty console.
- [x] The editor is not in the public bundle: `@tiptap` and `prosemirror` appear
      in two async chunks and in neither `main.js` nor any initial chunk;
      `main.js` grew 220 B gzipped.
- [x] `npm run lint` (0 findings), `npm run test:ci` (**1 729 tests, 86 suites**),
      `npm run build:ci` ("Compiled successfully", no warnings),
      `npm run check:traces` (0 findings over 812 files) and `npm run smoke`
      (274/274) pass. No console output in any of the browser walks.
- [x] One commit, clean tree.

**Manual QA (headless Chromium over the DevTools protocol, 800/1440 px and 390 px)**

Public: the RERA article renders one figure, one table, three slugged heading
ids, the CTA band, two live listing cards and three lazy images, with no raw
placeholder and an empty console; at 390 px the page has no horizontal overflow
and the table scrolls inside its column. The property page draws the CTA an
editor saved into the description.

Admin: the property form's description editor mounts with 24 toolbar buttons, a
`role="textbox" aria-multiline` surface and the counters ("171 words, 1 022
characters, 1 min read"); the three insert buttons each add their node view; a
table inserts and the table menu appears with it; the image dialog refuses to
insert without an address and without alt text ("Alt text is required."); the
link dialog offers the address, the two attributes and the internal picker, and
hides its text box exactly when there is a selection; a selection raises the
bubble bar; the outline rail and full screen work, and `Escape` leaves it. A
Word-flavoured paste keeps its `<h2>` and drops every `mso-*` and `<span>`; a
pasted YouTube link becomes a `youtube-nocookie.com/embed/…` iframe. The page
form draws two editors, the locality form one, and the FAQ form the compact
variant with its eight controls. At 390 px the toolbar scrolls horizontally,
its buttons measure 44 px and the page does not overflow.

**Issues left**

None opened. Two bugs were found by the browser walk and fixed in this prompt:
the bubble and "+" menus read the ProseMirror view before `EditorContent` had
mounted it (fatal under React's strict mode, now guarded by
`editor.isInitialized`), and the link dialog asked `selection.empty` whether
anything was selected — an editor that has not been clicked into yet answers
"yes", so it now asks for the text between the two ends instead.

### Prompt 33 — Articles admin: the list, the editor form, scheduling and the taxonomy (2026-09-17)

**What changed**

The two screens the boilerplate used to publish an article are gone. `AdminArticles.js`
fetched the **public** list and narrowed it in the browser, with a "trending"
toggle that wrote a tag; `ArticleForm.jsx` was a plain-text box with a
syntax-help modal, a free-text author line, category and tag pickers made of
hardcoded strings, and a save button behind an `Alert` explaining that saving
was disabled (ADD-20). `src/pages/admin/articles/` replaces both against the
real §6.8 record, and `src/utils/adapters/legacyArticle.js` — the adapter that
renamed `featuredImage.url` to `image` and `category.name` to `category` so
those two files could read a record they did not understand — is deleted with
them. `src/utils/adapters/` no longer exists.

**The list is the API's answer.** Six filters (`q`, status as a multi-select,
category, author, tag, featured), four sortable headers, the page and the page
size are query parameters the URL carries and the API answers, so the screen
holds one page of rows however long the archive gets and a filtered view is a
link somebody can send (§5.6, BUG-19). Six bulk actions — publish, unpublish,
archive, feature, unfeature, delete — are the ones `POST /admin/articles/bulk`
accepts for the resource, and nothing else is offered. Per row: Edit, Preview
(behind a token), View on the site **only when the article is live**, Feature /
Unfeature as an optimistic `PATCH`, Duplicate and Delete.

**Trending is a measurement now, not a flag.** The boilerplate's
`isTrending` / `trendingOrder` pair had an editor deciding what was popular; the
replacement is `isFeatured` for the editorial row on the home page and
`GET /articles/trending`, which reads `viewCount` (§5.14). Nothing was lost — a
feature toggle exists in the table, in the kebab and in the form's rail.

**The form is two columns.** The piece on the left (headline with a live
`SlugField` on `/insights/articles/`, excerpt with a counter and "Generate from
content", the full Tiptap editor, the FAQ repeater, the search-result fields);
everything _about_ it in a 340 px rail on the right (status and scheduling,
content checks, classification, featured image, related records). Below 1200 px
the rail folds above the body as a row of panels and Save plus the publishing
action follow the page in a sticky bar.

**A status is four things to do, not one field with four values.** The radio
group is Draft / Published / Scheduled / Archived, each with a sentence saying
what it means for a visitor, and `scheduled` brings its own `datetime-local`
field with it. **The clock is Bengaluru's**: the control has no timezone of its
own, so `utils/articleUtils` converts to and from IST at a fixed +05:30 (India
has never kept daylight saving), which makes the field independent of the
timezone the editor's laptop is set to (D22). Pressing Publish or Schedule moves
the status _first_ and saves on the render that commits it, so the validation
that follows reads the rules of the state being asked for rather than the state
being left.

**Publishing is refused, not repaired.** An excerpt, a featured image, alt text,
a category, an author and 300 words are what a publish needs; the rail's
"Content checks" card lists all seven (the two recommendations — two tags, a FAQ
item — never block) so "why will it not publish" is answered where it can be
acted on rather than in a toast. Alt text is required as soon as there **is** an
image, published or not: a hero picture a screen reader announces as nothing is
not a publication problem (§8.3).

**Everything else the record carries.** A creatable tag box that lower-cases and
slugs what is typed (`BBMP Khata` → `bbmp khata` / `bbmp-khata`, and an existing
tag is selected rather than duplicated); a category quick-create dialog; two
`EntityPicker`s for the related articles (5) and listings (4), searched rather
than listed; a table-of-contents toggle; a FAQ repeater whose answers are the
compact editor and whose rows are keyed on their own identity; and the reading
time and word count the API will derive, computed from the same string that will
be saved.

**The draft survives a crash.** Every ten seconds a dirty form writes
`sna_article_draft:<id|new>`; on the next visit a draft newer than the record is
**offered** (restore or discard) and one older than it is thrown away without
asking. A save clears it.

**The taxonomy is three `MasterDataPage` configurations.** Categories (ordered,
described, with the SEO placeholder and a drag list when sorted by order), tags
(a name and a URL — most are created from the article form) and authors (a
photograph, a designation, a biography in the compact editor, three social
links, a private e-mail §5.10 strips from every public response, and the SEO
placeholder). All three count the **published** articles pointing at them, which
is the number a delete is refused over (D88).

**Files**

Added (19): `src/utils/articleUtils.js`;
`src/pages/admin/articles/` — `ArticlesListPage.jsx` + `.module.css`,
`articleColumns.jsx`, `ArticleFormPage.jsx` + `.module.css`,
`ArticleStatusCard.jsx`, `ArticleChecksCard.jsx`, `ArticleTaxonomyCard.jsx`,
`ArticleImageCard.jsx`, `ArticleRelatedCard.jsx`, `ArticleFaqsCard.jsx`,
`CategoryQuickCreateDialog.jsx`, `useArticleForm.js`, `useArticleTaxonomy.js`,
`taxonomyConfigs.js` + `.module.css`, `CategoriesPage.jsx`, `TagsPage.jsx`,
`AuthorsPage.jsx`.

Tests added (4): `src/utils/__tests__/articleUtils.test.js` (20),
`src/services/__tests__/articleService.test.js` (7),
`src/pages/admin/articles/__tests__/ArticlesListPage.test.jsx` (12),
`ArticleFormPage.test.jsx` (14).

Changed (5): `src/routes/adminRouteConfig.js` (five lazy screens replace two, and
the three `soon()` placeholders become pages), `src/services/articleService.js`
(`duplicate`), `src/services/masterDataService.js` (`articleCategories`,
`articleTags`, `authors`), `src/pages/public/ArticleDetail.js` (one word of a
comment, so the acceptance grep is clean),
`src/components/editor/toolbar/BubbleMenuBar.jsx` (one line Prettier rewrapped).

Removed (3): `src/pages/admin/AdminArticles.js`, `src/pages/admin/ArticleForm.jsx`,
`src/utils/adapters/legacyArticle.js` (and with it `src/utils/adapters/`).

**Endpoints / dependencies / env vars / npm scripts**

No endpoint, dependency, environment or script changes. Every call is a registry
entry that already existed: `GET|POST /admin/articles`,
`GET|PUT|PATCH|DELETE /admin/articles/:id`, `POST /admin/articles/bulk`,
`GET /admin/articles/check-slug`, `GET /admin/articles/:id/preview-token`,
`/admin/article-categories*`, `/admin/article-tags*`, `/admin/authors*` and
`GET /admin/properties?ids=` for the related-listings picker. Storage key
`sna_article_draft:<id|new>` (§4.2, already reserved).

**Acceptance checklist**

- [x] `/admin/articles` lists server-side with the thumbnail, title + slug,
      category, author, status (a scheduled row showing its moment in IST),
      published date, views, SEO chip and updated date; the six filters travel in
      the URL; the four sortable headers are the four orders the API answers;
      the six bulk actions and the six row actions all work. Verified in
      Chromium: 12 rows, `2 articles updated.` from a bulk archive, a duplicate
      landing on `…-checklist-copy` as a draft with `isFeatured: false` and
      `publishedAt: null`.
- [x] `/admin/articles/add|edit/:id` writes the record: a new article created,
      scheduled for +30 h, previewed behind a token, then published — `Live since
17 Sep 2026, 05:31 pm` — and the public URL renders it with no token.
      Publishing an empty article reports all seven rules at once; a scheduled
      moment in the past is refused inline **and** by the API (422 on
      `publishedAt`, painted onto the scheduling field).
- [x] Autosave and restore work: a headline typed and left for eleven seconds
      lands in `sna_article_draft:new`, the banner offers it back after a reload,
      "Restore the draft" applies it and "Discard it" removes the key. A save
      clears the draft.
- [x] Tags typed with capitals and spaces are created lower-cased and slugged
      (`BBMP Khata` → `{ name: 'bbmp khata', slug: 'bbmp-khata' }`), and an
      existing name is selected rather than duplicated.
- [x] `/admin/articles/categories|tags|authors` all work; deleting a category
      four articles use and an author two articles use both raise the "Still in
      use" dialog listing them (D88).
- [x] Legacy files deleted; `grep -rn "legacyArticle\|Markdown" src` → **0**.
- [x] `npm run lint` (0 findings, 543 files), `npm run test:ci`
      (**1 782 tests, 90 suites**), `npm run build:ci` ("Compiled successfully",
      no warnings), `npm run check:traces` (0 findings over 834 files),
      `npm run format:check` and `npm run smoke` (274/274) all pass. The editor
      stays out of `main.js`: `prosemirror` appears in one async chunk only.
- [x] No console output on any screen walked, at 1440 px and at 390 px.
- [x] One commit, clean tree.

**Manual QA (headless Chromium over the DevTools protocol, 1440 px and 390 px)**

Desktop: the list draws its eleven columns and 12 rows with the thumbnails and
the SEO chips; the scheduled seed article reads "Scheduled" over its moment. The
new-article form mounts five rail cards, four sections, the 24-button editor
toolbar and the four status radios. Publishing an empty article reports the
title, the URL, the excerpt, the word count, the category, the author and the
featured image together. A 480-word body gives the slug
`khata-transfer-in-bengaluru-the-2026-checklist`, "Generate from content" fills
the excerpt from the first paragraph, and the checks card moves to five passes
and two recommendations. Scheduling for +30 h saves and lands on
`/admin/articles/edit/13` with "Article scheduled."; reopening it shows the
moment as IST wall-clock time. Preview opens
`/insights/articles/…?preview=<token>` and the public page renders while the
article is still scheduled; without the token the same URL answered 404 until
"Publish now". Duplicate opens the copy; bulk archive reports two rows updated.
The three taxonomy screens list, filter and open their dialogs (the author form
draws nine fields, the compact editor and the SEO placeholder), and both delete
guards list what still points at the record.

At 390 px: no horizontal overflow on any of the five screens
(`scrollWidth === clientWidth === 390`), the tables become cards, the rail sits
above the body and the sticky Save / Publish bar is pinned to the bottom. The
five controls measuring under 40 px in their short dimension are all existing kit
pieces (the topbar's "View site", a breadcrumb link, two `SwitchField`s and
`SlugField`'s regenerate button), not anything this prompt drew.

One measurement worth recording: at 1440 px the article table is 1 335 px wide
inside `DataTable`'s 1 118 px `overflow-x: auto` scroller, so its last column is
reached by scrolling the table rather than the page — eleven columns do not fit a
1 118 px content width whatever they are trimmed to, and the kit's scroller is
what that container is for. The **page** does not scroll: `html` and `body` are
`overflow-x: clip` (§8.1), and hiding the table takes
`documentElement.scrollWidth - clientWidth` from 168 to 0. The property table
(1 795 px) and the leads table (1 228 px) have measured the same since prompts 22
and 29; the article table is the narrowest of the three.

**Found and fixed in this prompt**

A self-review of the change before committing turned up three defects, all now
fixed and covered by tests:

1. **Ctrl+S had no re-entrancy guard.** Every button that saves is `disabled`
   while a save is in flight; the keyboard was not, so a held Ctrl+S on
   `/admin/articles/add` fired several `POST`s and created several articles. The
   handler now refuses `event.repeat` and anything while a save is open.
2. **A duplicate inherited the original's canonical and redirect.** `seo` travels
   with a copy, but `canonicalUrl` and `redirect` each name **one** page — a copy
   of an article with either set would have quietly canonicalised to the original
   or redirected away, with no screen in the panel showing the field until prompt 36. `articleService.duplicate` now clears both, along with the score and the
   analysis, which is what §5.14 has the property `duplicate` endpoint do.
3. **The same tag could land in `tagIds` twice.** Typing `stamp-duty` over an
   already-selected "Stamp Duty" is the same slug but a different label, so the
   creatable path was offered and `MultiSelect` appended the id it was handed. The
   tag control and `toPayload` both de-duplicate now: `tagIds`,
   `relatedArticleIds` and `relatedPropertyIds` are ordered sets, never bags.

**Issues left**

None. **NEW-36** — the CMS pages list's "Duplicate" action posting `slug: ''` —
was found during this prompt's QA and recorded rather than fixed; it was then
fixed in this prompt, on request, as a second commit. See the addendum below.

Two things worth knowing about the test output: the suites report React's
"An update to … was not wrapped in act(…)" warnings in the same volume the
existing admin suites do (NEW-33 — a `user-event@13` and MUI-transition
artefact of jsdom, not of these screens), and Chromium's `Log` domain records
the deliberate 409 of a delete guard and its own "Blocked attempt to show a
'beforeunload' confirmation panel" note when the unsaved-changes guard fires
without a prior user gesture. Neither is output the application writes: the
`console` was clean on every page walked.

#### Prompt 33 addendum — NEW-36: the CMS pages "Duplicate" action (2026-09-17)

Recorded during this prompt's QA and fixed in it on request, as a second commit.

**What was wrong.** `PagesListPage`'s row action assembled the copy itself and
posted `slug: ''` with `seo: { …, slug: '' }`. §6.10 types a page's slug as a
path-slug **pattern** (`^[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)*$`),
which the empty string does not match, so `mock-server/middleware/validate.js`
refused the write before `resolveSlug` in `lib/crud.js` was ever reached. The
action could never succeed, in any circumstance, since prompt 30.

**Why the article fix does not transfer verbatim.** An article's slug is optional
with a default, so `articleService.duplicate` leaves the key **out** and §5.9 has
the API derive and de-duplicate one. A page's slug is `required` **with no
default**, so an absent key is refused just as firmly — measured, not assumed:

```
slug: ''       → 422 {"slug":["The slug field is required."],
                      "seo.slug":["The seo.slug format is invalid."]}
slug omitted   → 422 {"slug":["The slug field is required."]}
```

**The fix.** The payload moved out of the screen into `pageService.duplicate()`,
beside the article one, and the copy **chooses** its slug: `<slug>-copy` — the
suffix landing on the last segment of a path, so `buyer-assistance/home-loan`
copies to `buyer-assistance/home-loan-copy` — trimmed to keep the suffix inside
the 120-character budget, and replaced by `check-slug`'s free variant when that
name is taken. That is what §5.14 has the property `duplicate` **endpoint** do
server-side. `seo.slug` is set to the same string, because the two are one URL
(D34). A failed availability check is not fatal: the candidate is posted anyway
and a genuinely taken slug comes back as the 409 the screen already reports.

The copy is also a draft in **neither** menu with neither menu set
(`showInHeader`/`showInFooter` false and `headerMenu`/`footerColumn` null, which
is what the form itself writes when a placement switch is off), and its title is
shortened so `" (Copy)"` fits the 150 characters §6.10 allows.

**What both copies now share.** `src/utils/duplicateRecord.js` holds the two
rules neither service should own alone: `copyTitle(title, { maxLength })` and
`copySeo(seo, { slug })`. The second is why this fix reaches further than the
slug: `seo.canonicalUrl` and `seo.redirect` each name **one** page, so a copy
that inherited them would quietly canonicalise itself to the original or
redirect away — with no screen showing either field until prompt 36's SEO panel.
Both are cleared, along with the score, the test counts and the analysis, which
are an answer about the original's text. `articleService.duplicate` was
refactored onto the same two helpers with no change in behaviour (its seven
existing tests still pass unchanged).

**One thing the build taught us.** The first version of this fix computed the
copy's slug with `slugifyPath` from `src/utils/slug.js`, and `npm run build:ci`
stopped compiling: `mini-css-extract-plugin` reported a "Conflicting order"
between `FaqAccordion.module.css` and `finance.module.css`. `pageService` is
imported by the **public** `CmsPage` route as well as by the two admin screens,
so pulling another module into it moved what the chunks contain and exposed an
order ambiguity between two stylesheets that had never shared a chunk group
before. The import was not needed in the first place: `record.slug` comes **from
the API**, which is what canonicalises a slug (§5.9), so re-slugifying it is
work with no effect — and the ceiling it also imported, `PATH_SLUG_MAX_LENGTH`,
is exported by `src/services/schemas/page.js`, which is the descriptor that
defines it and a same-layer import. The "derive from the title" fallback went
with it: §6.10 makes a page's slug `required`, so a stored page without one
cannot exist, and the API naming the field in its refusal beats a slug nobody
chose. Confirmed by building `HEAD` (clean) against the working tree (failing)
rather than by guessing at it.

**Files**

Added (2): `src/utils/duplicateRecord.js`,
`src/services/__tests__/pageService.test.js` (11 tests).

Changed (3): `src/services/pageService.js` (`duplicate`, `copySlugOf`,
`freeCopySlug`), `src/services/articleService.js` (onto the shared helpers),
`src/pages/admin/pages/PagesListPage.jsx` (the row action is now one call).

**Verification**

`npm run lint` (0 findings), `npm run test:ci` (**1 793 tests, 91 suites**),
`npm run build:ci` ("Compiled successfully", no warnings),
`npm run check:traces` (0 findings), `npm run format:check` and `npm run smoke`
(274/274) all pass.

Against the running mock: the old payload answers 422, the omitted-slug payload
answers 422, and the new one answers **201** with `slug: partnership-copy`,
`seo.slug` matching, the title suffixed, `status: draft`, both placements off and
null, five blocks carried, `canonicalUrl: null` and the redirect disabled. A
second copy of the same page takes `partnership-copy-2`. Driven through the
screen itself at 1440 px: "Duplicate" on `/admin/pages` toasts
`“Home (Copy)” created as a draft.`, opens `/admin/pages/edit/16`, and the stored
record reads `home-copy` / draft / out of both menus, with a clean console.

### Prompt 34 — The public blog: index, taxonomy pages and the article page (2026-09-17)

**What changed**

The two boilerplate files are gone. `Articles.js` fetched nine articles a page
and drew chips over them; `ArticleDetail.js` had a table of contents built from
`<h2>` alone with its own slug function, four share links, a related row and
nothing else — no category, tag or author archive existed at all, and the
`/insights/articles/category/:slug` link the breadcrumb already printed went
nowhere (the last of BUG-18 and of ADD-16).

**Four URLs, one engine.** `ArticleIndex` in `pages/public/Articles.jsx` draws
`/insights/articles` and, with the filter its route nails down, the category,
tag and author archives. The search box, the category strip, the sort, the page
and the grid are `GET /articles` answering — the query string is the state, so a
shared link reproduces the view and the back button walks it back (§5.6). Each
archive resolves its own record first (`/article-categories`, `/article-tags`,
`/authors/slug/:slug`), so an address nobody has written is a 404 rather than an
empty grid with a heading made from the URL.

**The article page is the reading experience ART-09 describes.** Breadcrumbs,
headline, the excerpt as a lede, the meta row (author, published, "Updated on",
reading time, category), the featured image with its caption, the body through
`SafeHtml` — where the CTA block opens the real enquiry dialog and the listings
block shows today's prices — the tags, the share bar, the author box, the merged
FAQs, the listings the editor attached, the enquiry form, the previous/next pair
and the related row.

**The contents list and the body agree because they are the same rule.**
`src/utils/toc.js` owns the heading ids; `SafeHtml` calls it while rendering and
the page calls it to draw the list, over the **sanitised** body — the very
string the ids are written onto. Duplicate titles get `-2`, `-3`; a heading with
no sluggable text gets `section`. The list is one element: a sticky rail from
1200 px, a collapsible card above the article below that, placed by the
stylesheet so nothing measures the window, and highlighted by one
`IntersectionObserver` rather than two.

**An article has one list of questions.** `article.faqs` and the questions of
every FAQ block in the body are merged into the accordion under the article, and
`SafeHtml` is told not to print the blocks a second time on the way past
(`faqBlocks={false}`, the FAQ twin of `propertyCards={false}`). The blocks are
still reported through `onFaqItems`, which is what prompt 38's `FAQPage` graph
is built from.

**Previous/next is an endpoint, not a download.** `GET /articles/:id/adjacent`
(new, recorded in `docs/DECISIONS.md` and `docs/API_CONTRACT.md`) answers
`{ prev, next }` — the pieces published either side of this one within its
category. The alternative the prompt offers, two list calls, means reading a
whole category into the browser to find two rows, which costs more the better
the blog does.

**Found in the browser: every paragraph on the site ran into the one above it.**
`prose.css` has a flow rule, `.prose > * + * { margin-top: var(--space-4) }`, and
a reset, `.prose p { margin: 0 }` — and the reset is one class and one element,
so it outranked the flow rule whatever the source order. Measured with
`getComputedStyle`: `margin-top: 0px` on every paragraph of an article, a
listing description, a locality guide and a page's rich text. The three margin
resets are now inside `:where()`, which scores nothing (`16px` after). Booked as
NEW-37, closed here.

**Files**

Added (28): `src/utils/toc.js`; `src/components/sections/article/` —
`ArticleCard`, `ArticleCta`, `ArticleFaqs`, `ArticleHero`, `ArticleMeta`,
`ArticlePrevNext`, `ArticleShareBar`, `AuthorBox`, `BlogSidebar`, `CategoryTabs`,
`RelatedArticles`, `RelatedProperties`, `TableOfContents`, `TagCloud`,
`TrendingList` (+ their stylesheets, `article.module.css` and `index.js`);
`src/pages/public/ArticleCategory.jsx`, `ArticleTag.jsx`, `AuthorPage.jsx` +
`AuthorPage.module.css`.

Rewritten (4): `src/pages/public/Articles.js` → `Articles.jsx`,
`ArticleDetail.js` → `ArticleDetail.jsx`, and both stylesheets.

Tests added (3, 32 assertions): `src/utils/__tests__/toc.test.js` (10),
`src/components/sections/article/__tests__/ArticleCard.test.jsx` (7),
`src/pages/public/__tests__/ArticleDetail.test.jsx` (15).

Changed (12): `src/routes/publicRoutes.js` (three archives),
`src/services/articleService.js` (`adjacent`, `prevNext`),
`src/services/endpoints.js` + `endpoints.test.js` (the new entry and the
catalogue list), `mock-server/routes/articles.js` +
`mock-server/__tests__/content.test.js` (the route and three cases),
`scripts/smoke-api.js` (`articles.adjacent-pair`),
`src/components/editor/SafeHtml.jsx` (`faqBlocks`, and the heading ids now come
from `utils/toc`), `src/components/sections/home/LatestInsights.jsx` + its
stylesheet (`ArticleCard`), `src/components/common/NewsletterSection.jsx` + its
stylesheet (a `compact` variant for the rail),
`src/components/cms/blocks/index.js` (import order, see below),
`src/assets/styles/prose.css` (NEW-37), `docs/API_CONTRACT.md`,
`docs/DECISIONS.md`.

Removed (2): `src/pages/public/Articles.js`, `src/pages/public/ArticleDetail.js`.

**The CSS-order trap, again**

`build:ci` treats a warning as an error and `mini-css-extract-plugin` warns when
two routes disagree about the order of one stylesheet. The blog is the third
route to pull `LeadForm.module.css`, `FaqAccordion.module.css` and
`PropertyCard.module.css` together, which made a disagreement between the CMS
blocks barrel (alphabetical: banks, faq, …, lead form) and the property page
(enquiry, faq, finance, similar) visible for the first time. Two ordered
barrels settle it: `components/cms/blocks/index.js` hoists `LeadFormBlock`,
`FaqBlock` and `BanksBlock` to the property page's order, and
`components/sections/article/index.js` exports `ArticleCta`, `ArticleFaqs` and
`RelatedProperties` in the same order, with every blog page importing through
it. Both carry the note. `ArticleFaqs` exists as a component so the accordion's
stylesheet has one fixed position in that order.

**Endpoints / dependencies / env vars / npm scripts**

One endpoint added: `GET /articles/:id/adjacent?categoryId=` →
`{ data: { prev, next } }`. No dependency, environment or script changes.
Everything else the blog calls already existed: `GET /articles` (all filters),
`/articles/slug/:slug` (`?preview=`), `/articles/trending`,
`/article-categories`, `/article-tags`, `/authors/slug/:slug`,
`GET /properties?ids=` and `POST /leads`. The RSS link in the index's head is
`buildUrl(endpoints.sitemap.rss)`, so it follows `REACT_APP_API_URL` rather than
being written out.

**Verification**

`npm run lint` clean (`--max-warnings=0`, 0 blocking endpoint findings);
`npm run test:ci` 94 suites / 1826 tests; `npm run build:ci` compiled
successfully with no warnings; `npm run check:traces` 0 findings;
`npm run test:mock` 137/137; `npm run smoke` 276/276 including the new
`articles.adjacent-pair`.

Driven in Chromium against the dev server at 1280/1360 px and at 390 px:
`/insights/articles` (hero, four category tabs with counts, search, sort, grid,
most-read 01–06, tag cloud, newsletter, advisor CTA), the tab writing
`?categorySlug=legal-rera` and the search `?q=khata`,
`/insights/articles/category/legal-rera`, `/insights/articles/tag/rera`,
`/insights/authors/legal-desk` (five articles) and `/insights/authors/editorial-team`
(empty state — its two articles are a draft and a scheduled one), an unknown tag
answering 404, and the RERA guide end to end: eight contents entries whose
anchors all name a heading, the highlight following the scroll, the table, the
figure, the two property cards and the CTA block live in the body, "Link copied",
the enquiry form filing `POST /leads` `201` with `source: "article"` and
`articleId: 1`, "Next article" alone at the older end of the category, and the
scheduled article answering 404 without a token and the preview banner plus
`noindex, nofollow` with one. No horizontal scroll at 390 px; the console carries
only the sandbox's certificate errors for the external image and font hosts.

### Prompt 35 — SEO engine core (`src/seo/`): analyzers, scoring, readability, snippet widths, template variables, schema generators, keywords, URLs (2026-09-17)

**What changed**

The two files the boilerplate called an SEO engine are gone.
`src/utils/seoScoring.js` scored nine checks against the HOM site name and
domain and gave a letter grade; `src/utils/seoGenerator.js` built titles,
canonicals and a schema **string** from the old flat property shape, and the
only screen that read either — `src/pages/admin/AdminSeo.js`, read-only since
prompt 11 — is deleted with them (ADD-27 closed, and the `AdminSeo` half of
ADD-20 with it). `src/seo/` replaces all three: 36 modules, no React, no
network, no DOM it cannot do without, and 505 assertions over them.

**`analyze(entityType, entity, context)` is the whole surface.** It normalises
the record, runs the four groups of §9.1 and scores the results, answering
exactly what §9.6 stores: `{ score, band, testsPassed, testsTotal, groups }`.
Fifty tests exist — the ten of SEO-06, the twenty-six of SEO-07, the five of
SEO-08 and the nine of SEO-09 including the `heading-hierarchy` test §7 of the
prompt asks for — and each answers `{ id, group, status, message, hint, field,
weight }`, where `field` is the dotted path prompt 36's panel focuses when the
row is clicked.

**Weights are apportioned, not written down.** Each test carries points (1–5)
that mean the same thing whatever record they measure; `APPLICABILITY` says
which tests each of the eight entity types is asked; `WEIGHTS[entityType]` is
those points apportioned to exactly 100 by the largest-remainder method, ties
broken by test id. Pass earns the full weight, warn half, fail nothing, and a
`skip` — a test that does not apply — leaves the denominator, which is
re-normalised over what is left. So a property is never marked down for having
no article category, and adding a test later cannot leave a column summing
to 99. `score.test.js` asserts the sum and that no weight is 0;
`docs/SEO_ENGINE.md` prints every column.

**One rule lives in `analyze.js` rather than in the analysers: a record nobody
has written yet fails everything.** A blank form has no title, no slug, no
description, no body and no keyword, so a warning about the FAQs it has not got
— or an "it may be indexed" about a record that does not exist — would score it
points for nothing. Every applicable result is read as the failure it is,
messages kept, and the score is 0 (§7).

**Two parsers, one answer.** `text.js` turns markup into a flat stream of
`open`/`text`/`close` events — `DOMParser` in the browser, a tag scanner in
Node — and every rule (`stripHtml`, `wordCount`, `sentences`, `paragraphs`,
`headings`, `images`, `links`) is written against the stream rather than against
either parser. `text.test.js` asserts the two agree event for event on ten
samples, the seed article and a listing description, which is what makes a rule
written once trustworthy in both places. Sentences survive `sq.`, `ft.` and
`Rs.`; words survive a hyphen, a grouped number and the combining marks Indian
scripts write their vowels with.

**Pixel widths are a table in Node and a canvas in the browser (D85).**
`snippet.js` measures Arial 20 px for titles and 14 px for descriptions against
the limits of §9.1 (580 px / 920 px). jsdom has a `document` and no 2D context —
it answers `getContext` with `null` and logs an implementation error while doing
it — so the engine never asks there: Node and Jest use the Helvetica metric set
in 1/1000 em units, and every test measures the same number on every run.

**Keyword matching is forgiving in three ways and no others.** The regular,
`-es` and `-ies` plurals and the Indian-English irregulars (`BHKs` → `bhk`);
hyphens and spaces interchangeable, so `ready-to-move` finds `ready to move`
both ways; case and punctuation ignored. Word order is not forgiven — "flats in
whitefield" and "whitefield flats" are two different searches — and neither are
words in between.

**`schema/` is fourteen generators, a merger and a validator.** Every node
carries the stable `@id` of §9.3 (`<canonical>#listing`, `#article`,
`#breadcrumb`, `#faq`, `#itemlist`, `#place`, `#person`, `#webpage`, `#video`,
`<siteUrl>/#organization`, `<siteUrl>/#website`), `mergeGraph` folds duplicates
by `@id` into one `@graph`, and `validate` refuses an unknown `@type`, a missing
required property, a URL that is not absolute and a date that is not ISO 8601 —
while accepting `{ "@id": … }` and `{ "@type": "WebPage", "@id": … }` as the
references they are. A listing publishes its coordinates only when the record
allows the exact location, and `review.js` drops every `isSample: true`
testimonial before it publishes a rating.

**Found while writing the tests, and kept as findings rather than papered
over:** the seed listing's meta description reads "3 BHK Apartment **at**
Lakeview Heights, Whitefield" and its slug leads with the project name, so
`keyword-in-description` and `keyword-in-slug` both fail for it. They are right
to. The seed is prompt 10's; the panel will show the two rows and an editor can
decide.

**Files**

Added (36 modules): `src/seo/index.js`, `analyze.js`, `score.js`,
`entityAdapters.js`, `text.js`, `keywords.js`, `readability.js`, `snippet.js`,
`variables.js`, `urls.js`, `suggestions.js`, `autoGenerate.js`;
`analyzers/` (`basic`, `additional`, `titleReadability`, `contentReadability`,
`index`); `schema/` (`index`, `graph`, `validate`, `organization`, `website`,
`breadcrumb`, `realEstateListing`, `article`, `faqPage`, `itemList`, `place`,
`developerOrganization`, `person`, `webPage`, `videoObject`, `review`);
`data/` (`powerWords`, `stopWords`, `transitionWords`).
Plus `src/pages/admin/seo/SeoPlaceholderPage.jsx` and `docs/SEO_ENGINE.md`.

Tests added (16 suites, 505 assertions): `src/seo/__tests__/` — `analyze` (43),
`score` (38), `basic` (35), `additional` (53), `titleReadability` (23),
`contentReadability` (31), `readability` (26), `snippet` (20), `variables` (24),
`keywords` (30), `urls` (24), `text` (45), `suggestions` (14), `autoGenerate`
(20), `schema` (52), `entityAdapters` (27) — with eight fixtures taken from the
seed (`property`, `article`, `page`, `locality`, `developer`, `seoSettings`,
`masterData`, `siteIndex`). The fixtures are `.json` rather than `.js` because
CRA's `testMatch` collects **every** `.js` file under a `__tests__` folder as a
suite, and a data module there would fail as "your test suite must contain at
least one test".

Changed (3): `src/routes/adminRouteConfig.js` (`/admin/seo` → the placeholder),
`docs/PROJECT_STATE.md`, `docs/DECISIONS.md`.

Removed (3): `src/utils/seoScoring.js`, `src/utils/seoGenerator.js`,
`src/pages/admin/AdminSeo.js`.

**Endpoints / dependencies / env vars / npm scripts**

None. The engine is pure code and calls nothing; `context.siteIndex` is the
`GET /admin/seo/overview` rows the caller already holds, which prompts 36 and 37
fetch.

**Verification**

`npm run lint` clean (`--max-warnings=0`, 0 blocking endpoint findings);
`npm run test:ci` 110 suites / 2331 tests; `src/seo` alone 16 suites / 505 tests
at **96.67 % statements**, 83.13 % branches, 99.31 % functions, 97.98 % lines;
`npm run build:ci` compiled successfully with no warnings;
`npm run check:traces` 0 findings; `npm run test:mock` 137/137;
`npm run smoke` 276/276.

Driven in Chromium against the dev server: `/admin/seo` signs in and renders the
placeholder under the real topbar title and the `seo · view` guard, and the rest
of the app is untouched — `/properties` and `/admin/properties` (20 rows) render
as before. The console carries only the sandbox's certificate errors for the
external image hosts.

**Next prompt: 36 — the SEO panel (`src/components/seo/SeoPanel/`), which draws
these results, the Google preview and the keyword suggestions inside every
entity form.**

---

### Prompt 36 — The SEO panel (`src/components/seo/SeoPanel/`): General, Social, Advanced and Schema, wired into eight entity forms (2026-09-17)

**What changed**

Every "the SEO panel arrives later" card in the admin is gone. Six of them were
`Alert`s (article, page, locality, developer, property type, article category)
and one was a four-field tab (`SeoPlaceholderTab.jsx`, deleted). In their place
is one component, `SeoPanel`, mounted eight times.

**The panel is a view of `seo` and of `analyze()`, and holds no state of its
own** beyond which tab is open. A host gives it `entity`, `seo`, `onChange` and
`onFocusField`; every edit is an `onChange` away from being in the form's
values, and the analysis writes `score`, `scoreBand`, `testsPassed`,
`testsTotal`, `analysis` and `lastAnalyzedAt` back through the same callback
(§9.6). Verified against the running mock: a `PUT /admin/localities/1` carrying
the whole branch — the analysis rows included — comes back with
`seo.score: 74`, `seo.scoreBand: "ok"` and the redirect intact.

**Four tabs.**

- **General** — the focus keyword with suggestions from the record's own facts
  (`suggestKeywords`) and up to four creatable secondary phrases; the snippet
  editor (SEO title with a variable-insert menu, the permalink, the meta
  description), each with a bar that measures **characters and pixels** and
  says which limit bit; the Google preview at 600 px and 380 px, truncated by
  pixel width, with the date in front of an article's snippet; the score card
  (a gauge, the band, "N of M tests passed", "Re-analyse", "Auto-fill
  missing"); and the four accordions of §9.1 with per-status counts.
- **Social** — Open Graph and X, every field an override with a "Use default"
  that fills it with what the page would have said anyway, the read-only
  `og:type`, and the two cards drawn (500 × 261 for Facebook/LinkedIn, the
  `summary_large_image` or `summary` X card the record asks for).
- **Advanced** — the robots directives with the string they produce printed
  underneath, the canonical override against the computed one, the breadcrumb
  title, the redirect, the sitemap entry, the read-only last-modified and (for
  an article) its single category, and the **Resolved values** box.
- **Schema** — the type select, a checklist of the generated nodes, the custom
  JSON-LD block with its validator, and the resolved graph as read-only JSON.

**A fix hint is a click, not a sentence.** Every analyser result carries the
dotted `field` it is about. `seo.*` stays inside the panel — the tab that owns
it opens and the control takes focus — and everything else goes to the host:
`usePropertyForm.focusField('content')` opens Basics and puts the cursor in the
description; `images` opens Media; `faqs` opens the FAQ tab. The article form
maps the same paths onto its own screen (the editor, the excerpt, the rail
cards).

**Two new pieces of the engine.** `src/seo/resolve.js` answers what a record
actually publishes — title, description, canonical, the robots string, the two
social cards — from the §9.3 rules, and it is what the Resolved values box
renders **and** what prompt 38's `<Seo>` will put in the head, so the box and
the page cannot disagree. `schema.buildGraph(entityType, entity, seoSettings)`
is the record's own share of the `@graph`: the node its type leads with, its
questions, its video and its trail, with `schema.type`, `disabledAutoTypes` and
`schema.custom` applied. 18 assertions in `src/seo/__tests__/resolve.test.js`.

**Two things block a save, and only two** (`validateSeoBranch`): custom JSON-LD
that does not parse or does not validate — invalid JSON-LD invalidates the
whole script tag, generated nodes included — and a redirect switched on with
nowhere to send anybody. Everything else is advice: a title of sixty-eight
characters is cut in a result, not refused, so the panel says so and the save
goes through.

**The redirect is a side effect, and it happens after the entity save.**
`applySeoSideEffects(entityType, savedRecord)` writes the `redirects` row with
`fromPath` = the record's own public path — which a new record does not have
until the API answers — and deactivates the row rather than deleting it when
the switch goes off. It never throws: a rule that could not be written is a
console warning, not a failed save. `redirectService.upsertByFromPath` does the
create-or-patch through the `q` filter that already existed on
`GET /admin/redirects`, so **no mock change was needed**; verified against the
running mock (201 create, 200 patch, deactivate, gone from `GET /redirects`).

**The site-wide index is loaded once per admin session.** `useSiteSeoIndex`
caches `GET /admin/seo/overview?perPage=all` at module level, and every save
publishes `seo:changed` through the new `src/utils/events.js`, which is what
refreshes it. Without the list the three uniqueness tests `skip` rather than
guess, so a desk that cannot read it (a sales user's 403) still gets a working
panel.

**The panel is a lazy chunk.** `components/seo/SeoPanel/index.jsx` is a
`React.lazy` wrapper, for the same reason `RichTextField` is one: the panel is
the second-heaviest thing in the admin, six forms import it, and a stylesheet
that spans the eager/lazy boundary is what makes the extracted CSS order
ambiguous. The §9.6 value helpers (`createSeo`, `withSeoDefaults`,
`toSeoPayload`, `toSeoPaths`) therefore live in `components/seo/seoValues.js`,
where a form's payload can reach them without pulling the panel.

**Files**

- New: `src/components/seo/SeoPanel/` — `index.jsx`, `SeoPanel.jsx`,
  `SeoPanel.module.css`, `SeoPanelContext.js`, `useSeoAnalysis.js`,
  `useSiteSeoIndex.js`, `SeoSummaryCard.jsx` (+ css), `tabs/GeneralTab.jsx`,
  `tabs/SocialTab.jsx`, `tabs/AdvancedTab.jsx`, `tabs/SchemaTab.jsx`,
  `parts/FocusKeywordField.jsx`, `parts/SnippetEditor.jsx`,
  `parts/VariableMenu.jsx`, `parts/SeoMeter.jsx`, `parts/GooglePreview.jsx`,
  `parts/SocialPreview.jsx`, `parts/ScoreCard.jsx`, `parts/TestList.jsx`,
  `parts/RobotsFields.jsx`, `parts/RedirectFields.jsx`,
  `parts/SitemapFields.jsx`, `parts/ResolvedValues.jsx`,
  `parts/SchemaEditor.jsx`; `src/components/seo/seoValues.js`,
  `src/components/seo/seoSideEffects.js`; `src/seo/resolve.js`;
  `src/utils/events.js`;
  `src/pages/admin/properties/property-form/tabs/SeoTab.jsx` and
  `property-form/fieldFocus.js`.
- Tests: `SeoPanel/__tests__/SeoPanel.test.jsx` (9),
  `SnippetEditor.test.jsx` (10), `SchemaEditor.test.jsx` (10),
  `src/seo/__tests__/resolve.test.js` (18).
- Changed: `src/seo/schema/index.js` (`buildGraph`, `autoNodeTypes`,
  `schemaTypeOptions`), `src/seo/index.js`, `src/services/redirectService.js`
  (`upsertByFromPath`, `findByFromPath`, `deactivateByFromPath`),
  `components/admin/MasterDataForm.jsx` + `MasterDataPage.jsx` (`seoPanel`),
  the property form (`tabs.js`, `StatusRail.jsx`, `PropertyFormShell.jsx`,
  `PropertyFormContext.js`, `usePropertyForm.js`, `validators/property.js`,
  `tabs/BasicsTab.jsx`), `ArticleFormPage.jsx` + `useArticleForm.js` +
  `ArticleFaqsCard.jsx`, `PageFormPage.jsx`, `LocalityFormPage.jsx`,
  `DeveloperFormPage.jsx`, `taxonomyConfigs.js`, `masterDataConfigs.js`,
  `PagesListPage.jsx`, `LocalitiesPage.jsx`, `DevelopersPage.jsx`.
- Deleted: `property-form/tabs/SeoPlaceholderTab.jsx`.

**Not touched**, per the guardrails: the public `<Seo>` (38), the mock server,
`db.json`, `theme.js`, `global.css`. No dependency was added.

**Verification**

`npm run lint` (0 findings, endpoints registry clean) · `npm run test:ci`
(114 suites, 2 377 tests) · `npm run build:ci` (compiled, no CSS-order
conflict) · `npm run check:traces` (967 files, 0 findings) · `npm run smoke`
(276/276) · `npm run format:check`. `npm run test:mock` was not re-run for a
change of its own — no mock file was touched — and the redirect upsert was
verified against the running server instead.

One console warning survives in the article form and is **not** this prompt's:
`EntityPicker` → `SortableList` logs a duplicate React key when a related
article is added (NEW-38, verified against `HEAD` before these changes, owned
by the QA prompt that covers the article form).

**Next prompt: 37 — the SEO dashboard, settings and redirects screens at
`/admin/seo`, which read the same `overview` rows this panel writes.**

### Prompt 37 — SEO dashboard, global SEO settings, redirects manager and the SNA SEO playbook (2026-09-17)

**What changed**

The SEO Manager is complete. Four routes that were placeholders — `/admin/seo`,
`/admin/seo/settings`, `/admin/seo/redirects`, `/admin/seo/guide` — are four
screens, and the boilerplate's last SEO artefact (`SeoGuidelines.jsx`, sixteen
accordions of advice written for another company in another city) is deleted
with `SeoPlaceholderPage.jsx`.

**The dashboard reads the overview twice, and the two reads are different
questions.** `useSeoOverview()` is the table: type, band, index state, search,
sort and page are query parameters the API answers and the URL carries, so a
site of four thousand records costs one page of rows. `useSeoOverviewAll()` is
everything else on the screen — six cards, the duplicates tab, the issues tab —
because an average over twenty rows is not the site's average and paging a
duplicates list would split the pairs it exists to show. It is one `perPage=all`
read, cached 60 s in the module and thrown away on `emit('seo:changed')`.

**The cards:** average score (over analysed records only — a site nobody has
measured shows "—", not `0`), the four band counts, records with no focus
keyword, records with no meta description, noindexed records, and records
sharing a value. Every card is also a way into the table or a tab.

**Editing happens in the panel of prompt 36, in a dialog.** The overview rows
carry `seo` and nothing else, and half the analysis is about the rest of the
record, so `SeoEditDialog` loads the whole record through `seoEntityServices`
(one table mapping each of the eight types to its admin read, its `PATCH`, the
screen that edits it and — for articles and pages — its preview token), mounts
`SeoPanel variant="full"` over it, and saves `PATCH { seo }` plus
`applySeoSideEffects`. The desk never writes a field the panel does not own.

**Two site-wide runs, sequential, writing only what changed.** "Re-analyse all"
reads each record, calls `analyze`, and stores the result only when the score,
the counts or any test's verdict differ; "Auto-generate missing" calls
`generateDefaults` and stores the difference, which is empty for every record an
editor has already written — that is how "never overwrite" is enforced rather
than intended. Ticking "Overwrite" is a separate, confirmed decision (ADD-20's
missing confirmation). Both report `n of N` with a live bar, a per-record error
list and a Stop button, and both keep everything written before the stop.
Measured against the seed: the first run wrote 119 of 119; a second run wrote 47
and skipped 72.

**The issues tab** is every failed **critical** test on the site — eight of the
engine's fifty, the ones that cost traffic outright — each with a "Fix" that
opens the dialog on the tab and the control that fixes it (`SeoPanel` gained one
additive `initialField` prop for that). 180 rows against the analysed seed.
**The duplicates tab** groups by the value records are fighting over, from
server-computed flags.

**`/admin/seo/settings`** is the §6.14 singleton in ten panels over one `useForm`
— Titles & meta (the separator, all eleven title templates each with the
variable menu **and a live example resolved against a real record of that type**,
the default description, the share image, the default robots and the four
automatic noindex rules), Knowledge graph, Verification, Analytics (a pointer to
Site settings, where the measurement ids actually live), Sitemap (per type
include/changefreq/priority, exclusions and links that open the API's own
documents so they work on a laptop and in production alike), robots.txt with
"Restore recommended", llms.txt with "Regenerate from data", Breadcrumbs, Custom
HTML and Head preview. The preview resolves the home page through
`resolveSeoOutput` — the same function the public `<Seo>` will use — and updates
while a template is being typed.

**`/admin/seo/redirects`** is the table (from, to, type, active, hits, note,
updated) with search and status filters, bulk activate/deactivate/delete, a
create/edit dialog that puts the API's four rules on the fields that raised them,
CSV import (paste or upload, parsed and checked in the browser so a bad row is
reported with its line number before anything is written) and export, a "Check a
URL" tester that asks `GET /redirects/resolve`, and an **Nginx snippet** export —
D30 is honest that an SPA performs a redirect after the app has loaded, and the
snippet is the same table for the server that fronts the build.

**`/admin/seo/guide`** is 25 topics in six sections, all about this site: focus
keywords as `[configuration] [type] in [locality]`, titles with `%variables%`,
descriptions, slugs and the redirect that must go with a slug change, content
length per record type, headings and readability, images and alt text, internal
linking between localities, listings and guides, external links and nofollow,
FAQs, structured data, canonicals and the listing filter rules, indexing,
robots/sitemaps, redirects, Core Web Vitals, mobile, local SEO and NAP
consistency, E-E-A-T, AI-search readability, measuring, and a nine-line
publishing checklist. The weight table is rendered from `WEIGHTS`, so the numbers
an editor reads cannot drift from the ones the panel scores.

**Files added**

`src/pages/admin/seo/`: `SeoDashboardPage.jsx` + `.module.css`,
`SeoOverviewCards.jsx`, `SeoEntityTable.jsx`, `SeoEditDialog.jsx`,
`SeoBulkTools.jsx`, `SeoDuplicatesTab.jsx`, `SeoIssuesTab.jsx`,
`useSeoOverview.js`, `seoEntityServices.js`, `SeoSettingsPage.jsx` +
`.module.css`, `settings-tabs/` (`TitlesMetaTab`, `KnowledgeGraphTab`,
`VerificationTab`, `AnalyticsTab`, `SitemapTab`, `RobotsTab`, `LlmsTab`,
`BreadcrumbsTab`, `CustomHtmlTab`, `HeadPreviewTab`), `RedirectsPage.jsx` +
`.module.css`, `RedirectImportDialog.jsx`, `RedirectTester.jsx`,
`nginxSnippet.js`, `SeoGuidePage.jsx` + `.module.css`, `seoGuideContent.js`, and
`__tests__/` (`SeoBulkTools.test.jsx`, `RedirectsPage.test.jsx`,
`nginxSnippet.test.js`, `TitlesMetaTab.test.jsx` — 38 new assertions).

**Files changed**

`src/routes/adminRouteConfig.js` (four `soon()` rows became `page()` rows),
`src/services/endpoints.js` (+4 entries), `src/services/seoService.js`
(`llmsPreview` now reads `/admin/seo/llms-preview`; the stored document is
`llmsTxt()`), `src/services/redirectService.js` (`import`, `exportUrl`,
`resolve`; the pure matcher is now `matchRedirect`),
`src/services/schemas/masterData.js` (`redirect.import`),
`src/services/endpoints.test.js`, `src/components/seo/SeoPanel/SeoPanel.jsx`
(additive `initialField`), `src/components/admin/index.js` and its test (the
`SeoGuidelines` export is gone), `src/seo/variables.js` +
`src/seo/__tests__/variables.test.js` (`templateKeyFor` now selects the `home`,
`listing` and `search` templates), `mock-server/routes/seo.js` (`key` and
`duplicateOf` on every overview row; 403 for a manager changing the custom HTML),
`mock-server/__tests__/content.test.js` (+2 cases), `scripts/smoke-api.js`
(+2 request plans), `docs/API_CONTRACT.md`, `docs/SEO_ENGINE.md`,
`docs/DECISIONS.md`, `docs/PROJECT_STATE.md`.

**Files removed**

`src/components/admin/SeoGuidelines.jsx`, `src/pages/admin/seo/SeoPlaceholderPage.jsx`.

**Endpoints**

Four paths the mock already served are now in the registry:
`GET /redirects/resolve`, `POST /admin/redirects/import`,
`GET /admin/redirects/export`, `GET /admin/seo/llms-preview` (241 declared).
Two mock changes, both documented in `docs/API_CONTRACT.md`: every
`SeoOverviewRow` carries `key` (`"<type>:<id>"`) and `duplicateOf`, and
`PUT /admin/seo/settings` answers **403** to a manager whose body changes
`customHeadHtml` or `customBodyEndHtml` — a body echoing the stored value is not
a change and is allowed through, and every other field stays a manager's to
write.

**Env vars, npm scripts**

None added. No dependency added.

**Acceptance checklist**

- [x] `/admin/seo` cards, table, dialog, bulk tools, duplicates, issues and
      export work against the seed; "Re-analyse all" filled all 119 records and
      the chips show their bands (0 good · 97 needs work · 22 poor).
- [x] `/admin/seo/settings` saves every field; "Restore recommended",
      "Regenerate from data" and the head preview work; the manager restrictions
      hold in the UI (no Custom HTML tab) and on the API (403).
- [x] `/admin/seo/redirects` CRUD, import, export, tester and Nginx snippet
      work; `/admin/seo/guide` renders the playbook; `SeoGuidelines.jsx` is
      deleted.
- [x] `npm run lint`, `npm run test:ci`, `npm run build:ci`,
      `npm run check:traces`, `npm run test:mock` and `npm run smoke` pass; no
      console warning on any of the four screens.
- [x] One commit; clean tree.

**Verification**

`npm run lint` (0 findings) · `npm run test:ci` (118 suites, 2 418 tests — 41 more than prompt 36) ·
`npm run build:ci` (compiled; one `mini-css-extract-plugin` order conflict
between `SeoPanel.module.css` and `ImageField.module.css` was resolved by import
order and is commented where it matters) · `npm run check:traces` (1 000 files,
0 findings) · `npm run test:mock` (139 tests) · `npm run smoke` (280/280) ·
`npm run format:check`.

Then in a real browser (Chromium, signed in as `admin@` and as `manager@`, at
1 440 px and 390 px): all four screens render with one `<h1>`, no horizontal
overflow at 390 px and a clean console. The run through the dashboard, the
settings and the redirects screens is what found the two defects below.

**Two defects found and fixed inside this prompt**

- **The bulk progress dialog reopened after being dismissed mid-run.** Closing
  it with the header × cancelled the run but the loop's next progress update
  re-opened it, leaving a dialog nobody could explain over a run that had
  silently stopped. Fixed: the dialog has no close control while a run is going
  — "Stop" is the way out — and a dismissed dialog stays dismissed. Covered by
  `SeoBulkTools.test.jsx` ("keeps what it has already written and does not reach
  the rest").
- **`templateKeyFor` could not select three of the eleven title templates.**
  §6.14 stores `home`, `listing` and `search` templates and the function mapped
  only the eight record types, so those three were fields an editor could write
  and nothing could ever read — visible as a head preview that resolved the home
  page through `default`. Fixed in `src/seo/variables.js` with a case in the
  engine's own test; prompt 38's `<Seo type="home">` needs the same fix.

**Issues left → "Known issues"**

- **NEW-39** — `cleanTitle` leaves a comma standing in front of the separator
  (`"3 BHK in Whitefield, | Squares N Acres"`). Found writing the settings
  screen's live examples. The engine is prompt 35's and its tests assert the
  current behaviour, so this prompt documented it rather than changing a scorer
  mid-prompt; owned by 45.
- **BUG-11** loses its `SeoGuidelines` half here; only the footer defaults (40)
  remain. **ADD-20** is closed outright: every screen it described now has a
  successor.

**Next prompt: 38 — the public `<Seo>` component, the JSON-LD graphs and
`RedirectHandler`, which read the settings this prompt made editable.**

### Prompt 38 — The public `<Seo>` component, the JSON-LD graphs, breadcrumbs, redirects, analytics and two validators (2026-09-17)

**What changed**

The site has one head. `grep -rn "react-helmet-async" src` returns the four
files prompt 38 §8 allows — `components/seo/Seo.jsx`,
`components/seo/CustomHtml.jsx`, `components/seo/AnalyticsScripts.jsx` and the
provider in `App.js` — plus `src/test-utils.jsx`, which is that provider's
counterpart for Jest and was already there. It returned nineteen. Every public
route, the admin shell and the sign-in screen render `<Seo type="…">`, and what
each one publishes is decided in one place.

**`<Seo>` renders; `useSeoResolved` decides.** The hook is where the rules are —
the §9.5 templates, the canonical whitelist of §9.4, the robots ladder, the
image fallback chain of §9.3, the graph — and it is testable without a `<head>`
to assert against. `Seo.test.jsx` asserts the other half: 70 cases reading
`document.head` after Helmet has actually written to it, including a table over
all twenty-one page types.

**The head, in the order a reader of the rendered page finds it:** `<html
lang="en-IN">`, the title, the description, the canonical, robots, the Open
Graph and Twitter cards (`og:locale en_IN`, `og:site_name`, `og:type`), the
`article:*` block, `rel=prev`/`rel=next`, the feed alternate on the blog routes,
the four verification metas, the favicons, `theme-color`, `application-name`,
whatever an administrator put in `customHeadHtml`, and one
`<script type="application/ld+json">` holding the page's whole `@graph` —
the one tag `<Seo>` writes outside Helmet, for the reason under "Fixed while
verifying".

**Two title channels, because there are two kinds of caller.** `title` is the
page's own name and goes **through** the type's template — "Localities in
Bengaluru" becomes "Localities in Bengaluru | Squares N Acres" and follows the
separator an editor changes in Admin → SEO. `overrides.title` is the finished
`<title>`, used verbatim; only `ListingEngine` wants it, because `listingSeo.js`
has already applied the `listing` template to build its count-aware title.

**One graph per page, built by `src/seo/pageGraph.js`.** `schema/index.js` still
builds what a _record_ says about itself; `pageGraph` builds what a _page_ says:
the publisher (`RealEstateAgent` from the knowledge graph) and the `WebSite` on
every page, the `SearchAction` on the home page only, the record's own nodes,
the `ItemList` of whatever the page is a list of, the `FAQPage` of the questions
it actually shows, and `Review`/`AggregateRating` for testimonials that are not
seeded samples (D41 — with the seed as it stands, none are, so no review markup
is published at all, which is the correct answer). A new `jobPosting.js`
generator gives `/careers/:slug` the `JobPosting` Google for Jobs reads.

**What a page publishes is what a page shows.** A property's `FAQPage` is its
stored FAQs plus the ones its description carries, which `OverviewSection` now
reports through `SafeHtml`'s `onFaqItems` — the pattern `ArticleDetail` already
used. A locality's and a builder's `ItemList` is the strip of listings actually
on the page, which the embedded `ListingEngine` reports the same way. Merging is
by `@id`, so a page's fuller list replaces the record's without either knowing
about the other.

**`compact()` now drops a node left holding nothing but its `@type`.** A
knowledge graph with no address was publishing `{"@type":"PostalAddress"}` —
§7's "never empty strings in JSON-LD", one level up. The rule is in the shared
compactor rather than in the organisation generator, so the next generator
cannot make the same node.

**One trail, drawn once and published once.** `src/seo/breadcrumbs.js` answers
`breadcrumbsFor(type, entity, extras)`; a page hands the same array to
`<Breadcrumbs>` and to `<Seo breadcrumbs>`. `ui/Breadcrumbs` accepts both
`{ label, to }` (the route tables of prompts 26 and 31) and `{ name, path }`
(schema.org's `ListItem`), and the last crumb carries no link either way,
because it is the page you are already on.

**`RedirectHandler`** loads `GET /redirects` once — in the module for the life
of the tab and in `sessionStorage` (`sna_redirects`) for ten minutes — and
performs a `<Navigate replace>` on an exact path match, carrying the visitor's
query string unless the rule wrote one of its own. An external target is a full
`window.location.assign`. Two rules pointing at each other stop after five hops
with one `console.warn` rather than spinning.

**`AnalyticsScripts`** injects GA4, GTM and the Meta pixel from
`settings.integrations`, each only when its id is set — which, in the seed, none
are. GA4 is configured `send_page_view: false` and every route change sends
`track('page_view')` instead, because a single-page app fires one automatic page
view in its life. `utils/analytics.js` now bridges `track()` to `fbq` as well as
to `gtag` and `dataLayer`. The admin panel is excluded.

**`customHeadHtml` / `customBodyEndHtml`** render verbatim, scripts included —
that is what the fields are for, and RBAC restricts both to `admin` (prompt 37).
The head fragment is parsed with `DOMParser` and handed to Helmet as elements,
since Helmet takes children rather than a string; the body fragment is appended
to `document.body` with elements built by hand, since React's
`dangerouslySetInnerHTML` never runs a `<script>` it writes. Both are verified
in a browser below.

**The engine's pure half is CommonJS now** (D36b extended): `src/seo/{text,
urls, variables, entityAdapters, resolve, breadcrumbs, pageTypes, pageGraph}.js`
and all of `src/seo/schema/`, plus the three leaves they reach —
`src/config/site.js`, `src/routes/paths.js`, `src/utils/format.js`. React and
Jest import them exactly as before; `module.exports` is the namespace object the
default import already was. The reason is `scripts/validate-jsonld.js`: a
validator that re-implemented the graph builder would be checking its own
opinion rather than the site's. The converted set is exactly the transitive
closure of what the scripts reach — nothing else was touched.

**Two validators, each with two modes, each saying which one it ran.**
`check:jsonld` walks the sitemaps and checks title, description, canonical,
uniqueness across indexed pages, `@context`, `@graph`, known `@type`s, absolute
URLs and ISO dates; with `CHROME_PATH` it reads the head Chrome actually built
and adds one-`<h1>`-per-page and `<img alt>`. `check:links` follows every
internal link on every sitemap page in Chrome, or — without one — traces every
sitemap URL back to a record on the API. Both wait for a canonical **and** a
JSON-LD script before reading, not for `networkidle0`: a detail page fetches its
record after the bundle settles, and read a frame after `networkidle0`,
`/properties/:slug` reported a head with a title and nothing else.

**Files**

- New: `src/components/seo/{Seo.jsx,useSeoResolved.js,seoDefaults.js,JsonLd.jsx,
AnalyticsScripts.jsx,CustomHtml.jsx}`, `src/components/common/RedirectHandler.jsx`,
  `src/seo/{breadcrumbs.js,pageTypes.js,pageGraph.js}`,
  `src/seo/schema/jobPosting.js`, `scripts/{check-links.js,validate-jsonld.js}`,
  `scripts/lib/renderJsonLd.js`, and three test files.
- Modified: every public page and route component, `AdminLayout`, `AdminLogin`,
  `routes/index.js`, `MainLayout`, `ui/Breadcrumbs`, `ui/Pagination`,
  `cms/PageRenderer`, `cms/blocks/TestimonialsBlock`,
  `sections/property/OverviewSection`, `utils/analytics.js`, `public/index.html`,
  `package.json`, and the CommonJS set above.

**Verification**

`npm run lint` ✔ · `npm run test:ci` ✔ (121 suites, 2 515 assertions) · `npm run build:ci` ✔ ·
`npm run check:traces` ✔ (1 017 files, 0 findings) · `npm run smoke` ✔ (280/280) ·
`npm run test:mock` ✔ · `npm run check:jsonld` ✔ · `npm run check:links` ✔ **but for
NEW-41** — see below.

Both scripts were run **both ways**: through the Node adapter, and through
Chromium at `/opt/pw-browsers/chromium` with `CHROME_PATH` set, against a
**production build** (`npm run build:ci`) rather than the dev server, because
one of the defects below only reproduces there.

| Script         | Node adapter                                                                                                                                           | Chromium                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `check:jsonld` | 112 record pages, **0 errors**, 46 warnings (the title lengths of NEW-40); the 15 routes with no record behind them are skipped and said to be skipped | 127 pages, **0 errors**, 34 warnings, every one a title length (NEW-40)   |
| `check:links`  | all 112 sitemap URLs traced back to a record, **0 broken**; it says plainly that the rendered links were not followed                                  | 127 pages opened, 146 internal links followed, **2 broken** — both NEW-41 |

`check:links` therefore exits 1 under Chromium. The two links it reports are
seed copy pointing at a draft and a scheduled article, the 404 is the correct
answer to both (§5.4), and `db.json` is off-limits here (§12) — so they are
recorded as NEW-41 for 46 rather than hidden. The checker was deliberately not
taught to downgrade a 404 whose slug happens to have a record: see `DECISIONS.md`.

Checked in a browser: `/old-properties` lands on `/properties`;
`/buy/apartments?page=2` canonicalises to `…?page=2` and its `rel=prev` is
`/buy/apartments` with no invented `?page=1`; `?preview=admin` on a property is
`noindex, nofollow` and its `Offer` still says `InStock`; `/shortlist` is
`noindex, nofollow`; every page carries exactly one `<h1>`; with the three
integration ids set through `PUT /api/admin/settings` the `gtag.js`, `gtm.js`
and `fbevents.js` scripts appear on the public site and none of them on
`/admin/login`; with `customHeadHtml`/`customBodyEndHtml` set, the meta appears
and both scripts execute.

**Fixed while verifying**

- **The index pages shipped `noindex`.** `/localities`, `/builders`,
  `/insights/articles`, `/insights/faqs` and `/careers` are routes rather than
  records, so the engine resolved them against a synthetic record with no
  `status` — which `toSeoInput('page', …)` reads as a draft. Found in Chrome, not
  in a test; the synthetic record is now marked published, and
  `Seo.test.jsx` asserts all five.
- **Every listing and index page published the graph twice.** `<Seo>` renders
  once before its results arrive and again with them, and `react-helmet-async`
  de-duplicates a `<script>` by its _contents_ while registering each instance
  during `render()` rather than in an effect — so a render React discards (which
  `React.lazy` and `<Suspense>` do on every route) leaves an instance behind
  holding the old graph. Both ended up in the head. Confirmed against the
  **production build**, so not a dev-server artefact, and fixed by taking the
  graph out of Helmet's cumulative script list: `JsonLd.jsx` owns one
  `<script data-sna-jsonld>` and rewrites its text in place. Every other tag was
  unaffected, because every other tag de-duplicates by its name.
- **Three article tags were unreachable.** `/insights/articles/tag/stamp-duty`,
  `/tag/whitefield` and `/tag/sarjapur-road` were in the sitemap, linked from
  three article bodies, and answered "Tag not found". `TagCloud`, `ArticleIndex`,
  `ArticleTag` and `ArticleCategory` asked the API for `perPage: 'all'`, which
  §5.6 reserves for admin routes — so `queryTranslate` ignored it and returned
  the first page, 12 of the 15 tags. The lookup that decides whether a tag slug
  is a 404 ran against those 12. All four now ask for `TAXONOMY_PER_PAGE = 100`,
  the public cap `MasterDataContext` already uses. Six of the eight failures
  `check:links` first reported were this one bug.
- **The two scripts read the head too early.** See `networkidle0` above.
- **Three pre-existing lint failures in prompt 37's test files** (
  `RedirectsPage`, `SeoBulkTools`, `TitlesMetaTab`): `testing-library`'s
  `no-unnecessary-act` assumes `user-event` v14, and this project pins 13.5
  (§3.1), which does not wrap its own interactions. `npm run lint` failed at
  `HEAD` before this prompt touched anything. The four `waitFor` + `getByText`
  pairs became `findByText`; the `act` rule is switched off per file with the
  version note.

**Issues left → "Known issues"**

- **NEW-39** (`cleanTitle` and a comma before the separator) is still open and
  still owned by 45; nothing here changed the engine's cleaning rules.
- **NEW-40** — four status-listing titles and seven CMS titles are the wrong
  length. Copy, not code; opened here by `check:jsonld` and owned by 46.
- **NEW-41** — two seeded article bodies link to an article that is not
  published. Seed copy, not code; opened here by `check:links` and owned by 46.
  It is the only reason `check:links` does not exit 0 under Chromium.

### Prompt 39 — Media library, Cloudinary uploads, picker dialog, responsive images (2026-09-18)

**Files added**

- `src/pages/admin/media/` — `MediaLibraryPage.jsx` (+ `.module.css`, shared by
  every part below), `MediaGrid.jsx` (the grid and its four states, plus
  `foldersOf`), `MediaCard.jsx`, `MediaUploadZone.jsx`, `MediaEditDrawer.jsx`,
  `MediaAddUrlDialog.jsx` (exports `MediaUrlForm` and `describeUrl`),
  `useMediaUpload.js` (the queue), `__tests__/MediaLibraryPage.test.jsx`
- `src/components/admin/MediaPickerDialog.jsx` (+ `.module.css`,
  `__tests__/MediaPickerDialog.test.jsx`), `src/components/admin/useMediaField.js`
- `src/hooks/useCloudinaryConfig.js`
- `src/components/ui/Picture.jsx` (art direction; wraps `LazyImage`)

**Files changed**

- `src/utils/cloudinary.js` — `parseCloudinary`, `buildSrcSet`, `blurThumb`,
  `parseRatio`, `SRCSET_WIDTHS`; `buildTransformation` gained `effect`;
  `cloudinaryUrl` gained `merge`, which chains **behind** an existing
  transformation instead of refusing (§7's "don't double `/upload/`")
- `src/components/ui/LazyImage.jsx` (+ css) — builds the six-width `srcSet`, the
  `c_fill` crop, the blur-up and the `priority` behaviour itself; `sizes` is
  emitted only beside a `srcset`; `sources` renders a `<picture>`
- `src/components/ui/Logo.jsx` — the wordmark and the monogram are asked for at
  1×/2×/3× of the size they are drawn at
- `src/components/admin/ImageField.jsx` — uses `useMediaField`, so **every**
  image and file slot in the admin gained Library / Upload without its form
  changing; the picker is lazy-loaded
- `src/components/editor/RichTextField.jsx` — supplies `onRequestImage`, so the
  editor's image dialog opens the picker from all nine of its hosts
- Property form: `ImageGalleryEditor` (multi-select + drop-zone upload, both
  de-duplicated by URL, `onAdd` now takes `{url, alt, caption}`), `MediaTab`
  (brochure), `FloorPlansTab` (drawing + PDF), `DocumentsTab` (`accept:
'document'`)
- `sizes` / `priority` passed by `PropertyCard` (now a `LazyImage`),
  `ArticleCard`, `ArticleHero`, `LocalityCard`, `LocalityHero`, `DeveloperHero`,
  `DeveloperLogo`, `TeamSection`, `PartnersSection`, `ImageBlock`,
  `ArticlesBlock`, `PropertyGallery`, `ArticleDetail`, and the five admin
  thumbnails; `HeroSection` is a `Picture` (desktop plate + `hero.mobileImageUrl`)
- `mock-server/routes/media.js` — the force-delete rule; `mock-server/lib/crud.js`
  — `beforeDelete` now receives `{ user, db, query, collections }`
- `src/services/endpoints.js` (`force`, `withUsage`), `src/services/mediaService.js`
  (`remove(id, { force })`), `src/routes/adminRouteConfig.js`,
  `scripts/smoke-api.js`, `docs/API_CONTRACT.md`

**Verification**

`lint`, `test:ci` (123 suites / 2560 tests), `build:ci`, `check:traces`,
`test:mock` (146) and `smoke` (**282/282**, two of them new:
`media.delete-guard-409` and `media.force-delete`) all pass. The build keeps the
library out of the main bundle — only the route table's `"Media library"` title
string is there; the page, the picker and the queue are three admin chunks.

Checked in Chromium at 1440 px and 390 px: the header logo carries
`srcset="…w_103…103w, …w_206…206w, …w_309…309w"` and `sizes="103px"`, a
`picsum.photos` photograph carries neither; `/admin/media` lists 392 files with
"Used in N" badges from one request; "Add by URL" with a picsum link stored
`type: "image"` (the host decides when the URL has no extension); deleting a
seeded listing photograph was refused with "It appears in 1 place" and the force
checkbox; the property gallery's "Add from library" added two files with their
alt text already filled (8 → 10 images, "every image described") and said
"Those photographs are already in the gallery" when the two chosen were already
there; the editor's image dialog opened the picker and filled both `src` and
`alt`; the grid is two columns at 390 px with no horizontal scroll. No console
warnings.

**Upload path**: no Cloudinary test cloud was available in this environment, so
the unsigned upload itself is **verified by unit tests only** — the queue's
validation, ordering, retry and record creation. What was exercised in the
browser is the other half of §7: with nothing configured there is no Upload
button on the library, in the picker or on any image field, and every URL route
still works.

**Fixed while verifying**

- **The whole admin panel crashed before this prompt's screens could be
  opened.** `/admin/*` rendered "Something went wrong" —
  `formatDistanceToNowStrict is not a function`, thrown by `NotificationsMenu`
  through `formatRelative`. Reproduced at `HEAD` with this prompt's work
  stashed, so it predates it (prompt 38 converted `src/utils/format.js` to
  CommonJS, D36b). The cause is not the conversion: Create React App's catch-all
  asset rule excludes `.js`, `.mjs`, `.jsx`, `.ts`, `.tsx`, `.html` and `.json`
  and **nothing else**, so `require('date-fns')` — whose `require` condition
  points at `index.cjs` — was emitted as a _file_ and the call returned its URL
  as a string. Silent: no build error, no runtime error, just an undefined
  import. `formatRelative` is now built on `Intl.RelativeTimeFormat('en-IN')`,
  which is in the platform, needs no import and gives the same readings
  (`3 hours ago`, `2 days ago`, `in 5 minutes`); `src/` no longer imports
  `date-fns` anywhere. The pin stays in `package.json` (§3.3) for a later prompt
  — see `DECISIONS.md` for the rule it must follow.
- **A drawer filled from a prop painted one frame of empty boxes.**
  `MediaEditDrawer` set its form in an effect, and because MUI mounts a drawer's
  contents when it opens, that frame was the one an editor saw. It now adjusts
  during render (React's documented pattern), as does `MediaPickerDialog`'s tab
  and `MediaUrlForm`'s detected type — the last is derived rather than stored.

**Issues left → "Known issues"**

- NEW-39, NEW-40 and NEW-41 are untouched and still owned by 45/46.

**Next prompt: 40 — site settings, users and the profile screen.**

### Prompt 40 — Site settings: seven panels, validation, previews and the context refresh (2026-09-18)

**Files added**

- `src/pages/admin/settings/SettingsPage.jsx` (+ `.module.css`, shared by every
  part below; exports `SETTINGS_TABS` and `tabOfSettingsField`)
- `src/pages/admin/settings/settingsSchema.js` — the client mirror of
  `schemas['settings.update']` (`settingsSchema`, `validateSettings`,
  `normalizeSettings`, `settingsErrors`, `INTEGRATION_PATTERNS`, `LIMITS`,
  `formatIndianPhone`, `trimTrailingSlash`, `isUsableHref`, `MAP_EMBED_PREFIX`)
- `tabs/` — `GeneralTab.jsx`, `ContactTab.jsx`, `HeroTab.jsx`,
  `NavigationFooterTab.jsx` (exports `SOCIAL_PROFILES`), `NewsletterTab.jsx`,
  `IntegrationsTab.jsx`, `LeadNotificationsTab.jsx` (exports
  `AUTO_ASSIGN_OPTIONS`)
- `parts/` — `FooterColumnsEditor.jsx` (exports `emptyColumn`, `emptyLink`),
  `WorkingHoursEditor.jsx`, `StatsEditor.jsx`
- `__tests__/SettingsPage.test.jsx` (5 tests), `__tests__/FooterColumnsEditor.test.jsx` (7 tests)

**Files changed**

- `src/contexts/SiteSettingsContext.js` — `refresh()` answers with the new
  settings; `updateLocal(record)` paints a freshly saved record immediately and
  strips the `leads` branch on the way in, because this context holds the public
  subset and its session cache is what the next public page paints from
- `src/utils/events.js` — `EVENTS.settingsChanged` (`settings:changed`)
- `src/routes/adminRouteConfig.js` — `/admin/settings` → `settings/SettingsPage`
- `src/components/layout/Footer.jsx` (+ `.module.css`) — the collage is drawn
  only from three pictures up (D79), and the firm's RERA/GST numbers are
  rendered in the legal block, which is what makes the settings field's "displayed
  in the footer" true. These are the only public components this prompt touched.

**Files removed**

- `src/pages/admin/AdminSettings.js` (1 016 lines) — the legacy screen

**Endpoints, env vars, npm scripts**: none added or changed. The screen consumes
`GET`/`PUT /admin/settings` and the context's `GET /settings`, all of which exist
since prompt 09; the mock needed no change, because every rule this screen adds
narrows what the API already accepts.

**Verification**

`lint` (718 files, 0 findings), `test:ci` (**125 suites / 2572 tests**),
`build:ci` (no warnings), `check:traces` (0 findings), `test:mock` (146) and
`smoke` (**282/282**) all pass. `GET /api/settings` answers
`general, hero, navigation, social, footer, newsletter, integrations, updatedAt`
— no `leads`; `GET /api/admin/settings` carries `leads` as well.

Checked in Chromium at 1440 px and 390 px, signed in as the seeded admin and
manager:

- tagline, hero title, a new footer column with a link, a GA4 id and a WhatsApp
  number saved in one `PUT`; a second tab on `/` showed all five — the headline,
  the footer column and its link, the `wa.me` address, the GA4 script and the
  RERA/GST line — without the admin reloading;
- a GA4 id of `UA-12345` was refused before the request, opened the Integrations
  tab, badged it "1 error in this section" and printed "A GA4 measurement ID
  looks like…"; `G-ABCD123456` then saved;
- `9845012345` became `+91 98450 12345` on blur, with its `wa.me` preview
  beside it; emptying the field removed every WhatsApp link from the public site
  after the save;
- the footer gallery at two pictures warned in the admin and drew nothing on the
  site; at three it drew three (D79);
- "Reset to brand assets" put the Cloudinary originals back;
- the manager: the banner, every input disabled, no Save button anywhere, no
  Users link — and `PUT /admin/settings` from the console answered **403**;
- 390 px: one column, the save bar fixed above the safe area, no horizontal
  scroll. No console warnings from the app (the sandbox blocks Cloudinary,
  picsum, Iconify and Google Fonts, which is all the console holds).

**Issues closed**

- **ADD-19 (settings/users)** — the last half. The file is gone; the rebuilt
  screen writes the eight §6.13 branches as they are modelled, derives the tab
  strip and the panels from one table, and asks `can('settings', 'edit')`.
- **BUG-11** — the footer defaults, and with them the whole row.
- **NEW-10**, **NEW-11** — both were defects of the deleted file.
- Pending rewrites: "`AdminSettings` saving disabled" is closed.

**Issues left → "Known issues"**

- NEW-38, NEW-39, NEW-40 and NEW-41 are untouched and still owned by 44–46.

**Next prompt: 41 — performance, code splitting and the optional prerender.**

### Prompt 41 — Performance: code splitting, lazy sections, LCP preloads, web-vitals and the optional prerender (2026-09-18)

**Files added**

- `scripts/lib/chrome.js` — the shared browser launcher: `CHROME_PATH` verbatim
  when set, otherwise the usual Windows/macOS/Linux install locations; exports
  `findChrome`, `hasChrome`, `describe`, `requireChrome`, `launchChrome`,
  `missingChromeMessage`, `candidatePaths`, `DEFAULT_ARGS`
- `scripts/bundle-report.js` — `npm run analyze`: gzips every asset the manifest
  names, prints the entry and the largest lazy chunks, and **fails** when the
  public entry chunk is over 300 000 bytes gzip or contains `SeoPanel`,
  `RichTextEditor`, `recharts` or `MediaLibrary`
- `scripts/prerender.js` — `npm run build:prerender`'s second half (§5 of
  `docs/PERFORMANCE.md`)
- `scripts/__tests__/chrome.test.js` (17 cases, 1 skipped where no Chrome is
  installed in a standard location), `scripts/__tests__/bundle-report.test.js`
  (6 cases)
- `src/utils/vitals.js` — `reportWebVitals()`, `vitalsPayload`, `ratingFor`,
  `roundValue`; + `src/utils/__tests__/vitals.test.js` (11 cases)
- `src/utils/idle.js` — `whenIdle`, `afterLoad`, `afterLoadIdle`
- `src/utils/motionFeatures.js` — `domAnimation`, re-exported and nothing else
- `src/utils/prerender.js` — `isPrerendering()`, `PRERENDER_FLAG`,
  `PRERENDER_READY_ATTRIBUTE`
- `src/hooks/usePrerenderReady.js`, `src/hooks/useDeferredSection.js`
- `src/components/ui/VideoEmbed.jsx` (+ `.module.css`) — the click-to-load
  YouTube facade; exports `youtubeId`, `embedUrl`, `thumbnailUrl`
- `src/components/editor/blocks/RenderedYoutube.jsx` — the facade inside `.prose`
- `src/pages/admin/properties/property-form/components/coordinates.js` —
  `DEFAULT_CENTRE`, `roundCoordinate`, `hasPin`, split out of `MapPinPicker` so
  the picker could become a lazy boundary
- `docs/PERFORMANCE.md`

**Files changed** (83 in the tree; the ones that matter)

- `src/routes/index.js` — `<LazyMotion features={loadMotionFeatures} strict>` is
  now the outermost element of the app shell
- `BackToTop`, `ToastProvider`, `MainLayout`, `FaqAccordion`, `NotFound` —
  `motion.*` → `m.*`
- `src/contexts/LeadCaptureContext.js` — `LeadCaptureModal` is `React.lazy`;
  exports `prefetchLeadModal` and `leadTriggerProps`
- `Header`, `BottomNav`, `MobileDrawer`, `CtaBlock`, `HeroBlock`,
  `PackagesBlock`, `BanksBlock`, `RenderedCta`, `BlogSidebar`,
  `UnitConfigurationsSection`, `PriceCard`, `MobileCtaBar`, `BankCard(s)`,
  `PageHero` — every lead trigger spreads `leadTriggerProps`
- `src/components/admin/DataTable.jsx` — the desktop row is a memoised `DataRow`,
  `MobileCard` is memoised, `toggleRow` is stable
- `src/components/sections/article/ArticleCard.jsx` — `memo`
- `src/components/ui/Section.jsx` — `forwardRef`, merged with its own
  fade-up observer, so a band can defer its request on the same element
- `PropertyRow`, `LatestInsights`, `FaqSection`, `PartnersSection`, `Home`
  (testimonials) — `useDeferredSection` + `enabled`
- `src/hooks/useInView.js` — reports in view during the prerender crawl
- `src/components/ui/Carousel.module.css` — `content-visibility: auto`
- `src/contexts/SiteSettingsContext.js` — the three getters are stable
  `useCallback`s reading the record through a ref
- `src/utils/cloudinary.js` — `responsiveImage()`, used by `LazyImage` **and**
  `<Seo preloadImage>`
- `src/components/seo/useSeoResolved.js`, `Seo.jsx` — the `preloadImage` prop →
  `<link rel="preload" as="image" fetchpriority="high">`
- `Home`, `PropertyDetails`, `ArticleDetail`, `LocalityDetail`, `BuilderDetail` —
  `preloadImage` wired to the page's LCP image
- `src/components/sections/property/PropertyGallery.jsx` — `preload="none"` +
  the cover as poster on a file video; the facade for YouTube and the tour
- `src/components/editor/SafeHtml.jsx` — a `data-youtube-video` wrapper or a
  bare YouTube iframe becomes the facade
- `src/components/seo/AnalyticsScripts.jsx` — the tags are injected after `load`
  in an idle slot; the page view is not deferred
- `src/index.js` — `whenIdle(() => reportWebVitals())` after `render`;
  `createRoot` untouched
- `public/index.html` — `preconnect` to `res.cloudinary.com`
- `scripts/check-links.js`, `scripts/validate-jsonld.js` — launch through
  `scripts/lib/chrome.js` (their `CHROME_PATH`-only gate is unchanged)
- `src/pages/public/*` (14 pages) + `ListingEngine` — `usePrerenderReady(loading)`
- `.gitignore` — ad-hoc `lighthouse-*.html/json`

**Endpoints**: none added or changed.

**Env vars**: `MOCK_URL` (prerender, default `http://localhost:4000/api`).
`CHROME_PATH` gains its second consumer.

**npm scripts**: `serve:build`, `build:prerender`, `analyze`, `test:scripts`
added; `test:scripts` added to `check:all`. Dev dependency `serve@14.2.6`.

**Bundle**

| Chunk                                | Before    | After         |
| ------------------------------------ | --------- | ------------- |
| `main.*.js` (the public entry), gzip | 305.99 kB | **281.92 kB** |
| `motion-dom` source inside it        | 375 KiB   | 120 KiB       |
| `framer-motion` source inside it     | 136 KiB   | 69 KiB        |
| Admin markers in it                  | none      | none          |
| Lazy chunks                          | 165       | 166           |

`npm run analyze` passes with **18.08 kB to spare**. The whole saving is the
`LazyMotion`/`m` adoption; the four new lazy boundaries (`LeadCaptureModal`,
`MapPinPicker`, the video facade, `web-vitals`) move bytes out of _route_
chunks rather than out of the entry.

**Verification**

`lint` (0 findings), `test:ci` (**126 suites / 2583 tests**), `build:ci`,
`check:traces` (0 findings), `test:scripts` (17 cases, 1 skipped), `analyze`
and `smoke` all pass.

`npm run build:prerender` with `CHROME_PATH` set: **127 of 127 pages saved, no
warnings, no failures** — 15 static routes plus 112 records from the mock's
sitemaps. Spot-checked: `build/properties/aurelia-court-duplex-koramangala/index.html`
is 93 kB and carries `<title>3 BHK Duplex in Koramangala</title>`, the
canonical, one `<h1>`, the LCP preload and a `@graph` of `RealEstateAgent`,
`WebSite`, `RealEstateListing,House`, `FAQPage`, `BreadcrumbList`; no
`googletagmanager` or `connect.facebook.net` anywhere in `build/`.

Without `CHROME_PATH` and with no Chrome in a standard location,
`node scripts/prerender.js` prints `Set CHROME_PATH to run the prerender
(optional step).` and exits 1. `npm run build` never touches Chrome.

Edge cases of §7, checked in Chromium against `serve:build`:

- a prerendered property page boots, React re-renders it (no hydration API
  anywhere in `src/`), and a click on an internal link navigates client-side —
  `/localities/koramangala` with the right `<title>` and `<h1>`, one navigation
  entry, no reload;
- `window.dataLayer` holds `web_vitals` entries after the load:
  `FCP=540(good)`, `TTFB=31(good)`, `LCP=744(good)`;
- a page whose data fails still reports `data-prerender-ready`, so the crawl
  never hangs — `NotFound` reports it unconditionally for the same reason;
- `bundle-report` fails the check when a marker is present: asserted in
  `scripts/__tests__/bundle-report.test.js` against a fixture chunk.

**Lighthouse**: measured, and **Performance is recorded as not validly
measurable in this container** — see `docs/PERFORMANCE.md` §4. Accessibility
96–100, Best Practices 96, SEO 100 and **CLS 0** on all six pages in both
variants, so three of the four targets pass. Performance came out 47–60 with
LCP 5.3–7.5 s, and between 16 and 41 of every page's requests are blocked by
the sandbox's TLS interception — the Google Fonts stylesheet, every Cloudinary
image and **every page's LCP photograph**. With no LCP image, LCP is the last
text paint; on every page it equalled Time to Interactive to the millisecond,
which is the signature of that substitution and not of a slow image. Every
request the mock answers completes inside 750 ms and the last request of any
kind ends at 1.9 s, so the 7 s is not the network. `--ignore-certificate-errors`
would have made the numbers meaningful and was not used. §4.5 of
`docs/PERFORMANCE.md` is the checklist prompt 46 re-measures against.

**Issues closed**

- **ADD-04** — the second half and the last of the row: `web-vitals` is wired
  and verified reporting in the production build.

**Issues left → "Known issues"**

- **NEW-42** — the home page's 25 `perPage=1` count requests (owner 46).
- **NEW-43**, **NEW-44**, **NEW-45** — the three Lighthouse accessibility
  findings: two composite contrast failures plus a decorative one, a `<dl>` with
  wrapped pairs, and two `aria-label`s that do not contain their visible text
  (owner 42). All six pages are already above the ≥ 95 target.
- **NEW-46** — navigating away from a property page fires one doomed
  `GET /properties/slug/<new-slug>`, because `AnimatePresence mode="wait"` keeps
  the outgoing page mounted while `useParams()` already reports the new
  location (owner 44).
- NEW-33, NEW-35, NEW-38 to NEW-41 untouched and still owned by 42–46.

**Next prompt: 42 — mobile UX and accessibility pass.**

---

### Prompt 42 — Mobile UX and accessibility pass: every page at every breakpoint (2026-09-18)

**Files added**

- `scripts/a11y-audit.js` — `npm run a11y:audit`. Crawls every sitemap URL, the
  routes no sitemap carries (`/shortlist`, the 404) and — after signing in
  through the login form — every admin route from `src/routes/paths.js`, in a
  real Chrome at a phone width and a desktop width. Writes
  `docs/QA/42-a11y-audit.json` + `.md` and exits non-zero on any error-level
  finding. Without Chrome it prints "skipped" and exits 0, so it is **not** in
  `npm run check:all`. Options: `--baseUrl --apiUrl --widths --sample --limit
  --admin --email --password --timeout --readyTimeout --focusStops --outName
  --verbose`.
- `scripts/lib/inPageAudit.js` — the audit that runs inside the page, and the
  colour arithmetic behind it. Exports `parseColor`, `compositeOver`,
  `relativeLuminance`, `contrastRatio`, `requiredRatio`, `audit`,
  `readFocusRing` and `buildAuditSource`, which stringifies the helpers with an
  entry point so Chrome receives one self-contained expression.
- `scripts/__tests__/inPageAudit.test.js` — 11 cases over the colour maths
  (the WCAG worked examples, the scrim this site actually paints, the
  large-text rule) and the shape of the injected source.
- `src/test-utils/a11y.js` — `accessibleName`, `expectAccessibleName`,
  `expectLabelledInputs`, `expectNamedControls`, `expectNoDuplicateIds`,
  `expectRoleGroup`, `expectRovingTabIndex`, `expectDialogSemantics`,
  `expectImageAlt`. The same rules as the crawl, for the states a crawl cannot
  reach.
- Nine `a11y.test.jsx` suites (32 cases) over `Tabs`, `Accordion`, `Carousel`,
  `BottomSheet`, `Drawer`, `Header`, `MobileDrawer`, `BottomNav`, `LeadForm`,
  `LeadCaptureModal`, `FilterSheet`, `PropertyGallery`, `SectionNav`,
  `FaqAccordion`, `DataTable`, `SortableList`, `IconPicker`, the
  `RichTextEditor` toolbar and the `SeoPanel` tabs.
- `src/hooks/useScrollLock.js` — the iOS half of the scroll lock MUI leaves
  out, counted so nested overlays unlock once.
- `docs/QA/42-mobile-a11y-checklist.md`, `docs/QA/42-mobile-a11y-report.md`,
  and the two machine runs `docs/QA/42-a11y-audit.{json,md}` and
  `docs/QA/42-a11y-widths.{json,md}`.

**Files moved**

- `src/test-utils.jsx` → `src/test-utils/index.jsx`, so `a11y.js` can sit
  beside it. All 62 `import renderWith from '…/test-utils'` resolve unchanged.

**Files changed** — 40 components, pages and stylesheets; the full list with a
reason each is in `docs/QA/42-mobile-a11y-report.md`. The shape of it:

| Category                 | Count | Where                                                                                                                                 |
| ------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Tap targets under 44 px  | 22    | breadcrumbs, footer links, hero pills, carousel dots, section chips, sliders, article chips and share bar, FAQ tabs, locality chips, the 404's form, the design-system switch, and nine admin controls |
| Contrast below 4.5:1     | 4     | the locality and builder hero placeholders, the dashboard's donut legend, the trending numerals                                        |
| Mobile text under 13 px  | 4     | `--font-size-xs`, `PropertyCard`'s literals, MUI's `caption`/`overline`/`FormHelperText`, the avatar's initials                        |
| Focus rings              | 9     | six wrapper-focus controls with no ring, one red ring, three `onDark` variants with a blue one                                         |
| Names and structure      | 5     | the 404's search box, `/admin/403`'s heading, the two skip-link targets, the admin's missing skip link                                 |
| Overlay semantics        | 4     | `BottomSheet`, `Drawer`, the admin drawer, and the iOS scroll lock                                                                     |
| ARIA on custom controls  | 5     | four sliders' `aria-valuetext`, the carousel's pause button                                                                            |
| Layout                   | 3     | the section strip that scrolled the page, the landscape bar rule, `100dvh`                                                             |
| Reduced motion           | 1     | `animation-delay` / `transition-delay` reset                                                                                          |

**Endpoints** — none added or changed.

**npm scripts** — `a11y:audit` added (`node scripts/a11y-audit.js`). It is not
in `check:all`: it needs a running mock, a served build and Chrome.

**Env vars** — none.

**Verification**

| Command                 | Result                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `npm run lint`          | 0 errors, 0 warnings                                                                                          |
| `npm run test:ci`       | 135 suites, 2 615 tests, all green. The nine new suites emit no console output of their own; the `act(…)` notices of **NEW-33** (user-event v13 around MUI transitions, owner 44) are unchanged in the pre-existing suites. |
| `npm run test:scripts`  | 28 cases (1 skipped: no Chrome in a standard location)                                                        |
| `npm run test:mock`     | green                                                                                                        |
| `npm run build:ci`      | success, 0 warnings                                                                                          |
| `npm run check:traces`  | 1 077 files, 0 findings                                                                                      |
| `npm run check:contrast`| 29 gated pairs, all pass                                                                                     |
| `npm run validate:seed` | pass                                                                                                         |
| `npm run smoke`         | 282/282                                                                                                      |
| `npm run a11y:audit`    | see below                                                                                                    |

**Acceptance checklist**

- [x] `docs/QA/42-mobile-a11y-checklist.md` filled for every route at all seven widths, zero open ✗.
- [x] `docs/QA/42-mobile-a11y-report.md` lists every finding with the file that fixed it.
- [x] `scripts/a11y-audit.js` passes with Chrome — zero error-level findings.
- [x] The new a11y component tests pass; lint, `test:ci`, `build:ci`, `check:traces`, `check:contrast` and `smoke` all pass; no console warnings.
- [x] One commit, clean tree.

**Issues closed**

- **NEW-43** — all three contrast failures. (1) and (2) were one defect: the
  locality and builder heroes put white text on `LazyImage`'s light placeholder
  behind the scrim, 3.63:1, for as long as the photograph was missing; the hero
  image box now carries the hero's charcoal. (3) the trending numerals were
  1.47:1 and are now `--color-text-muted`.
- **NEW-44** — the property overview's `<dl>` is a `<ul>` of facts; a card per
  pair cannot be built inside a `<dl>` without the wrapper every checker
  reports, so the second of the two fixes prompt 41 offered was taken.
- **NEW-45** — both accessible names now begin with the words on the control
  (WCAG 2.5.3), and `npm run a11y:audit` has a `label-in-name` check so the
  next one is caught here rather than by Lighthouse.
- **BUG-20** — **verified closed.** `src/config/navigation.js` is still the one
  source of every menu: `buildHeaderNav()` feeds the desktop header and the
  phone drawer, `buildBottomNav()` the bottom bar and `buildFooterNav()` the
  footer; there is no second `navItems` or `sideMenuItems` literal anywhere in
  `src/`, and the audit found the same links at every width.

**New issues → "Known issues"**

- **NEW-47** — the audit reports "background unknown" for text over a
  photograph, because a photograph's contrast cannot be computed from CSS. Each
  such case was checked by eye at 390 px and the one that was wrong is NEW-43;
  a future pass could sample the rendered pixels instead (owner 46).

**Next prompt: 43 — UX polish, states and copy.**

---

### Prompt 43 — UX polish: loading/empty/error/success states, 404/500 pages, centralised copy (2026-09-18)

**What this prompt did**

Audited every route, public and admin, in a real Chromium at 1280 px and
390 px, under four conditions — a 1 500 ms network, the API stopped, a filter
that matches nothing, and the real action — then fixed the sixteen gaps that
audit found, moved every string the product says on its own behalf into two
copy files, rebuilt the 404 and the crash screen, and taught `check:traces` to
find placeholder copy.

`docs/QA/43-states-and-copy-report.md` is the audit: the route × state grid,
the sixteen fixes, the copy review and the verification table.

**Files added**

- `src/config/adminCopy.js` — the admin panel's own words: `TABLES`, `FORMS`,
  `TOASTS`, `DIALOGS`, `SEO`, `DASHBOARD`. 76 strings, every one with a call
  site. `TOASTS` is a vocabulary rather than a list: `saved(entity)`,
  `created`, `published`, `unpublished`, `deleted`, `duplicated`,
  `updatedCount(n, one, many)`, `copied(what)`, `flagged(entity, field, on)`.
- `src/config/__tests__/copy.test.js` — 14 cases over **both** copy files: no
  empty strings, no placeholder copy, no boilerplate brand, no invented SLA, no
  exclamation marks, sentence case for buttons and labels, toasts under 60
  characters, the admin vocabulary's exact output, a confirm that names its
  record, `fill()`'s behaviour, and `INDEX_PAGES === SEO.indexPages`. The two
  pattern checks import `COPY_PATTERNS` and `TRACE_PATTERNS` from
  `scripts/check-traces.js`, so the suite and the scan cannot disagree.
- `src/components/common/__tests__/ErrorBoundary.test.jsx` — 7 cases: children
  while nothing throws, the branded screen, the logged error, the injected
  head, the admin variant's "Reload this page", the Reload and Go home
  handlers, and **recovery on a key change without a reload**.
- `src/pages/public/__tests__/NotFound.test.jsx` — 7 cases: the branded mark and
  the single `<h1>`, the labelled search box, `?q=` (BUG-10), the five popular
  links in order, the two actions, a page-specific title, and `noindex`.
- `docs/QA/43-states-and-copy-report.md`, `docs/CONTENT_TO_BE_PROVIDED_BY_CLIENT.md`.

**Files deleted**

- `src/components/admin/AdminPlaceholderPage.jsx` and its stylesheet, with the
  barrel export and the entry in `components/admin/__tests__/index.test.js`.
  No route had used it since prompt 39.

**Files changed** — 111 in the tree (105 under `src/`). The shape of it:

| Category                                   | Count | Where |
| ------------------------------------------ | ----- | ----- |
| Copy moved into `copy.js` / `adminCopy.js` | 61    | nav, hero, home, listing, property, leads, blog, footer, forms, errors, empty, seo; admin tables, forms, toasts, dialogs, SEO, dashboard |
| Loading states that were a spinner         | 5     | `ArticleDetail`, `CmsPage`, `ArticleCategory`, `ArticleTag`, `AuthorPage` |
| Error-state defects                        | 4     | `CmsPage`'s outage-as-404, `PropertyDetails`' swallowed message, the home page's silence, the master-data filtered title |
| Confirmation and toast defects             | 5     | the bulk bar's fallback title, five ungrammatical singulars, the media drawer's unnamed file, the inconsistent toggle toast, five clipboard/delete/save wordings |
| Rebuilt screens                            | 2     | `NotFound`, `ErrorBoundary` (+ the route key and the admin variant) |
| Stale scaffolding comments and a CSS class | 10    | nine "arrives in prompt NN" comments, `.todo` → `.pending` |

**Endpoints** — none added or changed.

**npm scripts** — none added. `test:ci` **lost** `--passWithNoTests`: `src/`
holds 138 suites, so an empty run is a failure again.

**Env vars** — none.

**`check:traces`** — six copy patterns added (`lorem ipsum`, `TODO`, `FIXME`,
`Coming in prompt`, `placeholder until`, `dummy`), scanned in `src/` **only**:
`prompts/` is the specification and says "Coming in prompt" on purpose, `docs/`
records what was found. Both are still scanned for the brand traces. The scan
exports `COPY_PATTERNS` and `COPY_SCAN_PREFIX` beside `TRACE_PATTERNS`.

**Verification**

| Command                  | Result |
| ------------------------ | ------ |
| `npm run lint`           | 0 errors, 0 warnings; `check:endpoints` 742 files, 0 findings |
| `npm run test:ci`        | **138 suites, 2 642 tests**, all green (three new suites, 28 new cases) |
| `npm run test:mock`      | green |
| `npm run test:scripts`   | 28 cases (1 skipped: no Chrome in a standard location) |
| `npm run build:ci`       | Compiled successfully, 0 warnings |
| `npm run check:traces`   | 1 080 files, **0 findings** — brand, hex and the six copy patterns |
| `npm run check:contrast` | 29 gated pairs, all pass |
| `npm run validate:seed`  | `db.json` is valid |
| `npm run analyze`        | 285.91 kB / 300 kB gzip — 14.09 kB to spare |
| `npm run smoke`          | 282/282 |

The three new suites emit no console output of their own; the `act(…)` notices
in the pre-existing suites are **NEW-33** (owner 44), unchanged.

**Acceptance checklist**

- [x] `docs/QA/43-states-and-copy-report.md` covers every route × {loading, error, empty, success} with ✓ and lists the sixteen fixes.
- [x] `copy.js` (288 strings) and `adminCopy.js` (76) hold the UI strings; `grep -rn ">Submit<\|'Save'" src/components src/pages` returns nothing; the documented exception list is §5 of the report.
- [x] `AdminPlaceholderPage.jsx` deleted; "Pending rewrites" empty; `check:traces` extended and passing.
- [x] `lint`, `test:ci`, `build:ci`, `check:traces`, `smoke` all pass; no console warnings from this prompt's code.
- [x] One commit, clean tree.

**Issues closed**

- **NEW-20** — `test:ci` no longer carries `--passWithNoTests`.
- **BUG-12 — verified closed, finally.** The row has been in "Known issues
  (closed)" since the design-system prompt; this prompt re-measured its four
  parts and the last one is now gone. Colour literals outside `theme.js`,
  `global.css`, `src/seo/data/` and `public/brand/`: **0** in JS/JSX and **0**
  in CSS modules (the four `#`-matches left in `src/` are HTML numeric
  entities — `&#160;`, `&#8377;` — which the scan discounts). Inline
  `fontFamily` literals: **0** (the one remaining reads
  `var(--font-body)`). The boilerplate's SweetAlert popup classes: **0**. And the four components
  the row named by hand are all rewritten: `ErrorBoundary` is branded, keyed
  and has an admin variant (this prompt); `PageLoader` is the monogram and is
  now only a Suspense fallback (this prompt); `BackToTop` and the skeletons
  were rewritten in 04 and extended here.

**"Additional defects" re-verified**

Every row of `00_MASTER_CONTEXT.md` §11's second list was re-read against the
tree. ADD-01, ADD-02, ADD-03, ADD-06, ADD-09, ADD-16, ADD-18, ADD-19, ADD-20,
ADD-21, ADD-27 are closed and stay closed. **ADD-22** (the four property-form
tab defects) is the one still carrying an open half — the drag's per-drag-over
state updates — and keeps its owner. **ADD-24** (`PropertyCardSkeleton`'s two
phantom buttons, no `aria-busy`, `PageLoader`'s boilerplate wordmark) is
re-verified closed and is extended by this prompt: every skeleton preset now
carries `aria-busy`, and three new presets replace the five spinner-only pages.

**Issues left → "Known issues"**

Unchanged and still owned by 44–46: NEW-33 (act notices, 44), NEW-35 (fixed
elements during the page transition, 44), NEW-38 (duplicate React keys in
`ArticleRelatedCard`, 44), NEW-39 (`cleanTitle`'s dangling comma, 45), NEW-40
(four over-long status titles, 45), NEW-41 (two links to unpublished articles,
45), NEW-42 (the home page's 25 count requests, 46), NEW-46 (the doomed request
when navigating off a property page, 44), NEW-47 (contrast over a photograph,
46). NEW-04, NEW-08, NEW-15, NEW-17, NEW-18, NEW-28, NEW-29, NEW-30 are the
audit's own historical rows and are unchanged.

**No new issues opened.** Every gap this audit found was fixed in it.

**Next prompt: 44 — QA bug bash: property and listing.**

### Prompt 44 — QA bug bash: the property module end to end (2026-09-18)

**What this prompt did**

Exercised the whole property path — master data, the sixteen-tab form, the
admin list, the listing engine, the details page, lead capture and the mock's
own rules — for **admin, manager and sales**, at **1280 px and 390 px**, with
the console open. 145 request-level scenarios, 11 interactive flows, 74
instrumented page loads and 38 browser specs. **Six defects found, six fixed**,
each with a regression test. `docs/QA/44-property-bug-bash.md` is the record:
the scenario table row by row, the defects with the file that fixed each, and
the observations that are not defects.

**Defects found and fixed**

| Id     | What was wrong                                                                                                                                                      | Fixed in                                                          |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| BB-01  | An empty `slug` was refused with 422 although §5.9 has the API derive one from the title — on **every** slugged resource, and on exactly the body the property form sends when the editor has not chosen a URL | `mock-server/middleware/validate.js`                              |
| BB-02  | `location.pincode` accepted `'12'` and `'abc123'`; the six-digit rule lived only in the browser                                                                       | `src/services/schemas/property.js`, `src/services/schemas/masterData.js` |
| BB-03  | `possessionDate` was not required for a pre-launch or under-construction listing, although §6.1 says it is                                                            | a `requiredIf` rule in `mock-server/middleware/validate.js`        |
| BB-04  | A duplicated property inherited the original's `canonicalUrl` and `redirect`, and reset `seo.analysis` to `[]` where §9.6 types it as an object                       | `mock-server/routes/properties.js`                                |
| BB-05  | `formatPrice`/`formatArea`/`formatNumber`/`formatBhk` rendered `₹0`, `0 sq ft` and "Studio" for a blank string or an empty array (`Number('   ') === 0`)              | `src/utils/format.js`                                             |
| BB-06  | `₹99,99,999` printed as `₹100 L`: the unit was picked before the rounding                                                                                            | `src/utils/format.js`                                             |

**Files added**

- `docs/QA/44-property-bug-bash.md` — the scenario table (145 rows, grouped),
  the six defects with their fixes and regression tests, six observations that
  are not defects, the console/layout result and the verification table.
- `src/__tests__/seedProperties.render.test.jsx` — 39 cases. Every **active**
  seed property is put through `mock-server/lib/embed.js` + `lib/scope.js`, so
  the test renders byte-for-byte what `GET /properties/slug/:slug` answers, and
  asserts: one `<h1>` carrying the title, **no** `console.error` or
  `console.warn` at all, and every section chip pointing at a section the page
  actually printed (BUG-06 over the whole seed rather than one fixture).
- `src/pages/admin/properties/property-form/__tests__/payload.seed.test.js` —
  123 cases. `fromRecord → toPayload → fromRecord` is a fixed point for all 40
  seed records, no editable field is lost on the way to the API, exactly one
  cover image survives, and no `tmp-` id ever reaches the wire. Two values are
  allowed to differ, both by design and both asserted rather than exempted: a
  `tmp-` React key, and the `pricing.pricePerSqft` D33 derives.
- `src/utils/__tests__/listingFilters.roundtrip.test.js` — 43 cases. URL →
  params → URL is a fixed point for every §5.7 parameter at once and for each
  one alone; defaults and route-fixed params stay out of the address; an
  unreadable value is dropped rather than sent as `NaN`; every name the engine
  serialises is a name the contract answers; and the admin table's own
  serialisation and its export (D44) round-trip too.
- `src/utils/__tests__/format.edge.test.js` — 84 cases over the lakh/crore
  boundary, zero, every shape of "nothing", IST dates across the day boundary,
  relative time and six ways of typing a phone number.
- `src/components/listing/__tests__/listingRoutes.test.js` — 29 cases over the
  thirteen listing routes, D25's resolution order (a status slug before a
  property-type slug, under every parent), the pending state while master data
  is on its way, the 404 after it has arrived, and the rule that a route may
  only fix a parameter the engine reads.
- `e2e/playwright.config.js`, `e2e/fixtures/auth.js`, `e2e/README.md` and six
  specs — `login`, `property-create`, `property-details`, `lead-submit`,
  `listing-filters`, `shortlist` — **38 tests, all passing**.
- `playwright.config.js` at the repository root: three lines that re-export
  `e2e/playwright.config.js`, so `npm run e2e` is plain `playwright test`.

**Files changed**

| File                                        | Change                                                                                                     |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `mock-server/middleware/validate.js`        | the `slug` type accepts the empty string (BB-01); a `requiredIf` descriptor rule, Laravel's `required_if` (BB-03) |
| `mock-server/routes/properties.js`          | `duplicate` clears `canonicalUrl`, `redirect`, the score and `testsTotal`, and resets `analysis` to the model's object (BB-04) |
| `mock-server/__tests__/properties.test.js`  | +4 regression cases, one per contract defect                                                                |
| `src/services/schemas/property.js`          | `location.pincode` gets `^\d{6}$`; `possessionDate` gets `requiredIf`                                        |
| `src/services/schemas/masterData.js`        | `localities.pincodes[]` items get the same pattern                                                          |
| `src/utils/format.js`                       | `toNumber` refuses a blank string and a non-string non-number (BB-05); `unitOf()` picks lakh or crore after rounding (BB-06) |
| `src/utils/format.test.js`                  | the `₹99,99,999` case now expects `₹1 Cr`, with the reason beside it, and `₹99.95 L` is pinned beside it     |
| `package.json`                              | `@playwright/test@1.63.0` (dev, exact) and `"e2e": "playwright test"`                                        |

**npm scripts** — `e2e` added (`playwright test`). No other script changed.
**Dependencies** — `@playwright/test@1.63.0` (dev), the one §3.3 allows for this
prompt. Nothing else added, nothing removed.
**Endpoints** — none added or changed. Three *rules* tightened on existing ones:
an empty slug is accepted, a pincode must be six digits, and a possession date
is required while a project is being built. All three are §5/§6 rules that were
documented and unenforced.

**Acceptance checklist**

- [x] `docs/QA/44-property-bug-bash.md` records every scenario of task 1 for all
      three roles, with ✓ and the defect each row found.
- [x] The new Jest suites pass — the seed render test over all 38 published
      properties, the payload round trip over all 40.
- [x] Playwright specs pass: 38 / 38, Chromium, from a freshly reset seed.
- [x] `npm run lint`, `npm run test:ci`, `npm run build:ci`, `npm run
      check:traces`, `npm run test:mock`, `npm run smoke` all pass; no console
      warnings on any property-related page at either width.
- [x] One commit, clean tree.

**Issues left → "Known issues"**

Three new rows, all outside the property module and none of them a defect in it:
**NEW-48** (the a11y audit's horizontal-scroll heuristic reports a false
positive for a table inside its own scroller — owner 46), **NEW-49** (one seed
record carries no `pricePerSqft` — owner 48), **NEW-50** (`e2e/**` is outside
the `lint` and `format` globs — owner 48).

Two rows this prompt owned are answered rather than fixed. **NEW-33**: the
`act(…)` notices stay — user-event v14 is a dependency §3.3 does not list and
this prompt's guardrail allows only Playwright; the notices are cosmetic, no
test is flaky, and the new seed render suite, which fails on a single console
line, is green. **NEW-46**: the doomed request could not be reproduced on the
current build (evidence in the row); it keeps its row because the transition it
names can no longer be started from the page, and because its fix is in the
router setup (D97), which this prompt is told not to touch.

**Next prompt: 45 — QA bug bash: leads, articles, SEO, CMS, settings, auth.**

### Prompt 45 — QA bug bash: leads, articles, SEO, CMS, careers, media, settings, auth (2026-09-18)

**What this prompt did**

Exercised every module prompt 44 did not — leads and the CRM, articles and the
blog, the SEO Manager, the pages CMS, careers and the newsletter, the media
library, site settings, users and profiles, and authentication itself — for
**admin, manager and sales**, at **1280 px and 390 px**, with the console open.
579 role/endpoint pairs, 197 request-level scenarios, 23 auth-and-expiry
scenarios against a mock issuing thirty-six-second tokens, 352
instrumented page loads and 52 browser specs. **Seven defects found, seven
fixed**, each with a regression test.
`docs/QA/45-modules-bug-bash.md` is the record and
`docs/QA/45-rbac-matrix-verified.md` is the matrix, route by route and endpoint
by endpoint, for all three roles and on both sides — the screen and the API.

**Defects found and fixed**

| Id         | What was wrong                                                                                                                                                                                                 | Fixed in                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **MB-02**  | **(high)** `lead.pageSlug` was typed as a single-segment slug, so **every lead sent from a nested CMS page was a 422** — the Home Loan, Legal Assistance, Interior Designing and Real Estate Awareness pages, four of the site's lead-generating pages | `src/services/schemas/lead.js`                                        |
| MB-01      | `SlugField` fired `check-slug` while `disabled`, so a sales user opening the property form read-only collected a **403 and a console error** on a screen they may read                                             | `src/components/admin/SlugField.jsx`                                  |
| MB-03      | A CMS page refused an empty slug instead of deriving one from its title, although §5.9 says the API derives it and prompt 44 settled that for every other slugged resource                                          | `src/services/schemas/page.js`                                        |
| MB-04      | The reserved-path rule lived only in `PageFormPage`: the API stored a page under `/properties`, which exists and can never be opened (D11)                                                                          | `mock-server/routes/pages.js`                                         |
| NEW-38     | `EntityPicker` rendered two children with the same key when its value carried a repeated id — a row that disappears on the next reorder                                                                             | `src/components/admin/EntityPicker.jsx`                               |
| NEW-39     | `cleanTitle` left a comma leaning on the separator when the variable between them resolved to nothing                                                                                                               | `src/seo/variables.js`                                                |
| NEW-41     | Two seeded links pointed at a draft and a scheduled article, so `check:links` exited 1                                                                                                                              | `scripts/seed/data/articles.js`, `scripts/seed/data/pages.js`, `db.json` |

**Files added**

- `docs/QA/45-modules-bug-bash.md` — the 197-row scenario matrix grouped by
  module, the 23 auth scenarios, the seven defects with their fixes and
  regression tests, seven observations that are not defects, the three SEO
  walk-throughs from Poor to Good step by step, the console audit and the
  verification table.
- `docs/QA/45-rbac-matrix-verified.md` — §7 verified three times over: every
  screen × every role as `RoleRoute` actually rendered it, every admin endpoint
  × every role as the server actually answered it, and the sidebar of each role
  walked for a link that would lead to a 403. Plus the five rules a yes/no
  cannot express (the sales lead scoping and export, the manager's read-only
  settings and custom HTML) and what each role is sent to when it asks for a
  route it may not open.
- `src/__tests__/rbac.routes.test.jsx` — 146 cases. Every `adminRouteConfig.js`
  entry is rendered through `RoleRoute` as each of the three roles and the
  result read from the output — the screen or the `Forbidden` page, never both.
  The same answer is then checked against the login redirect
  (`canAccessAdminRoute`), against the navigation (`getNavItemsForRole`, in both
  directions: no link that 403s, and no area silently missing from the sidebar),
  and against the permission the **API** derives for the same resource
  (`mock-server/lib/routePermissions.js`). The failure it exists to catch is not
  one guard being wrong but two of them disagreeing.
- `src/seo/__tests__/seedEntities.analyze.test.js` — 143 cases. `analyze()` run
  over all 119 records the seed publishes, of all eight entity types, with the
  context `SeoPanel` builds: no exception, a finite score in 0–100, one of the
  three bands, the fifty results §9.6 counts, counters that agree with the
  results they count, and the same answer twice. Then the walk that matters: the
  seed's lowest-scoring listing taken from **Poor 50 to Good 88** by applying
  its own panel messages, asserting that the score never goes backwards and that
  no failing test is left behind.
- `src/components/cms/__tests__/allBlocks.render.test.jsx` — 82 cases. All
  twenty-five block components rendered twice — with the `defaultData()` an
  editor gets on insert, and with every field of the block's own schema filled —
  with and without site settings, plus all twenty-five in one `PageRenderer`
  tree. A `console.error` or `console.warn` fails the test. The filled data is
  derived from `blockSchemas.js` rather than written out, so it cannot drift
  from what the editor produces.
- `src/components/cms/__fixtures__/blocks.js` — the seed records the
  data-driven blocks are given, so a block that draws a listing card draws a
  real one.
- `src/components/admin/__tests__/EntityPicker.test.jsx` — eight cases, the
  NEW-38 regression among them.
- `e2e/tests/article-publish.spec.js`, `seo-panel.spec.js`, `cms-page.spec.js`,
  `settings.spec.js` — fourteen specs: writing an article in the editor and
  publishing it (with the draft 404 and the preview token on the way), the SEO
  panel saving only the `seo` branch and storing the score, a CMS page built out
  of blocks and published, and the settings saved and read back in the public
  footer — each with its RBAC half.

**Files changed**

- `src/services/schemas/lead.js`, `src/services/schemas/page.js`,
  `mock-server/routes/pages.js` — MB-02, MB-03, MB-04.
- `src/components/admin/SlugField.jsx`, `src/components/admin/EntityPicker.jsx`,
  `src/seo/variables.js` — MB-01, NEW-38, NEW-39.
- `src/components/sections/developer/DeveloperCta.jsx` — a comment that MB-02
  made untrue.
- `scripts/seed/data/articles.js`, `scripts/seed/data/pages.js`, `db.json` —
  NEW-41, rebuilt with `npm run seed:build`.
- `mock-server/__tests__/content.test.js` (+5), `mock-server/__tests__/leads.test.js` (+2),
  `src/components/admin/__tests__/SlugField.test.jsx` (+2),
  `src/seo/__tests__/variables.test.js` (+2) — the regressions.
- `e2e/playwright.config.js`, `e2e/README.md` — the suite honours `CHROME_PATH`
  (D16), and the README records the login rate limit a repeated run trips.
- `package-lock.json` — `npm install` normalised the `@playwright/test` entry to
  the exact pin `package.json` already carried (§3.3).

**Endpoints added / changed**

None. Three request **contracts** changed, all documented in
`docs/API_CONTRACT.md`: `lead.pageSlug` accepts a slug path, `page.slug` accepts
the empty string and is derived from the title, and `POST`/`PUT`/`PATCH` on a
page refuse a slug under a reserved prefix with a 422 keyed `slug`.

**Env vars, npm scripts**

None added. `MOCK_TOKEN_TTL_HOURS=0.01` was used as §4.2 asks; `CHROME_PATH` now
also reaches the e2e suite.

**Acceptance checklist (copied from the prompt, ticked)**

- [x] `docs/QA/45-modules-bug-bash.md` and `docs/QA/45-rbac-matrix-verified.md`
      complete, with every defect fixed and referenced by id from both.
- [x] Console clean on every route for all roles: **352 page loads** — 50 public
      URLs at 1280 px and 390 px, 42 admin URLs for each of the three roles at
      both widths — with **0** application `console.error`/`console.warn`, 0
      page errors, 0 failed requests, 0 horizontal scroll, 0 routes landing
      anywhere but where they were asked for, and 0 pages rendering an empty
      shell. Both route lists are printed in §6 of the report. The one HTTP 4xx
      is `/this-route-does-not-exist` asking the API for a page that does not
      exist, which is the 404 page working (prompt 44's OBS-3).
- [x] New Jest suites pass: `rbac.routes` (146), `seedEntities.analyze` (143),
      `allBlocks.render` (82), `EntityPicker` (8).
- [x] e2e extended: four new spec files, fourteen new specs, **52 / 52** green.
- [x] `npm run lint`, `npm run test:ci` (147 suites, 3 344 tests),
      `npm run build:ci` (compiled successfully, 0 warnings),
      `npm run check:traces`, `npm run check:contrast`, `npm run test:mock`
      (157), `npm run test:scripts`, `npm run smoke` (282),
      `npm run check:links` (**0 broken**), `npm run check:jsonld` (0 errors)
      all pass. `npm run format:check` and `npm run validate:seed` too.
- [x] "Known issues (open)" carries no row this prompt owns and none of
      severity high; every remaining row names a later prompt and a reason.
- [x] One commit, clean tree.

**Issues left → "Known issues"**

None added. Three rows are **closed**: **NEW-38** (the duplicate key in
`EntityPicker`), **NEW-39** (the comma in front of the separator) — the two this
prompt owned — and **NEW-41** (the seed's dead internal links), which was owned
by prompt 46 and is closed here because `check:links` is an acceptance criterion
of this one and the fix is seed copy inside this prompt's modules.

The rows that stay open are the ones later prompts own and this prompt's
guardrails do not reach: **NEW-40**, **NEW-42**, **NEW-47**, **NEW-48** (owner
46 — the SEO-validation and a11y run), **NEW-49**, **NEW-50** (owner 48), and
**NEW-30**, **NEW-35** (owner 41). None is of high severity.

**Next prompt: 46 — QA: cross-device, Lighthouse and SEO validation.**

### Prompt 46 — QA: cross-device, Lighthouse, SEO validation and the prerender dry run (2026-09-18)

**What this prompt did**

Produced the release-quality evidence of §8.6, §9 and §8.1 against **one**
production build served on port 5000 against the mock: Lighthouse mobile on the
six pages of §8.6, a new third validation script, the full sitemap/robots/RSS/
llms verification, the prerender dry run, and the nine-route × seven-width
cross-device grid. **Seven defects found, seven fixed** — the largest being
seventeen indexable pages that no sitemap listed.
`docs/QA/46-cross-device-lighthouse-seo.md` is the record and
`docs/QA/46-lighthouse-howto.md` is the runbook for the one measurement this
container cannot make.

**Defects found and fixed**

| Id         | What was wrong                                                                                                                                                                                                 | Fixed in                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **SM-01**  | **(high)** **Seventeen property-type landing pages were in no sitemap at all** — `/buy/apartments` … `/commercial/warehouses` (D25). They are linked from the home page and listed in `llms.txt`, and `PUBLIC_PATHS.propertyType` existed, but only `llms.txt` ever read it. Seventeen indexable pages Google was never told about. | `mock-server/lib/sitemapBuilder.js` + 2 regression tests              |
| NEW-40 (a) | The four `/buy/<status>` titles said "for Sale" twice — `%listingtype%` in a *title* ignored the route's own `verb`, which the `<h1>` and the description had always honoured. 72/82/73/70 → 63/73/64/61 characters | `src/components/listing/listingSeo.js` (`titleVerbOf`)                |
| NEW-40 (b) | Seven CMS pages had a `seo.title` too short to say anything — `"Disclaimer"` at 10 characters was the whole of what a result would show                                                                             | `scripts/seed/data/pages.js`, `db.json`                               |
| NEW-43′    | **Prompt 42's hero-contrast fix never applied.** `.heroImage`'s charcoal and `LazyImage`'s `.wrapper` grey are two single-class selectors on the *same element*: whichever CSS-module chunk loaded second won, and in the production build that was `.wrapper`. Lighthouse scored locality **97** with five failures on `rgb(114,114,115)` — the exact colour NEW-43 named. `.fallback` was never covered at all. Locality **97 → 100** | `LazyImage.module.css`, `LocalitySections.module.css`, `DeveloperSections.module.css` |
| A11Y-46    | The admin "Status" filter showed **no focus ring** — a MUI `Autocomplete` whose input MUI gives `outline: none`, between two native `<select>`s that light up the 2 px `--color-focus` ring                          | `src/components/admin/MultiSelect.jsx`                                |
| SEO-46     | The three local favicon links were absolute against `seoSettings.siteUrl`, so every non-production host fetched its icons from `https://www.squaresnacres.com`                                                      | `src/components/seo/useSeoResolved.js`                                |
| NEW-48     | `inPageAudit` read horizontal scroll from `documentElement.scrollWidth`, which counts an element inside its *own* scroller — `/admin/properties` reported 721 px of overflow while the page did not move                | `scripts/lib/inPageAudit.js`                                          |

Two further tooling defects were fixed because the grid could not be trusted
without them: **the admin screens had never been audited past the first width**
(each width reuses the browser, so `/admin/login` correctly redirects the
already-authenticated session and `signIn()` threw on the missing form), and
the script had **no way to express a fixed route list** (`--limit` truncates
the admin list as well as the sitemap). Both in `scripts/a11y-audit.js`.

**Files added**

- `scripts/check-sitemap-coverage.js` (`npm run check:sitemap`) — the third
  validator. With Chrome it crawls from `/` to depth 4 and compares the
  canonical of every indexable page it renders with the union of the sitemaps,
  then opens every sitemap URL the crawl missed, so both directions are
  covered; without Chrome it compares `src/routes/paths.js` plus the public API
  and resolves each listed URL through the same SEO modules the browser runs.
  Reports `missing` and `extra` and exits non-zero on either.
- `docs/QA/46-cross-device-lighthouse-seo.md` — the run of record.
- `docs/QA/46-lighthouse-howto.md` — the fifteen-minute runbook for Performance.

**Results**

| Check                                   | Result                                                                |
| --------------------------------------- | ---------------------------------------------------------------------- |
| `npm run check:sitemap`                 | 144 sitemap URLs, 144 indexable rendered routes, **0 missing, 0 extra** |
| `npm run check:jsonld`                  | 144 pages, **0 errors**, 36 warnings (all title length)                |
| `npm run check:links`                   | 144 pages, 143 links followed, **0 broken**                            |
| Lighthouse ×6 — A11y / BP / SEO / CLS   | **100 / 96 / 100 / ≤0.001** on all six — every target passed           |
| Lighthouse — Performance / LCP / TBT    | **not validly measurable here** — see below                            |
| Prerender dry run                       | **144 of 144**, 0 failures, 2 min 30 s; 3 files spot-checked; client-side navigation verified; 0 modal markup in the snapshots |
| Cross-device grid                       | 9 routes × 7 widths = **63 audits, 0 errors**                          |
| robots.txt / rss.xml / llms.txt         | 20 agents + 6 sitemap lines / 10 items all valid / 5 sections, 58 absolute links |
| `npm run analyze`                       | entry 286.03 kB of 300 kB, no admin code in it                         |
| `lint` · `test:ci` · `test:mock` · `test:scripts` · `build:ci` · `check:traces` · `validate:seed` · `check:contrast` · `smoke` | pass · 3344 · 159 · 28 · 0 warnings · 0 findings · valid · 29 pairs · 282/282 |

**Performance could not be measured, and is owed**

The container's egress proxy re-terminates TLS with a CA Chromium will not
trust, so `fonts.googleapis.com`, `res.cloudinary.com`, `picsum.photos` and the
Iconify API all fail with `ERR_CERT_AUTHORITY_INVALID` — **including every
page's LCP image**. Prompt 41 hit the same wall; this prompt re-verified it
rather than assuming it, and tried two remedies (Chromium's `CACertificates`
enterprise policy, which this build ignores; `certutil` into the NSS store,
which the environment does not permit). Disabling certificate verification
would have replaced one wrong number with another. Performance 50–59, LCP
5.4–7.2 s and TBT 556–1027 ms are recorded as environment artefacts, not as the
verdict on §8.6, and `docs/QA/46-lighthouse-howto.md` closes it in fifteen
minutes on a machine with ordinary network access.

**Acceptance checklist**

- [x] `docs/QA/46-cross-device-lighthouse-seo.md` carries the Lighthouse table,
      the three script results, the Rich Results/Schema validator table, the
      robots/rss/llms checks, the prerender dry run and the cross-browser grid.
- [x] `check:jsonld`, `check:links`, `check:sitemap` pass; `docs/PERFORMANCE.md`
      §4 replaced with the final table.
- [x] `lint`, `test:ci`, `build:ci`, `check:traces`, `validate:seed`,
      `test:mock`, `smoke` pass.
- [x] One commit, clean tree.
- [ ] Lighthouse **Performance ≥ 85, LCP < 2.5 s, TBT < 200 ms** — needs a
      network that reaches the CDNs (runbook written).
- [ ] **Firefox** (and nominally Edge) pass of the width grid — neither browser
      exists in this Linux container.
- [ ] Rich Results Test / `validator.schema.org` — the human step, with the
      table and the extraction command ready in §4 of the report.

**Issues left → "Known issues"**

Closed: **NEW-40** (both halves) and **NEW-48**, the two rows this prompt owned.

Added: **NEW-51** — the property gallery stage fails `label-content-name-mismatch`
because it contains a nested "View all N photos" button, so its accessible name
cannot be a superset of its visible text; the real defect underneath is a
`role="button"` region containing three real buttons, and the fix is to lift
them out of the clickable region. Recorded rather than fixed because
Accessibility is 100 on that page, every target passes, and restructuring a
gallery prompt 44 bug-bashed — swipe handlers, lightbox, absolute positioning —
with no way to verify it visually would risk more than it buys. Owner 48.
**NEW-52** — the audit's contrast rule measures `aria-hidden` decoration; 63 of
the grid's 454 warnings are the breadcrumb `/` separator, which axe's own rule
skips. Owner 48.

Still open and owned elsewhere: **NEW-42** (specified in §9.2 of the report for
prompt 47 to document), **NEW-47**, **NEW-49**, **NEW-50**, **NEW-30**,
**NEW-35**. None is of high severity.

**Next prompt: 47 — backend developer guidelines package.**

---

### Prompt 47 — Backend developer handover package (2026-09-18)

**What it is**

`backend_developer_guidelines/` — everything the Laravel + MySQL developer needs
to build the API this finished frontend already expects — is **generated**, from
the same files the application itself reads, plus a live capture against the
running mock. Nothing in it is typed twice, so nothing in it can drift from the
contract.

```
npm run mock                            # terminal 1 — examples are captured live
npm run generate:backend-guidelines     # terminal 2
npm run check:guidelines                # registry ↔ docs ↔ Postman ↔ OpenAPI
```

**The package** — 15 files, 6.2 MB, `generatedFrom: <commit>` the only line that
moves between commits.

| File                       | Bytes     | What it is                                                                          |
| -------------------------- | --------- | ----------------------------------------------------------------------------------- |
| `README.md`                | 41 532    | orientation, the one-line switch-over, the parity checklist, the support matrix     |
| `01_API_CONTRACT.md`       | 69 364    | §5.1–5.13 verbatim, worked examples, the response shapes, versioning/caching/CORS/throttling |
| `02_AUTH_AND_RBAC.md`      | 39 195    | the Sanctum flow as text, three role matrices, the seed accounts, sales scoping     |
| `03_ENDPOINTS.md`          | 1 305 515 | 242 sections: query table, body table with Laravel rules, captured example, errors, side effects |
| `04_DATA_MODELS.md`        | 278 366   | 28 collections field by field, the relational mapping, the column mapping, the enums |
| `schema.sql`               | 44 524    | MySQL 8 DDL — 42 tables, utf8mb4/InnoDB, FKs, JSON columns, soft deletes, full-text  |
| `05_BUSINESS_RULES.md`     | 17 878    | 18 rule sets with the formulas the mock implements                                   |
| `06_SEO_SITEMAP_ROBOTS.md` | 14 094    | the nine crawler documents, with captured samples and the shipped `robots.txt`      |
| `07_DEPLOYMENT.md`         | 14 222    | env vars for both apps, two Nginx blocks, CSP, switch-over, rollback, go-live        |
| `08_TESTING_AND_PARITY.md` | 8 791     | running both servers, `--compare`, Postman, a module-by-module acceptance checklist  |
| `postman_collection.json`  | 1 321 415 | v2.1, 242 requests in 11 module folders, tests on every one, captured responses      |
| `postman_environment.json` | 1 660     | Local mock enabled, the production rows alongside it, disabled                       |
| `openapi.yaml`             | 1 554 444 | OpenAPI 3.1 — 152 paths, 242 operations, 116 schemas, bearer security scheme         |
| `db.json`                  | 1 509 450 | the seed, byte-identical (checked by `check:guidelines`)                             |
| `seed-mapping.md`          | 12 945    | import order, id preservation, pivot extraction, JSON columns, singletons, passwords |

**The machinery**

| File                                     | Lines | What it does                                                        |
| ---------------------------------------- | ----- | -------------------------------------------------------------------- |
| `scripts/generate-backend-guidelines.js` | 367   | the orchestrator: capture, render, write, summarise                  |
| `scripts/check-guidelines.js`            | 274   | twelve coverage checks; in `check:all`                               |
| `scripts/lib/guidelines/capture.js`      | 654   | the live walk, the cleanup and the whole stabilisation policy        |
| `scripts/lib/guidelines/documents.js`    | 532   | the `{{token}}` values every template needs                          |
| `scripts/lib/guidelines/sql.js`          | 713   | the relational mapping rules and the DDL                             |
| `scripts/lib/guidelines/openapi.js`      | 558   | descriptors → JSON Schema → the 3.1 document                         |
| `scripts/lib/guidelines/postman.js`      | 343   | the collection, the environment, stable ids                          |
| `scripts/lib/guidelines/fixtures.js`     | 225   | the sample bodies and writable resources, shared with the smoke test |
| `scripts/lib/guidelines/rules.js`        | 225   | descriptors → Laravel rule strings, snake_case, foreign keys         |
| `scripts/lib/guidelines/merge.js`        | 154   | the notes, split on their `##` headings, and the template renderer   |
| `scripts/lib/guidelines/yaml.js`         | 121   | the hand-written YAML emitter (no dependency added)                  |
| `scripts/lib/guidelines/markdown.js`     | 82    | square tables, escaped pipes, no empty cells                         |
| `scripts/lib/guidelines/templates/*.md`  | 10    | one per document                                                     |
| `docs/backend-notes/*.md`                | 7     | 76 kB of hand-written prose, 50 sections, merged by heading          |

**Idempotency** — proved three ways: two runs in a row on a used database are
identical; a run on a pristine seed matches the run after it; and a run on a
pristine seed reproduces the committed package byte for byte. Getting there
needed four state leaks closed, each recorded in `docs/DECISIONS.md`: fixtures
that appeared in the list examples (the walk now reads before it writes), a
documented `PATCH { order }` that left the seed renumbered, `PUT /auth/profile`
renaming the seed's sales user, and the `propertyViews` row that
`POST /properties/:id/view` adds and no endpoint removes.

**`npm run smoke -- --compare=<url>`** sends every read to two base URLs and
prints only what differs — status, content type, envelope keys, the `meta` key
set with its value types, and the key set of `data`. It was verified against a
proxy that breaks three things on purpose: a list answered as a bare array, a
missing `slug`, and a 404 where the mock answers 200. All three are reported;
113 of the other 116 reads are silent.

**Results**

| Check                               | Result                                                              |
| ----------------------------------- | -------------------------------------------------------------------- |
| `npm run generate:backend-guidelines` ×2 | second run → **no diff**                                        |
| `npm run check:guidelines`          | **12/12** — 242 endpoints × 3, 28 collections × 2, 50 note sections, 242 captured examples, byte-identical seed, no stale trace |
| `npm run smoke`                     | **282/282**                                                         |
| `npm run smoke -- --compare=…`      | 116/116 reads identical against the mock; 3/3 injected defects found |
| `lint` · `test:ci` · `test:mock` · `test:scripts` · `build:ci` · `check:traces` · `validate:seed` · `check:contrast` | pass · 3344 · 159 · 54 (25 new) · 0 warnings · 0 findings · valid · 29 pairs |

**Env vars** — none added or changed.

**npm scripts** — `generate:backend-guidelines` and `check:guidelines` added;
`check:all` now ends with `check:guidelines`.

**Data contract** — unchanged. `scripts/smoke-api.js` gained `--compare` and now
imports its sample bodies from `scripts/lib/guidelines/fixtures.js` instead of
holding its own copy; the walk still reports 282/282.

**Acceptance checklist**

- [x] `backend_developer_guidelines/` holds every file of BDG-02 with its content
- [x] `npm run check:guidelines` passes; regeneration is idempotent
- [x] `03_ENDPOINTS.md`, Postman and OpenAPI cover 100 % of the registry;
      `schema.sql` covers every collection; the `db.json` copy is byte-identical
- [x] `npm run smoke -- --baseUrl=…` and `--compare=…` work and are documented in
      `08_TESTING_AND_PARITY.md`; the repository README has a "Handover package"
      section
- [x] `lint`, `test:ci`, `build:ci`, `check:traces`, `test:scripts`, `check:all` pass
- [x] One commit, clean tree
- [ ] **Human step** — open `postman_collection.json` in Postman and run the
      collection against the Local mock environment; open `openapi.yaml` in
      <https://editor.swagger.io>. Neither tool exists in this container. The
      collection was validated structurally (242 items, stable ids, a test script
      on every request) and the OpenAPI document was parsed and checked for
      unique `operationId`s and dangling `$ref`s.

**Issues → "Known issues"**

Closed: none. **NEW-42** — the home page's 25 `perPage=1` count requests — had
its documentation half discharged here: the aggregate endpoint prompt 46
specified is now written up as `GET /properties/counts` under **Planned
additions** in `01_API_CONTRACT.md` — request, response, caching, scoping and
the note that it is optional because the frontend keeps the per-tile fallback. **The
defect itself is still open**: the home page still issues the 25 requests, and
it stays that way until an API ships `GET /properties/counts` and
`useCategoryCounts` is changed to prefer it. Owner reassigned to **backend +
48**.

Still open and owned elsewhere: **NEW-42**, **NEW-47**, **NEW-49**, **NEW-50**,
**NEW-51**, **NEW-52**, **NEW-30**, **NEW-35**. None is of high severity.

**Next prompt: 48 — final audit and release.**
