# Prompt 02 — Rebrand identity, environment files, brand assets and README (first pass)

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §2 Brand identity and §3.5 Environment files), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompt 01 is done (check the "Executed prompts" list in `docs/PROJECT_STATE.md`); working tree is clean (`git status`); `npm install` has been run.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
`package.json` name is `hom-real-eastate-website`. `.env` is **committed** and contains `REACT_APP_API_URL=https://phplaravel-780646-6246811.cloudwaysapps.com/api`, `REACT_APP_SITE_NAME=H.O.M Advisory`, `REACT_APP_GOOGLE_MAPS_KEY=your_key_here`; `.gitignore` ignores only `.env.local`/`.env.*.local`. `src/services/api.js` line 4–6 falls back to the Cloudways URL when the env var is missing. `public/index.html` has `<html lang="en">`, title "H.O.M Advisory — Elevating Every Experience in Real Estate", `theme-color #1B2A4A`, a HOM description and a link to a non-existent `favicon.ico`; there is no `manifest.json`; `public/robots.txt` is the CRA default (allow all). `src/assets/images/logo.png` is the HOM logo imported by `src/components/layout/Header.jsx`, `MobileHeader.jsx` and `Footer.jsx` (`import logo from '../../assets/images/logo.png'`, rendered with `alt="H.O.M Advisory"`; the footer applies `filter: brightness(0) invert(1)` in `Footer.module.css` `.brandLogo`). `README.md` describes HOM, references a non-existent `API_DOCUMENTATION.md` and says Node 16+. Brand assets are on Cloudinary (URLs and derived transformations in `00_MASTER_CONTEXT.md` §2.1/§2.3; the icon is a monogram, the wordmark is stacked 540×231).

## 2. Objective
When this prompt is finished the repository identifies as Squares N Acres at the package/HTML/manifest/env level: `package.json` is renamed, `.env` is removed from git and replaced by documented `.env.example` / `.env.development` / `.env.production.example`, the Cloudways URL exists nowhere, `src/config/site.js` exposes `BRAND`/`SITE` constants, the brand assets are downloaded into `public/brand/` by a script and referenced from `index.html` + `manifest.json`, the three logo usages render the SNA wordmark from `BRAND.logoUrl` (no CSS filter), and `README.md` describes the new project in a first pass. HOM strings elsewhere in `src/` are handled by prompt 03.

## 3. Scope
### Files to create
- `.env.example`, `.env.development`, `.env.production.example`
- `src/config/site.js`
- `public/manifest.json`, `public/brand/` (downloaded PNGs), `scripts/fetch-brand-assets.js`
### Files to modify
- `package.json` (name, description, version `0.2.0`, scripts `generate:brand-assets`), `.gitignore`, `public/index.html`, `public/robots.txt`, `README.md`, `src/services/api.js` (BASE_URL only), `src/components/layout/Header.jsx`, `src/components/layout/MobileHeader.jsx`, `src/components/layout/Footer.jsx`, `src/components/layout/Footer.module.css` (`.brandLogo` filter removal only), `docs/PROJECT_STATE.md`, `docs/DECISIONS.md`
### Files to delete
- `.env` (via `git rm --cached .env` **and** delete the file; a fresh `.env` is not needed because `.env.development` is read by `npm start`), `src/assets/images/logo.png`
### May also touch
- nothing else

