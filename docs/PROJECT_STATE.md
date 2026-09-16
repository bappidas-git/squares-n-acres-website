# Project state — Squares N Acres website

Status: IN PROGRESS
Last prompt executed: 10 — Full Bangalore seed data and seed guide Next prompt: 11

## Executed prompts

| #   | Title                                                         | Commit                                                                             | Date       |
| --- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------- |
| 01  | Repository audit, tooling baseline and project state files    | `c1cc2f7`                                                                          | 2026-09-15 |
| 02  | Rebrand identity, environment files, brand assets and README  | `376203f`                                                                          | 2026-09-15 |
| 03  | Purge HOM traces and dead code; strict trace check            | `f82d069`                                                                          | 2026-09-15 |
| 04  | Design system: tokens, MUI theme, UI kit and layout restyle   | `373e092`                                                                          | 2026-09-15 |
| 05  | API contract, enums, endpoint registry and schema descriptors | `1812eae`                                                                          | 2026-09-15 |
| 06  | Mock server core, runtime db, envelope and starter seed       | `1a2ce23`                                                                          | 2026-09-15 |
| 07  | Auth tokens, RBAC middleware, users CRUD and profile          | `2383116`                                                                          | 2026-09-15 |
| 08  | Property search and lead pipeline on the mock                 | `71e0727`                                                                          | 2026-09-15 |
| 09  | Mock content, master data, SEO, sitemaps and smoke tests      | `92df3cb`                                                                          | 2026-09-16 |
| 10  | Full Bangalore seed data and seed guide                       | HEAD of this branch (a commit cannot contain its own hash — prompt 11 fills it in) | 2026-09-16 |

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

| Script                  | Command                                                                                         | Added by                     |
| ----------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------- |
| `start`                 | `react-scripts start`                                                                           | boilerplate                  |
| `dev`                   | `concurrently -n mock,web -c blue,green "npm run mock" "npm start"`                             | boilerplate (replaced in 06) |
| `mock`                  | `node mock-server/server.js`                                                                    | 06                           |
| `mock:reset`            | `node mock-server/reset.js`                                                                     | 06                           |
| `build`                 | `react-scripts build`                                                                           | boilerplate                  |
| `test`                  | `react-scripts test`                                                                            | boilerplate                  |
| `eject`                 | `react-scripts eject`                                                                           | boilerplate                  |
| `lint`                  | `eslint … --max-warnings=0 && node scripts/check-endpoints.js`                                  | 01 (extended in 05, 06)      |
| `lint:fix`              | `eslint "src/**/*.{js,jsx}" "mock-server/**/*.js" "scripts/**/*.js" --fix`                      | 01 (extended in 06)          |
| `format`                | `prettier --write "src/**" "mock-server/**/*.js" "scripts/**" "docs/**/*.md"`                   | 01 (extended in 06)          |
| `format:check`          | `prettier --check "src/**" "mock-server/**/*.js" "scripts/**/*.js"`                             | 01 (extended in 06)          |
| `test:ci`               | `cross-env CI=true react-scripts test --watchAll=false --passWithNoTests`                       | 01                           |
| `test:mock`             | `cd mock-server && node --test`                                                                 | 07                           |
| `build:ci`              | `cross-env CI=true react-scripts build`                                                         | 01                           |
| `check:traces`          | `node scripts/check-traces.js`                                                                  | 01                           |
| `check:traces:report`   | `node scripts/check-traces.js --report`                                                         | 01                           |
| `generate:brand-assets` | `node scripts/fetch-brand-assets.js`                                                            | 02                           |
| `check:contrast`        | `node scripts/contrast-check.js`                                                                | 04                           |
| `check:endpoints`       | `node scripts/check-endpoints.js`                                                               | 05                           |
| `validate:seed`         | `node scripts/validate-seed.js`                                                                 | 06                           |
| `seed:build`            | `node scripts/seed/build-seed.js`                                                               | 10                           |
| `smoke`                 | `node scripts/smoke-api.js` (needs a running mock; deliberately outside `check:all`)            | 09                           |
| `check:all`             | `… lint && test:ci && test:mock && build:ci && check:traces && validate:seed && check:contrast` | 01 (extended in 04, 06, 07)  |

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
| `CHROME_PATH`                        | no       | —                           | 02       | prerender script (prompt 41)                                 |
| `MOCK_PORT`                          | no       | `4000`                      | 02       | `mock-server/config.js` — the port `npm run mock` listens on |
| `MOCK_DELAY_MS`                      | no       | `0`                         | 02       | `mock-server/config.js` — latency on every response          |
| `MOCK_TOKEN_TTL_HOURS`               | no       | `24`                        | 02       | `mock-server/config.js` — token lifetime (used by prompt 07) |
| `MOCK_FRESH`                         | no       | `0`                         | 02       | `mock-server/config.js` — `1` re-seeds the runtime db        |

`.gitignore` (prompt 01) already ignored `.env` and `.env.production`; those rules now
protect real files instead of being a no-op.

### Endpoints

**235 endpoints are now declared** in `src/services/endpoints.js` — the complete catalogue
of `00_MASTER_CONTEXT.md` §5.14 (44 public, 5 auth, 186 admin) in 52 groups, documented in
`docs/API_CONTRACT.md`. None of them is served yet (prompts 06–09 build the mock) and none
is called yet (prompt 11 rewrites the services): this prompt freezes the contract, it does
not wire it.

