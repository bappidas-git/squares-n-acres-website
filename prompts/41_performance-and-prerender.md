# Prompt 41 — Performance: code-splitting audit, image transforms, fonts, web-vitals, bundle analysis, Lighthouse fixes; optional build-time prerender

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §8.6 performance budget, §9.9 prerender, §3.4 scripts, §13 D16), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–40 are done; working tree clean; `npm install` run; `npm run dev` running; `CHROME_PATH` may or may not be set (both paths must be handled).
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
Route-level `React.lazy` exists; heavy components are lazy where the prompts said so (lightbox 23, recharts 29, editor 32/forms, SEO panel 36?, media library 39). `web-vitals` is installed but unused. Fonts load via `<link>` (02). `LazyImage` emits Cloudinary `srcSet` (39) but seed photos are picsum (no transformations) — the budget is measured with that in mind. `puppeteer-core@24.43.1` is installed (38); `serve@14.2.6` is not yet installed. `scripts/check-links.js`/`validate-jsonld.js` know how to launch Chrome from `CHROME_PATH`. Mock sitemaps list every public URL.

## 2. Objective
When this prompt is finished the app meets the performance budget in a production build served by `npm run serve:build` against the mock: code-splitting audited (every admin module, editor, charts, lightbox, SEO panel, media library, maps in separate chunks; the public main chunk contains no admin code — verified with a bundle report), `React.memo`/`useMemo` on cards/rows, `useInView` lazy sections for below-the-fold home rows, images with fixed ratios + `priority` on LCP images + `sizes`, fonts preconnect/swap + `font-display`, third-party scripts deferred, `web-vitals` reporting to GA4 when configured (`src/utils/vitals.js`), no layout shift (CLS < 0.1), no long tasks from analysis (SEO engine only in admin), gzip-friendly assets; Lighthouse mobile (Performance ≥ 85, SEO ≥ 95, Accessibility ≥ 95, Best Practices ≥ 95) on Home, Listing, Property details, Locality, Article index, Article — measured with Chrome when available (results recorded); `scripts/prerender.js` + `npm run build:prerender` (build + serve + crawl the mock sitemaps + static routes with `puppeteer-core` + write `build/<path>/index.html` with the rendered head/body; `createRoot` kept) working when `CHROME_PATH` is set and failing fast with a clear message otherwise; `npm run build` never needs Chrome; `serve:build` script added.

## 3. Scope
### Files to create
- `scripts/prerender.js`, `scripts/lib/chrome.js` (shared launcher: resolves `CHROME_PATH`, falls back to common Windows/macOS/Linux install paths, prints a clear error), `scripts/bundle-report.js` (reads `build/asset-manifest.json` + file sizes, prints chunks with gzip sizes; fails if the public entry chunk exceeds 300 KB gzip or contains admin markers — implemented by checking that `build/static/js/main.*.js` does not contain the strings `SeoPanel`, `RichTextEditor`, `recharts`, `MediaLibrary`), `src/utils/vitals.js` (`reportWebVitals` → `track('web_vitals', { name, value, id })` + `gtag` when present), `docs/PERFORMANCE.md` (budget, how to measure, results table)
- Tests: `scripts/__tests__/bundle-report.test.js`? — scripts are Node; add `node --test scripts/__tests__/chrome.test.js` for path resolution (skip when no Chrome) and include `scripts/__tests__` in `test:mock`? — keep a separate `"test:scripts": "node --test scripts/__tests__"` and add it to `check:all`
### Files to modify
- `src/index.js` (`reportWebVitals` after mount, deferred via `requestIdleCallback`), `src/routes/*` (lazy boundaries audit), components lacking `memo`/`useInView` (home rows, listing grid, sections), `LazyImage` usages missing `sizes`/`priority`, `public/index.html` (preload the hero font subset? — no: keep `<link>`; add `<link rel="preconnect" href="https://res.cloudinary.com">` and `dns-prefetch` for `picsum.photos` in dev only? — add `preconnect` to `res.cloudinary.com` only), `package.json` (scripts `build:prerender`, `serve:build`, `analyze` (`node scripts/bundle-report.js`), `test:scripts`; devDeps `serve@14.2.6`), `docs/*`
### Files to delete
- none
### May also touch
- `src/components/seo/Seo.jsx` (preload LCP image via `<link rel="preload" as="image" imagesrcset>` for property/article heroes — implement: `<Seo preloadImage={{ src, srcSet, sizes }}>`)