## 4. Detailed tasks
1. `package.json`: `"name": "squares-n-acres-website"`, `"description": "Squares N Acres — Bengaluru real-estate portal (public website + admin panel)"`, `"version": "0.2.0"`, add script `"generate:brand-assets": "node scripts/fetch-brand-assets.js"`.
2. **Environment files.** `git rm --cached .env`, delete it, add `.env` and `.env.production` to `.gitignore` (keep the CRA `.env.*.local` entries). Create:
   - `.env.example` — every variable with a comment: `REACT_APP_API_URL=http://localhost:4000/api` (required; mock default), `REACT_APP_SITE_URL=http://localhost:3000`, `REACT_APP_SITE_NAME=Squares N Acres`, `REACT_APP_CLOUDINARY_CLOUD_NAME=` (optional, enables uploads), `REACT_APP_CLOUDINARY_UPLOAD_PRESET=` (optional, unsigned preset), `REACT_APP_GOOGLE_MAPS_KEY=` (optional), `CHROME_PATH=` (optional, prerender), `MOCK_PORT=4000`, `MOCK_DELAY_MS=0`, `MOCK_TOKEN_TTL_HOURS=24`, `MOCK_FRESH=0`.
   - `.env.development` — `REACT_APP_API_URL=http://localhost:4000/api`, `REACT_APP_SITE_URL=http://localhost:3000`, `REACT_APP_SITE_NAME=Squares N Acres`.
   - `.env.production.example` — `REACT_APP_API_URL=https://api.squaresnacres.com/api`, `REACT_APP_SITE_URL=https://www.squaresnacres.com`, `REACT_APP_SITE_NAME=Squares N Acres`, the optional Cloudinary/Maps keys empty.
3. `src/services/api.js`: replace the `BASE_URL` constant with
   ```js
   const BASE_URL = process.env.REACT_APP_API_URL;
   if (!BASE_URL) {
     throw new Error('REACT_APP_API_URL is not set. Copy .env.example to .env and set it.');
   }
   ```
   (no fallback URL). Nothing else in this file changes (prompt 11 replaces it).
4. **`src/config/site.js`** (the only place that reads brand env vars):
   ```js
   export const BRAND = {
     name: 'Squares N Acres',
     shortName: 'SNA',
     logoUrl: 'https://res.cloudinary.com/dn9gyaiik/image/upload/v1789465788/sna-logo_o09ugt.png',
     iconUrl: 'https://res.cloudinary.com/dn9gyaiik/image/upload/v1789465791/sna-icon_efty7z.png',
     iconSquareUrl: 'https://res.cloudinary.com/dn9gyaiik/image/upload/c_crop,x_375,y_655,w_395,h_390/v1789465791/sna-icon_efty7z.png',
     ogImageUrl: 'https://res.cloudinary.com/dn9gyaiik/image/upload/w_1200,h_630,c_pad,b_white/v1789465788/sna-logo_o09ugt.png',
     localLogo: '/brand/logo.png', localIcon: '/brand/icon.png', localOgImage: '/brand/og-default.png',
   };
   export const SITE = {
     name: process.env.REACT_APP_SITE_NAME || BRAND.name,
     url: (process.env.REACT_APP_SITE_URL || 'https://www.squaresnacres.com').replace(/\/+$/, ''),
     defaultLocale: 'en-IN',
     placeholderDomain: 'https://www.squaresnacres.com',
   };
   ```