`src/services/endpoints.test.js` hardcodes every path of §5.14 and fails when one
disappears from the registry; `scripts/check-endpoints.js` (now part of `npm run lint`)
fails when a path literal appears anywhere else under `src/`.

**Served by the mock:** all 235 registry endpoints, plus `GET /api/health` and four
operational paths the registry does not declare (`GET /redirects/resolve`,
`POST /admin/redirects/import`, `GET /admin/redirects/export`,
`GET /admin/seo/llms-preview`). Prompt 06 built the core and generic CRUD for all 28
collections; 07 added `/auth/*` and `/admin/users`; 08 the property and lead routes; 09 the
rest — articles, pages, the fourteen master-data collections, media, settings, SEO settings
and overview, the dashboard, the newsletter, careers, redirects, and the sitemap family
(`sitemap.xml` + five children, `robots.txt`, `rss.xml`, `llms.txt`) at both `/api/...` and
the root (D21).

Every `/api/admin/*` path — hand-written or generic — answers 401 without a bearer token and
403 outside the §7 matrix. `npm run smoke` walks `allEndpoints()` against a running server
and asserts the status, the envelope and two dozen behaviours: **269/269 checks pass, 0
failures** (2026-09-16, against the committed seed).

The generic JSON Server router is now a fallback for two things only, neither of them in the
contract: the camelCase spellings of the kebab-case paths (`/api/propertyTypes`) and a
detail read by id where the contract gives only a slug lookup (`/api/localities/1`).
`GENERIC_COLLECTIONS` in `mock-server/middleware/publicScope.js` names them.

The boilerplate's own endpoint surface stays inventoried in
`docs/archive/CODEBASE_INVENTORY.md` §d until prompt 11 replaces it.

## Pending rewrites (temporary adapters that must be removed; owner prompt)

| Item                                           | Why it is temporary                                                                                                                                                                                                                                                             | Owner prompt |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `test:ci --passWithNoTests`                    | Needed only while `src/` contains no test file; drop the flag once real tests exist.                                                                                                                                                                                            | 35           |
| Header / MobileHeader / BottomNav nav arrays   | The three components still declare the same `navItems` / `sideMenuItems` literals. Prompt 04 restyled and unified their breakpoints but left the data alone, as its §9 requires ("nav data still hardcoded until prompt 27"). Prompt 27 moves it to `src/config/navigation.js`. | 27           |
| `scripts/check-endpoints.allow.json`           | Holds `src/services/api.js` and `src/services/seoService.js`, the two files that still call the HOM endpoints with literal paths and snake_case params. Prompt 11 rewrites both onto the registry and empties the file to `[]`.                                                 | 11           |
| 501 on the sitemap / robots / RSS / llms paths | The routes are mounted and mirrored at the root (D21) but answer `501` until prompt 09 generates the documents from `seoSettings` and the seed.                                                                                                                                 | 09           |

## Known issues (open) — id, description, found by, owner prompt

### Tagged defects of `00_MASTER_CONTEXT.md` §11

