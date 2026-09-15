# 00_MASTER_CONTEXT — Squares N Acres website (single source of truth for every prompt)

> **Read this file completely before executing any prompt.** Every prompt in `prompts/` assumes you know everything in here. When a prompt and this file disagree, this file wins. When this file is silent, choose the simplest robust option that is consistent with the rest of this file, implement it, and log it in `docs/DECISIONS.md`. **Never ask the human a question.**

Last generated: 2026-09-15 (from an analysis of the `hom-real-eastate-website` boilerplate at commit `f754fe3`).

---

## 0. How this file is organised

| § | Content |
|---|---|
| 1 | Project brief |
| 2 | Brand identity (logo, palette, typography, imagery, company facts) |
| 3 | Technology stack, pinned dependencies, npm scripts, environment files, Windows-first tooling |
| 4 | Target folder structure, naming conventions, coding standards |
| 5 | API contract (envelopes, errors, auth, pagination, writes, slugs, rate limiting) and the complete endpoint catalogue + endpoint registry |
| 6 | Data model: every collection, every field; HOM → SNA field mapping; canonical enums |
| 7 | RBAC matrix |
| 8 | UI/UX principles, design tokens, breakpoints, accessibility |
| 9 | SEO principles and the `<Seo>` component contract |
| 10 | Mock server design |
| 11 | Known defects of the boilerplate (must not survive) — including extra defects found during analysis |
| 12 | Definition of done, verification commands, git conventions, state-file formats |
| 13 | Decisions & assumptions (numbered) |
| 14 | Content placeholders policy |

---

## 1. Project brief

- **Client:** Squares N Acres, Bengaluru (Bangalore), Karnataka, India. Display name is always **`Squares N Acres`** (capital N, no ampersand). The abbreviation `SNA` may appear only in code identifiers, storage keys, CSS class prefixes and internal file names (`sna_lead`, `snaTheme`, `sna-*`) — **never in user-facing copy**.
- **What we build:** a real-estate portal for one company's curated inventory, in the spirit of MagicBricks / Housing.com: public website (property search, listing, details, localities, builders, buyer assistance, insights/articles, company pages, lead capture everywhere) + admin panel (properties with every detail, leads/CRM, articles, SEO Manager, master data, pages CMS, settings, users). Clean, minimalistic, professional, mobile-first; built to rank on Google and on AI search engines.
- **Reference sites (inspiration only, never copy):** damaniconsulting.com, proptimes.org, searchhomesindia.com, stanleyestates.in, magicbricks.com. Patterns to take: consulting-grade corporate polish; insight-heavy content layouts; locality-driven navigation; premium minimal cards and galleries; MagicBricks-style filters and property detail structure (price, area, configuration, amenities, floor plans, locality, EMI, similar, FAQs).
- **Boilerplate:** the repository was the "H.O.M Advisory" (HOM, "Home Office Market") website. Its clean UI language carries over; its branding, colours, fonts, names, keys, URLs and defects do not. **Every feature, page, module and section of the boilerplate must survive — rebranded, fixed and made data-driven.** Nothing may be silently dropped (see §11 and the coverage matrix in `00_INDEX.md`).
- **Dual mode:** the frontend runs identically against (a) the local mock backend (`mock-server/`, JSON Server 0.17.4 inside Express, seeded from `db.json`) and (b) the future Laravel + MySQL API. Switching is done **only** by changing `REACT_APP_API_URL`. No code may know which backend it is talking to. The handover package `backend_developer_guidelines/` lets a Laravel developer implement the real API with zero ambiguity.
- **Two most important modules:** the **SEO Manager** (§9) and **Articles** (rich-text editor + public blog). Property management is the core and must also be flawless.
- **Locale:** English (India). Currency INR with Indian grouping and lakh/crore short forms (`₹85.5 L`, `₹1.42 Cr`, `₹45,000/month`); area in sq ft by default (sq m, sq yd, acre, cent, guntha supported for plots); dates `dd MMM yyyy`; timezone Asia/Kolkata; Indian mobile validation (10 digits starting 6–9, optional `+91`).

---

## 2. Brand identity

### 2.1 Logo assets (Cloudinary, cloud `dn9gyaiik`)

| Asset | URL | Facts (verified 2026-09-15) |
|---|---|---|
| Wordmark (`BRAND.logoUrl`) | `https://res.cloudinary.com/dn9gyaiik/image/upload/v1789465788/sna-logo_o09ugt.png` | 540×231 px PNG, white/transparent background. **Stacked** wordmark: "Squares" on the first line (the "q" descender reaches the second line), then the red rounded square with a white zig-zag "growth" line followed by "Acres". Aspect ratio ≈ 2.34:1. |
| Icon (`BRAND.iconUrl`) | `https://res.cloudinary.com/dn9gyaiik/image/upload/v1789465791/sna-icon_efty7z.png` | 1254×1254 px PNG on white. **It is a monogram, not just the red square:** a charcoal "S", the red rounded square with the white zig-zag line, and a charcoal "A". Use the monogram as-is for favicon, PWA icons, loader, avatars and map markers. |
| Red square only (`BRAND.iconSquareUrl`) | `https://res.cloudinary.com/dn9gyaiik/image/upload/c_crop,x_375,y_655,w_395,h_390/v1789465791/sna-icon_efty7z.png` | Cloudinary crop of the square from the monogram (verify visually in prompt 04; adjust x/y/w/h by a few pixels if a sliver of "S"/"A" is visible). Used as a decorative accent only. |

Sampled colours (Cloudinary 1×1 BMP crops): monogram red `#E7343A` (samples `#E8353B`, `#E73339`, `#E63439`); wordmark square red `#DF4B4C`; charcoal `#2C2C2B` (monogram) / `#303030` (wordmark).

### 2.2 Logo usage rules (enforce everywhere)

1. Never recolour with CSS filters (`invert`, `brightness`, `hue-rotate`, `grayscale`), never stretch, never crop the wordmark.
2. Clear space ≥ the width of the red square on every side.
3. Rendered height: header **32 px on mobile (< 900 px)**, **44 px on desktop**; footer 40 px; admin sidebar 36 px (collapsed sidebar shows the monogram at 32 px); login page 56 px.
4. Always `alt="Squares N Acres"` (from `siteSettings.general.siteName`).
5. The logo is designed for light backgrounds. **Decision (D3):** the footer is a **light surface** (`--color-surface`) with charcoal text, so the logo is placed as-is. On any dark surface (hero overlays, dark cards) place the logo inside a white rounded container (`--color-bg`, `--radius-md`, 8 px padding). Never place the raw PNG on a dark background.
6. The monogram is the favicon/PWA icon (derived assets in §2.3), the Suspense `PageLoader` mark, the default avatar and the map marker. The red square (`iconSquareUrl`) is a decorative accent only (e.g. section eyebrow marks).
7. `src/config/site.js` exports `BRAND = { name: 'Squares N Acres', shortName: 'SNA', logoUrl, iconUrl, iconSquareUrl, ogImageUrl }`; every component reads `siteSettings.general.logoUrl/iconUrl` first and falls back to `BRAND`.

### 2.3 Derived assets (Cloudinary transformations go between `/upload/` and `/v1789…/`)

`scripts/fetch-brand-assets.js` (`npm run generate:brand-assets`) downloads these once into `public/brand/` (committed) and `public/index.html` + `public/manifest.json` reference the local files; if a download fails in the executing environment, the script prints a warning and the HTML falls back to the Cloudinary URLs.

| File in `public/brand/` | Cloudinary URL |
|---|---|
| `favicon-16.png` | `https://res.cloudinary.com/dn9gyaiik/image/upload/w_16,h_16,c_pad,b_white,f_png/v1789465791/sna-icon_efty7z.png` |
| `favicon-32.png` | `…/upload/w_32,h_32,c_pad,b_white,f_png/v1789465791/sna-icon_efty7z.png` |
| `favicon-48.png` | `…/upload/w_48,h_48,c_pad,b_white,f_png/v1789465791/sna-icon_efty7z.png` |
| `apple-touch-icon.png` (180) | `…/upload/w_180,h_180,c_pad,b_white,f_png/v1789465791/sna-icon_efty7z.png` |
| `icon-192.png` | `…/upload/w_192,h_192,c_pad,b_white,f_png/v1789465791/sna-icon_efty7z.png` |
| `icon-512.png` | `…/upload/w_512,h_512,c_pad,b_white,f_png/v1789465791/sna-icon_efty7z.png` |
| `icon-512-maskable.png` | `…/upload/w_512,h_512,c_pad,b_white,f_png/v1789465791/sna-icon_efty7z.png` (same pad; maskable safe zone is satisfied because the monogram occupies ~75 %) |
| `og-default.png` (1200×630) | `https://res.cloudinary.com/dn9gyaiik/image/upload/w_1200,h_630,c_pad,b_white/v1789465788/sna-logo_o09ugt.png` |
| `logo.png` | the wordmark URL unchanged |
| `icon.png` | the monogram URL unchanged |

`favicon.ico` is not generated (no dependency allowed for ICO encoding): `public/index.html` uses `<link rel="icon" type="image/png" sizes="32x32" href="%PUBLIC_URL%/brand/favicon-32.png">` (+16/48) and `<link rel="apple-touch-icon" …>`. The boilerplate's `<link rel="icon" href="%PUBLIC_URL%/favicon.ico">` (a 404) is removed.

### 2.4 Colour palette (design tokens)

Hex literals may exist **only** in `src/assets/styles/global.css` and `src/theme.js` (a Jest test `src/theme.test.js` asserts both files agree). Everywhere else use `var(--token)` in CSS and `theme.palette.*` / `'var(--token)'` in MUI `sx`.

```css
:root {
  /* Brand */
  --color-brand-red:      #E7343A;  /* sampled from the monogram square (D4); decorative, icons, display text ≥ 24px only (4.24:1 on white) */
  --color-primary:        #CF3F38;  /* buttons, active states, focus of primary controls; white text on it = 4.75:1 (AA) */
  --color-primary-dark:   #B2332D;  /* hover/pressed; ALSO the colour for red TEXT/links on white or surface (6.17:1 / 5.76:1) */
  --color-primary-light:  #FBE9E8;  /* tints, chips, selected rows */
  --color-charcoal:       #2B2B2B;  /* headings, dark surfaces */
  --color-text:           #1F1F1F;
  --color-text-muted:     #5F6368;  /* 6.05:1 on white */
  --color-text-inverse:   #FFFFFF;
  --color-bg:             #FFFFFF;
  --color-surface:        #F7F7F8;  /* sections, cards on white, footer */
  --color-surface-2:      #EFEFF1;
  --color-border:         #E5E7EB;
  --color-border-strong:  #D1D5DB;
  /* Status (base = icons/borders/backgrounds; -dark = text on white or tint; -bg = tint background) */
  --color-success: #1E8E5A; --color-success-dark: #166B45; --color-success-bg: #E6F4EC;
  --color-warning: #D98E04; --color-warning-dark: #8A5A00; --color-warning-bg: #FFF4DE;
  --color-error:   #C62828; --color-error-dark:   #A31F1F; --color-error-bg:   #FDECEC;
  --color-info:    #2563EB; --color-info-dark:    #1D4ED8; --color-info-bg:    #E8EFFD;
  --color-overlay: rgba(31, 31, 31, 0.6);
  --color-focus:   #1D4ED8;  /* focus ring, visible on red and on white */
  /* Social (only for share buttons) */
  --color-whatsapp: #25D366;
}
```

Contrast facts (verified): `--color-primary` on `--color-surface` is 4.44:1 (**fails AA for text**) → red text on surfaces always uses `--color-primary-dark`. `--color-warning` (2.68:1) and `--color-success` (4.14:1) are never used as text on white; use their `-dark` variants. No gold, no navy, nothing from the HOM palette (`#1B2A4A`, `#2D4470`, `#111C33`, `#C9A86C`, `#D4BC8E`, `#B08E4A`, `#F8F6F3`, `#2d3f63`, the cream gradient `#F8F3EB/#F2E8D5/#EDE0CC`, `rgba(201,168,108,*)`, `rgba(27,42,74,*)`) may remain anywhere.

Other tokens (all in `global.css`, mirrored in `theme.js` where MUI needs them):

```css
  /* Typography */
  --font-heading: 'Manrope', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --font-body:    'Inter',   'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --font-size-xs: 0.75rem;  --font-size-sm: 0.875rem; --font-size-md: 1rem; --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;  --font-size-2xl: 1.5rem;
  --font-size-3xl: clamp(1.75rem, 1.4rem + 1.2vw, 2.25rem);
  --font-size-4xl: clamp(2rem, 1.5rem + 2vw, 3rem);
  --font-size-5xl: clamp(2.5rem, 1.8rem + 3vw, 4rem);
  --line-height-tight: 1.2; --line-height-snug: 1.35; --line-height-normal: 1.6;
  --font-weight-regular: 400; --font-weight-medium: 500; --font-weight-semibold: 600; --font-weight-bold: 700; --font-weight-extrabold: 800;
  /* Spacing (4 px base) */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-5: 20px; --space-6: 24px;
  --space-8: 32px; --space-10: 40px; --space-12: 48px; --space-16: 64px; --space-20: 80px; --space-24: 96px;
  /* Radius */
  --radius-sm: 6px; --radius-md: 8px; --radius-lg: 12px; --radius-xl: 16px; --radius-2xl: 24px; --radius-full: 9999px;
  /* Shadows (soft) */
  --shadow-sm: 0 1px 2px rgba(31,31,31,.06), 0 1px 3px rgba(31,31,31,.04);
  --shadow-md: 0 4px 12px rgba(31,31,31,.08), 0 2px 4px rgba(31,31,31,.04);
  --shadow-lg: 0 12px 32px rgba(31,31,31,.10), 0 4px 8px rgba(31,31,31,.04);
  /* Z-index (aligned with MUI: appBar 1100, drawer 1200, modal 1300, snackbar 1400, tooltip 1500) */
  --z-dropdown: 1000; --z-sticky: 1090; --z-header: 1100; --z-bottom-nav: 1100; --z-drawer: 1200;
  --z-modal: 1300; --z-toast: 1400; --z-tooltip: 1500;
  /* Motion */
  --transition-fast: 150ms ease; --transition-base: 250ms ease; --transition-slow: 400ms ease;
  /* Layout */
  --container-max: 1280px; --container-padding: 16px;   /* 24px at >= 900px */
  --header-height: 64px;                                  /* 72px at >= 900px */
  --bottom-nav-height: 64px;
  --safe-bottom: env(safe-area-inset-bottom, 0px);
```

### 2.5 Typography

Headings **Manrope** (600/700/800), body **Inter** (400/500/600), loaded in `public/index.html` (not via CSS `@import`):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@600;700;800&display=swap" rel="stylesheet">
```

Type scale: H1 `--font-size-4xl` (home hero uses `--font-size-5xl`), H2 `--font-size-3xl`, H3 `--font-size-xl`, H4 `--font-size-lg`, body `--font-size-md`, small `--font-size-sm`, caption `--font-size-xs`. The HOM fonts (Playfair Display, DM Sans, Outfit) are removed everywhere, including `theme.js`, `global.css`, every inline `fontFamily` literal and every `.module.css`.

### 2.6 Tone & imagery

Professional, trustworthy, Bangalore-focused, data-rich but uncluttered; generous white space; charcoal typography; red used sparingly (primary actions, active states, accents); rounded corners 8–16 px; soft shadows; hero imagery gets at most a subtle overlay (`--color-overlay`); no loud gradients.

### 2.7 Domain & company facts

- Production domain is unknown. Placeholder everywhere: **`https://www.squaresnacres.com`** via `REACT_APP_SITE_URL` (build-time) and `siteSettings.general.siteUrl` / `seoSettings.siteUrl` (runtime, authoritative for canonical/OG/sitemap URLs).
- Never invent company history, awards, years, client counts, addresses, phones, RERA numbers or team members as facts. Seed clearly labelled placeholders (`+91 98XXX XXXXX`, `info@squaresnacres.com`, `Bengaluru, Karnataka 560001`, `RERA: to be provided`) editable in Admin → Settings, and list them in `docs/CONTENT_TO_BE_PROVIDED_BY_CLIENT.md` (prompt 48). See §14.

---

## 3. Technology stack, dependencies, scripts, environment

### 3.1 Kept from the boilerplate (versions in `package.json`)

`react-scripts 5.0.1` (Create React App, webpack 5, Jest 27, ESLint 8.57 with `eslint-config-react-app 7.0.1`), `react ^18.2`, `react-dom ^18.2`, `react-router-dom ^6.22`, `@mui/material ^7.3`, `@emotion/react`, `@emotion/styled`, `framer-motion ^12` (kept; every animation must respect `prefers-reduced-motion`), `react-helmet-async ^2`, `axios ^1.13`, `@iconify/react ^6` (mdi icons; amenity/nearby/badge icons are Iconify ids), `web-vitals ^2.1` (wired in prompt 41), `@testing-library/*`. **No migration** to Vite/Next/TypeScript. Keep route-level `React.lazy`; add component-level lazy loading for heavy parts (lightbox, map, editor, charts, SEO panel).

### 3.2 Removed dependencies (prompt 03/04 — decision D2)

| Package | Replacement |
|---|---|
| `@mui/icons-material` | unused in the boilerplate (0 imports) — removed; icons are `@iconify/react` |
| `sweetalert2` | `src/components/ui/ConfirmDialog.jsx` (MUI Dialog) + `useToast()`; the `.hom-swal-*` classes are deleted |
| `react-slick` + `slick-carousel` | `src/components/ui/Carousel.jsx` (CSS scroll-snap + buttons + dots, keyboard/touch friendly) |
| `react-countup` | `src/hooks/useCountUp.js` (rAF, respects reduced motion) |
| `react-intersection-observer` | `src/hooks/useInView.js` returning `{ ref, inView }` with the same `{ triggerOnce, threshold, rootMargin }` options (drop-in) |

### 3.3 Allowed new dependencies (exact pins, verified on the npm registry 2026-09-15; nothing else may be added by any prompt)

Runtime: `@tiptap/react@3.31.3`, `@tiptap/pm@3.31.3`, `@tiptap/starter-kit@3.31.3`, `@tiptap/extension-link@3.31.3`, `@tiptap/extension-image@3.31.3`, `@tiptap/extension-table@3.31.3`, `@tiptap/extension-table-row@3.31.3`, `@tiptap/extension-table-cell@3.31.3`, `@tiptap/extension-table-header@3.31.3`, `@tiptap/extension-youtube@3.31.3`, `@tiptap/extension-text-align@3.31.3`, `@tiptap/extension-underline@3.31.3`, `@tiptap/extensions@3.31.3` (provides `Placeholder` and `CharacterCount` in Tiptap v3 — decision D8; do **not** install `@tiptap/extension-placeholder` / `@tiptap/extension-character-count`), `dompurify@3.4.15`, `slugify@1.6.9`, `yet-another-react-lightbox@3.32.2` (ESM-only → lazy-loaded and listed in Jest `transformIgnorePatterns`, D7), `recharts@3.10.1`, `date-fns@4.4.0`.

Dev: `json-server@0.17.4`, `express@4.22.3`, `cors@2.8.6`, `concurrently@9.2.1`, `cross-env@7.0.3`, `rimraf@5.0.10`, `puppeteer-core@24.43.1`, `serve@14.2.6`, `prettier@3.9.6`, `eslint-config-prettier@10.1.8`, `@playwright/test@1.63.0` (optional, prompt 44; needs Node ≥ 20).