## 4. Detailed tasks
1. `npm i -D serve@14.2.6`; scripts: `"serve:build": "serve -s build -l 5000"`, `"build:prerender": "npm run build && node scripts/prerender.js"`, `"analyze": "node scripts/bundle-report.js"`, `"test:scripts": "node --test scripts/__tests__"` (+ `check:all`).
2. **Bundle audit**: run `npm run build` + `npm run analyze`; ensure lazy boundaries: all `pages/admin/**` (route-level), `components/editor/RichTextEditor` (already lazy in forms), `components/seo/SeoPanel` (lazy inside forms/dialog), `pages/admin/dashboard/charts/*` (lazy), `PropertyLightbox` (lazy), `MediaLibraryPage`/`MediaPickerDialog` (lazy), `MapPinPicker` (lazy), `QuizBlock`/`ChecklistBlock` (route-level is enough), `GlobalSearch` popover (no), `LeadCaptureModal` (lazy: it is used everywhere but only after interaction → `React.lazy` + prefetch on hover/focus of triggers); confirm `main.*.js` gzip ≤ 300 KB (record the number; if larger, split further: MUI icons none; `date-fns` imports per-function; `framer-motion` imported per component (`motion` from `framer-motion` is fine — check `LazyMotion`/`domAnimation` usage to reduce size: adopt `LazyMotion` with `domAnimation` features + `m` components in the public layout — decision, record).
3. **Rendering**: `React.memo` on `PropertyCard`, `ArticleCard`, `LocalityCard`, `DeveloperCard`, table rows; `useInView` (`rootMargin: '200px'`) to defer data fetching of below-the-fold home rows (`PropertyRow`, localities, builders, testimonials, insights) — fetch when near the viewport; `Carousel` renders only visible slides + neighbours (`content-visibility: auto` on offscreen cards); avoid re-render storms from `SiteSettingsContext` (split context values with `useMemo`; providers memoised).
4. **Images**: `priority` (eager + `fetchpriority=high` + `<Seo preloadImage>`) on the home hero, property hero, article featured image, locality/builder hero; `sizes` on every grid card (`(max-width: 599px) 100vw, (max-width: 899px) 50vw, 33vw`); explicit `width/height` on logos; `LazyImage` placeholders reserve space (CLS 0); videos `preload="none"` + poster; YouTube embeds as click-to-load facades (thumbnail + play button → iframe on click) in the property gallery and `.prose` (`SafeHtml` post-processing: replace `iframe[src*=youtube]` with the facade component).
5. **Fonts/head**: keep Google Fonts `<link>` with `display=swap`; add `preconnect` to `res.cloudinary.com`; ensure no render-blocking third-party scripts (GA/GTM/Pixel injected `async`/deferred after `load` — adjust `AnalyticsScripts` to inject after `window.load` + idle).
6. **web-vitals**: `src/utils/vitals.js` using `web-vitals` (`onCLS`, `onINP`? — v2 API exports `getCLS/getFID/getLCP/getFCP/getTTFB`; use those) → `track('web_vitals', { name, value: Math.round(value*1000)/1000, id, rating })`; wired in `index.js` after mount.
7. **Prerender**: `scripts/prerender.js`: reads `--port` (free port default 5050), starts `serve -s build` programmatically (spawn `npx serve` via `child_process` with `path.join`), collects URLs from `<MOCK>/sitemap.xml` (children) + static routes list (`/`, listing category routes, `/localities`, `/builders`, `/insights/articles`, `/insights/faqs`, `/shortlist`? no (noindex) ), launches Chrome (`scripts/lib/chrome.js`) with `--headless=new`, for each URL: navigate, wait for `document.querySelector('[data-prerender-ready]')` (add `data-prerender-ready` on `<main>` after the page's primary query resolves — implement via a small `usePrerenderReady(loading)` hook in page components) or a 10 s timeout, capture `document.documentElement.outerHTML`, strip the injected analytics scripts, write `build/<path>/index.html` (root `/` → `build/index.html` **replacing** CRA's index — keep a copy `build/index.spa.html` for the SPA fallback and document Nginx `try_files $uri $uri/index.html /index.spa.html`), concurrency 3, progress log, summary (n pages, failures), exit non-zero on failures; requires the mock running (documented) — `MOCK_URL` env (default `http://localhost:4000/api`). Without `CHROME_PATH` → exits 1 with "Set CHROME_PATH to run the prerender (optional step)". `docs/PERFORMANCE.md` documents the pipeline and Nginx fallback rules (also feeds the guidelines in 47).
8. **Lighthouse**: with Chrome available run Lighthouse via `npx lighthouse` — **not allowed** (new dependency)? `npx` would download `lighthouse` on the fly (not added to `package.json`) — decision: use Chrome DevTools' Lighthouse panel manually (human step) **or** `npx lighthouse@latest` ad hoc without adding a dependency; record scores for the six pages (mobile, production build via `serve:build`, mock running) in `docs/PERFORMANCE.md`; fix regressions found (e.g. missing `sizes`, unsized images, contrast, tap targets, meta viewport, `aria` issues) until the targets pass; when Chrome is unavailable, record "not measured" and leave a checklist for 46.
9. Tests/scripts; format.

## 5. Data contract touched
None. npm: `serve@14.2.6` (dev); scripts `serve:build`, `build:prerender`, `analyze`, `test:scripts`. Env: `CHROME_PATH`, `MOCK_URL` (prerender).

## 6. UI/UX requirements
No visual regressions; YouTube facades look like the player (thumbnail + centred play button, accessible button); deferred sections show skeletons of the final size; no CLS.

## 7. Edge cases that must work
- `npm run build` on a machine without Chrome works; `build:prerender` explains what is missing.
- Prerendered HTML loads and React re-renders without console errors (no hydration API used); client-side navigation still works from a prerendered page.
- Pages whose data fails to load still emit `data-prerender-ready` (with the error state) so the crawl never hangs.
- `bundle-report` fails the build check when admin code leaks into the public chunk.
- Reduced-motion users get no autoplay/animations (already) — verify Lighthouse "Best practices".

## 8. Acceptance criteria
- [ ] `npm run analyze` passes (public main chunk ≤ 300 KB gzip, no admin markers) — record sizes.
- [ ] `web-vitals` events appear in `dataLayer` on the production build; LCP images preloaded; YouTube facades in place; below-the-fold rows fetch lazily.
- [ ] `npm run build:prerender` works with Chrome (record page count) or fails fast without it; `docs/PERFORMANCE.md` has the Lighthouse table (or "not measured" + reasons).
- [ ] `npm run lint`, `npm run test:ci`, `npm run build:ci`, `npm run check:traces`, `npm run test:scripts`, `npm run smoke` pass; no console warnings.
- [ ] One commit; clean tree.

## 9. Verification
```
npm run lint
npm run test:ci
npm run build:ci
npm run analyze
npm run check:traces
npm run test:scripts
npm run mock            (terminal 2)
npm run serve:build     (terminal 3) → http://localhost:5000
npm run build:prerender (only with CHROME_PATH)
```
Manual QA: on `http://localhost:5000` (mock running) open Home/Listing/Property/Locality/Blog/Article at 390 px with DevTools Performance → no long tasks > 200 ms on load; Lighthouse mobile scores recorded; `window.dataLayer` contains `web_vitals` entries after interaction; prerendered `build/properties/<slug>/index.html` contains the rendered `<title>` and JSON-LD.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 41 report (bundle sizes, Lighthouse table, prerender status); Known issues: additional defect 4 (web-vitals) closed; next prompt: 42.
- `docs/DECISIONS.md`: D16, `LazyMotion` adoption, Lighthouse measurement method, `index.spa.html` fallback.

## 11. Commit
`git add -A && git commit -m "perf: code-splitting audit, lazy sections, LCP preloads, web-vitals, bundle report and optional prerender pipeline"`

## 12. Guardrails
- Do not touch: `db.json`, `theme.js`, `global.css` (except `content-visibility` utilities if needed — allowed), mock server.
- Do not add dependencies other than: `serve@14.2.6` (dev). Do not add `lighthouse` to `package.json`.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality.