| Id                        | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Found by                  | Owner prompt                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | --------------------------- |
| BUG-01                    | Every write uses `PUT` with partial payloads (11 call sites across property/lead/article/FAQ/neighborhood/partner/user toggles)                                                                                                                                                                                                                                                                                                                                                                                                                                        | master spec, confirmed 01 | 11, 14–22, 29, 33, 40       |
| BUG-02 (contract defined) | List params (`is_active`, `featured`, `property_type`, `per_page`, `search`, `type`, `status`, `area`) match neither `db.json` camelCase nor JSON Server syntax. **Prompt 05 froze the camelCase parameter set**: every accepted parameter of every endpoint is declared in `src/services/endpoints.js` and documented in `docs/API_CONTRACT.md` §5.6/§5.7. **Prompt 08 implemented them on the mock**: every §5.7 filter, the six sort options, the facets and `perPage=all` answer to the camelCase names. `api.js` starts sending them in 11, the listing UI in 26. | master spec, confirmed 01 | 08, 11, 26 (contract: 05 ✔) |
| BUG-04 (contract defined) | camelCase/snake_case drift (`transformPropertyPayload`, `normalizePropertyResponse`, `seoService` mappers, nested shapes differ between form, db and sections). **Prompt 05 froze the single camelCase shape** in `docs/DATA_MODEL.md`, `src/services/schemas/` and `mock-server/schemas/models.js`, and `scripts/check-endpoints.js` fails on a snake_case path in the registry. The transformation layer still exists; prompt 11 deletes it and 18–21 rebuild the property form on the frozen shape.                                                                 | master spec, confirmed 01 | 11, 18–21 (contract: 05 ✔)  |
| BUG-05                    | PropertyDetails renders sections with defaults/placeholders (`DEFAULT_BANKS`, `'—'`, `Document`, "Map view available on live version")                                                                                                                                                                                                                                                                                                                                                                                                                                 | master spec, confirmed 01 | 23–25                       |
| BUG-06                    | `StickyNav` ignores toggles; `visibleSections` logic duplicated; "Construction" targets `construction-specs`                                                                                                                                                                                                                                                                                                                                                                                                                                                           | master spec, confirmed 01 | 23                          |
| BUG-07 (server side done) | `SimilarProperties` ignores `similarPropertyIds` and fetches by type. **Prompt 08 built the endpoint**: `GET /properties/:id/similar` answers with the editor's picks first (skipping inactive ones) and fills to six by listing type and locality or property type; the component moves onto it in 25                                                                                                                                                                                                                                                                 | master spec, confirmed 01 | 08, 25                      |
| BUG-08                    | `brochureUrl`, `floorPlanPdfUrl`, `documents[].url` never delivered after lead capture                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | master spec, confirmed 01 | 25, 28                      |
| BUG-09 (contract defined) | Lead sources inconsistent (21 values in `src/` vs `adminConstants` vs `AdminLayout.formatSource`). **Prompt 05 froze `LEAD_SOURCES` (29 values) and `LEGACY_LEAD_SOURCE_MAP` (24 old values)** in `src/config/enums.js`, tested in `enums.test.js`. The forms still send the old values; **Prompt 08 applies `LEGACY_LEAD_SOURCE_MAP` on `POST /leads`**, so an old bundle's `property_enquiry` is stored as `property-enquiry` and an unknown value is a 422. The seed converts its own rows in 10, the forms move in 28 and the CRM labels in 29.                    | master spec, confirmed 01 | 10, 28, 29 (contract: 05 ✔) |
| BUG-10                    | `NotFound` → `?search=` vs listing `?q=`; `QuickActions` → `type=lease` unsupported; `?area=` only a hidden client-side filter                                                                                                                                                                                                                                                                                                                                                                                                                                         | master spec, confirmed 01 | 26, 27, 43                  |
| BUG-11                    | Hardcoded content on About, Contact, FAQs, HomeLoan, LegalAssistance, InteriorDesigning, Careers, Partnership, SellLet, FlexibleWorkspace, DirectLeaseRetails, RealEstateAwareness, WhyChoose, HowItWorks, Dashboard trends, footer defaults, `SeoGuidelines` **Data side prepared in 10:** every one of those pages is now a seeded CMS record with its blocks, so prompts 27–31 render data rather than JSX.                                                                                                                                                         | master spec, confirmed 01 | 27, 29, 30, 31, 37, 40      |
| BUG-14 (server side done) | Token expiry never enforced; login writes both storages; logout incomplete; 401 redirect for public calls. **Prompt 07 closed the server half**: a token carries `expiresAt` from `MOCK_TOKEN_TTL_HOURS`, an expired or revoked one answers 401 and is deleted, logout revokes, a password change revokes the user's other tokens and a deactivated account loses its sessions. The client half — one storage, the expiry timer, the auto-logout toast and no 401 redirect on public calls — is prompts 11 and 12.                                                     | master spec, confirmed 01 | 11, 12                      |
| BUG-15 (frontend)         | Careers résumé upload dead; no spam protection; newsletter no dedupe and a false reCAPTCHA notice. **Closed on the server in 09:** `POST /jobs/:id/apply`, `POST /newsletter/subscribe` and `POST /leads` are throttled to ten a minute per IP and honour the `website` honeypot, a known address answers "Already subscribed" and an unsubscribed one is revived, and a résumé travels as a URL (D12). The forms themselves arrive with 28 and 31.                                                                                                                    | master spec, confirmed 01 | 28, 31                      |
| BUG-16 (residual)         | Filter logic duplicated between `PropertyListing` and `PropertyFilters`. All the dead code named in the row is gone (01: unused variables; 03: `adminService`, `visitService`, `PropertyDetail.js`, `AnimatedSection.jsx`, the unreachable enquiry modal, five dead CSS class blocks, two dead props, `stats.missing`).                                                                                                                                                                                                                                                | master spec, confirmed 01 | 26                          |
| BUG-18 (frontend)         | `getFeatured` tag hack; ad-hoc trending/related; FAQ page/section fetch-all-and-filter. **Closed on the server:** `/properties/featured` and `/properties/:id/similar` (08), `/articles/trending` and the `category`/`showOnHome`/`propertyTypeId` FAQ filters (09). The components that still fetch-all-and-filter arrive with 27 and 34.                                                                                                                                                                                                                             | master spec, confirmed 01 | 27, 34                      |
| BUG-19                    | Listing paginates client-side after fetching everything                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | master spec, confirmed 01 | 26                          |
| BUG-20 (partial)          | Nav **data** is still hardcoded and duplicated between `Header` and `MobileHeader`. The inconsistency prompt 04 owned is gone: both render on the same 900 px switch, with the same tokens, radii and shadows, and the footer is a light surface. Prompt 27 moves the arrays to `src/config/navigation.js`.                                                                                                                                                                                                                                                            | master spec, confirmed 01 | 27, 43                      |
| BUG-21                    | Additional defects recorded here by the audit prompt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 01                        | 01 → all                    |

### Additional defects of `00_MASTER_CONTEXT.md` §11