Node: `.nvmrc` = `20`; `package.json` `"engines": { "node": ">=18.18", "npm": ">=9" }`. The pins above were chosen so that everything except Playwright also runs on Node 18.18+ (the analysis machine had Node 18.19.0; the target machine has Node 20 LTS). Before installing, prompts run `npm view <pkg> version` only to confirm the pinned version still exists; they do **not** upgrade majors.

### 3.4 npm scripts (final set; all cross-platform — introduced progressively by the prompts, see the note after the block)

```json
{
  "start": "react-scripts start",
  "mock": "node mock-server/server.js",
  "mock:reset": "node mock-server/reset.js",
  "dev": "concurrently -n mock,web -c blue,green \"npm run mock\" \"npm start\"",
  "build": "react-scripts build",
  "build:ci": "cross-env CI=true react-scripts build",
  "build:prerender": "npm run build && node scripts/prerender.js",
  "serve:build": "serve -s build -l 5000",
  "lint": "eslint \"src/**/*.{js,jsx}\" \"mock-server/**/*.js\" \"scripts/**/*.js\" --max-warnings=0 && node scripts/check-endpoints.js",
  "lint:fix": "eslint \"src/**/*.{js,jsx}\" \"mock-server/**/*.js\" \"scripts/**/*.js\" --fix",
  "format": "prettier --write \"src/**/*.{js,jsx,css,json}\" \"mock-server/**/*.js\" \"scripts/**/*.js\" \"docs/**/*.md\" \"prompts/**/*.md\"",
  "format:check": "prettier --check \"src/**/*.{js,jsx,css,json}\" \"mock-server/**/*.js\" \"scripts/**/*.js\"",
  "test": "react-scripts test",
  "test:ci": "cross-env CI=true react-scripts test --watchAll=false",
  "smoke": "node scripts/smoke-api.js",
  "e2e": "playwright test",
  "validate:seed": "node scripts/validate-seed.js",
  "check:traces": "node scripts/check-traces.js",
  "check:links": "node scripts/check-links.js",
  "check:jsonld": "node scripts/validate-jsonld.js",
  "check:contrast": "node scripts/contrast-check.js",
  "check:traces:report": "node scripts/check-traces.js --report",
  "check:sitemap": "node scripts/check-sitemap-coverage.js",
  "check:guidelines": "node scripts/check-guidelines.js",
  "check:env": "node scripts/check-env-example.js",
  "test:mock": "node --test mock-server/__tests__",
  "test:scripts": "node --test scripts/__tests__",
  "seed:build": "node scripts/seed/build-seed.js",
  "analyze": "node scripts/bundle-report.js",
  "a11y:audit": "node scripts/a11y-audit.js",
  "check:all": "npm run lint && npm run test:ci && npm run build:ci && npm run check:traces && npm run validate:seed && npm run check:contrast && npm run test:mock && npm run test:scripts && npm run check:guidelines && npm run check:env",
  "generate:backend-guidelines": "node scripts/generate-backend-guidelines.js",
  "generate:brand-assets": "node scripts/fetch-brand-assets.js"
}
```

Introduction order: 01 `lint`, `lint:fix`, `format`, `format:check`, `test:ci`, `build:ci`, `check:traces`, `check:traces:report`, `check:all`; 02 `generate:brand-assets`; 04 `check:contrast`; 06 `mock`, `mock:reset`, `dev`, `validate:seed`; 07 `test:mock`; 09 `smoke`; 10 `seed:build`; 38 `check:links`, `check:jsonld`; 41 `serve:build`, `build:prerender`, `analyze`, `test:scripts`; 42 `a11y:audit`; 44 `e2e`; 46 `check:sitemap`; 47 `generate:backend-guidelines` (verified), `check:guidelines`; 48 `check:env`. `check:all` grows as scripts arrive and reaches the form above in prompt 48; `smoke`, `check:links`, `check:jsonld`, `check:sitemap`, `a11y:audit` and `e2e` need a running mock/app and are run explicitly.

Rules: `cross-env` for env vars, `rimraf` for deletes, Node scripts instead of shell one-liners, `path.join` everywhere, no `export`, no `cp -r`, no bash-only syntax, no `&&` inside PowerShell-only contexts (npm scripts run in `cmd.exe` on Windows, where `&&` is fine). Windows line endings are normalised by `.gitattributes` (`* text=auto eol=lf`). `.editorconfig`: `indent_style=space`, `indent_size=2`, `end_of_line=lf`, `charset=utf-8`, `trim_trailing_whitespace=true`, `insert_final_newline=true`.

ESLint lives in `package.json` → `eslintConfig` (CRA reads it during `start`/`build`): `extends: ["react-app", "react-app/jest", "prettier"]`, rules: `"no-console": ["error", { "allow": ["warn", "error"] }]`, `"no-unused-vars": ["error", { "argsIgnorePattern": "^_", "ignoreRestSiblings": true }]`, `"no-restricted-imports": ["error", { "paths": [{ "name": "axios", "message": "Use src/services/http.js" }, { "name": "@mui/icons-material", "message": "Use @iconify/react" }], "patterns": ["@mui/icons-material/*"] }]`, `"react-hooks/exhaustive-deps": "error"`. Prettier `.prettierrc`: `{ "singleQuote": true, "semi": true, "printWidth": 100, "trailingComma": "es5", "endOfLine": "lf" }`. Jest config in `package.json` → `"jest": { "transformIgnorePatterns": ["node_modules/(?!(yet-another-react-lightbox)/)"] }`.

### 3.5 Environment files

| File | Committed | Content |
|---|---|---|
| `.env.example` | yes | every variable with a comment and a placeholder value |
| `.env.development` | yes | `REACT_APP_API_URL=http://localhost:4000/api`, `REACT_APP_SITE_URL=http://localhost:3000`, `REACT_APP_SITE_NAME=Squares N Acres` |
| `.env.production.example` | yes | `REACT_APP_API_URL=https://api.squaresnacres.com/api`, `REACT_APP_SITE_URL=https://www.squaresnacres.com`, `REACT_APP_SITE_NAME=Squares N Acres` |
| `.env`, `.env.production`, `.env.local`, `.env.*.local` | **no** (git-ignored) | the boilerplate's committed `.env` (with the Cloudways URL) is removed from git in prompt 02 |

Optional variables: `REACT_APP_CLOUDINARY_CLOUD_NAME`, `REACT_APP_CLOUDINARY_UPLOAD_PRESET`, `REACT_APP_GOOGLE_MAPS_KEY`, `CHROME_PATH` (prerender), `MOCK_PORT` (default 4000), `MOCK_DELAY_MS` (default 0), `MOCK_TOKEN_TTL_HOURS` (default 24), `MOCK_FRESH` (`1` = re-seed runtime db on start). `REACT_APP_API_URL` is **required**: `src/services/http.js` throws `Error('REACT_APP_API_URL is not set. Copy .env.example to .env.')` at module load when it is missing. The Cloudways URL (`phplaravel-780646-6246811.cloudwaysapps.com`) must not exist anywhere, including git-ignored files created by prompts.

---

## 4. Target folder structure, naming conventions, coding standards

### 4.1 Repository tree after prompt 48 (directories that must exist; files listed are the important ones)

```
squares-n-acres-website/
├─ .editorconfig  .gitattributes  .gitignore  .nvmrc  .prettierrc  .prettierignore
├─ .env.example  .env.development  .env.production.example
├─ package.json (name "squares-n-acres-website", version "1.0.0")  package-lock.json  README.md
├─ db.json                                  # committed seed (never written by the server)
├─ backend_developer_guidelines/            # generated by scripts/generate-backend-guidelines.js (§ prompt 47)
├─ docs/
│  ├─ PROJECT_STATE.md  DECISIONS.md  API_CONTRACT.md  DATA_MODEL.md  RBAC.md  SEED_GUIDE.md  SEO_ENGINE.md  PERFORMANCE.md  RELEASE_CHECKLIST.md
│  ├─ CONTENT_TO_BE_PROVIDED_BY_CLIENT.md  QA/ (bug-bash reports)  archive/CODEBASE_INVENTORY.md
│  └─ backend-notes/*.md                    # hand-written enrichment merged into the guidelines
├─ e2e/                                     # optional Playwright specs (prompt 44)
├─ mock-server/
│  ├─ server.js  db.js  reset.js  config.js  README.md
│  ├─ middleware/ (auth.js role.js envelope.js errors.js rateLimit.js timestamps.js validate.js)
│  ├─ routes/ (auth.js properties.js leads.js articles.js seo.js settings.js dashboard.js masterData.js pages.js media.js users.js newsletter.js jobs.js redirects.js sitemap.js)
│  ├─ lib/ (filters.js sort.js paginate.js slug.js ids.js csv.js xml.js scope.js)
│  ├─ schemas/ (models.js + one descriptor file per collection)
│  └─ .runtime/db.json                      # git-ignored runtime copy
├─ prompts/                                 # this folder
├─ public/ (index.html manifest.json robots.txt brand/*)
├─ scripts/ (check-traces.js check-endpoints.js check-links.js check-sitemap-coverage.js check-guidelines.js check-env-example.js validate-seed.js validate-jsonld.js smoke-api.js a11y-audit.js bundle-report.js lib/ seed/
│            fetch-brand-assets.js generate-backend-guidelines.js prerender.js contrast-check.js)
└─ src/
   ├─ index.js  App.js  theme.js  theme.test.js  setupTests.js
   ├─ assets/styles/ (global.css prose.css)
   ├─ config/ (site.js enums.js rbac.js routes.js navigation.js seoDefaults.js)
   ├─ services/ (http.js endpoints.js schemas/*.js authService.js propertyService.js leadService.js articleService.js
   │             seoService.js settingsService.js masterDataService.js pageService.js mediaService.js userService.js
   │             dashboardService.js newsletterService.js careerService.js redirectService.js)
   ├─ hooks/ (useApi.js useApiList.js useDebounce.js useThrottledScroll.js useInView.js useCountUp.js useForm.js
   │          useLocalStorage.js useUnsavedChanges.js useScrollDirection.js useBreakpoint.js)
   ├─ contexts/ (AdminAuthContext.js SiteSettingsContext.js MasterDataContext.js ShortlistContext.js LeadCaptureContext.js LeadNotificationsContext.js)
   ├─ utils/ (format.js validators.js leadStorage.js storage.js cloudinary.js slug.js url.js analytics.js
   │          propertySections.js listingFilters.js csv.js download.js finance.js)
   ├─ seo/ (analyzers/ schema/ data/ score.js readability.js snippet.js variables.js keywords.js urls.js index.js __tests__/)
   ├─ components/
   │  ├─ ui/        (design-system kit, §8.4)
   │  ├─ admin/     (DataTable FilterBar PageHeader FormSection ImageField MultiSelect SlugField StatusChip AdminTabs
   │  │              MasterDataPage SortableList MediaPickerDialog IconPicker ProtectedRoute RoleRoute Forbidden)
   │  ├─ common/    (LeadForm LeadCaptureModal NewsletterSection PropertyCard ScrollToTop BackToTop ToastProvider
   │  │              SkeletonLoaders RedirectHandler WhatsAppButton ShareButton ShortlistButton GlobalSearch RecentlyViewed)
   │  ├─ layout/    (Header MegaMenu MobileDrawer Footer BottomNav MainLayout AdminLayout AdminSidebar AdminTopbar)
   │  ├─ editor/    (RichTextEditor.jsx toolbar/ extensions.js nodes/ sanitize.js SafeHtml.jsx InternalLinkPicker.jsx)
   │  ├─ seo/       (Seo.jsx SeoPanel/ SeoScoreChip.jsx)
   │  ├─ cms/       (PageRenderer.jsx blocks/*.jsx BlockEditor/)
   │  ├─ listing/   (ListingEngine FilterRail FilterSheet ActiveFilters SortSelect ResultsHeader ViewToggle)
   │  └─ sections/  (home/ property/ property/finance/ locality/ developer/ article/)
   ├─ pages/
   │  ├─ public/ (Home PropertyListing + category wrappers, PropertyDetails, Localities LocalityDetail Builders BuilderDetail,
   │  │           Articles ArticleDetail ArticleCategory ArticleTag AuthorPage, FAQs, CmsPage, JobDetail, Shortlist, NotFound)
   │  └─ admin/  (AdminLogin Dashboard properties/ leads/ articles/ seo/ master-data/ pages/ faqs/ media/ settings/ careers/ newsletter/)
   └─ routes/ (index.js publicRoutes.js adminRoutes.js paths.js)
```

### 4.2 Naming conventions

- Components: `PascalCase.jsx` (one component per file, default export, named export for helpers only when tested). Hooks: `useThing.js`. Services: `thingService.js` exporting an object of one-liners. Contexts: `ThingContext.js` exporting `ThingProvider` + `useThing()`. Utils: `camelCase.js` with named exports. Constants/enums: `UPPER_SNAKE_CASE` values, files `camelCase.js`.
- CSS Modules: `ComponentName.module.css` next to the component; class names `camelCase`; every colour/spacing/radius/shadow/font through `var(--token)`.
- Route path constants live in `src/routes/paths.js` (e.g. `PATHS.propertyDetails(slug)`); components never build public URLs by string concatenation elsewhere.
- Storage keys: `sna_auth_token`, `sna_auth_user`, `sna_auth_expires_at`, `sna_lead` (sessionStorage), `sna_property_draft:<id|new>`, `sna_article_draft:<id|new>`, `sna_page_draft:<id|new>`, `sna_shortlist`, `sna_recent_searches`, `sna_recent_properties`, `sna_listing_view`, `sna_site_settings_cache` (sessionStorage), `sna_master_data_cache` (sessionStorage), `sna_viewed_properties` (sessionStorage), `sna_admin_sidebar_collapsed`. All go through `src/utils/storage.js` (`getItem/setItem/removeItem` with JSON + try/catch).
- Endpoint keys: `module.action` (`properties.list`, `adminProperties.bulk`, `auth.login`); JSON fields camelCase; enum values kebab-case; slugs kebab-case lowercase.
- Test files: `*.test.js` co-located or in `__tests__/`.

### 4.3 Coding standards

Functional components + hooks only (the single `class` is `ErrorBoundary` in `src/components/common/ErrorBoundary.jsx`). No `any`-style shortcuts (no `// eslint-disable`, no `@ts-ignore`, no swallowing errors with empty `catch {}` — always handle or surface). No inline hex/rgba colours, no inline `fontFamily`. No `console.log` (only `console.warn/error` in `http.js`, `ErrorBoundary`, scripts and the mock server logger). No TODO/FIXME left behind, no commented-out code, no lorem ipsum, no HOM traces. `PropTypes` are optional but, if used in a file, used for every exported component of that file. Every list `key` is a stable id (never an array index for reorderable/editable lists). Every image has `alt` from data. Every `fetch`/axios call goes through `http.js` and is cancelled on unmount (`AbortController` via `useApi`). All async UI has loading, empty, error and success states (§8). Dates are rendered via `src/utils/format.js` only. Prices via `formatPrice`. Never `window.location.href` for internal navigation (use `useNavigate`), except the 401 handler.

---

## 5. API contract (identical for the mock and for Laravel)

### 5.1 Base URL and paths
`REACT_APP_API_URL` (e.g. `http://localhost:4000/api`, later `https://api.squaresnacres.com/api`). All paths below are relative to it. Public and admin endpoints share the base; admin endpoints are prefixed `/admin/`. Casing: **the entire contract is camelCase** — request bodies, response bodies and query parameters. `db.json` is camelCase. There is **no transformation layer** in the frontend (`transformPropertyPayload`, `normalizePropertyResponse`, `normalizeListResponse`, `extractPaginationMeta`, `buildPayload` conversions and the snake↔camel mappers in `seoService.js` are deleted in prompt 11). The Laravel developer maps `snake_case` columns to camelCase JSON in API Resources.

### 5.2 Success envelope
- Single resource → `{ "data": { … } }`
- List → `{ "data": [ … ], "meta": { "page": 1, "perPage": 12, "total": 57, "totalPages": 5 } }` (non-paginated lists still return `meta` with `total`, `page: 1`, `perPage: total`, `totalPages: 1`). Property lists additionally return `meta.facets` (§5.7).
- Action/void → `{ "data": null, "message": "…" }`
- Never a bare array or bare object.

### 5.3 Error envelope
`{ "message": "Human readable", "errors": { "fieldName": ["message", …] } }` with status **400** bad request, **401** unauthenticated, **403** forbidden (role), **404** not found, **409** conflict (duplicate slug/email), **422** validation (Laravel format, keys camelCase, nested keys dotted: `"location.localityId"`, `"images.0.alt"`), **429** rate limited, **500** server error. The frontend shows `message` in a toast and `errors` inline on fields (`useForm.setServerErrors(errors)` / `usePropertyForm`).

### 5.4 Auth
Header `Authorization: Bearer <token>`. `POST /auth/login { email, password }` → `{ data: { token, expiresAt, user: { id, name, email, role, avatarUrl, phone } } }`; `POST /auth/logout` revokes (200 `{data:null,message}`); `GET /auth/profile` → `{ data: user }` (401 when the token is missing/expired/revoked); `PUT /auth/profile { name, phone, avatarUrl }`; `PUT /auth/password { currentPassword, newPassword }` (422 `currentPassword` when wrong; `newPassword` min 8). Tokens expire after `MOCK_TOKEN_TTL_HOURS` (default 24) on the mock and per Sanctum config on Laravel. Client storage: `sna_auth_token`, `sna_auth_user`, `sna_auth_expires_at` (localStorage); expiry enforced client-side (timer + check on every route change → auto-logout with toast "Your session has expired. Please sign in again.") and server-side (401).

### 5.5 IDs & timestamps
Integer auto-increment `id` (the mock uses `max(id)+1` per collection). ISO-8601 UTC strings `createdAt`, `updatedAt` on every record (and `publishedAt`, `deletedAt`, `lastLoginAt` where relevant); the API sets them, the client never sends them (ignored if sent). Foreign keys `xxxId`. Reads embed denormalised display objects (`property.locality = {id,name,slug}`, `property.location.city = {id,name,slug}`, `property.propertyType = {id,name,slug,segment}`, `property.developer = {id,name,slug,logoUrl}`, `property.amenities[] = {id,name,slug,icon,category}`, `property.badges[] = {id,name,slug,color,icon}`, `lead.property = {id,title,slug}`, `lead.assignedUser = {id,name}`, `article.category/author/tags`, `jobApplication.job = {id,title,slug}`); writes send only the ids (`localityId`, `cityId`, `propertyTypeId`, `developerId`, `amenityIds[]`, `badgeIds[]`, `categoryId`, `authorId`, `tagIds[]`, `assignedTo`). Read-only embedded/computed fields sent by a client are ignored.

### 5.6 Pagination, sorting, filtering
Query params `page` (1-based, default 1), `perPage` (default 12 public / 20 admin, max 100; `perPage=all` allowed **only on admin endpoints** and returns everything), `sort` (a field name or an alias from the endpoint's allowed list; default per endpoint), `order` (`asc|desc`), `q` (full-text on the endpoint's searchable fields, case-insensitive substring), plus endpoint-specific filters. Multi-value filters are comma-separated (`bedrooms=2,3`, `localityId=4,7`). Booleans are the strings `true|false`. Dates are `yyyy-mm-dd` (`from`, `to` inclusive). Unknown params are ignored. Out-of-range `page` returns an empty `data` with correct `meta`.