5. **`scripts/fetch-brand-assets.js`** (Node ≥ 18 `fetch`, no dependencies): downloads the 10 files of `00_MASTER_CONTEXT.md` §2.3 into `public/brand/` (create the folder; overwrite), validates each response is `image/png` and > 200 bytes, prints a table (file, bytes, status), and exits 0 even when some downloads fail (prints `WARN` and keeps going) so the build never depends on the network. Run it now and commit the PNGs (`public/brand/*.png` are binary per `.gitattributes`).
6. **`public/index.html`** — rewrite the `<head>`: `<html lang="en-IN">`; `<meta charset>`; viewport `width=device-width, initial-scale=1, viewport-fit=cover`; `theme-color` `#CF3F38`; `<title>Squares N Acres – Buy, Sell & Rent Properties in Bangalore</title>`; description "Squares N Acres helps you buy, sell and rent apartments, villas, plots and commercial spaces across Bengaluru. Verified listings, locality guides and expert assistance."; favicon links (`brand/favicon-32.png` sizes 32x32 type image/png, `favicon-16.png`, `favicon-48.png`), `apple-touch-icon` → `brand/apple-touch-icon.png`, `<link rel="manifest" href="%PUBLIC_URL%/manifest.json">`, `application-name` meta, Google Fonts preconnect + stylesheet exactly as in §2.5 (Inter 400/500/600, Manrope 600/700/800, `display=swap`); remove the `favicon.ico` link. Keep `<noscript>` and `<div id="root">`. If a brand file failed to download, reference the Cloudinary URL for that asset instead (check `public/brand/` contents when writing the HTML; document which case applied).
7. **`public/manifest.json`**: `name "Squares N Acres"`, `short_name "Squares N Acres"`, `description` (as above), `start_url "/"`, `display "standalone"`, `background_color "#FFFFFF"`, `theme_color "#CF3F38"`, `icons`: `brand/icon-192.png` (192, `image/png`, purpose `any`), `brand/icon-512.png` (512, `any`), `brand/icon-512-maskable.png` (512, `maskable`).
8. **`public/robots.txt`** (dev placeholder only — in production the API serves it, see §5.13):
   ```
   # Development placeholder. In production /robots.txt is proxied to the API (see backend_developer_guidelines/06_SEO_SITEMAP_ROBOTS.md).
   User-agent: *
   Disallow: /admin
   ```
9. **Logo usages:** in `Header.jsx`, `MobileHeader.jsx`, `Footer.jsx` remove `import logo from '../../assets/images/logo.png'`, import `{ BRAND } from '../../config/site'`, render `<img src={BRAND.logoUrl} alt={BRAND.name} width="112" height="48" … />` (keep existing class names/sizes; set explicit `width`/`height` attributes proportional to the stacked wordmark (2.34:1) so there is no layout shift; do not change layout otherwise — the design-system prompt restyles). Delete `src/assets/images/logo.png`. In `Footer.module.css` remove `filter: brightness(0) invert(1);` from `.brandLogo` and give the logo a white rounded container while the footer is still dark: add `background: #fff; padding: 8px; border-radius: 8px;` to `.brandLogo` (temporary; prompt 04 switches the footer to the light surface and replaces these literals with tokens — note this in `docs/PROJECT_STATE.md` → "Pending rewrites" with owner prompt 04). Change the three `alt="H.O.M Advisory"` to `alt={BRAND.name}`.
10. **README.md (first pass):** title "Squares N Acres — Website & Admin Panel"; sections: What it is (public site + admin, dual mode mock/Laravel), Requirements (Node 20 LTS via `.nvmrc`, npm 9+), Quick start (`npm install`, copy `.env.example` → `.env` (optional; `.env.development` works out of the box), `npm run dev` — note: the mock server arrives in prompt 06, so until then write "`npm start` (mock server coming)"), Scripts table (all scripts currently in `package.json`), Environment variables table (from `.env.example`), Project structure (current tree, one line per folder), Brand assets (`npm run generate:brand-assets`), Deployment placeholder ("see `docs/` — to be completed"), License "Private — Squares N Acres". Remove every HOM/Cloudways/`API_DOCUMENTATION.md` reference.
11. Run `npm run check:traces:report` and record the new totals; `db.json` and `src/` still contain HOM traces (prompt 03).

## 5. Data contract touched
None. Env vars: `REACT_APP_API_URL` (now required, no fallback), `REACT_APP_SITE_URL`, `REACT_APP_SITE_NAME`, optional `REACT_APP_CLOUDINARY_CLOUD_NAME`, `REACT_APP_CLOUDINARY_UPLOAD_PRESET`, `REACT_APP_GOOGLE_MAPS_KEY`, `CHROME_PATH`, `MOCK_PORT`, `MOCK_DELAY_MS`, `MOCK_TOKEN_TTL_HOURS`, `MOCK_FRESH` (documented in `.env.example`). npm script added: `generate:brand-assets`.

## 6. UI/UX requirements
Header, mobile header and footer show the SNA wordmark at the existing sizes without stretching (`object-fit: contain`, explicit width/height); the footer logo sits in a white rounded container on the still-dark footer (temporary). The browser tab shows the monogram favicon and the new title. Everything else looks as before.