| Id               | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Found by                  | Owner prompt                                                                                                                                                                                                                                                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ADD-01           | `.env` committed with the Cloudways URL; no `.env.example`; README links a non-existent `API_DOCUMENTATION.md`; README says Node 16+                                                                                                                                                                                                                                                                                                                                                                                                                                       | master spec, confirmed 01 | 02                                                                                                                                                                                                                                                                                                                                                           |
| ADD-02           | `dev` script equals `start` (no json-server anywhere); `devDependencies` empty; no ESLint/Prettier config beyond CRA                                                                                                                                                                                                                                                                                                                                                                                                                                                       | master spec               | 01 (tooling half **closed**), 06 (`dev`/`mock`)                                                                                                                                                                                                                                                                                                              |
| ADD-03           | `public/index.html` references a non-existent `favicon.ico`; `robots.txt` allows everything with no sitemap; no `manifest.json`                                                                                                                                                                                                                                                                                                                                                                                                                                            | master spec, confirmed 01 | 02                                                                                                                                                                                                                                                                                                                                                           |
| ADD-04           | `@mui/icons-material` and `web-vitals` are unused dependencies (0 imports each)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | master spec, confirmed 01 | 03, 41                                                                                                                                                                                                                                                                                                                                                       |
| ADD-06 (partial) | **Closed in 04:** the three scroll-hide copies (now `useScrollDirection`; `useThrottledScroll` stays for `BackToTop`), the 13 local `Section` components (now `ui/Section`), and `tagColors` vs `TAG_OPTIONS` (`PropertyCard` reads `TAG_OPTIONS` tones). **Still open:** the five `formatPrice` and three `formatDate` copies still exist at their call sites — `src/utils/format.js` is the single implementation but the call sites move to it with the data hooks; `GooglePreview` ×2, `getTitleLenColor` ×2 and `leadStatusConfig` in `Dashboard`; nav data (BUG-20). | master spec, confirmed 01 | 11, 27, 36                                                                                                                                                                                                                                                                                                                                                   |
| ADD-07 (pollers) | Two 30-second pollers on `GET /admin/leads` (`AdminLayout` and `AdminLeads`). The toast half of this row is closed in 04. `LeadNotificationsContext` (D45/D55) makes it one poller.                                                                                                                                                                                                                                                                                                                                                                                        | master spec, confirmed 01 | 12, 29                                                                                                                                                                                                                                                                                                                                                       |
| ADD-08           | Two `GET /settings` calls per public page (Footer + NewsletterSection); Articles fires `/articles/trending` twice                                                                                                                                                                                                                                                                                                                                                                                                                                                          | master spec, confirmed 01 | 11, 27, 34                                                                                                                                                                                                                                                                                                                                                   |
| ADD-09           | `LeadForm` ignores `required:false`, has no `<label>`s, no `onSuccess`, posts unsanitised values; `NewsletterSection` validation is `includes('@')`, fails silently, shows a false reCAPTCHA notice                                                                                                                                                                                                                                                                                                                                                                        | master spec, confirmed 01 | 28                                                                                                                                                                                                                                                                                                                                                           |
| ADD-10           | `PropertyCard`: price unit printed twice, `liked` not persisted, `imageLoaded` never reset, timer leak, imports `TAG_OPTIONS` from `pages/admin`, autoplaying videos in grids                                                                                                                                                                                                                                                                                                                                                                                              | master spec, confirmed 01 | 26                                                                                                                                                                                                                                                                                                                                                           |
| ADD-11           | `PropertyFilters`: `clearFilters` wipes every query param, `50000000-Infinity` in URLs, the 4th location silently ignored, only apartment/villa types, desktop applies live but mobile needs Apply                                                                                                                                                                                                                                                                                                                                                                         | master spec, confirmed 01 | 26                                                                                                                                                                                                                                                                                                                                                           |
| ADD-12           | `PropertyDetails`: 30 `useState`s (spec said 24), four copy-pasted modal state machines, `handleOpenLeadForm` dead → **the enquiry modal is unreachable**, `EnquiryForm` mounted three times, `dimensionRange` chip always renders, modals without `role="dialog"`/focus trap, `og:site_name` hardcoded to the boilerplate brand                                                                                                                                                                                                                                           | master spec, confirmed 01 | 23–25, 28                                                                                                                                                                                                                                                                                                                                                    |
| ADD-13           | `FinanceGuide` (1 808 lines): typo "Home Finance Clearity", hardcoded "8.35 % / 48 Hrs / Up to 90 % / 0.5 % + GST", six real bank brands, score ignores 6 collected fields, success shown even when the POST fails, `document.body.style.overflow` mutation                                                                                                                                                                                                                                                                                                                | master spec, confirmed 01 | 25                                                                                                                                                                                                                                                                                                                                                           |
| ADD-14           | `ConstructionStatus` progress → `Infinity%`/`NaN%` with one milestone; `BuilderOverview` self-nullifies for description-only developers; `PropertySpecs` legacy-object branch unreachable and `specificationsArray` prop dead                                                                                                                                                                                                                                                                                                                                              | master spec, confirmed 01 | 24                                                                                                                                                                                                                                                                                                                                                           |
| ADD-15           | `HeroSection`: `role="combobox"` without `aria-controls` (**closed in 01**), "View all results" shown with zero suggestions, video/input refs unused; `QuickActions` links `type=lease`                                                                                                                                                                                                                                                                                                                                                                                    | master spec, confirmed 01 | 27                                                                                                                                                                                                                                                                                                                                                           |
| ADD-16           | `ArticleDetail` Markdown renderer: duplicate tables on every `\|` line, ordered lists rendered as `<ul>`, only `**bold**` inline, breadcrumb "Insights" and "Articles" to the same URL; `Articles` state not URL-synced                                                                                                                                                                                                                                                                                                                                                    | master spec, confirmed 01 | 32, 34                                                                                                                                                                                                                                                                                                                                                       |
| ADD-17           | `Contact`: five `#` social links opening new tabs, generic Brigade Road map with a fabricated `!4v1700000000000`, US-format phone in FAQs `(555) 123-4567`                                                                                                                                                                                                                                                                                                                                                                                                                 | master spec, confirmed 01 | 30, 31                                                                                                                                                                                                                                                                                                                                                       |
| ADD-18           | `Careers`: résumé file input has no `name`/`onChange`, form never reset, modal without dialog semantics; `InteriorDesigning` room cards and "Get Started" buttons do nothing; `LegalAssistance`/`RealEstateAwareness` encode conflicting Karnataka stamp-duty figures                                                                                                                                                                                                                                                                                                      | master spec, confirmed 01 | 30, 31                                                                                                                                                                                                                                                                                                                                                       |
| ADD-19           | `AdminLogin`: "Remember me" is a no-op, seed passwords in a commented block; `AdminSettings`: `PUT` drops `footerLinks`, tab panels out of order, "Footer Tagline" edits the General `tagline`, hardcoded `role === 'admin'`; `UserManagement`: last-admin guard hole, plaintext passwords echoed, own `ROLES` list                                                                                                                                                                                                                                                        | master spec, confirmed 01 | 12, 40                                                                                                                                                                                                                                                                                                                                                       |
| ADD-20           | `AdminSeo`: the old domain in previews, "Auto-Generate" writes HOM titles/canonicals/schema, `stats.missing` dead, saving wipes empty fields, no confirmation before bulk overwrite; `ArticleForm`: the boilerplate brand as the default article author, `readTime` not editable, `isTrending/trendingOrder` dropped on PUT, `setTimeout(navigate)` not cleared                                                                                                                                                                                                            | master spec, confirmed 01 | 33, 36, 37                                                                                                                                                                                                                                                                                                                                                   |
| ADD-21           | `AdminProperties` fetches the public `/properties`, toggle omits the `is_active` fallback, `Promise.all` bulk aborts on first failure, per-page select-all; `AdminLeads`/`Dashboard` `p.id === propertyId` string-vs-number → Property column always empty; `Dashboard` "Leads by source" from 10 leads; `FaqManager` reorder wrong under a category filter with two sequential PUTs per swap; `LeadDetail` simulated timeline, `isMobile` unused (**closed in 01**)                                                                                                       | master spec, confirmed 01 | 17, 22, 29                                                                                                                                                                                                                                                                                                                                                   |
| ADD-22           | Property tabs: `DetailsTab` drag issues N state updates per drag-over; `SectionVisibilityTab` toggle asymmetric for `undefined`; `GalleryTab` seeds placeholder-image covers; `NearbyPlacesTab` default type `school` unknown to the public map; index keys everywhere; `SeoTagsTab` old-domain placeholder                                                                                                                                                                                                                                                                | master spec, confirmed 01 | 18–21                                                                                                                                                                                                                                                                                                                                                        |
| ADD-23           | `IconPicker`: 17 invalid MDI ids (all verified present), tiles not keyboard-operable, search ignores the category                                                                                                                                                                                                                                                                                                                                                                                                                                                          | master spec, confirmed 01 | 13                                                                                                                                                                                                                                                                                                                                                           |
| ADD-27           | `seoScoring.js`/`seoGenerator.js`: HOM site name/URL constants, generic CTA-word scoring, schema string stored in the record                                                                                                                                                                                                                                                                                                                                                                                                                                               | master spec, confirmed 01 | 36                                                                                                                                                                                                                                                                                                                                                           |
| ADD-28 (partial) | **Closed in 04** (§9 asked for these three): the active parent group collapses again (`??` instead of `                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |                           | `, so an explicit collapse wins over the active state), the mobile drawer renders the brand once, and `PAGE_TITLES`covers every registered admin route including`/admin/partners`, with regex patterns for the three parameterised ones. **Still open:** the new-lead toast still navigates on click (now a `useToast`call), and`.notificationDot` dead CSS. | master spec, confirmed 01 | 12  |