### 5.7 Property list filters (`GET /properties`, `GET /admin/properties`)
`listingType`, `segment`, `propertyTypeId` (multi), `localityId` (multi), `cityId`, `constructionStatus` (multi), `availability`, `bedrooms` (multi; `5` means ≥ 5; matches `configuration.bedrooms` **or any active `unitConfigurations[].bedrooms`**), `minPrice`, `maxPrice` (compare against `pricing.price` for sale, `pricing.rentPerMonth` for rent/lease; `priceOnRequest` records are excluded when a price filter is set), `minArea`, `maxArea`, `areaUnit` (default sqft; compare against `area.superBuiltUpArea ?? area.carpetArea ?? area.plotArea` converted to the requested unit), `furnishing` (multi), `facing` (multi), `developerId`, `amenityIds` (multi = **all** must match), `badgeIds` (multi = any), `isFeatured`, `isVerified`, `reraRegistered`, `possessionBy` (`yyyy-mm`; `possessionDate <= last day of that month` or ready-to-move), `q` (title, projectName, shortDescription, locality name, developer name), `ids` (multi, returns those ids in the given order, ignores other filters except `isActive` scoping), `sort` ∈ `relevance|newest|price-asc|price-desc|area-desc|popular` (`relevance` = `isFeatured desc, priorityOrder desc, updatedAt desc`; `newest` = `publishedAt desc`; `popular` = `viewCount desc`), `page`, `perPage`. Admin adds `isActive`, `seoScoreBand` (`good|ok|poor|none`), `createdBy`, `sort=updatedAt|price|viewCount|priorityOrder|title|seoScore`. Response `meta.facets` (public + admin): `{ propertyType: [{id,name,count}], locality: [{id,name,count}], bedrooms: [{value,count}], constructionStatus: [{value,count}] }` computed on the result set **before** pagination but **after** the other filters.

### 5.8 Write semantics
`POST` creates → **201** + full record. `PUT` replaces the full record (the client always sends the complete record from the form; missing optional fields become their defaults). `PATCH` updates only the provided fields — used by toggles, bulk actions, SEO panel saves, lead status changes, section-visibility toggles, `order` reorders. `DELETE` → 200 `{ data: null, message }`. Bulk: `POST /admin/<resource>/bulk { ids: [], action: 'activate'|'deactivate'|'delete'|'feature'|'unfeature'|'verify'|'unverify'|'publish'|'unpublish'|'assign'|'status', payload? }` → `{ data: { affected: n }, message }` (unsupported action for the resource → 422).

### 5.9 Slugs
Every public entity has a unique `slug` (lowercase, `[a-z0-9-]`, ≤ 75 chars). Lookup: `GET /<resource>/slug/:slug`. Check: `GET /admin/<resource>/check-slug?slug=&excludeId=` → `{ data: { available: true|false, suggestion } }`. The API auto-generates a slug from the title when the client sends an empty slug and de-duplicates with `-2`, `-3`… A duplicate explicit slug → 409 with `errors.slug`. The entity `slug` and `seo.slug` are always kept identical by the API.

### 5.10 Public vs admin reads
Public list endpoints return only `isActive: true` records (and `status: 'published'` for articles/pages, `publishedAt <= now`); public detail endpoints return 404 for inactive/unpublished/unknown slugs (except `?preview=<token>` on articles/pages, D28). Public responses strip private fields: `agent.phone/whatsapp/email` only when `agent.showOnListing`; never `leads`, `adminUsers`, `apiTokens`, `media`, `createdBy/updatedBy`, `authors[].email`, internal notes, `siteSettings.integrations.*Secret`, `siteSettings.leads`. Admin endpoints return everything, with `isActive` filterable.

### 5.11 Rate limiting & spam
`POST /leads`, `POST /newsletter/subscribe`, `POST /jobs/:id/apply` accept an optional honeypot field `website` (non-empty → 200 `{data:null, message:'ok'}` and nothing stored) and are rate limited per IP (mock: 10/min → 429 `{message:'Too many requests. Please try again in a minute.'}`). Documented for Laravel (`throttle:10,1`).

### 5.12 CORS
The API allows the site origin(s) from configuration; the mock allows `http://localhost:3000`, `http://127.0.0.1:3000` and `http://localhost:5000` (served build).

### 5.13 Sitemap/robots/RSS/llms
`GET /sitemap.xml` (sitemap index), `GET /sitemap-properties.xml`, `/sitemap-localities.xml`, `/sitemap-developers.xml`, `/sitemap-articles.xml`, `/sitemap-pages.xml` (with `<lastmod>`, `<changefreq>`, `<priority>` from `seoSettings.sitemap` and per-entity `seo.sitemap` overrides; `<image:image>` entries for properties), `GET /robots.txt`, `GET /rss.xml` (latest 20 published articles), `GET /llms.txt` — `text/xml` / `text/plain`, no envelope, served both under the API base (`/api/sitemap.xml`) and mirrored at the mock's root (`/sitemap.xml`) for Nginx proxying. URLs use `seoSettings.siteUrl`.

### 5.14 Endpoint catalogue (every one exists on the mock, is in the registry, is smoke-tested and is documented in the guidelines)

**Public (no auth)**

| Method | Path | Notes |
|---|---|---|
| GET | `/properties` | filters §5.7; `isActive` forced true |
| GET | `/properties/featured` | `isFeatured && isActive`, sort `priorityOrder desc, updatedAt desc`, `perPage` default 12 |
| GET | `/properties/slug/:slug` | 404 if inactive |
| GET | `/properties/:id/similar` | admin-selected `similarPropertyIds` (active) first, then fill to 6 by same `listingType` + same `localityId` or `propertyTypeId`, excluding self |
| POST | `/properties/:id/view` | increments `viewCount`; debounced per IP per hour in memory; `{data:{viewCount}}` |
| GET | `/properties/suggestions?q=` | `{ data: { localities: [{id,name,slug,propertyCount}], properties: [{id,title,slug,localityName,price}], propertyTypes: [{id,name,slug}], developers: [{id,name,slug}] } }` (max 5 each, `q` ≥ 2 chars) |
| GET | `/localities` | filters `zone`, `isFeatured`, `q`, `cityId`; sort `order|name|propertyCount`; embeds `propertyCount` |
| GET | `/localities/slug/:slug` | |
| GET | `/cities` | |
| GET | `/developers` | filters `isFeatured`, `q`; embeds `propertyCount` |
| GET | `/developers/slug/:slug` | |
| GET | `/property-types` | filter `segment` |
| GET | `/amenities` | filter `category` |
| GET | `/badges` | |
| GET | `/banks` | active only, sorted `order` |
| GET | `/articles` | filters `categoryId`, `categorySlug`, `tagId`, `tagSlug`, `authorId`, `authorSlug`, `q`, `isFeatured`; sort `newest|popular`; published + `publishedAt <= now` only |
| GET | `/articles/slug/:slug` | `?preview=<token>` returns drafts/scheduled when the token matches |
| GET | `/articles/trending` | top 6 by `viewCount` among published |
| GET | `/article-categories` | with `articleCount` |
| GET | `/article-tags` | with `articleCount` |
| GET | `/authors` | active, public fields only |
| GET | `/authors/slug/:slug` | |
| GET | `/faqs` | filters `category`, `showOnHome`, `propertyTypeId`; sort `order` |
| GET | `/testimonials` | active; filter `isFeatured`; `isSample` included |
| GET | `/team` | active; filter `showOnAbout` |
| GET | `/partners` | active; filter `category`; sort `order` |
| GET | `/pages/slug/:slug` | published only (`?preview=` supported) |
| GET | `/jobs` | active, `closesAt` null or future |
| GET | `/jobs/slug/:slug` | |
| POST | `/jobs/:id/apply` | body `{ name, email, phone, resumeUrl, coverLetter?, linkedinUrl?, website? }` → 201 |
| GET | `/settings` | public subset of `siteSettings` |
| GET | `/seo/settings` | public subset of `seoSettings` (no `customHeadHtml` for non-admins? — no: it **is** public because the public site must render it; only `verification` is public too) |
| GET | `/redirects` | active only, `{data:[{fromPath,toPath,statusCode}]}` |
| POST | `/leads` | body §6 leads; honeypot `website`; 201 |
| POST | `/newsletter/subscribe` | `{ email, name?, source?, website? }` → 201, or 200 `{data:null,message:'Already subscribed'}` for duplicates |
| GET | `/sitemap.xml`, `/sitemap-properties.xml`, `/sitemap-localities.xml`, `/sitemap-developers.xml`, `/sitemap-articles.xml`, `/sitemap-pages.xml`, `/robots.txt`, `/rss.xml`, `/llms.txt` | §5.13 |

**Auth**: `POST /auth/login`, `POST /auth/logout`, `GET /auth/profile`, `PUT /auth/profile`, `PUT /auth/password`.

**Admin (Bearer + role per §7)**

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/dashboard` | §6.16 shape; role-aware |
| GET, POST | `/admin/properties` | |
| GET, PUT, PATCH, DELETE | `/admin/properties/:id` | |
| POST | `/admin/properties/:id/duplicate` | copies as inactive draft: title `"<title> (Copy)"`, new slug `<slug>-copy[-n]`, `isFeatured:false`, `viewCount:0`, `enquiryCount:0`, `seo.score` recomputed lazily (null) |
| POST | `/admin/properties/bulk` | actions activate/deactivate/feature/unfeature/verify/unverify/delete |
| GET | `/admin/properties/check-slug` | |
| same CRUD + `bulk` (+ `check-slug` where slugged) | `/admin/localities`, `/admin/cities`, `/admin/property-types`, `/admin/amenities`, `/admin/badges`, `/admin/developers`, `/admin/banks`, `/admin/articles`, `/admin/article-categories`, `/admin/article-tags`, `/admin/authors`, `/admin/faqs`, `/admin/testimonials`, `/admin/team`, `/admin/partners`, `/admin/pages`, `/admin/jobs`, `/admin/redirects`, `/admin/media`, `/admin/users` | slugged: localities, cities, property-types, amenities, badges, developers, banks, articles, article-categories, article-tags, authors, team, pages, jobs. Deleting a master-data item in use → 409 `{ message, errors: { id: ['Used by 3 properties'] }, data: { usedBy: [{type, id, title}] } }` (D-guard) |
| GET | `/admin/leads` | filters `q`, `status` (multi), `source` (multi), `assignedTo` (`me`, `unassigned`, id), `propertyId`, `from`, `to`, `priority`; sort `createdAt|updatedAt|followUpAt|status`; sales-scoped |
| GET, PATCH, DELETE | `/admin/leads/:id` | sales cannot DELETE (403); `POST /admin/leads/:id/claim` sets `assignedTo` = self when unassigned |
| POST | `/admin/leads/:id/notes` | `{ text }` → returns the lead |
| DELETE | `/admin/leads/:id/notes/:noteId` | |
| GET | `/admin/leads/export` | CSV (UTF-8 BOM), same filters; `Content-Disposition: attachment; filename="leads-<yyyy-mm-dd>.csv"` |
| POST | `/admin/leads/bulk` | actions `status` (`payload.status`), `assign` (`payload.assignedTo`), `priority`, `delete` |
| GET | `/admin/job-applications` | filters `jobId`, `status`, `q` |
| PATCH, DELETE | `/admin/job-applications/:id` | |
| GET | `/admin/newsletter-subscribers` | filters `status`, `q` |
| DELETE | `/admin/newsletter-subscribers/:id` | |
| GET | `/admin/newsletter-subscribers/export` | CSV |
| GET, PUT | `/admin/settings` | PUT deep-merges known keys only |
| GET, PUT | `/admin/seo/settings` | |
| GET | `/admin/seo/overview?type=property\|article\|page\|locality\|developer\|articleCategory\|author&q=&scoreBand=&index=` | lightweight rows `{ id, type, title, slug, url, seo, isActive, status, updatedAt }`; `perPage=all` allowed |
| GET | `/admin/media` | filters `type`, `folder`, `q`, `provider` |
| POST | `/admin/media` | metadata record (no binary) |
| PATCH, DELETE | `/admin/media/:id` | |
| GET | `/admin/articles/:id/preview-token` | `{ data: { token, url } }` (token valid 24 h) — same for `/admin/pages/:id/preview-token` |

### 5.15 Endpoint registry (`src/services/endpoints.js`)

A single exported object `endpoints` describing every endpoint the frontend uses. Shape of one entry:

```js
// src/services/endpoints.js (excerpt)
const { SORT_OPTIONS } = require('../config/enums'); // CommonJS (D36b): Node scripts require this file too

const endpoints = {
  properties: {
    list: {
      key: 'properties.list',
      method: 'GET',
      path: '/properties',
      auth: 'public',                       // 'public' | 'user' | 'admin' | 'manager' | 'sales'  (minimum role; 'user' = any authenticated role)
      module: 'properties',
      description: 'Public paginated property search with facets',
      query: {                              // allowed params → type descriptor (string | int | number | bool | date | enum:[…] | csv:int | csv:enum:[…])
        page: 'int', perPage: 'int', sort: `enum:${SORT_OPTIONS.values.join(',')}`, order: 'enum:asc,desc', q: 'string',
        listingType: 'enum:sale,rent,lease', segment: 'enum:residential,commercial,land', propertyTypeId: 'csv:int',
        localityId: 'csv:int', cityId: 'int', constructionStatus: 'csv:enum:pre-launch,under-construction,ready-to-move,resale',
        availability: 'string', bedrooms: 'csv:int', minPrice: 'number', maxPrice: 'number', minArea: 'number', maxArea: 'number',
        areaUnit: 'string', furnishing: 'csv:string', facing: 'csv:string', developerId: 'int', amenityIds: 'csv:int',
        badgeIds: 'csv:int', isFeatured: 'bool', isVerified: 'bool', reraRegistered: 'bool', possessionBy: 'string', ids: 'csv:int',
      },
      body: null,                           // or a key into src/services/schemas/*.js, e.g. 'property.create'
      response: 'PropertyList',             // shape name documented in docs/API_CONTRACT.md
      example: 1,                           // id of a seed record used by the smoke test / generator
    },
    bySlug: { key: 'properties.bySlug', method: 'GET', path: '/properties/slug/:slug', auth: 'public', module: 'properties', description: 'Property details by slug', query: {}, body: null, response: 'Property', example: 'lakeview-heights-3-bhk-whitefield' },
    // …
  },
  adminProperties: { list, create, get, update /* PUT */, patch, remove, duplicate, bulk, checkSlug },
  // … one group per module: auth, leads, adminLeads, articles, adminArticles, localities, adminLocalities, cities, adminCities,
  // propertyTypes, adminPropertyTypes, amenities, adminAmenities, badges, adminBadges, developers, adminDevelopers, banks, adminBanks,
  // articleCategories, adminArticleCategories, articleTags, adminArticleTags, authors, adminAuthors, faqs, adminFaqs, testimonials,
  // adminTestimonials, team, adminTeam, partners, adminPartners, pages, adminPages, jobs, adminJobs, adminJobApplications,
  // newsletter, adminNewsletterSubscribers, settings, adminSettings, seo (settings, overview), adminSeo, redirects, adminRedirects,
  // adminMedia, adminUsers, dashboard, sitemap (sitemap, robots, rss, llms)
};