## 7. Edge cases that must work
- `npm start` without any `.env` file works (CRA loads `.env.development`); `npm run build` without `.env.production` uses `.env.development`? — **No**: CRA only loads `.env.production` for builds; therefore `build:ci` must not depend on it: `REACT_APP_API_URL` is read at runtime and `api.js` throws only when the module loads in the browser, which is fine for the build itself. Verify `npm run build:ci` still passes with no `.env.production` present (it must; CRA embeds `undefined` → the runtime throw is expected and documented until a real `.env.production` exists). If CRA fails the build for a missing variable, load `.env.development` values via `.env` — do not weaken the throw.
- Cloudinary unreachable during `fetch-brand-assets`: script warns, HTML falls back to Cloudinary URLs (task 6).
- `public/brand/og-default.png` is 1200×630 (check with the script by reading the PNG IHDR width/height bytes 16–23 and printing them).
- Windows paths in the script (`path.join(__dirname, '..', 'public', 'brand')`).

## 8. Acceptance criteria
- [ ] `package.json` name `squares-n-acres-website`, version `0.2.0`, script `generate:brand-assets`.
- [ ] `.env` is untracked and deleted; `.env.example`, `.env.development`, `.env.production.example` exist with the documented variables; `.gitignore` ignores `.env` and `.env.production`.
- [ ] `grep -ri cloudwaysapps .` (excluding `node_modules`, `.git`, `prompts`) → no matches.
- [ ] `public/brand/` contains the 10 PNGs (or the script's WARN output is recorded and the HTML falls back to Cloudinary URLs); `public/index.html` has the new title/meta/theme-color/fonts/favicons/manifest; `public/manifest.json` is valid JSON with three icons.
- [ ] `src/config/site.js` exports `BRAND` and `SITE` exactly as specified.
- [ ] Header, mobile header and footer render the SNA wordmark from `BRAND.logoUrl` with `alt="Squares N Acres"`; `src/assets/images/logo.png` is gone; no CSS `filter` on the logo.
- [ ] `README.md` has no HOM/Cloudways references and documents the current scripts and env vars.
- [ ] `npm run lint`, `npm run test:ci`, `npm run build:ci` pass.
- [ ] One commit; clean tree.

## 9. Verification
```
npm run generate:brand-assets
npm run lint
npm run test:ci
npm run build:ci
npm run check:traces:report
```
Manual QA:
1. `npm start` → `http://localhost:3000/`: tab title "Squares N Acres – Buy, Sell & Rent Properties in Bangalore", monogram favicon visible; header shows the SNA wordmark (not stretched); footer shows it inside a white rounded box.
2. DevTools → Network: `fonts.googleapis.com` stylesheet loads Inter and Manrope (the fonts are not applied yet — that is prompt 04).
3. Resize to 390 px: mobile header shows the wordmark at its current size, no overflow.
4. Application tab → Manifest: name, theme colour and three icons load without 404.
5. `git status` after `npm start`: no generated files outside `public/brand/`.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 02 report (files, env vars, script), Pending rewrites: "Footer `.brandLogo` white container uses literal `#fff` → prompt 04", "HOM strings in `src/` and `db.json` → prompt 03"; check:traces totals; next prompt: 03.
- `docs/DECISIONS.md`: D5 (monogram usage), D31 (site URL defaults), D48 (no fallback API URL), D49 (fonts via `<link>`), D50 (HOM logo deleted).

## 11. Commit
`git add -A && git commit -m "chore(brand): rename package, add SNA brand assets, env files, manifest and README"`

## 12. Guardrails
- Do not touch: `src/theme.js`, `src/assets/styles/global.css`, any component other than the three layout files (and only their logo markup), `db.json`, routes.
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or Cloudways/HOM traces in the files you touch.
- Do not reduce or remove existing functionality.