### New defects found by this audit

| Id     | Description                                                                                                                                                                                                                                                                                                                                                                                                       | Found by | Owner prompt               |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------- |
| NEW-01 | `config/rbac.js` has no `/admin/settings/users` entry and no per-area permission matrix; `AdminSettings` uses `role === 'admin'` and `UserManagement` its own `ROLES` array                                                                                                                                                                                                                                       | 01       | 12                         |
| NEW-02 | `routes/index.js` limits `/admin/seo` and `/admin/settings` to `admin` only; §7 of the master context gives both to `admin` **and** `manager`                                                                                                                                                                                                                                                                     | 01       | 12                         |
| NEW-03 | Navigation/role data lives in three places: `rbac.NAV_ITEMS`, `AdminLayout.pageTitles` and the `<Route>` declarations                                                                                                                                                                                                                                                                                             | 01       | 12                         |
| NEW-04 | `slick-carousel` is a dependency but its CSS is never imported, so the `SimilarProperties` slider renders unstyled                                                                                                                                                                                                                                                                                                | 01       | 03, 25                     |
| NEW-05 | `?area=` is a hidden client-side substring filter: no chip, no way to remove it in the UI, wiped by "Clear filters"                                                                                                                                                                                                                                                                                               | 01       | 26                         |
| NEW-06 | `PropertyFilters.clearFilters()` replaces the query string with an empty one, dropping `q`, `sort` and `page` too                                                                                                                                                                                                                                                                                                 | 01       | 26                         |
| NEW-07 | `Articles.js` fires `GET /articles/trending` twice (its effect depends on `articles`)                                                                                                                                                                                                                                                                                                                             | 01       | 34                         |
| NEW-08 | `GalleryTab` carried the repository's only `eslint-disable` comment                                                                                                                                                                                                                                                                                                                                               | 01       | **closed in 01**           |
| NEW-09 | `SectionVisibilityTab` reads `!== false` but writes `!value`, so the first toggle of an `undefined` key is a no-op on screen                                                                                                                                                                                                                                                                                      | 01       | 21                         |
| NEW-10 | `AdminSettings` renders `TabPanel index={4}` after `index={5}`, so the JSX order no longer matches the `<Tab>` order                                                                                                                                                                                                                                                                                              | 01       | 40                         |
| NEW-11 | `AdminSettings.mergeWithDefaults` omits `footerLinks`, so every save drops that `db.json` key                                                                                                                                                                                                                                                                                                                     | 01       | 40                         |
| NEW-12 | `AdminAuthContext` restores a session without checking `tokenExpiry`, and `logout()` clears `user` before awaiting `authService.logout()`                                                                                                                                                                                                                                                                         | 01       | 12                         |
| NEW-13 | The 401 handler does a full `window.location.href` reload from any page, including public ones                                                                                                                                                                                                                                                                                                                    | 01       | 11                         |
| NEW-14 | `authService.login` invents a 24-hour `tokenExpiry` client-side when the API omits one                                                                                                                                                                                                                                                                                                                            | 01       | 11, 12                     |
| NEW-15 | `useThrottledScroll` has a single consumer (`BackToTop`); Header, MobileHeader, BottomNav and StickyNav each re-implement scroll handling                                                                                                                                                                                                                                                                         | 01       | 04                         |
| NEW-16 | `PropertyCard` imports `TAG_OPTIONS` from `pages/admin/property-tabs/constants`, so the public bundle depends on admin code                                                                                                                                                                                                                                                                                       | 01       | 04, 26                     |
| NEW-17 | `global.css` loads Google Fonts through a render-blocking CSS `@import` instead of a `<link>` in `index.html`                                                                                                                                                                                                                                                                                                     | 01       | 02, 04                     |
| NEW-18 | `public/robots.txt` is the CRA default with no `Sitemap:`; `index.html` has no manifest, no OG tags, and a `theme-color` in the boilerplate navy                                                                                                                                                                                                                                                                  | 01       | 02                         |
| NEW-20 | No test file exists anywhere (119 files checked, 0 matches), so `test:ci` needs `--passWithNoTests` until the first tests land                                                                                                                                                                                                                                                                                    | 01       | partially closed in 01; 35 |
| NEW-22 | `AdminLeads` CSV export is built in the browser: no UTF-8 BOM, the Property column uses the broken id lookup, newlines inside `message` break rows                                                                                                                                                                                                                                                                | 01       | 29                         |
| NEW-23 | `FaqManager` reorder writes two sequential `PUT`s and computes `swapIndex` against the filtered array                                                                                                                                                                                                                                                                                                             | 01       | 17                         |
| NEW-24 | `Dashboard` falls back to fetching the entire `properties`, `leads` and `articles` collections and recomputing every KPI in the browser                                                                                                                                                                                                                                                                           | 01       | 29                         |
| NEW-26 | `/properties` renders the `ErrorBoundary` fallback against the new data shape: `PropertyCard` calls `property.configuration.join()`, and `configuration` is an object in §6.1, not an array of `"3 BHK"` strings (`pageerror: _property$configurati.join is not a function`). Expected until prompt 11 rewrites the services and cards; the app recovers rather than white-screening.                             |
| NEW-27 | The un-migrated frontend still calls four endpoints that no longer exist: `GET /settings` (6× on the home page — it is `/settings` in the registry but the old service sends no `Accept` scoping and the response shape differs), `/neighborhoods/active`, `/partners/active` and `/articles/trending`. All four answer 404 with the error envelope. Prompt 11 moves every call onto `src/services/endpoints.js`. |