const allEndpoints = () => Object.values(endpoints).flatMap((group) => Object.values(group));
const findEndpoint = (key) => allEndpoints().find((e) => e.key === key);
module.exports = { endpoints, allEndpoints, findEndpoint };
```

Services call `http.request(endpoints.properties.list, { params })`; `http.request(endpoint, { params, pathParams, body, signal, responseType })` builds the URL from `path` + `pathParams`, sends `body` for POST/PUT/PATCH, returns the parsed envelope `{ data, meta }` and throws `ApiError { status, message, errors, isNetworkError, isTimeout }`. The registry is consumed by `scripts/generate-backend-guidelines.js` (Postman collection, OpenAPI, `03_ENDPOINTS.md`) and by `scripts/smoke-api.js`. **`scripts/check-endpoints.js`** (part of `npm run lint`) fails when any file under `src/` other than `src/services/endpoints.js` contains a string literal starting with `/admin/`, `/auth/` or another API path in an `http.` / `axios` call, or when a service file references a path string instead of a registry entry.

---

## 6. Data model (`db.json` collections; every field camelCase; `?` = nullable/optional; `(read)` = computed/embedded by the API, ignored on write)

Column legend: **Type** · **Null** (Y/N) · **Default** · **Enum/notes**. Every record also has `id` (int), `createdAt`, `updatedAt` unless stated.

### 6.1 `properties`

| Field | Type | Null | Default | Enum / notes |
|---|---|---|---|---|
| `slug` | string | N | from title | unique |
| `title` | string | N | — | ≥ 10 chars |
| `projectName` | string | Y | null | |
| `listingType` | enum | N | `sale` | `sale|rent|lease` |
| `segment` | enum | N | `residential` | `residential|commercial|land` |
| `propertyTypeId` | int | N | — | FK propertyTypes |
| `propertyType` | object (read) | | | `{id,name,slug,segment}` |
| `constructionStatus` | enum | N | `ready-to-move` | `pre-launch|under-construction|ready-to-move|resale` |
| `availability` | enum | N | `available` | `available|sold|rented|reserved` |
| `possessionDate` | date (yyyy-mm-dd) | Y | null | required for pre-launch/under-construction |
| `ageOfPropertyYears` | int | Y | null | ready-to-move/resale |
| `furnishing` | enum | Y | null | `unfurnished|semi-furnished|fully-furnished` |
| `facing` | enum | Y | null | `north|south|east|west|north-east|north-west|south-east|south-west` |
| `floorNumber` | int | Y | null | |
| `totalFloors` | int | Y | null | |
| `ownership` | enum | Y | null | `freehold|leasehold|co-operative-society|power-of-attorney` |
| `reraNumber` | string | Y | null | |
| `reraRegistered` | bool | N | false | |
| `description` | string (sanitised HTML) | N | `''` | ≥ 300 chars to activate |
| `shortDescription` | string | N | `''` | ≤ 300 chars |
| `highlights` | string[] | N | `[]` | |
| `amenityIds` | int[] | N | `[]` | FK amenities |
| `amenities` | object[] (read) | | | `{id,name,slug,icon,category}` |
| `badgeIds` | int[] | N | `[]` | FK badges |
| `badges` | object[] (read) | | | `{id,name,slug,color,icon}` |
| `specifications` | object[] | N | `[]` | `{ group (SPEC_GROUPS), label, value, icon? }` |
| `constructionSpecs` | object[] | N | `[]` | `{ group (SPEC_GROUPS), label, value }` |
| `unitConfigurations` | object[] | N | `[]` | `{ id, name, bedrooms?, bathrooms?, superBuiltUpArea?, carpetArea?, areaUnit, price?, priceOnRequest, floorPlanImageUrl?, floorPlanPdfUrl?, availableUnits?, isActive }` |
| `floorPlans` | object[] | N | `[]` | `{ id, title, imageUrl, pdfUrl?, area?, areaUnit, bedrooms?, price?, order }` |
| `images` | object[] | N | `[]` | `{ id, url, alt, caption?, order, isCover }`; exactly one `isCover` when non-empty |
| `videoUrl` | string | Y | null | YouTube/Vimeo/MP4 URL |
| `virtualTourUrl` | string | Y | null | |
| `brochureUrl` | string | Y | null | |
| `brochureLeadGated` | bool | N | true | |
| `documents` | object[] | N | `[]` | `{ id, title, url, type (brochure|approval|legal|floor-plan|price-list|other), leadGated, order }` |
| `location` | object | N | see notes | `{ address, localityId, locality (read {id,name,slug}), cityId, city (read), pincode?, landmark?, latitude?, longitude?, mapEmbedUrl?, showExactLocation (bool, default false) }` |
| `nearbyPlaces` | object[] | N | `[]` | `{ id, name, category (NEARBY_CATEGORIES), distanceKm?, travelTimeMin?, order }` |
| `pricing` | object | N | see notes | `{ price?, priceOnRequest (bool), priceRangeMin?, priceRangeMax?, pricePerSqft?, priceNegotiable (bool), rentPerMonth?, securityDeposit?, maintenanceChargesMonthly?, bookingAmount?, otherCharges[] {label, amount, note?}, currency:'INR' }` |
| `area` | object | N | see notes | `{ superBuiltUpArea?, builtUpArea?, carpetArea?, plotArea?, areaUnit (AREA_UNITS, default sqft), plotLength?, plotWidth?, plotDimensionUnit? }` |
| `configuration` | object | N | see notes | `{ bedrooms?, bathrooms?, balconies?, parkingCovered?, parkingOpen?, servantRoom (bool), studyRoom (bool), poojaRoom (bool), kitchenType? (modular|semi-modular|regular) }` |
| `project` | object | N | see notes | `{ developerId?, developer (read {id,name,slug,logoUrl}), totalUnits?, totalTowers?, totalFloors?, projectAreaAcres?, openAreaPercent?, launchDate?, approvals[] (bbmp|bda|bmrda|biaapa|rera|other), landmarkProject (bool) }` |
| `constructionTimeline` | object[] | N | `[]` | `{ id, milestone, date?, status (completed|in-progress|upcoming), imageUrl?, note?, order }` |
| `constructionProgressPercent` | int | Y | null | 0–100 |
| `faqs` | object[] | N | `[]` | `{ id, question, answer (HTML), order }` |
| `similarPropertyIds` | int[] | N | `[]` | max 6, ordered |
| `sectionVisibility` | object | N | all true | keys `overview, highlights, specifications, amenities, unitConfigurations, floorPlans, gallery, video, virtualTour, documents, construction, builder, nearby, location, finance, faqs, similar, enquiry` (bool each) |
| `agent` | object | N | `{showOnListing:false}` | `{ teamMemberId?, name?, phone?, whatsapp?, email?, photoUrl?, showOnListing }` |
| `seo` | object | N | §9.6 defaults | §9.6 |
| `isActive` | bool | N | false | |
| `isFeatured` | bool | N | false | |
| `isVerified` | bool | N | false | |
| `priorityOrder` | int | N | 0 | |
| `viewCount` | int | N | 0 | server-managed |
| `enquiryCount` | int | N | 0 | server-managed |
| `publishedAt` | datetime | Y | null | set when `isActive` first becomes true |
| `createdBy`, `updatedBy` | int | Y | null | user ids (admin only) |

### 6.2 `localities` and `cities`

`localities`: `name` (string, unique per city), `slug` (unique), `cityId` (int), `city` (read), `zone` (`north|south|east|west|central`), `description` (HTML), `shortDescription` (≤ 300), `heroImageUrl?`, `latitude?`, `longitude?`, `pincodes` (string[]), `highlights` (string[]), `connectivity` (`{label, value}[]`), `avgPricePerSqft?` (int), `priceTrendNote?`, `isFeatured` (false), `isActive` (true), `order` (0), `seo`, `propertyCount` (read: active properties).
`cities`: `name`, `slug`, `state`, `isActive` (seed: `{id:1, name:'Bengaluru', slug:'bengaluru', state:'Karnataka', isActive:true}`).

### 6.3 `propertyTypes`
`name`, `slug` (**plural URL form**, D25: `apartments, villas, independent-houses, row-houses, penthouses, duplexes, studios, builder-floors, residential-plots, farm-land, office-spaces, co-working-spaces, retail-shops, warehouses, industrial-sheds, commercial-plots, pg-co-living`), `segment` (residential for the first 8; `residential-plots` and `farm-land` → `land`; `office-spaces`…`industrial-sheds` → `commercial`; `commercial-plots` → `land`; `pg-co-living` → `residential`), `icon` (Iconify id), `description?`, `isActive`, `order`, `seo`.

### 6.4 `amenities` and `badges`
`amenities`: `name`, `slug`, `category` (`basic|lifestyle|safety|sports|kids|eco|convenience|commercial`), `icon`, `isActive`, `order`. Seed ≥ 40 across all categories (e.g. basic: Power Backup, Lift, Water Supply, Piped Gas, Intercom; lifestyle: Swimming Pool, Clubhouse, Gymnasium, Spa, Mini Theatre, Library, Party Hall, Landscaped Gardens; safety: 24×7 Security, CCTV, Fire Safety, Gated Community, Video Door Phone; sports: Tennis, Badminton, Basketball, Cricket Pitch, Jogging Track, Yoga Deck, Table Tennis; kids: Kids Play Area, Crèche, Kids Pool; eco: Rainwater Harvesting, Solar Lighting, STP, Organic Waste Converter, EV Charging; convenience: Covered Parking, Visitor Parking, Wi-Fi, Convenience Store, ATM, Cafeteria; commercial: Conference Room, Reception, Pantry, Server Room, Loading Dock, Cold Storage).
`badges`: `name`, `slug`, `color` (**token name**, e.g. `primary`, `success`, `info`, `warning`, `charcoal` — never hex), `icon?`, `isActive`, `order`. Seed: New Launch, Hot Deal, Ready to Move, RERA Approved, Verified, Premium, Price Drop, Limited Units.

### 6.5 `developers`
`name`, `slug`, `logoUrl?`, `coverImageUrl?`, `description` (HTML), `shortDescription`, `establishedYear?`, `headquarters?`, `website?`, `totalProjects?`, `ongoingProjects?`, `completedProjects?`, `reraIds` (string[]), `highlights` (string[]), `isFeatured`, `isActive`, `order`, `seo`, `propertyCount` (read). **Seed developers are fictional** (e.g. "Aurelia Estates", "Nandi Ridge Developers", "Cauvery Homes", "Prakriti Builders", "Skyline Bengaluru", "Trident Habitat", "Vasanth Constructions", "Greenfield Realty").

### 6.6 `banks`
`name`, `slug`, `logoUrl?`, `interestRateMin` (number, % p.a.), `interestRateMax`, `processingFeeNote?`, `maxTenureYears`, `maxLtvPercent`, `minLoanAmount?`, `maxLoanAmount?`, `features` (string[]), `applyUrl?`, `isActive`, `order`. Seed: 6 **fictional** banks ("Garden City Bank", "Southern Housing Finance", "Nandi Cooperative Bank", "Cauvery Home Finance", "Metro Capital Bank", "Prime Housing NBFC"). Replaces `DEFAULT_BANKS`; when no active bank exists the finance section is hidden.

### 6.7 `leads`
`name` (N), `email?`, `phone` (N, Indian mobile), `message?`, `source` (LEAD_SOURCES), `propertyId?`, `property` (read `{id,title,slug}`), `articleId?`, `pageSlug?`, `pageUrl?`, `requirement` (`{ listingType?, propertyTypeId?, localityId?, bedrooms?, budgetMin?, budgetMax?, timeline? (immediate|1-3-months|3-6-months|6-12-months|exploring) }`), `status` (`new|contacted|qualified|site-visit|negotiation|converted|lost`, default new), `priority` (`low|medium|high`, default from `siteSettings.leads.defaultPriority`), `assignedTo?` (user id), `assignedUser` (read `{id,name}`), `followUpAt?`, `lostReason?`, `notes[]` (`{ id, text, createdBy, createdByName, createdAt }`), `activities[]` (`{ id, type (created|status-changed|assigned|note-added|follow-up-set|contacted|email-sent|call-logged|priority-changed), description, createdBy?, createdAt }`), `utm` (`{source?, medium?, campaign?, term?, content?}`), `consent` (bool), `meta?` (object — **D56**: free-form source-specific payload, e.g. the financial assessment answers/score and the bank name), `ipAddress?`, `userAgent?`.

### 6.8 `articles`, `articleCategories`, `articleTags`, `authors`
`articles`: `slug`, `title` (20–100), `excerpt` (≤ 300), `content` (sanitised HTML), `contentText` (read: plain text generated on save), `featuredImage` (`{url, alt, caption?}`), `categoryId`, `category` (read `{id,name,slug}`), `tagIds[]`, `tags` (read), `authorId`, `author` (read `{id,name,slug,avatarUrl,designation}`), `status` (`draft|scheduled|published|archived`), `publishedAt?`, `updatedAtDisplay?`, `readingTimeMinutes` (computed: ceil(words/200)), `wordCount` (computed), `isFeatured`, `allowComments` (false, reserved), `relatedArticleIds[]`, `relatedPropertyIds[]`, `faqs[]` (`{question, answer}`), `tableOfContents` (true), `seo`, `viewCount`.
`articleCategories`: `name`, `slug`, `description?`, `seo`, `order`, `isActive`, `articleCount` (read). Seed 4 (D76): `buying-guides` "Buying Guides", `market-trends` "Market Trends", `legal-rera` "Legal & RERA", `investment-finance` "Investment & Finance".
`articleTags`: `name`, `slug`, `articleCount` (read). Seed 15 (rera, khata, stamp-duty, home-loan, whitefield, sarjapur-road, north-bangalore, nri, rental-yield, plots, first-time-buyer, checklist, emi, registration, investment).
`authors`: `name`, `slug`, `designation?`, `bio` (HTML), `avatarUrl?`, `email?` (private), `socialLinks` (`{linkedin?, twitter?, website?}`), `isActive`, `seo`. Seed 3 placeholder authors ("Editorial Team", "Research Desk", "Legal Desk" — designations as placeholders).

### 6.9 `faqs`, `testimonials`, `teamMembers`, `partners`
`faqs`: `question`, `answer` (HTML), `category` (`buying|selling|renting|home-loan|legal|rera|nri|general`), `order`, `isActive`, `showOnHome` (bool), `propertyTypeId?`.
`testimonials`: `name`, `designation?`, `location?`, `rating` (1–5), `message`, `avatarUrl?`, `propertyId?`, `isFeatured`, `isActive`, `order`, `isSample` (true in seed; sample records never render in production builds).
`teamMembers`: `name`, `slug`, `designation`, `phone?`, `whatsapp?`, `email?`, `photoUrl?`, `bio?`, `reraId?`, `socialLinks` (object), `order`, `isActive`, `showOnAbout`.
`partners`: `name`, `logoUrl`, `websiteUrl?`, `category` (`developer|bank|legal|interior|other`), `order`, `isActive`.

### 6.10 `pages` (CMS)
`slug`, `title`, `template` (`standard|service|about|contact|careers|awareness|legal|landing`), `status` (`draft|published`), `heroImageUrl?`, `blocks[]` (`{ id, type, order, data }`), `leadSource?`, `seo`, `order`, `showInFooter` (bool), `footerColumn?` (`company|services|insights`), `showInHeader` (bool), `headerMenu?` (`buyer-assistance|company|insights`).

Block types and `data` shapes (BLOCK_TYPES):

| type | data |
|---|---|
| `hero` | `{ title, subtitle, imageUrl?, ctaLabel?, ctaHref? }` |
| `richText` | `{ html }` |
| `features` | `{ title, subtitle?, items[] { icon, title, text } }` |
| `steps` | `{ title, subtitle?, items[] { title, text } }` |
| `stats` | `{ items[] { label, value, suffix? } }` — rendered only when `items.length > 0` |
| `faq` | `{ title, faqIds[]?, items[] { question, answer }? }` |
| `cta` | `{ title, text, buttonLabel, buttonHref, leadSource? }` (when `leadSource` is set the button opens `LeadCaptureModal`) |
| `leadForm` | `{ title, subtitle, fields[] (LeadForm field config), leadSource, successMessage }` |
| `team` | `{ title, memberIds[] }` (empty = all `showOnAbout`) |
| `testimonials` | `{ title, ids[] }` (empty = featured) |
| `properties` | `{ title, mode (featured|ids|filter), ids[], filter {} }` |
| `articles` | `{ title, mode (latest|ids|category), ids[], categoryId? }` |
| `checklist` | `{ title, intro?, items[] { text, detail? } }` (interactive, progress persisted in localStorage `sna_checklist:<pageSlug>`) |
| `quiz` | `{ title, intro?, questions[] { question, options[], answerIndex, explanation } }` |
| `map` | `{ embedUrl? , latitude?, longitude? }` (falls back to settings) |
| `contactInfo` | `{}` (reads settings) |
| `image` | `{ url, alt, caption? }` |
| `banks` | `{ title, showEmiCalculator (bool) }` |
| `partners` | `{ title, category? }` |
| `html` | `{ html }` (sanitised) |
| `jobs` | `{ title }` (lists active jobs; careers template) |
| `facts` | `{ title, items[] { stat, label, icon } }` (the "Did you know" cards of the awareness page) |
| `expandableCards` | `{ title, items[] { id, icon, title, summary, html } }` (the "Essential knowledge" cards; also used by Legal services) |
| `packages` | `{ title, items[] { name, price, unit, features[], highlighted, ctaLabel? } }` (interior design packages; CTA opens lead modal with the page's `leadSource`) |
| `gallery` | `{ title, items[] { url, alt, caption? } }` |

Seed pages (each reproduces the HOM page's structure/type of content with SNA-neutral placeholder copy): `home` (landing: `features` "Why choose Squares N Acres" ×4, `steps` "How it works" ×4), `about` (about: hero, richText story, `steps` timeline-as-steps, `features` values, richText mission/vision, `stats` (empty → hidden), `team`, `testimonials`, `cta`), `contact` (contact: hero, `contactInfo`, `leadForm` source `contact-page` with subject select, `map`), `sell-let` (service: hero, `stats` (empty), `features` benefits ×4, `steps` ×4, `leadForm` source `sell-let` with propertyType/location/askingPrice/description fields), `careers` (careers: hero, `features` culture ×3, `jobs`, `features` perks ×6), `partnership` (service: hero, `features` why ×4, `features` types ×4, `partners`, `leadForm` source `partnership` with companyName/partnershipType), `buyer-assistance/home-loan` (service: hero, `banks` with EMI calculator, `steps` ×4, `checklist` documents ×8, `leadForm` source `home-loan` with monthlyIncome/desiredLoanAmount, `faq`), `buyer-assistance/legal-assistance` (service: hero, `stats` (empty), `expandableCards` services ×6, `steps` ×3, `leadForm` source `legal-assistance` with serviceType, `faq`), `buyer-assistance/interior-designing` (service: hero, `features` rooms ×6, `steps` ×5, `gallery` ×8 placeholders, `packages` ×3, `leadForm` source `interior-design` with propertyType/budget), `flexible-workspace` (service: hero, `features` ×6, `features` benefits ×4, `leadForm` source `flexible-workspace` with workspaceType/teamSize), `direct-lease-retails` (service: hero, `features` ×4, `features` ×4, `steps` ×4, `leadForm` source `direct-lease-retail` with spaceType/areaRequired), `insights/real-estate-awareness` (awareness: hero, `facts` ×6, `expandableCards` ×6, `quiz` ×5, `checklist` ×10, `leadForm` source `real-estate-awareness` with interest select), `privacy-policy`, `terms-of-use`, `disclaimer` (legal: hero + richText placeholders clearly marked "[Client to provide]").

### 6.11 `jobOpenings`, `jobApplications`
`jobOpenings`: `slug`, `title`, `department`, `location`, `employmentType` (`full-time|part-time|contract|internship`), `experience?`, `description` (HTML), `responsibilities[]`, `requirements[]`, `salaryRange?`, `isActive`, `postedAt`, `closesAt?`.
`jobApplications`: `jobId`, `job` (read `{id,title,slug}`), `name`, `email`, `phone`, `resumeUrl`, `coverLetter?`, `linkedinUrl?`, `status` (`new|shortlisted|interview|rejected|hired`), `notes?`, `createdAt`.

### 6.12 `media`
`url`, `publicId?`, `provider` (`cloudinary|external`), `type` (`image|video|document`), `width?`, `height?`, `bytes?`, `format?`, `alt`, `title?`, `folder?`, `tags[]`, `usedIn[]?` (read, best-effort `{type,id,title}`), `createdBy?`, `createdAt`.

### 6.13 `siteSettings` (singleton object, not an array)
```
general { siteName:'Squares N Acres', tagline, logoUrl, iconUrl, siteUrl, defaultLanguage:'en-IN', contactEmail, contactPhone, alternatePhone?, whatsappNumber, whatsappDefaultMessage,
          address { line1, line2?, locality?, city, state, pincode, country }, mapEmbedUrl?, latitude?, longitude?, workingHours[] { days, hours }, reraNumber?, gstNumber?, establishedYear? }