## Known issues (closed)

| Id                 | Description                                                                                                      | Closed by                                                                                                                                                                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BUG-03             | 15 endpoints called by the frontend do not exist on a plain JSON Server                                          | 09 — every endpoint of §5.14 is served by a hand-written router; `npm run smoke` walks the whole registry (269/269). `/neighborhoods/active`, `/partners/active` and `/visits` are boilerplate paths the contract replaces, not endpoints to build (11). |
| NEW-08             | `eslint-disable-line react-hooks/exhaustive-deps` in `GalleryTab.jsx`                                            | 01 — effect restructured with a loop-safe equality guard                                                                                                                                                                                                 |
| ADD-15 (partial)   | `role="combobox"` without `aria-controls` in `HeroSection`                                                       | 01 — `aria-controls="hero-search-suggestions"` added                                                                                                                                                                                                     |
| ADD-21 (partial)   | `LeadDetail` computed `isMobile` and never used it                                                               | 01 — removed with its `useTheme`/`useMediaQuery` imports                                                                                                                                                                                                 |
| ADD-02 (partial)   | No ESLint/Prettier config beyond CRA, empty `devDependencies`                                                    | 01 — Prettier + `eslint-config-prettier` + project rule set + cross-platform scripts                                                                                                                                                                     |
| NEW-21             | No favicon, PWA icon or OG image; `logo.png` the only brand asset                                                | 02 — 10 brand PNGs in `public/brand/`, favicons + `manifest.json`, HOM `logo.png` deleted                                                                                                                                                                |
| BUG-17 (partial)   | README/`.env` described HOM + Cloudways; no favicon or manifest                                                  | 02 — README rewritten, `.env` removed from git, favicons and `manifest.json` added                                                                                                                                                                       |
| BUG-17             | "Sign In" (`/admin/login`) in the public drawer menus                                                            | 03 — both `sideMenuItems` entries removed; the route still works by URL (D24)                                                                                                                                                                            |
| BUG-16 (dead code) | `adminService`, `visitService`, `PropertyDetail.js`, `AnimatedSection.jsx`, the unreachable enquiry modal        | 03 — deleted, together with five dead CSS class blocks, two dead props and `stats.missing`                                                                                                                                                               |
| NEW-25             | 16 public pages set a boilerplate brand title through React Helmet                                               | 03 — every Helmet `<title>` and meta description now interpolates `SITE.name`                                                                                                                                                                            |
| BUG-12             | ~1 500 colour and font literals outside the token files                                                          | 04 — 0 hex literals outside `global.css`/`theme.js`; `check:traces` gates it with an empty allow-list                                                                                                                                                    |
| ADD-05             | No header rendered between 900 px and 960 px; five competing breakpoint sets                                     | 04 — one 900 px switch in JS (`useBreakpoint`) and CSS (`899.98`/`900`); verified at 899–960 px                                                                                                                                                          |
| ADD-07 (toasts)    | Three toast systems (`ToastProvider`, AdminLayout and UserManagement Snackbars)                                  | 04 — one `ToastProvider`/`useToast`; 13 local Snackbars removed, `grep -rn "Snackbar" src` is empty (the two pollers stay, owner 12/29)                                                                                                                  |
| ADD-24             | `PropertyCardSkeleton` showed two buttons the card has not; no `aria-busy`; `PageLoader` in the HOM serif        | 04 — skeleton mirrors the card's detail grid with `aria-busy`; `PageLoader` is the monogram + "Loading…" with `role="status"`                                                                                                                            |
| ADD-25             | `ScrollToTop` threw on non-selector hashes and used `behavior: 'instant'`                                        | 04 — `getElementById` on the decoded fragment, `behavior` honours `prefers-reduced-motion`                                                                                                                                                               |
| BUG-13             | Mixed id types (`"b998"`, `"8a37"`, string ids vs numeric `propertyId`), missing timestamps, plaintext HOM users | 06 — `db.json` rewritten with integer ids and ISO `createdAt`/`updatedAt` on every record; the mock assigns `max(id)+1` and the timestamps (D14), `validate:seed` enforces both, and the three seeded accounts are the documented SNA placeholders (D80) |
| NEW-19             | `db.json` `partners` and property `developer` values were real company names and URLs                            | 06 — `db.json` rewritten: the three seed developers, the three banks and the three partners are fictional placeholder records (§14), and every project name with them                                                                                    |

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

| File                                 | What it holds                                                                                                                                         |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/API_CONTRACT.md`               | §5.1–§5.13 verbatim (with the full 422 example), the 235-endpoint catalogue rendered from the registry, and every response shape                      |
| `docs/DATA_MODEL.md`                 | §6.1–§6.14 verbatim, the HOM → SNA mapping table (§6.15), the singleton note and the reserved seed id ranges                                          |
| `docs/RBAC.md`                       | §7 verbatim, the matrix and route map as `rbac.js` encodes them, the navigation per role, and the four enforcement layers                             |
| `src/config/enums.js`                | `makeEnum()` + 46 enums, `LEGACY_LEAD_SOURCE_MAP`, `PRICE_BUCKETS_SALE/RENT`, `SECTION_VISIBILITY_KEYS`, `BLOCK_TYPES`                                |
| `src/config/enums.test.js`           | 241 assertions: unique values, labels, tones, icons, `bandOf`, `toSqft`, `verbOf`, the legacy map, the price buckets                                  |
| `src/services/endpoints.js`          | the registry: 235 entries in 52 groups, `allEndpoints()`, `findEndpoint()`                                                                            |
| `src/services/endpoints.test.js`     | 251 assertions incl. the hardcoded §5.14 path list in both directions                                                                                 |
| `src/services/schemas/*.js`          | 74 request-body descriptors (`index`, `property`, `lead`, `article`, `page`, `masterData`, `settings`, `auth`, `seo`, `newsletter`, `jobApplication`) |
| `mock-server/schemas/models.js`      | 28 collection descriptors, every field of §6 with defaults                                                                                            |
| `mock-server/schemas/README.md`      | the field mini-language and how each descriptor renders as a Laravel rule                                                                             |
| `scripts/check-endpoints.js`         | three rules, now part of `npm run lint`                                                                                                               |
| `scripts/check-endpoints.allow.json` | the two files prompt 11 still has to rewrite                                                                                                          |

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

| Path                                  | What it is                                                                                |
| ------------------------------------- | ----------------------------------------------------------------------------------------- |
| `mock-server/lib/tokens.js`           | `createTokenStore({db, config})` — issue / resolve / revoke / purge over `apiTokens`      |
| `mock-server/lib/password.js`         | `verify()` and `store()` — plain comparison on the mock, one place to replace with a hash |
| `mock-server/lib/routePermissions.js` | `resolvePermission(path, method)` — an admin path and method → an area and action of §7   |
| `mock-server/middleware/auth.js`      | `requireAuth` — `Bearer` → `req.user` (no password) + `req.token`; 401 with one message   |
| `mock-server/middleware/role.js`      | `role(...roles)`, `can(area, action)` and `adminPermission()` — the matrix, 403           |
| `mock-server/routes/auth.js`          | `POST /auth/login` (throttled 10/min), `logout`, `GET                                     | PUT /auth/profile`, `PUT /auth/password` |
| `mock-server/routes/users.js`         | `/admin/users` list, create, read, replace, patch, delete and bulk, with the safety rules |
| `mock-server/__tests__/auth.test.js`  | 24 `node:test` cases over `createApp()` on a temp copy of the seed — `npm run test:mock`  |

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

| Path                                    | What it is                                                                                               |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `mock-server/lib/crud.js`               | `makeCrudRouter()` — the eight endpoints twenty resources share, written once                            |
| `mock-server/lib/usage.js`              | `findUsages()` / `findMediaUsages()` / `describeUsages()` — the delete guard of D88                      |
| `mock-server/lib/previewTokens.js`      | 24-hour in-memory draft tokens (D28)                                                                     |
| `mock-server/lib/html.js`               | `stripHtml`, `wordCount`, `readingTime`                                                                  |
| `mock-server/lib/articleFilters.js`     | Publication visibility, the `scheduled` promotion, the public filters and sorts                          |
| `mock-server/lib/dashboard.js`          | The whole §6.16 payload, with the sales scope of D15                                                     |
| `mock-server/lib/sitemapBuilder.js`     | `PUBLIC_PATHS`, the five `<urlset>` builders, the index, RSS, robots and `llms.txt`                      |
| `mock-server/routes/masterData.js`      | Fourteen collections configured on the factory: filters, embeds, counters, delete guards                 |
| `mock-server/routes/articles.js`        | The public blog, `trending`, the preview token, and the admin CRUD with the derived fields               |
| `mock-server/routes/pages.js`           | The CMS: block ids, `order` renumbering, the `<script` rejection, preview tokens                         |
| `mock-server/routes/media.js`           | The library: inferred `provider`/`type`/`format`, `usedIn`                                               |
| `mock-server/routes/settings.js`        | `GET /settings`, `GET                                                                                    | PUT /admin/settings` and the known-keys deep merge             |
| `mock-server/routes/seo.js`             | `GET /seo/settings`, `GET                                                                                | PUT /admin/seo/settings`, the overview, the `llms.txt` preview |
| `mock-server/routes/dashboard.js`       | `GET /admin/dashboard`                                                                                   |
| `mock-server/routes/newsletter.js`      | Subscribe with dedupe and honeypot, the admin list, the CSV export                                       |
| `mock-server/routes/jobs.js`            | The open-role rule, `apply`, the admin openings and the application triage                               |
| `mock-server/routes/redirects.js`       | The public list, `resolve`, the loop/chain validation, `import` and `export`                             |
| `mock-server/routes/sitemap.js`         | The nine SEO files, served at `/api/...` and mirrored at the root                                        |
| `mock-server/__tests__/content.test.js` | 36 cases — articles, previews, master data, pages, settings, SEO, dashboard, newsletter, jobs, redirects |
| `mock-server/__tests__/sitemap.test.js` | 16 cases — the index, the five children, the overrides, robots, RSS, `llms.txt`, the root mirrors        |
| `scripts/smoke-api.js`                  | Walks `allEndpoints()` against a running server and checks the behaviours behind the status codes        |

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

| Command                 | Result                                                                                                                                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run test:mock`     | **117 tests, 117 pass, 0 fail** (was 64 before this prompt)                                                                                                                                                                              |
| `npm run smoke`         | **269/269 checks pass, 0 failures** — 235 registry endpoints + 34 targeted assertions                                                                                                                                                    |
| `npm run lint`          | 0 errors, 0 warnings; `check:endpoints` 185 files scanned, 0 blocking findings                                                                                                                                                           |
| `npm run test:ci`       | 10 suites, 573 tests, all pass                                                                                                                                                                                                           |
| `npm run build:ci`      | Compiled, no warnings                                                                                                                                                                                                                    |
| `npm run check:traces`  | 360 files scanned, 0 findings                                                                                                                                                                                                            |
| `npm run validate:seed` | `db.json is valid.`                                                                                                                                                                                                                      |
| ADD-26                  | `db.json`: mixed `leads[].propertyId`, `.mp4` in a property gallery, hardcoded `neighborhoods.propertyCount`, `(555) 123-4567`, off-scope Mumbai article, lorem-ipsum "Test Article" and Guwahati "Test Property", `faqs[6]` double `??` | 10 — `db.json` is regenerated from `scripts/seed/`: lead `propertyId` is always an integer, no video sits in a gallery, `propertyCount` is computed rather than stored, the phone numbers are synthetic Indian mobiles, and there is no off-scope, lorem-ipsum or test record left. `npm run validate:seed` now enforces the §10 quality rules as well as the types. |

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