hero { title, subtitle, backgroundImageUrl?, backgroundVideoUrl?, mobileImageUrl?, searchTabs[] (sale|rent|lease|commercial|plots), stats[] { label, value, suffix? } (empty = hidden), badges[] (strings) }
navigation { headerCtaLabel:'Post Requirement', headerCtaHref:'#post-requirement', showCallButton:true, showWhatsappButton:true }
social { facebook?, instagram?, linkedin?, youtube?, x?, pinterest? }
footer { aboutText, columns[] { title, links[] { label, href, external } }, disclaimer, copyrightText, showNewsletter:true, showGallery:false, galleryImageUrls[] }
newsletter { enabled:true, title, subtitle, successMessage }
integrations { googleAnalyticsId?, googleTagManagerId?, facebookPixelId?, googleMapsApiKey?, cloudinaryCloudName?, cloudinaryUploadPreset?, recaptchaSiteKey? }
leads { notificationEmails[], autoAssign ('none'|'round-robin'), defaultPriority:'medium' }
updatedAt
```
Public subset (`GET /settings`): everything except `leads` and `integrations.recaptchaSiteKey`-style secrets (`integrations` public keys: `googleAnalyticsId`, `googleTagManagerId`, `facebookPixelId`, `googleMapsApiKey`, `cloudinaryCloudName`, `cloudinaryUploadPreset`, `recaptchaSiteKey` are all public by nature — there are no secrets in the model; `leads.*` is admin-only).

### 6.14 `seoSettings` (singleton), `redirects`, `newsletterSubscribers`, `adminUsers`, `apiTokens`, `propertyViews`
`seoSettings`: `siteUrl`, `separator` (`'|'`), `titleTemplates { default, home, property, listing, locality, developer, article, articleCategory, page, author, search }` (§9.5 defaults), `defaults { metaDescription, ogImageUrl, twitterCard:'summary_large_image', robots { index:true, follow:true } }`, `knowledgeGraph { type (Organization|RealEstateAgent|LocalBusiness), name, legalName?, logoUrl, description, phone, email, address { streetAddress, addressLocality, addressRegion, postalCode, addressCountry:'IN' }, geo { latitude, longitude }, openingHours[] (schema.org strings), priceRange?, areaServed[], sameAs[] }`, `verification { google?, bing?, pinterest?, yandex? }`, `robotsTxt` (string, §9.8 default), `llmsTxt` (string), `sitemap { enabled, includeProperties, includeLocalities, includeDevelopers, includeArticles, includePages, changefreq { property:'weekly', locality:'weekly', developer:'monthly', article:'monthly', page:'monthly' }, priority { property:0.8, locality:0.7, developer:0.6, article:0.6, page:0.5 }, excludeUrls[] }`, `breadcrumbs { enabled:true, homeLabel:'Home' }`, `noindex { searchResults:true, paginatedListings:false, filteredListings:true, adminAndAuth:true }`, `customHeadHtml?`, `customBodyEndHtml?`, `updatedAt`.
`redirects`: `fromPath`, `toPath`, `statusCode` (301|302), `isActive`, `hits`, `note?`.
`newsletterSubscribers`: `email` (unique), `name?`, `source`, `status` (`subscribed|unsubscribed`).
`adminUsers`: `name`, `email` (unique), `password` (**plaintext only in the mock seed**; Laravel hashes), `role` (`admin|manager|sales`), `phone?`, `avatarUrl?`, `isActive`, `lastLoginAt?`. Seed: `admin@squaresnacres.com / Admin@123`, `manager@squaresnacres.com / Manager@123`, `sales@squaresnacres.com / Sales@123` (mock only; documented for rotation).
`apiTokens` (mock only): `userId`, `token` (48 chars), `expiresAt`, `createdAt`.
`propertyViews` (optional analytics): `propertyId`, `viewedAt`, `referrer?` — the mock appends one record per counted view and the dashboard `viewsByDay` reads it.

### 6.15 HOM → SNA field mapping (prompt 05 copies this into `docs/DATA_MODEL.md`; prompt 10 applies it when writing the seed)

| HOM (`db.json` / form) | SNA | Rule |
|---|---|---|
| `properties.type` (`sale|rent`) | `listingType` | + `lease` supported |
| `status` (`pre-launch|under-construction|ready-to-move`) | `constructionStatus` | + `resale` |
| `propertyType` / `category` (`apartment`, `villa`, …) | `propertyTypeId` → `propertyTypes.slug` plural (`apartments`, `villas`) | `segment` derived from the type |
| `publishStatus` (`published|draft`) / `isActive` | `isActive` (+ `publishedAt`) | draft ⇒ `isActive:false` |
| `price` + `priceUnit` (`onwards`, `per month`, `Cr`, `Lakhs`) | sale: `pricing.price` (= starting price), `pricing.priceRangeMax` when unit configurations exist; rent/lease: `pricing.rentPerMonth` | `priceUnit` dropped |
| `configuration[]` (`"2 BHK"`, `"3 BHK"`) | `unitConfigurations[].name/bedrooms` + `configuration.bedrooms` = min | strings parsed with `/(\d+(\.\d+)?)\s*BHK/` |
| `dimensionRange {min,max,unit}` | `area.superBuiltUpArea` = min, `area.areaUnit` = unit; max lives in `unitConfigurations` | |
| `possession` (string) | `possessionDate` (yyyy-mm-01) or `ageOfPropertyYears` for ready-to-move | "Ready to Move" ⇒ null |
| `developer` (string) + `developerInfo {name,description,logo,stats[]}` | `developers` record + `project.developerId`; `stats` → `establishedYear`/`totalProjects`/`completedProjects` | fictional names in seed |
| `description` (plain text) | `description` (HTML `<p>…</p>`) | |
| `highlights[]` (strings) + `specialities[] {icon,name,description}` | `highlights[]` strings (`name — description`) | icons dropped (D60) |
| `specifications` object (`projectArea, towers, totalUnits, floors, constructionType, reraId, launchDate, possessionDate`) / `specificationsArray[] {key,value,icon}` | `project.projectAreaAcres/totalTowers/totalUnits/totalFloors/launchDate`, `reraNumber`, `possessionDate`, remaining → `specifications[] { group:'other', label:key, value }` | |
| `constructionSpecs { flooring:[{area,spec}], doors, structure, electrical, plumbing, others }` | `constructionSpecs[] { group (flooring→flooring, doors→doors-windows, structure→structure, electrical→electrical, plumbing→bathroom, others→other), label:area, value:spec }` | |
| `amenities[] {icon,name,category}` | `amenityIds[]` (matched by name to master data; unknown → created in seed) | categories re-mapped (leisure→lifestyle, fitness→lifestyle) |
| `floorPlans[] {config, area, price, image, bedrooms, bathrooms}` | `unitConfigurations[]` **and** `floorPlans[]` | see D61 |
| `gallery[]` (URL strings incl. `.mp4`) | `images[] {url, alt, order, isCover}`; video URLs → `videoUrl` | alt generated `"<title> – photo n"` in seed, then improved manually |
| `brochureUrl`, `floorPlanPdfUrl` | `brochureUrl` (+ `brochureLeadGated:true`); `floorPlanPdfUrl` → `floorPlans[0].pdfUrl` | |
| `documents[] {name, icon, url}` | `documents[] {title, url, type, leadGated:true, order}` | type by name (RERA→approval, brochure→brochure, floor plan→floor-plan, else other) |
| `nearbyPlaces[] {name, distance:"3 km", type}` | `nearbyPlaces[] {name, category, distanceKm, order}` | type map: education→school, healthcare→hospital, shopping→mall, transport→metro (or other), workplace→it-park, landmark→other, entertainment→other, school→school, hospital→hospital, restaurant→restaurant, park→park, bank→bank |
| `constructionTimeline[] {label,status:pending|in-progress|completed,icon}` | `constructionTimeline[] {milestone,status: pending→upcoming, order}` | |
| `faqs[] {question,answer}` | `faqs[] {id,question,answer (HTML),order}` | |
| `similarPropertyIds[]` (strings) | `similarPropertyIds[]` (ints) | |
| `tags[]` (`featured, popular, just-launched, premium, hot-deal, trending, new-launch, …`) | `isFeatured` (from `featured`), `badgeIds` (`premium`→Premium, `hot-deal`→Hot Deal, `new-launch`/`just-launched`→New Launch, `ready-to-move`→Ready to Move); everything else dropped | D58 |
| `sections {overview, details, highlights, amenities, floorPlans, finance, location, documents, construction, constructionSpecs, developer, faqs, similar}` | `sectionVisibility` (details→specifications, constructionSpecs→specifications, location→location+nearby, developer→builder; new keys default true) | D59 |
| `seoTitle, seoDescription, seoKeywords[], canonicalUrl, ogTitle, ogDescription, ogImage, twitterCard, schemaMarkup` | `seo.title`, `seo.description`, `seo.focusKeyword` = keywords[0], `seo.secondaryKeywords` = keywords[1..4], `seo.canonicalUrl` regenerated, `seo.og.*`, `seo.twitter.card`; `schemaMarkup` dropped (auto-generated) | |
| `location {area, city, state, lat, lng, address}` | `location.localityId` (locality matched/created from `area`), `cityId`, `address`, `latitude`, `longitude`, `showExactLocation:false` | |
| `neighborhoods {name, image, propertyCount, city, isActive}` | `localities {name, slug, heroImageUrl, cityId, isActive, order}`; `propertyCount` computed | |
| `partners {name, logo, website, isActive, order}` | `partners {name, logoUrl, websiteUrl, category:'developer', isActive, order}` | fictional names |
| `faqs.category` `finance` | `home-loan` | answers wrapped in `<p>` |
| `articles {content (Markdown), image, category (enum), tags[] strings, author string, readTime, isTrending, trendingOrder, isActive, seoTitle, seoDescription}` | `content` HTML, `featuredImage{url,alt}`, `categoryId`, `tagIds[]`, `authorId`, `readingTimeMinutes` computed, trending dropped (viewCount), `status`, `seo.title/description` | |
| `leads {source, notes[] {text, addedAt}, assessmentData, propertyId mixed types}` | `source` via the map in §6.17, `notes[] {id,text,createdBy,createdByName,createdAt}`, `meta` = assessmentData, `propertyId` int | |
| `siteSettings {contactInfo, socialLinks, newsletterText, newsletterSubtitle, heroText{title,subtitle,backgroundMedia,backgroundImage}, tagline, companyName, companySubtitle, companyDescription, footerLinks, footerLinkGroups, footerGallery}` | `general.contact*`, `social`, `newsletter.title/subtitle`, `hero.title/subtitle/backgroundVideoUrl/backgroundImageUrl`, `general.tagline`, `general.siteName`, `footer.aboutText`, `footer.columns` (from `footerLinkGroups`), `footer.galleryImageUrls` (from `footerGallery`, default hidden); `companySubtitle` and legacy `footerLinks` dropped | |
| `adminUsers {avatar}` | `avatarUrl` | new emails/passwords |

### 6.16 Dashboard response (`GET /admin/dashboard`)
```
{ data: {
  stats: { propertiesTotal, propertiesActive, propertiesFeatured, propertiesInactive, leadsTotal, leadsNew, leadsToday, leadsThisMonth, leadsLastMonth,
           conversionRate (converted / total, %, 1 decimal), articlesPublished, articlesDraft, viewsThisMonth, enquiriesThisMonth, subscribers },
  trends: { leadsByDay: [30 × {date:'yyyy-mm-dd', count}], leadsBySource: [{source, count}], leadsByStatus: [{status, count}], viewsByDay: [30 × {date, count}] },
  recentLeads: [10 × lead summary {id,name,phone,source,status,propertyId,property,createdAt,assignedTo}],
  topProperties: [5 × {id, title, slug, viewCount, enquiryCount}],
  seoHealth: { averageScore, good, ok, poor, missingFocusKeyword, missingMetaDescription },
  upcomingFollowUps: [10 × {id, name, followUpAt, status, assignedTo}]
} }
```
For the `sales` role every lead figure is scoped to leads assigned to the user or unassigned; property/article/SEO figures are global.

### 6.17 Canonical enums (`src/config/enums.js` — the only place; every dropdown, filter, chip, label and validation imports from here)

**Decision D36b:** `src/config/enums.js`, `src/services/endpoints.js`, `src/services/schemas/*.js` and `mock-server/schemas/*.js` are authored in **CommonJS** (`module.exports = { LISTING_TYPES, … }`, no `import`/`export` keywords) so that webpack (CRA), Jest **and** Node can all load the same file: React code writes `import { LISTING_TYPES } from '../config/enums';` (webpack interops CJS named exports), the mock server and scripts write `const { LISTING_TYPES } = require('../src/config/enums');`. The same rule applies to `mock-server/schemas/*.js` and `src/services/schemas/*.js` (shared descriptors). A helper `makeEnum(entries)` inside `enums.js` builds `{ values, options, labelOf, meta }` from `[{ value, label, ...meta }]` entries.

Each enum exports `values` (array), `options` (`[{value,label}]`), `labelOf(value)`, and where noted extra metadata:

- `LISTING_TYPES`: `sale` "Buy", `rent` "Rent", `lease` "Lease" (+ `verbOf(value)` → "for Sale"/"for Rent"/"for Lease").
- `SEGMENTS`: `residential` "Residential", `commercial` "Commercial", `land` "Plots & Land".
- `CONSTRUCTION_STATUS`: `pre-launch` "Pre-Launch", `under-construction` "Under Construction", `ready-to-move` "Ready to Move", `resale` "Resale".
- `AVAILABILITY`: `available` "Available", `sold` "Sold", `rented` "Rented", `reserved` "Reserved".
- `FURNISHING`: `unfurnished` "Unfurnished", `semi-furnished` "Semi-furnished", `fully-furnished` "Fully furnished".
- `FACING`: `north, south, east, west, north-east, north-west, south-east, south-west` (labels Title Case with hyphen kept: "North-East").
- `OWNERSHIP`: `freehold` "Freehold", `leasehold` "Leasehold", `co-operative-society` "Co-operative Society", `power-of-attorney` "Power of Attorney".
- `AREA_UNITS`: `sqft` "sq ft", `sqm` "sq m", `sqyd` "sq yd", `acre` "acre", `cent` "cent", `guntha` "guntha" (+ `toSqft(value, unit)` factors: sqm 10.7639, sqyd 9, acre 43560, cent 435.6, guntha 1089).
- `BEDROOM_OPTIONS`: `1,2,3,4,5` with labels "1 BHK", "2 BHK", "3 BHK", "4 BHK", "5+ BHK" (`5` = ≥ 5).
- `PRICE_BUCKETS_SALE`: `[{min:0,max:2500000,label:'Up to ₹25 L'},{2500000,5000000,'₹25 L – ₹50 L'},{5000000,7500000,'₹50 L – ₹75 L'},{7500000,10000000,'₹75 L – ₹1 Cr'},{10000000,15000000,'₹1 Cr – ₹1.5 Cr'},{15000000,25000000,'₹1.5 Cr – ₹2.5 Cr'},{25000000,50000000,'₹2.5 Cr – ₹5 Cr'},{50000000,100000000,'₹5 Cr – ₹10 Cr'},{100000000,null,'₹10 Cr+'}]`; `PRICE_BUCKETS_RENT`: `[{0,10000,'Up to ₹10 K'},{10000,20000,'₹10 K – ₹20 K'},{20000,35000,'₹20 K – ₹35 K'},{35000,50000,'₹35 K – ₹50 K'},{50000,75000,'₹50 K – ₹75 K'},{75000,100000,'₹75 K – ₹1 L'},{100000,200000,'₹1 L – ₹2 L'},{200000,500000,'₹2 L – ₹5 L'},{500000,null,'₹5 L+'}]` (lease uses the rent buckets). URL form: `minPrice`/`maxPrice`.
- `LEAD_STATUS` (value, label, color token): `new` "New" `info`; `contacted` "Contacted" `warning`; `qualified` "Qualified" `info`; `site-visit` "Site Visit" `primary`; `negotiation` "Negotiation" `warning`; `converted` "Converted" `success`; `lost` "Lost" `error`. Pipeline order = this order (lost is terminal, outside the funnel).
- `LEAD_PRIORITY`: `low` "Low" `muted`, `medium` "Medium" `info`, `high` "High" `error`.
- `LEAD_SOURCES` (value → label): `property-enquiry` "Property Enquiry", `brochure-download` "Brochure Download", `floor-plan-request` "Floor Plan Request", `document-request` "Document Request", `price-request` "Price Request", `site-visit-request` "Site Visit Request", `callback-request` "Callback Request", `post-requirement` "Post Requirement", `contact-page` "Contact Page", `home-loan` "Home Loan", `financial-assessment` "Financial Assessment", `bank-eligibility` "Bank Eligibility", `legal-assistance` "Legal Assistance", `interior-design` "Interior Design", `sell-let` "Sell / Let", `careers` "Careers", `partnership` "Partnership", `flexible-workspace` "Flexible Workspace", `direct-lease-retail` "Direct Lease & Retail", `real-estate-awareness` "Real Estate Awareness", `newsletter` "Newsletter", `article` "Article", `faq` "FAQ", `locality-page` "Locality Page", `developer-page` "Developer Page", `whatsapp-click` "WhatsApp Click", `call-click` "Call Click", `hero-search` "Hero Search". Legacy map (`LEGACY_LEAD_SOURCE_MAP`, used by the seed conversion and by the mock to accept old values): `property-detail-page→property-enquiry, property_enquiry→property-enquiry, property-listing-page→property-enquiry, homepage-contact-form→contact-page, contact→contact-page, website→contact-page, home_loan→home-loan, legal_assistance→legal-assistance, interior_design→interior-design, sell_let→sell-let, flexible_workspace→flexible-workspace, direct_lease_retails→direct-lease-retail, real_estate_awareness→real-estate-awareness, newsletter_articles→newsletter, article_detail→article, faq_contact→faq, brochure_download→brochure-download, floorplan_download→floor-plan-request, floorplan_request→floor-plan-request, document_download→document-request, detailed_pricing→price-request, bank-eligibility-check→bank-eligibility, financial-assessment→financial-assessment`.
- `LEAD_ACTIVITY_TYPES`: `created, status-changed, assigned, note-added, follow-up-set, contacted, email-sent, call-logged, priority-changed`.
- `REQUIREMENT_TIMELINES`: `immediate` "Immediately", `1-3-months` "1–3 months", `3-6-months` "3–6 months", `6-12-months` "6–12 months", `exploring` "Just exploring".
- `ARTICLE_STATUS`: `draft` "Draft" `muted`, `scheduled` "Scheduled" `info`, `published` "Published" `success`, `archived` "Archived" `warning`.
- `PAGE_STATUS`: `draft`, `published`. `PAGE_TEMPLATES`: `standard, service, about, contact, careers, awareness, legal, landing`. `HEADER_MENUS`: `buyer-assistance` "Buyer Assistance", `company` "Company", `insights` "Insights". `FOOTER_COLUMNS`: `company`, `services`, `insights`.
- `BLOCK_TYPES`: the 23 types of §6.10 with labels and an `icon` each.
- `MEDIA_TYPES`: `image, video, document`. `MEDIA_PROVIDERS`: `cloudinary, external`.
- `ROLES`: `admin` "Admin", `manager` "Manager", `sales` "Sales".
- `SORT_OPTIONS`: `relevance` "Relevance", `newest` "Newest first", `price-asc` "Price: Low to High", `price-desc` "Price: High to Low", `area-desc` "Area: Largest first", `popular` "Most viewed".
- `NEARBY_CATEGORIES` (value, label, icon): `school` "Schools" `mdi:school-outline`, `hospital` "Hospitals" `mdi:hospital-box-outline`, `metro` "Metro" `mdi:train-variant`, `railway` "Railway" `mdi:train`, `airport` "Airport" `mdi:airplane`, `mall` "Malls & Shopping" `mdi:shopping-outline`, `it-park` "IT Parks & Offices" `mdi:office-building-outline`, `restaurant` "Restaurants" `mdi:silverware-fork-knife`, `park` "Parks" `mdi:tree-outline`, `bank` "Banks & ATMs" `mdi:bank-outline`, `other` "Other" `mdi:map-marker-outline`.
- `AMENITY_CATEGORIES`: `basic` "Basic", `lifestyle` "Lifestyle", `safety` "Safety & Security", `sports` "Sports", `kids` "Kids", `eco` "Eco-friendly", `convenience` "Convenience", `commercial` "Commercial".
- `FAQ_CATEGORIES`: `buying` "Buying", `selling` "Selling", `renting` "Renting", `home-loan` "Home Loans", `legal` "Legal", `rera` "RERA", `nri` "NRI", `general` "General".
- `SPEC_GROUPS`: `structure` "Structure", `flooring` "Flooring", `kitchen` "Kitchen", `doors-windows` "Doors & Windows", `bathroom` "Bathroom", `electrical` "Electrical", `walls-painting` "Walls & Painting", `security` "Security", `lift-common-areas` "Lift & Common Areas", `other` "Other".
- `DOCUMENT_TYPES`: `brochure` "Brochure", `approval` "Approval / Certificate", `legal` "Legal", `floor-plan` "Floor Plan", `price-list` "Price List", `other` "Other".
- `TIMELINE_STATUS`: `completed` "Completed" `success`, `in-progress` "In Progress" `warning`, `upcoming` "Upcoming" `muted`.
- `KITCHEN_TYPES`: `modular`, `semi-modular`, `regular`. `LOCALITY_ZONES`: `north` "North Bengaluru", `south` "South Bengaluru", `east` "East Bengaluru", `west` "West Bengaluru", `central` "Central Bengaluru". `PROJECT_APPROVALS`: `bbmp` "BBMP", `bda` "BDA", `bmrda` "BMRDA", `biaapa` "BIAAPA", `rera` "RERA", `other` "Other".
- `EMPLOYMENT_TYPES`: `full-time, part-time, contract, internship`. `JOB_APPLICATION_STATUS`: `new` `info`, `shortlisted` `primary`, `interview` `warning`, `rejected` `error`, `hired` `success`. `PARTNER_CATEGORIES`: `developer, bank, legal, interior, other`. `HERO_SEARCH_TABS`: `sale` "Buy", `rent` "Rent", `lease` "Lease", `commercial` "Commercial", `plots` "Plots".
- `SEO_SCHEMA_TYPES`: `auto, RealEstateListing, Article, BlogPosting, NewsArticle, FAQPage, WebPage, Place, Organization, LocalBusiness, Product, Event`. `SEO_SCORE_BANDS`: `good` (≥ 81, `success`), `ok` (51–80, `warning`), `poor` (≤ 50, `error`), `none` (not analysed, `muted`). `REDIRECT_CODES`: `301`, `302`. `SEO_ENTITY_TYPES`: `property, article, page, locality, developer, articleCategory, author, propertyType`.

---

## 7. RBAC matrix

Enforced three times: (1) `ProtectedRoute` (authenticated) + `RoleRoute allowedRoles={[…]}` around every admin route; (2) navigation items hidden per role (`src/config/rbac.js` `NAV_ITEMS[].roles`, `ROUTE_PERMISSIONS`, `hasRouteAccess`, `getNavItemsForRole`, `getDefaultRoute` → always `/admin/dashboard`); (3) the API (`mock-server/middleware/role.js`, 403). Components never hardcode `role === 'admin'`; they call `useAdminAuth().can('area', 'action')` which reads the matrix below from `rbac.js` (`PERMISSIONS[area][action] = [roles]`).

| Area (`rbac.js` key) | admin | manager | sales |
|---|---|---|---|
| `dashboard` | full | full | own leads stats + property counts |
| `properties` (`view`, `create`, `edit`, `delete`, `bulk`, `duplicate`) | all | all | `view` only (read-only list + "View on site"; form opens read-only) |
| `masterData` (localities, cities, property types, amenities, badges, developers, banks) | all | all | — |
| `leads` (`view`, `edit`, `assign`, `export`, `delete`, `bulk`) | all | all | `view`/`edit` only on leads assigned to self or unassigned; may `claim`; no `assign` to others, no `delete`, no `export` (export of own leads allowed — decision: **yes**, `export` allowed for sales, server-scoped) |
| `articles` (+ categories, tags, authors) | all | all | — |
| `content` (pages CMS, FAQs, testimonials, team, partners, jobs & applications, newsletter subscribers) | all | all | — |
| `seo` (panels, dashboard, redirects, SEO settings, guide) | all | all | — |
| `media` | all | all | — |
| `settings` (general, contact, hero, navigation/footer, newsletter, integrations, lead notifications) | all | read-only (form disabled, no Save) | — |
| `users` | all | — | — |
| `profile` (own profile & password) | ✔ | ✔ | ✔ |

Route permission map (`ROUTE_PERMISSIONS`): `/admin/dashboard` all; `/admin/properties` all (sales read-only inside); `/admin/leads` all; `/admin/articles`, `/admin/pages`, `/admin/faqs`, `/admin/testimonials`, `/admin/team`, `/admin/partners`, `/admin/jobs`, `/admin/newsletter`, `/admin/media`, `/admin/seo`, `/admin/master-data/*` → admin+manager; `/admin/settings` → admin+manager (manager read-only); `/admin/settings/users` → admin; `/admin/profile` all. Login redirects to `location.state.from` when allowed, else `/admin/dashboard`; a forbidden route renders the `Forbidden` (403) page inside the admin layout with a "Go to dashboard" `Link` (no full reload).

---

## 8. UI/UX principles, design system, breakpoints, accessibility

### 8.1 Breakpoints (MUI defaults; single source of truth for CSS and JS)
`xs` 0–599 (mobile), `sm` 600–899 (tablet), `md` 900–1199 (laptop), `lg` 1200+ (desktop), `xl` 1536+. **The mobile/desktop switch is `md` (900 px) everywhere**: `useBreakpoint()` hook → `{ isMobile: below 900, isTablet: 600–899, isDesktop: ≥ 900 }`; CSS modules use `@media (max-width: 899.98px)` and `@media (min-width: 900px)` (and 599.98/600 for the phone tier). The boilerplate's 960/961/768/1024 breakpoints are removed (the 900–960 px "no header" gap is a live bug, §11). Test widths: 360, 390, 414, 768, 1024, 1280, 1536. Touch targets ≥ 44 px; sticky elements respect `--safe-bottom`; no horizontal scroll ever (`html, body { overflow-x: clip }` + tests); images always in aspect-ratio boxes; fonts `display=swap`; skeletons match the final layout.

### 8.2 States everywhere
Every data-driven view implements: **loading** (layout-identical skeleton), **empty** (icon + one-line explanation + a CTA that makes sense: "Clear filters", "View all in Whitefield", "Add your first property"), **error** (inline `ErrorState` with "Try again" → `refetch`), **success** (toast for actions), **confirm** (`ConfirmDialog` for destructive actions, danger button, item name in the copy), optimistic toggles in admin with rollback + error toast on failure, 404 page with search + popular links, branded `ErrorBoundary` page ("Something went wrong", "Reload", "Go home").

### 8.3 Accessibility (WCAG 2.1 AA)
Semantic landmarks (`header`, `nav`, `main#main-content`, `footer`, `aside`); exactly one `<h1>` per page; visible focus ring `outline: 2px solid var(--color-focus); outline-offset: 2px`; keyboard-operable menus, dialogs (focus trap, `Escape`, `aria-modal`, `role="dialog"`, labelled by title), carousels (arrow keys), filters, accordions (`aria-expanded` + `aria-controls`), tabs (roving tabindex); `aria-*` on custom controls; alt text from data (decorative images `alt=""`); contrast verified by `scripts/contrast-check.js`; `prefers-reduced-motion` honoured (framer-motion `useReducedMotion`, CSS media query); skip link kept; form labels visible (no placeholder-only inputs), errors linked with `aria-describedby` and `aria-invalid`, `role="alert"` on submit errors; `aria-live="polite"` for toasts/result counts.

### 8.4 UI kit (`src/components/ui/`, prompt 04) — names and key props
`Button` (`variant: primary|secondary|outline|ghost|danger|link`, `size: sm|md|lg`, `loading`, `icon`, `href`/`to`), `IconButton` (`label` required → `aria-label`), `Chip` (`color` token, `variant: filled|soft|outline`, `onDelete`), `Badge` (property badges), `Card` (`padding`, `hoverable`, `as`), `Section` (`background: bg|surface`, `spacing`, replaces the 13 duplicated page-level `Section` components; uses `useInView` fade-up honouring reduced motion) + `SectionHeader` (`eyebrow`, `title` (H2), `subtitle`, `action`), `Container` (`size: default|narrow|wide`), `Breadcrumbs` (`items[{label,to}]`, emits `BreadcrumbList` via `<Seo>` props), `Tabs`, `Modal` (desktop dialog / mobile full-screen or bottom sheet via `mobile: 'sheet'|'fullscreen'`), `BottomSheet`, `Drawer`, `Skeleton` (+ layout presets in `common/SkeletonLoaders.jsx`: `PropertyCardSkeleton`, `PropertyGridSkeleton`, `PropertyDetailSkeleton`, `ArticleCardSkeleton`, `ArticleGridSkeleton`, `PageHeroSkeleton`, `TableSkeleton`, `PageLoader` (monogram + "Loading…")), `EmptyState` (`icon`, `title`, `text`, `action`), `ErrorState` (`onRetry`), `Alert`, `Tooltip`, `Pagination` (`page`, `totalPages`, `onChange`, renders `rel=prev/next` links), `Price` (`value`, `listingType`, `onRequest`, `perMonth`), `Area` (`value`, `unit`), `Rating`, `Avatar` (initials fallback), `LazyImage` (`src`, `alt`, `ratio`, `sizes`, `widths[]`, Cloudinary `srcSet`, blur-up placeholder, `loading="lazy"`, `decoding="async"`, `onErrorFallback`), `Picture` (art direction), `Carousel` (`itemsPerView` per breakpoint, `autoplay`, `loop`, keyboard, dots, arrows), `Accordion` (`items`, `single`), `Stepper`, `StatCard`, `DataTable` (admin: server-side; `columns`, `rows`, `meta`, `onPageChange`, `onSortChange`, `selectable`, `bulkActions`, `rowActions`, `loading`, `emptyState`, mobile card renderer), `FormField` wrappers (`TextField`, `SelectField`, `SwitchField`, `CheckboxGroup`, `RadioGroup`, `DateField`, `NumberField` with Indian formatting, `TextareaField`, `UrlField`, `PhoneField`), `ConfirmDialog` (`open`, `title`, `message`, `confirmLabel`, `danger`, `onConfirm`, `loading`), `Logo` (`variant: wordmark|monogram`, `height`), `Eyebrow`, `Divider`, `Kbd`.

### 8.5 Copywriting
Concise, benefit-led, India-specific vocabulary (BHK, sq ft, carpet area, khata, RERA, possession, EMI, FOIR). No lorem ipsum anywhere. Every company-specific string comes from settings or pages. Microcopy defaults live in `src/config/copy.js` (buttons, empty states, errors) so they are reviewed once (prompt 43).

### 8.6 Performance budget
Route-level + heavy-component code splitting; `React.memo` on cards; `useInView` lazy sections; Cloudinary transformations for all Cloudinary images (`f_auto,q_auto,w_…`), `srcSet` widths `[320, 480, 640, 960, 1280, 1600]`; fonts `display=swap` + preconnect; no MUI barrel imports of icons; max 24 items per page; Lighthouse mobile targets (prompt 46): Performance ≥ 85, SEO ≥ 95, Accessibility ≥ 95, Best Practices ≥ 95 on Home, Listing, Property details, Locality, Article index, Article; LCP < 2.5 s, CLS < 0.1, TBT < 200 ms. `web-vitals` reports to GA4 when configured.

---

## 9. SEO principles and the `<Seo>` component contract

### 9.1 Where things live
- `src/seo/` — the engine (pure functions, Jest-tested): `analyzers/` (`basic.js`, `additional.js`, `titleReadability.js`, `contentReadability.js`, `index.js`), `score.js` (`WEIGHTS` per entity type summing to 100, bands: **Good ≥ 81 green, OK 51–80 amber, Poor ≤ 50 red**), `readability.js` (Flesch Reading Ease, sentence/paragraph length, subheading distribution, passive-voice heuristic, transition words), `snippet.js` (character + pixel-width estimation via canvas `measureText` — Arial 20 px for titles / 14 px for descriptions, limits ≈ 580 px title / ≈ 920 px description; character guides 50–60 / 120–160; a Node fallback uses a per-character width table when `document` is undefined), `variables.js` (§9.5), `schema/` (one generator per JSON-LD type + `validate.js` structural validator + `graph.js` merger with stable `@id`s), `keywords.js` (density, distribution, stemming-light matching incl. Indian-English plurals, uniqueness via `/admin/seo/overview`), `urls.js` (canonical builder, index-worthy filter whitelist, trailing-slash policy "none"), `data/powerWords.js`, `data/stopWords.js`, `index.js` (`analyze(entityType, entity, context)` → `{ score, band, testsPassed, testsTotal, groups: { basic, additional, titleReadability, contentReadability } }`).
- `src/components/seo/SeoPanel/` — the admin UI (entity-type aware; tests that do not apply to a type are skipped and not counted).
- `src/components/seo/Seo.jsx` — the single public head component.
- `/admin/seo` (dashboard), `/admin/seo/settings`, `/admin/seo/redirects`, `/admin/seo/guide` (the rewritten SeoGuidelines playbook).

### 9.2 `<Seo>` props
```js
<Seo
  type="home|property|listing|locality|developer|article|articleCategory|articleTag|author|page|search|admin|notFound|error|shortlist|jobs|job"
  entity={object}                 // the record (with entity.seo)
  overrides={{ title, description, canonical, robots, og: {...}, twitter: {...}, noindex }}
  variables={{ count, page, ... }} // extra template variables for listing pages
  jsonLd={[...]}                  // extra JSON-LD graphs to merge
  breadcrumbs={[{ name, url }]}   // also rendered by <Breadcrumbs> UI; url absolute or path
  pagination={{ prev, next }}     // paths → rel=prev/next
/>
```

### 9.3 Behaviour
Resolves the title through `seoSettings.titleTemplates[type]` + variables + `entity.seo.title` (an explicit `seo.title` is used verbatim, still passed through variable resolution); meta description (`entity.seo.description` → `seoSettings.defaults.metaDescription`); canonical (absolute, `seoSettings.siteUrl`, no trailing slash, no query params except index-worthy listing filters §9.4; `entity.seo.canonicalUrl` override); robots (entity `seo.robots` → type default → `seoSettings.defaults.robots`; `admin`, `search`, `shortlist`, `notFound`, `error` and any `?preview=` page are always `noindex,nofollow`; inactive entities `noindex`); OG/Twitter (`og:locale` `en_IN`, `og:site_name`, `og:type` `article` for articles / `website` otherwise, image fallback chain: `seo.og.imageUrl` → entity cover/featured image → `seoSettings.defaults.ogImageUrl` → `BRAND.ogImageUrl`; `twitter:card` from `seo.twitter.card`), `article:published_time/modified_time/author/section/tag` meta, `rel=prev/next`, RSS `alternate` link on blog routes, verification meta tags, GA4/GTM/Pixel scripts (once, via Helmet, from `siteSettings.integrations`), `customHeadHtml` (admin-only field, rendered verbatim), `theme-color` (`#CF3F38`), favicon links, `application-name`, and one `<script type="application/ld+json">` containing a single `@graph`: always `Organization`/`RealEstateAgent` (knowledge graph, `@id: <siteUrl>/#organization`) + `WebSite` (`@id: <siteUrl>/#website`, with `SearchAction` targeting `<siteUrl>/properties?q={search_term_string}`) on home; `BreadcrumbList` on every page with breadcrumbs; type-specific graphs: property → `RealEstateListing` (+ `Residence`/`Apartment`/`House`/`Place` per property type, `Offer` with price/INR/availability, `PostalAddress`, `GeoCoordinates` only when `showExactLocation`, `image[]`, `floorSize`, `numberOfRooms`, `amenityFeature[]`, `datePosted`, `dateModified`, `url`) + `FAQPage` (if FAQs) + `VideoObject` (if video); article → `Article`/`BlogPosting` (headline, description, image, author `Person` with url, publisher `Organization` with logo, datePublished, dateModified, mainEntityOfPage, wordCount, articleSection, keywords) + `FAQPage`; listing/locality/developer → `ItemList` of the page's results; locality → `Place`; developer → `Organization`; author → `Person`; page → `WebPage`; home/about → `Review`/`AggregateRating` only for genuine (`isSample:false`) testimonials. `entity.seo.schema.custom` (validated JSON) is appended; `disabledAutoTypes` respected. Each graph node has a stable `@id` (`<canonical>#listing`, `#article`, `#breadcrumb`, `#faq`, `#video`, `#place`, `#itemlist`, `#webpage`, `#person`).

### 9.4 Listing canonical & index rules
Canonical = path without query, plus **only** these index-worthy params in this order: `listingType`, `segment`, `propertyTypeId`, `localityId`, `constructionStatus`, `bedrooms`, `page` (page > 1). `noindex` when `q`, `minPrice/maxPrice`, `minArea/maxArea`, `amenityIds`, `badgeIds`, `furnishing`, `facing`, `developerId`, `sort` (non-default), `ids` or any other param is present (`seoSettings.noindex.filteredListings`), when `page > 1` and `seoSettings.noindex.paginatedListings`, and always for `/shortlist` and `?preview=`.

### 9.5 Template variables (`variables.js`)
`%title%`, `%sitename%`, `%sep%`, `%tagline%`, `%excerpt%`, `%category%`, `%author%`, `%date%`, `%modified%`, `%currentyear%`, `%page%` ("Page 2" or empty), `%propertytype%`, `%listingtype%` ("for Sale"/"for Rent"/"for Lease"), `%bhk%` ("3 BHK"; empty for plots/commercial), `%locality%`, `%city%`, `%price%` ("₹1.42 Cr", "₹45,000/month", "Price on Request"), `%area%` ("1,650 sq ft"), `%developer%`, `%status%` ("Ready to Move"), `%projectname%`, `%count%` (listing results, "128"). Unresolved variables are removed, then double spaces/dangling separators are collapsed (`cleanTitle()`). Default templates (seed `seoSettings.titleTemplates`): `default` `%title% %sep% %sitename%`; `home` `%sitename% – Buy, Sell & Rent Properties in Bangalore`; `property` `%bhk% %propertytype% %listingtype% in %locality%, %city% – %price% %sep% %sitename%`; `listing` `%propertytype% %listingtype% in %locality%, %city% – %count% Listings %sep% %sitename%`; `locality` `Properties in %locality%, %city% – Buy, Rent & Invest %sep% %sitename%`; `developer` `%title% – Projects in %city% %sep% %sitename%`; `article` `%title% %sep% %sitename%`; `articleCategory` `%title% Articles %sep% %sitename%`; `page` `%title% %sep% %sitename%`; `author` `%title% – Author %sep% %sitename%`; `search` `Search results %sep% %sitename%`.

### 9.6 The `seo` object (same shape on every entity)
```js
seo: {
  focusKeyword: '', secondaryKeywords: [], title: '', description: '', slug: '' /* mirror of entity slug */, canonicalUrl: null,
  robots: { index: true, follow: true, noarchive: false, nosnippet: false, noimageindex: false, maxSnippet: null, maxImagePreview: 'large', maxVideoPreview: null },
  og: { title: null, description: null, imageUrl: null }, twitter: { card: 'summary_large_image', title: null, description: null, imageUrl: null },
  breadcrumbTitle: null,
  schema: { type: 'auto', custom: '', disabledAutoTypes: [] },
  sitemap: { include: true, priority: null, changefreq: null },
  redirect: { enabled: false, toPath: '', statusCode: 301 },
  score: null, scoreBand: 'none', testsPassed: 0, testsTotal: 0,
  analysis: { basic: [], additional: [], titleReadability: [], contentReadability: [] } /* [{ id, status: 'pass'|'warn'|'fail'|'skip', message }] */,
  lastAnalyzedAt: null,
}
```
The panel saves via `PATCH /admin/<resource>/:id { seo }` (or as part of the entity form save); `score`/`analysis` are computed client-side (`src/seo`) and stored so the dashboard lists them without re-analysing. Saving `seo.redirect.enabled` creates/updates a `redirects` record (`fromPath` = the entity's current public path).

### 9.7 Headings discipline
One `<h1>` per page from the entity title; sections use `<h2>`; card titles `<h3>`; the SEO panel's heading analyser parses the actual HTML of articles/pages/descriptions (H1 inside content is flagged).

### 9.8 robots.txt default (`seoSettings.robotsTxt`; "Restore recommended" in the SEO settings UI)
```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /shortlist
Disallow: /*?preview=
Disallow: /*?q=

User-agent: Googlebot
Allow: /
User-agent: Bingbot
Allow: /
User-agent: DuckDuckBot
Allow: /
User-agent: GPTBot
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Claude-User
Allow: /
User-agent: Claude-SearchBot
Allow: /
User-agent: anthropic-ai
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Perplexity-User
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: CCBot
Allow: /
User-agent: Applebot
Allow: /
User-agent: Applebot-Extended
Allow: /
User-agent: Amazonbot
Allow: /
User-agent: meta-externalagent
Allow: /
User-agent: Bytespider
Allow: /

Sitemap: %siteurl%/sitemap.xml
```
(`%siteurl%` is replaced at serve time; the per-type sitemap URLs are appended as additional `Sitemap:` lines.) `llms.txt` (Markdown per the llms.txt convention): `# Squares N Acres`, a one-paragraph summary, `## Localities` (absolute links), `## Property types`, `## Featured properties` (top 10), `## Guides` (top 10 articles), `## Contact`; regenerated from data on request and stored in `seoSettings.llmsTxt`.

### 9.9 Prerender (optional, prompt 41)
`scripts/prerender.js` + `puppeteer-core` + `CHROME_PATH`: `npm run build:prerender` = build + `serve` the build on a free port + visit every URL from the mock's sitemaps (+ `/`, listing category routes, `/localities`, `/builders`, `/insights/articles`, `/insights/faqs`) + write `build/<path>/index.html` with the fully rendered head/body; `createRoot` stays (React re-renders on load; no hydration mismatch). The default `npm run build` never requires Chrome.

### 9.10 Redirects at runtime
`RedirectHandler` (mounted in `App` under `BrowserRouter`) loads `GET /redirects` once (cached in memory 10 min + sessionStorage) and performs `<Navigate replace>` for exact path matches (query preserved); the guidelines document server-level 301s and the SEO dashboard exports an `redirects.nginx.conf` snippet.

---

## 10. Mock server design (`mock-server/`)

- **Library, not CLI:** `json-server@0.17.4` used inside Express (`jsonServer.router(runtimeDbPath)`, `router.db` = lowdb, `router.render` = envelope). `mock-server/server.js`: CORS (§5.12), JSON body limit 5 MB, optional latency `MOCK_DELAY_MS`, request log (`morgan`-style one-liner without a new dependency: method, path, status, ms), custom routers registered **before** the generic router, generic router mounted under `/api` with a query-translation middleware (`page→_page`, `perPage→_limit`, `sort/order→_sort/_order`, `q→q`, `isActive` scoping for public reads), root mirrors for `/sitemap*.xml`, `/robots.txt`, `/rss.xml`, `/llms.txt`, 404 JSON for unknown `/api/*`, error handler → §5.3 envelope.
- **Runtime db:** `mock-server/db.js` copies root `db.json` → `mock-server/.runtime/db.json` (git-ignored) on first run or when `MOCK_FRESH=1`; the runtime copy persists between restarts; `npm run mock:reset` (`mock-server/reset.js`) restores it from the seed. The root `db.json` is never written by the server.
- **Middleware:** `auth.js` (Bearer → `apiTokens` → `req.user`; expired → 401), `role.js` (`role('admin','manager')`), `envelope.js` (`res.ok(data, meta)`, `res.created(data)`, `res.message(msg)`), `errors.js` (`ApiError(status, message, errors)` + handler), `rateLimit.js` (in-memory per IP), `timestamps.js` (sets `createdAt/updatedAt`, strips client-sent read-only fields), `validate.js` (schemas → 422).
- **Lib:** `filters.js` (property/lead/article filter implementations + facets), `sort.js`, `paginate.js` (`{data, meta}`), `slug.js` (generate + de-duplicate + `checkSlug`), `ids.js` (`nextId(collection)`), `csv.js` (BOM + quoting), `xml.js` (escape + builders), `scope.js` (public field stripping, sales lead scoping), `embed.js` (denormalised read objects), `enums.js` = `require('../../src/config/enums')`.
- **Schemas:** `mock-server/schemas/models.js` — plain JS descriptors `{ collection, fields: { name: { type, required, enum, min, max, maxLength, default, items, shape, unique } } }` shared with `scripts/validate-seed.js` and the guidelines generator (rules rendered as Laravel rule strings).
- **Business rules (all in prompts 08/09):** slug generation/uniqueness; `POST /properties/:id/view` debounced per IP per hour; `POST /leads` → `status:'new'`, `priority` from settings, `activities[0]` "Lead created via <source label>", stores `utm`, `pageUrl`, `ipAddress`, `userAgent`, increments `enquiryCount` on the property, maps legacy sources through `LEGACY_LEAD_SOURCE_MAP`, auto-assigns round-robin among active sales users when `siteSettings.leads.autoAssign === 'round-robin'`; lead `PATCH` on `status`/`assignedTo`/`priority`/`followUpAt` appends an activity; notes append `note-added`; similar/featured logic §5.14; article `scheduled` becomes public when `publishedAt <= now`; preview tokens; dashboard aggregates §6.16; `PUT /admin/settings` deep-merges known keys; `check-slug`; `duplicate`; bulk actions; CSV export with BOM; sitemaps/robots/rss/llms from data + `seoSettings`; redirects `hits++` on `GET /redirects/resolve?path=` (used only by the smoke test; the SPA resolves client-side); suggestions; newsletter dedupe; honeypot; master-data delete guard (409 with usages); `viewCount`/`enquiryCount` never writable by clients.
- **Smoke tests:** `scripts/smoke-api.js` (Node 18+ `fetch`, no framework) walks `allEndpoints()`: logs in as each role, calls every endpoint with a valid and an invalid payload, asserts status codes, envelope shape, pagination meta, RBAC (403 for sales on admin-only routes), PATCH semantics (untouched fields survive), PUT semantics, slug lookup, filters (`bedrooms=3` only returns 3-BHK), facets, sitemap XML well-formedness, CSV BOM; prints a pass/fail table; exits non-zero on failure; accepts `--baseUrl=<url>` (default `http://localhost:4000/api`) and `--token=<bearer>` / `--email --password` for real APIs.
- **Seed quality (prompt 10):** 36+ properties covering every sensible `listingType × segment × constructionStatus` combination and all property types; 20 real Bangalore localities (Whitefield, Sarjapur Road, Electronic City, Hebbal, Yelahanka, Devanahalli, Koramangala, Indiranagar, HSR Layout, JP Nagar, Bannerghatta Road, Kanakapura Road, Marathahalli, Bellandur, Hennur, Thanisandra, Jayanagar, Rajajinagar, Malleshwaram, KR Puram); 8 fictional developers; 40+ amenities; 8 badges; 6 fictional banks; 12+ HTML articles (800–1500 words; topics: RERA Karnataka, BBMP khata (A vs B), stamp duty & registration in Karnataka, home-loan eligibility & FOIR, Whitefield locality guide, Sarjapur Road guide, North Bangalore/airport corridor, NRI buying checklist, rental yields by locality, plot buying checklist (BDA/BMRDA/BIAAPA approvals), under-construction vs ready-to-move, first-time buyer checklist, EMI planning); 4 categories; 15 tags; 3 authors; 20 FAQs; 8 sample testimonials (`isSample:true`); 6 placeholder team members; 6 fictional partners; 15 CMS pages; 4 jobs; 3 applications; 45 leads across all sources/statuses over the last 90 days; 12 subscribers; 3 redirects; media records for every image; `siteSettings`/`seoSettings` fully populated with placeholders. Images: `https://picsum.photos/seed/<unique-seed>/<w>/<h>` (photos) and the Cloudinary brand URLs; never hot-link real listings; `placehold.co` and `dzbiw7t4i` Cloudinary URLs and Gumlet videos are removed. Internal consistency rules: rent listings have `rentPerMonth` + `securityDeposit` and no sale prices; plots have `plotArea` + dimensions and no `bedrooms`; commercial has no BHK; under-construction/pre-launch have `possessionDate` + timeline + `constructionProgressPercent`; ready-to-move/resale have `ageOfPropertyYears`; every active property has ≥ 5 images with alt and a cover, ≥ 8 amenities, ≥ 3 FAQs, ≥ 300-char description; prices realistic for Bangalore 2026 (apartments ₹6,500–₹14,000/sq ft depending on locality; villas ₹2.5–₹9 Cr; plots ₹4,500–₹12,000/sq ft; rents ₹18,000–₹1,50,000/month).

---

## 11. Known defects of the boilerplate — none may survive

Tagged defects from the master specification (each is cleared by the prompt(s) named in the coverage matrix of `00_INDEX.md`):

| Tag | Defect | Cleared by |
|---|---|---|
| BUG-01 | Every write uses `PUT` with partial payloads (11 call sites: property `{is_active}`, lead `{status}`, article `{isActive}`/`{isTrending,trendingOrder}`, FAQ `{isActive}`/`{order}`, neighborhood/partner/user `{isActive}`) | 11 (services: PATCH), 14–22, 29, 33, 40 |
| BUG-02 | List params (`is_active`, `featured`, `property_type`, `per_page`, `search`, `type`, `status`, `area`) match neither `db.json` camelCase nor JSON Server syntax | 05, 08, 11, 26 |
| BUG-03 | `/auth/login`, `/auth/profile`, `/admin/dashboard`, `/seo/*`, `/properties/slug/:slug`, `/admin/leads/:id/notes`, `/newsletter/subscribe`, `/neighborhoods/active`, `/partners/active`, `/articles/trending`, `/articles/slug/:slug` do not exist on a plain JSON Server | 06–09 |
| BUG-04 | camelCase/snake_case drift (`transformPropertyPayload`, `buildPayload`, `normalizePropertyResponse`, nested shapes differ between form, db and sections) | 05, 11, 18–21 |
| BUG-05 | PropertyDetails renders sections with defaults/placeholders (`DEFAULT_BANKS`, `'—'` cards, `Feature`, `Document`, `Available`, "Map view available on live version", `Map` fallback) | 23–25 |
| BUG-06 | `StickyNav` ignores toggles (`specialities` without `highlights` check, `finance` without price, `construction` unreachable, "Construction" targets `construction-specs`), `visibleSections` logic duplicated | 23 (`getVisibleSections`) |
| BUG-07 | `SimilarProperties` ignores `similarPropertyIds` (fetches by type) while the gate requires the ids | 08, 25 |
| BUG-08 | `brochureUrl`, `floorPlanPdfUrl`, `documents[].url` never delivered after lead capture | 25, 28 |
| BUG-09 | Lead sources inconsistent (`adminConstants` vs `AdminLayout.formatSource` vs 24 form values incl. `child_form`, `website`) | 05, 10, 28, 29 |
| BUG-10 | `NotFound` → `?search=` vs listing `?q=`; `QuickActions` → `type=lease` unsupported; `ExploreNeighborhoods` → `?area=` ignored | 26, 27, 43 |
| BUG-11 | Hardcoded content: About, Contact (Brigade Road map), FAQs copy, HomeLoan, LegalAssistance, InteriorDesigning, Careers, Partnership, SellLet, FlexibleWorkspace, DirectLeaseRetails, RealEstateAwareness, WhyChoose, HowItWorks, Dashboard trends (+12 %…), footer defaults, `SeoGuidelines` city examples | 27, 29, 30, 31, 37, 40 |
| BUG-12 | 1 206 hex literals in JS/JSX (+290 in CSS modules), inline `fontFamily` literals (16 in PropertyDetails alone), `.hom-swal-*`, `ErrorBoundary`, `PageLoader`, `BackToTop` | 04 (+ every module prompt), 43 |
| BUG-13 | Mixed ID types (`"b998"`, `"8a37"`, string ids vs numeric `propertyId`), missing timestamps, plaintext HOM users | 06, 10 |
| BUG-14 | Token expiry never enforced; login writes both storages; logout incomplete; 401 redirect for public calls | 11, 12 |
| BUG-15 | Careers resume upload dead; no spam protection; newsletter no dedupe (and a false reCAPTCHA notice) | 09, 28, 31 |
| BUG-16 | Dead code: `adminService`, `visitService`, `extractPaginationMeta`, `PropertyDetail.js`, `AnimatedSection` (verify), `handleOpenLeadForm`, unused imports/refs (`memo`, `useInView`, `videoRef`, `inputRef`, `resultRef`, `sanitizeInput`, `LinearProgress`, `isMobile`), duplicated filter logic | 03, 11, 26 |
| BUG-17 | "Sign In" in public nav; no favicon/manifest; README/.env describe HOM + Cloudways | 02, 03 |
| BUG-18 | `getFeatured` tag hack; ad-hoc trending/related; FAQ page/section fetch-all-and-filter | 08, 09, 27, 34 |
| BUG-19 | Listing paginates client-side after fetching everything | 26 |
| BUG-20 | Header/MobileHeader/BottomNav/Footer navigation hardcoded and inconsistent (duplicate nav data, `/buy` parents unreachable, Insights active state wrong) | 04, 27, 43 |
| BUG-21 | The audit prompt records additional defects in `docs/PROJECT_STATE.md` → "Known issues"; each module prompt clears its module's issues | 01 → all |

Additional defects found during the analysis (also listed in `docs/PROJECT_STATE.md` by prompt 01, and to be cleared by the prompt in brackets):

1. `.env` is committed with the Cloudways URL; no `.env.example` although README references it; README links a non-existent `API_DOCUMENTATION.md`; README says Node 16+ (02).
2. `dev` script equals `start` (no json-server anywhere); `devDependencies` empty; no ESLint/Prettier config beyond CRA (01, 06).
3. `public/index.html` references a non-existent `favicon.ico`; `robots.txt` allows everything with no sitemap; no `manifest.json` (02).
4. `@mui/icons-material` and `web-vitals` are unused dependencies (03, 41).
5. Breakpoint fragmentation: `MainLayout` switches at MUI `md` (900) while `Header.module.css` hides at 960 → **no header between 900 and 960 px**; BottomNav/PropertyCard/PropertyFilters use 960/961, AdminLayout 899, others 600/768/1024 (04).
6. Three scroll-hide implementations (Header, MobileHeader, BottomNav) and a fourth in `useThrottledScroll`; nav data duplicated byte-for-byte in Header and MobileHeader; 13 identical local `Section` components; `formatPrice` ×5, `formatDate` ×3, `GooglePreview` ×2, `getTitleLenColor` ×2, `leadStatusConfig` duplicated in Dashboard, `tagColors` contradicts `TAG_OPTIONS` (04, 11, 27).
7. Three toast systems (`ToastProvider`, AdminLayout Snackbar, UserManagement Snackbar); two 30-second pollers on `GET /admin/leads` (AdminLayout + AdminLeads) fetching the whole collection (12, 29).
8. Two `GET /settings` calls per public page (Footer + NewsletterSection); Articles fires `/articles/trending` twice (11, 27, 34).
9. `LeadForm` ignores `required:false` for name/phone, has no `<label>`s, no `onSuccess`, posts unsanitised values; `NewsletterSection` validation is `includes('@')`, silently fails, and shows a false reCAPTCHA notice (28).
10. `PropertyCard`: price unit printed twice ("₹25,000/mo per month"), `liked` not persisted, `imageLoaded` never reset, timer leak, imports `TAG_OPTIONS` from `pages/admin` (inverted dependency), autoplaying videos in grids (26).
11. `PropertyFilters`: `clearFilters` wipes every query param, `50000000-Infinity` in URLs, 4th location silently ignored, only apartment/villa types, desktop applies live but mobile needs Apply (26).
12. `PropertyDetails`: 24 `useState`s, four copy-pasted modal state machines, `handleOpenLeadForm` dead → the enquiry modal is unreachable, `EnquiryForm` mounted three times, `dimensionRange` chip always renders (" - sqft"), modals without `role="dialog"`/focus trap, `og:site_name "HOM Advisory"` (23–25, 28).
13. `FinanceGuide` (1 808 lines): typo "Home Finance Clearity", hardcoded "8.35 % / 48 Hrs / Up to 90 % / 0.5 % + GST", six real bank brands, score ignores 6 of the collected fields, success shown even when the POST fails, `document.body.style.overflow` mutation, `resultRef` unused (25).
14. `ConstructionStatus` progress → `Infinity%`/`NaN%` with one milestone; `BuilderOverview` self-nullifies for description-only developers; `PropertySpecs` legacy-object branch unreachable, `specificationsArray` prop dead (24).
15. `HeroSection`: `role="combobox"` without `aria-controls`, "View all results" shown with zero suggestions, video/input refs unused; `QuickActions` links `type=lease` (27).
16. `ArticleDetail` Markdown renderer: duplicate tables on every `|` line, ordered lists rendered as `<ul>`, only `**bold**` inline, `let inList` dead, breadcrumb links "Insights" and "Articles" to the same URL; `Articles` state not URL-synced (32, 34).
17. `Contact`: five `#` social links opening new tabs, generic Brigade Road map with fabricated `!4v1700000000000`, US-format phone in FAQs `(555) 123-4567` (30, 31).
18. `Careers`: file input has no `name`/`onChange`, form never reset, modal without dialog semantics; `InteriorDesigning`: room cards and "Get Started" buttons do nothing; `LegalAssistance`/`RealEstateAwareness` encode conflicting Karnataka stamp-duty figures (30, 31).
19. `AdminLogin`: "Remember me" is a no-op, seed passwords in a commented block; `AdminSettings`: `PUT` drops `footerLinks`, tab panels out of order, "Footer Tagline" edits the General `tagline`, hardcoded `role === 'admin'`; `UserManagement`: last-admin guard hole (`isActive === undefined`), plaintext passwords echoed, own `ROLES` list (12, 40).
20. `AdminSeo`: `homadvisory.com` in previews, dialog "Auto-Generate" writes HOM titles/canonicals/schema, `stats.missing` dead, saving wipes empty fields, no confirmation before bulk overwrite; `ArticleForm`: `author 'H.O.M Advisory Team'`, `readTime` not editable, `isTrending/trendingOrder` dropped on PUT, `setTimeout(navigate)` not cleared (33, 36, 37).
21. `AdminProperties`: fetches the public `/properties` (no inactive rows), toggle omits the `is_active` fallback, `Promise.all` bulk aborts on first failure, per-page select-all; `AdminLeads`/`Dashboard`: `p.id === propertyId` string-vs-number → Property column always empty; `Dashboard` "Leads by source" computed from 10 leads; `FaqManager` reorder wrong under a category filter, two sequential PUTs per swap; `LeadDetail` simulated timeline, `isMobile` unused (22, 29, 17).
22. Property tabs: `DetailsTab` drag issues N state updates per drag-over; `SectionVisibilityTab` toggle asymmetric for `undefined`; `GalleryTab` seeds `placehold.co/goldenrod` covers; `NearbyPlacesTab` default type `school` unknown to the public map; index keys everywhere; `SeoTagsTab` `homadvisory.com` placeholder (18–21).
23. `IconPicker`: ~17 invalid MDI ids (`mdi:apartment`, `mdi:pool`, `mdi:restaurant`, `mdi:badminton`, `mdi:cricket`, `mdi:billiards`, `mdi:highway`, `mdi:bridge`, `mdi:pipe`, `mdi:wall`, `mdi:intercom`, `mdi:mountain`, `mdi:storefront`, `mdi:file-chart`, `mdi:bricks`, `mdi:clock-check`, `mdi:target`), tiles not keyboard-operable, search ignores the category (13).
24. `SkeletonLoaders.PropertyCardSkeleton` shows two buttons the card doesn't have (CLS); no `aria-busy`; `PageLoader` prints "H.O.M Advisory" in Playfair (03, 04).
25. `ScrollToTop` `document.querySelector(hash)` throws on non-selector hashes; `behavior:'instant'` (04).
26. `db.json`: `leads[].propertyId` mixed (`1`, `"2"`, `null`); property `gallery` contains an `.mp4`; `neighborhoods.propertyCount` hardcoded; `siteSettings.contactInfo.phone "(555) 123-4567"`; articles include an off-scope Mumbai piece and a lorem-ipsum "Test Article"; property `"b998"` is a lorem-ipsum test record in Guwahati; `faqs[6]` question has a double `??` (10).
27. `seoScoring.js`/`seoGenerator.js`: HOM site name/URL constants, generic CTA-word scoring, schema string stored in the record (36).
28. `AdminLayout`: active parent group cannot collapse, mobile drawer renders the brand twice, toast `onClick` navigates even when closing, `pageTitles` lacks `/admin/partners`, `.notificationDot` dead CSS (12).

---

## 12. Definition of done, verification, git conventions, state files

### 12.1 Definition of done (every prompt)
`npm run lint` → 0 errors, 0 warnings. `npm run test:ci` → all green. `npm run build:ci` → success with 0 warnings. `npm run check:traces` → 0 findings (from prompt 03 onward). `npm run validate:seed` → pass (from 06). `npm run smoke` → all pass (from 09; requires `npm run mock` running). No browser console errors or warnings (React keys/props, MUI, act(), 404 assets) on any page touched. The manual QA script of the prompt executed and every acceptance checkbox ticked in the prompt's report inside `docs/PROJECT_STATE.md`. One commit, clean tree. Never disable a lint rule or skip a test to make it pass; fix the cause.

### 12.2 Verification commands (run in this order; start `npm run mock` and `npm start` in background terminals first — on Windows PowerShell: `Start-Process npm -ArgumentList 'run','mock'` or use two terminals; `npm run dev` runs both)
```
npm run lint
npm run test:ci
npm run build:ci
npm run check:traces
npm run validate:seed
npm run smoke
```
Manual QA always includes a **390 px** viewport pass (Chrome DevTools device toolbar) and a desktop 1280 px pass, with the console open.

### 12.3 Git conventions
Conventional Commits: `<type>(<scope>): <summary>` with `type ∈ feat|fix|refactor|chore|docs|test|build|perf|style` and `scope` = module (`mock`, `seed`, `design-system`, `properties`, `leads`, `articles`, `seo`, `cms`, `settings`, `qa`, …). One commit per prompt (`git add -A && git commit -m "…"`), working tree clean afterwards. Never amend previous prompts' commits. Never force-push. Branch: `main`. The final prompt tags `v1.0.0`.

### 12.4 `docs/PROJECT_STATE.md` format (created by prompt 01, appended by every prompt)
```markdown
# Project state — Squares N Acres website
Status: IN PROGRESS | COMPLETE
Last prompt executed: NN — <title>   Next prompt: NN+1
## Executed prompts
| # | Title | Commit | Date |
## Baseline (prompt 01)
…
## Current npm scripts / env vars / endpoints added (cumulative lists)
## Pending rewrites (temporary adapters that must be removed; owner prompt)
## Known issues (open) — id, description, found by, owner prompt
## Known issues (closed)
## Prompt reports
### Prompt NN — <title> (yyyy-mm-dd)
- Files added / changed / removed
- Endpoints added / changed
- Env vars, npm scripts
- Acceptance checklist (copied from the prompt, ticked)
- Issues left → moved to "Known issues"
```
`docs/DECISIONS.md`: one ADR line per decision `- yyyy-mm-dd — Dxx/Pnn — <decision> — <reason>`, newest last.

---

## 13. Decisions & assumptions (numbered; referenced as `Dnn` in prompts)

| # | Decision | Rationale |
|---|---|---|
| D1 | 48 prompts; the recommended sequence is followed with the mock routes split in two (08 properties+leads, 09 content+SEO+smoke), the details page split in three (23–25), leads CRM + dashboard merged (29), and one extra prompt for the property list (22). | Keeps every prompt within 5–20 files while staying ≤ 50 |
| D2 | Remove `sweetalert2`, `react-slick`, `slick-carousel`, `react-countup`, `react-intersection-observer`, `@mui/icons-material`; replace with `ConfirmDialog`, `Carousel`, `useCountUp`, `useInView` | Bundle size, consistency, `@mui/icons-material` unused |
| D3 | Footer on light surface with charcoal text; logo never on dark | Logo designed for light backgrounds |
| D4 | `--color-brand-red: #E7343A` (monogram sample); `--color-primary #CF3F38` / `-dark #B2332D` kept for AA; red text on surfaces uses `-dark` | Sampled 2026-09-15; 4.44:1 fails AA on surface |
| D5 | The "icon" asset is the S-square-A monogram; used as-is for favicons/PWA/loader; the red square accent is a Cloudinary crop (`iconSquareUrl`) | Actual asset content |
| D6 | Version pins compatible with Node 18.18+ and 20 (`cross-env 7.0.3`, `concurrently 9.2.1`, `rimraf 5.0.10`, `puppeteer-core 24.43.1`) | Analysis machine runs Node 18.19; target Node 20 |
| D7 | `yet-another-react-lightbox` is ESM-only → lazy-loaded + Jest `transformIgnorePatterns` | CRA Jest 27 cannot transform ESM in node_modules |
| D8 | Tiptap v3.31.3 everywhere; `Placeholder`/`CharacterCount` from `@tiptap/extensions` | v3 moved them |
| D9 | Mock = JSON Server 0.17.4 as a library inside Express; runtime db at `mock-server/.runtime/db.json` | Custom routes/envelope impossible with the CLI |
| D10 | Storage keys per §4.2, all through `utils/storage.js` | Single place, `sna_` prefix |
| D11 | All HOM routes keep working; CMS catch-all `/:slug` registered after static routes; unknown → 404 | No broken external links |
| D12 | Job applications: resume via Cloudinary unsigned upload (`resource_type: auto`) when configured, otherwise a URL field; stored only in `jobApplications` | No multipart on the API |
| D13 | `neighborhoods` → `localities`; `partners`, `faqs`, `adminUsers` keep their names | Domain accuracy |
| D14 | Integer ids assigned as `max(id)+1` by the mock; seed re-ids everything starting at 1 | Laravel auto-increment parity |
| D15 | Sales: read-only properties, scoped leads (`assignedTo == me OR null`), may claim, may export own scope, no delete/assign | RBAC matrix |
| D16 | Prerender uses `puppeteer-core@24.43.1` + `CHROME_PATH`; never part of `npm run build` | No Chrome download in CI |
| D17 | `check:traces` regexes (case-insensitive): `h\.o\.m`, `\bhom advisory`, `homadvisory`, `home office market`, `\bhom_`, `\bhom-`, `\.hom-`, `cloudwaysapps`, `#1B2A4A`, `#2D4470`, `#111C33`, `#C9A86C`, `#D4BC8E`, `#B08E4A`, `#F8F6F3`, `#2d3f63`, `playfair`, `dm sans`, `\boutfit\b` (font), `dzbiw7t4i`, `video\.gumlet\.io`, `placehold\.co`, `goldenrod`; allow-list: the words home/homes/homepage/home-loan; scanned paths: `src public mock-server scripts db.json README.md package.json .env* docs` (excluding `docs/archive/**` and `prompts/**`); hex-literal check outside `global.css`/`theme.js`/`src/seo/data` | Master spec QA-03/QA-04 |
| D18 | `@testing-library/react 13.4` kept for Jest component tests | Works with React 18 |
| D19 | Mock env defaults: port 4000, delay 0, TTL 24 h | Spec |
| D20 | `LEGACY_LEAD_SOURCE_MAP` accepted by the mock and used by the seed converter | Old forms/data keep working during migration |
| D21 | Sitemaps/robots/rss/llms served at `/api/...` and `/...` on the mock | Nginx proxy parity |
| D22 | Dates: `Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata' })` for absolute dates (`dd MMM yyyy`), `date-fns` for relative time/parsing/math | No timezone dependency allowed |
| D23 | `perPage` defaults: public lists 12, admin tables 20 (options 10/20/50/100), home rows 8, similar 6 | Spec + UX |
| D24 | No admin links anywhere on the public site; admin reachable only at `/admin/login` | Spec |
| D25 | Property-type slugs are plural URL forms; `/buy/:slug`, `/rent/:slug`, `/commercial/:slug` resolve status slugs first (`pre-launch`, `under-construction`, `ready-to-move`, `resale`), then property-type slugs from master data, else 404 | Keeps `/rent/apartments`, `/rent/villas`, `/buy/villas` |
| D26 | 12 new SNA articles in HTML; the 10 HOM articles are not migrated (topics reused where relevant, Mumbai piece dropped) | Spec ART-11 |
| D27 | Extra CMS block types beyond the master list: `jobs`, `facts`, `expandableCards`, `packages`, `gallery` | Needed to reproduce the HOM Careers, Awareness, Legal and Interior pages faithfully |
| D28 | Draft preview: `GET /admin/<articles|pages>/:id/preview-token` → `?preview=<token>` on the public URL (24 h, `noindex`) | Editors need preview |
| D29 | `POST /properties/:id/view` once per property per session (`sna_viewed_properties`) | Avoid inflating counts |
| D30 | `RedirectHandler` mounted in `App` (client-side 302-like navigation); server-level 301s documented | SPA reality |
| D31 | `REACT_APP_SITE_URL` defaults per environment file; runtime `seoSettings.siteUrl` wins for canonicals | Spec BRAND-08 |
| D32 | Every role lands on `/admin/dashboard` after login | Simplicity |
| D33 | `formatPrice(n)`: ≥ 1 Cr → `₹1.42 Cr` (2 decimals, trailing zeros trimmed), ≥ 1 L → `₹85.5 L`, else `₹45,000` (Indian grouping); rent appends `/month`; `priceOnRequest` → "Price on Request"; ranges `₹85 L – ₹1.2 Cr` | Spec BRIEF-07 |
| D34 | `seo.slug` always mirrors the entity slug; editing either updates both | Single URL |
| D35 | Jest tests co-located (`*.test.js`) or in `__tests__/` | CRA default |
| D36 | ESLint config in `package.json` extended with `prettier` + rules §3.4; endpoint-registry enforcement via `scripts/check-endpoints.js` in `npm run lint` | CRA constraints |
| D36b | `enums.js` and schema descriptors are CommonJS so React, Jest and Node share one file | See §6.17 |
| D37 | Prettier: singleQuote, semi, printWidth 100, trailingComma es5, LF | Team default |
| D38 | The HOM→SNA mapping (§6.15) is the contract for the seed conversion and the `docs/DATA_MODEL.md` table | Nothing lost |
| D39 | `constructionSpecs` render inside the Specifications section (visibility key `specifications`) as a second grouped block | No extra toggle in the spec |
| D40 | Old `specialities` → `highlights` strings (`name — description`); the public Highlights section shows a check icon per item | Spec says highlights are strings |
| D41 | Testimonials with `isSample:true` render only when `process.env.NODE_ENV !== 'production'` | Spec HOME-05 |
| D42 | Maps: `https://www.google.com/maps?q=<lat>,<lng>&z=15&output=embed` needs no key; a draggable pin in admin loads the Maps JS API via a `<script>` injected at runtime only when a key exists (no new dependency) | Spec ARCH-08/PROP-02 |
| D43 | Client-side submit throttle: one submit per 10 s per form | Spec LEAD-04 |
| D44 | Admin property CSV export is built client-side from `GET /admin/properties?perPage=all&<filters>` | Spec PROP-01 |
| D45 | One lead poller (30 s, paused when `document.hidden`) in `LeadNotificationsContext`; badge = `meta.total` of `status=new` | Two pollers today |
| D46 | Authenticated CSV downloads via `fetch` + Blob + `URL.createObjectURL` (`utils/download.js`) | Bearer header on downloads |
| D47 | Admin `DataTable` default 20 rows | Spec API-06 |
| D48 | Missing `REACT_APP_API_URL` throws at startup with a clear message; no fallback URL | Spec ARCH-04 |
| D49 | Google Fonts via `<link>` in `index.html` with preconnect | Performance |
| D50 | `src/assets/images/logo.png` (HOM) deleted; header/footer read `siteSettings.general.logoUrl` with `BRAND` fallback | Rebrand |
| D51 | One breakpoint system (MUI `md` = 900) for JS and CSS | Fixes the 900–960 gap |
| D52 | Header is always visible (sticky, elevation on scroll, transparent over the home hero until scrolled); BottomNav hides on scroll-down and returns on scroll-up | Spec UX-04/UX-06 |
| D53 | `ui/Section` + `useInView` replace the 13 duplicated local `Section` components | DRY |
| D54 | One `ToastProvider`/`useToast` for public and admin | Three systems today |
| D55 | `LeadNotificationsContext` provides `newLeadCount`, `recentLeads`, `lastUpdatedAt`; `AdminLeads` refetches when `lastUpdatedAt` changes | Single poller |
| D56 | `leads.meta` (object) stores source-specific payloads (financial assessment answers + score, bank name); the admin lead detail renders it as a key/value card | Do not lose FinanceGuide data |
| D57 | FinanceGuide scoring keeps the FOIR formula (60 % of monthly income) but adds co-applicant income to monthly income when present; credit score / employment / down payment / EMI tenure drive recommendations and the "eligibility breakdown" (documented in `utils/finance.js`) | Use collected data honestly without inventing an underwriting model |
| D58 | Property `tags` → `isFeatured` + `badgeIds`; unmapped tags dropped | Badges are master data |
| D59 | `sections` → `sectionVisibility` per §6.15 | |
| D60 | See D40 | |
| D61 | Old `floorPlans` → both `unitConfigurations` (pricing/BHK table) and `floorPlans` (images) | Two public sections |
| D62–D75 | Field mappings exactly as §6.15 | |
| D76 | Four article categories: Buying Guides, Market Trends, Legal & RERA, Investment & Finance | Spec MOCK-08 |
| D77 | FAQ category `finance` → `home-loan` | Enum |
| D78 | Partners get `category: 'developer'` in the seed | Enum |
| D79 | Footer image collage kept as an **optional** setting (`footer.showGallery`, default false) | Feature retention without cluttering the minimal footer |
| D80 | Mock admin users: `admin@squaresnacres.com / Admin@123`, `manager@… / Manager@123`, `sales@… / Sales@123` | Placeholders, rotated on go-live |
| D81 | Home "Why choose us" / "How it works" come from the `home` CMS page blocks (`features`, `steps`) | Spec HOME-05 |
| D82 | Header CTA "Post Requirement" opens `LeadCaptureModal` (source `post-requirement`) with the requirement fields (listingType, propertyTypeId, localityId, bedrooms, budget bucket, timeline) | Spec UX-04 |
| D83 | Contact page and FAQ "Still have questions?" read phone/e-mail/WhatsApp from `siteSettings.general` | No hardcoded contacts |
| D84 | Legal/tax figures in seed articles/pages (stamp duty, 80C, RERA escrow…) are written generically and every figure is tagged in `docs/CONTENT_TO_BE_PROVIDED_BY_CLIENT.md` for verification | Never assert facts |
| D85 | `snippet.js` pixel width: canvas in the browser; a per-character width table in Node/Jest | Testability |
| D86 | `sectionVisibility.enquiry=false` hides the in-page enquiry section only; the sticky CTA bar/enquire buttons stay | Leads must always be possible |
| D87 | The property form's tab 16 hosts the full `SeoPanel`; article/page forms host it as a tab + rail summary; locality/developer/category/author/property-type forms host `variant="compact"` | Spec SEO-22 |
| D88 | Deleting master data in use returns 409 with usages; the UI shows them | Spec MASTER-01 |
| D89 | `POST /admin/leads/:id/claim` for sales users | Spec 9.5 "can claim" |
| D90 | Lease listings use `rentPerMonth` and the rent price buckets | Simplicity |
| D91 | Careers page keeps a general enquiry form with source `careers` ("Didn't find a role? Send your profile"); job applications are separate records | Both requirements satisfied |
| D92 | `QuickActions` tiles link to `/buy`, `/rent`, `/lease`, `/commercial`, `/plots`, `/buy/ready-to-move` (no `?type=`) | Routes exist |
| D93 | `GET /settings` and master data are loaded once at app start by their contexts; components never call these endpoints directly | Fixes duplicate calls |
| D94 | The listing engine is server-driven; the only client-side derivation is facet display | Spec BUG-19 |
| D95 | Property `viewCount`/`enquiryCount` are never accepted from clients | Integrity |

### 13.1 Resolved contradictions / ambiguities of the master specification
- The spec's inventory says the `dev` script uses the plain `json-server` CLI; in fact `dev` = `react-scripts start` and json-server is not installed at all. Handled: prompt 06 creates the mock from scratch.
- The spec describes the icon as "the red square"; the asset is a monogram (D5).
- The spec lists `@tiptap/extension-placeholder` **or** `@tiptap/extensions`: `@tiptap/extensions` chosen (D8).
- The spec says "prefer 44–48 prompts" and lists 46: 48 produced (D1).
- Spec 12.6 says the locality "properties" tabs are completed by "prompt 24" (the listing prompt): in this numbering that is **prompt 26**; both prompts 14 and 26 say so explicitly.
- `[UX-05]` describes a footer without the HOM image collage while `[BRIEF-04]` requires every feature to survive: kept optional (D79).
- `[LEAD-01]` says careers leads are stored only as job applications while `LEAD_SOURCES` contains `careers`: D91.
- `[QUICK-ACTIONS]`/`[BUG-10]` mention `type=lease` as unsupported; `lease` is now a first-class listing type, so the tile links to `/lease` (D92).
- `[API-06]` `perPage` default 12: applied to public lists; admin tables default 20 (D23, D47).
- The spec's `[DATA-13]` public subset excludes "`integrations.*Secret`-like values": the model contains no secrets; `leads.*` is the only admin-only branch.
- `[SEO-06]` "meta description not identical to another entity's" needs site-wide data: the panel uses the cached `/admin/seo/overview` list (loaded once per admin session, refreshed after saves).
- `[MOCK-08]` says "15+ localities" and lists 20: the seed has 20.
- `[ARCH-11]` allows removing carousel/countup/observer/swal "if replaced consistently": removed (D2).
- The master spec's `[PROP-02]` names 16 tabs while the boilerplate has 16 differently-named tabs; the mapping is in prompt 18.

---

## 14. Content placeholders policy

**May be invented (clearly fictional, never real):** project names ("Lakeview Heights", "Aurelia Park Residences"…), developer names (§6.5), bank names (§6.6), partner names, testimonials (`isSample:true`, names like "Sample Buyer — R. Kumar"), team members ("Team Member 1 — Founder (placeholder)"), job openings, leads (Indian names, phones `98XXX XXXX1`-style patterns that are valid 10-digit numbers starting 6–9 but obviously synthetic, e-mails `@example.com`), article authorship ("Editorial Team"), photos (`picsum.photos` seeds).

**Must be a clearly labelled placeholder editable in Admin → Settings/Pages and listed in `docs/CONTENT_TO_BE_PROVIDED_BY_CLIENT.md`:** phone numbers (`+91 98XXX XXXXX`), WhatsApp number, e-mail (`info@squaresnacres.com`), physical address (`[Office address to be provided], Bengaluru, Karnataka 560001`), map coordinates (default: Bengaluru city centre 12.9716, 77.5946 with `showExactLocation:false`), RERA number (`RERA registration number: to be provided`), GST number, established year, company story/mission/vision text (prefixed `[Placeholder — client to provide]` in seed pages), statistics (seed `stats` blocks empty so they stay hidden), social links (empty → hidden), legal pages (privacy/terms/disclaimer: short generic placeholder paragraphs marked `[Client's legal text required]`), working hours, tagline, hero copy, SLA promises ("within 24 hours" → "as soon as possible" unless the client confirms), interest rates and fees (bank records marked "indicative; to be confirmed"), legal/tax figures (D84).

**Never:** real developer names, real project names, real people, real bank brands, real partner brands, HOM content, lorem ipsum, invented awards/years/counts presented as facts, real listing photos.
