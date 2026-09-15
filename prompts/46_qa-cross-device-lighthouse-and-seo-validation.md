# Prompt 46 — QA 3: cross-device runs, Lighthouse targets, JSON-LD validation, link crawler, sitemap/robots/rss/llms checks, prerender dry run

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §8.1 widths, §8.6 budget, §9.9 prerender, QA-02/QA-05/QA-07 (master spec 16.2), §13 D16), then `docs/PROJECT_STATE.md`, `docs/DECISIONS.md`, `docs/PERFORMANCE.md`, `docs/QA/*`.
- Confirm prerequisites: prompts 01–45 are done; working tree clean; `npm install` run; `npm run mock` running; production build served via `npm run serve:build` for measurements; `CHROME_PATH` set when Chrome is available (record `node -v` and whether Chrome is available).
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
Scripts: `check-links.js`, `validate-jsonld.js` (38), `a11y-audit.js` (42), `prerender.js`, `bundle-report.js` (41), `smoke-api.js` (09), `contrast-check.js` (04), `validate-seed.js` (06/10). `docs/PERFORMANCE.md` holds the last Lighthouse table (41) or "not measured". All modules are complete and bug-bashed (44/45).

## 2. Objective
When this prompt is finished the release-quality evidence exists: Lighthouse mobile (production build, mock) on Home, Listing (`/buy`), Property details, Locality, Article index, Article — Performance ≥ 85, SEO ≥ 95, Accessibility ≥ 95, Best Practices ≥ 95, with lab LCP < 2.5 s, CLS < 0.1, TBT < 200 ms (measured with Chrome; each failing audit fixed and re-measured; without Chrome: documented as "requires Chrome — run `docs/QA/46-lighthouse-howto.md`" with the exact commands, and every fixable static issue addressed proactively); `npm run check:jsonld` and `npm run check:links` pass over the full sitemap; JSON-LD of three URLs validated by the human in Google's Rich Results Test (instructions + placeholders for the results in the report); every public page has exactly one H1, unique title/description, canonical, breadcrumbs (except home), valid JSON-LD, images with alt; sitemaps/robots/rss/llms verified against the rendered routes (every sitemap URL renders, every rendered indexable route is in a sitemap, robots serves the allow-list, RSS validates structurally, llms.txt lists localities/types/articles/contact); prerender dry run executed when Chrome is available (page count, spot-check of 3 prerendered files) and documented; cross-browser smoke (Chrome + Edge on Windows; Firefox if installed) at 360/390/414/768/1024/1280/1536; all findings fixed; `docs/QA/46-cross-device-lighthouse-seo.md` records everything.

## 3. Scope
### Files to create
- `docs/QA/46-cross-device-lighthouse-seo.md`, `docs/QA/46-lighthouse-howto.md`
- `scripts/check-sitemap-coverage.js` (crawls the app with Chrome from `/` following internal links up to depth 4 (public only), builds the set of indexable rendered routes (robots meta not noindex), compares with the union of sitemap URLs → reports missing/extra; without Chrome compares route tables + API data instead), script `check:sitemap`
### Files to modify
- Any file needed for fixes (performance, SEO, a11y); `docs/PERFORMANCE.md` (final table), `package.json` (`check:sitemap`), `docs/*`
### Files to delete
- none
### May also touch
- `mock-server/routes/sitemap.js`, `src/seo/*` for validation fixes

## 4. Detailed tasks
1. **Environment**: `npm run build:ci`, start `npm run mock` and `npm run serve:build`; confirm `http://localhost:5000` works against the mock (CORS includes 5000).
2. **Lighthouse (with Chrome)**: run mobile audits (DevTools → Lighthouse, mobile, simulated throttling, clear storage) for the six pages; also `npx lighthouse <url> --preset=perf --form-factor=mobile --output=json --output-path=docs/QA/lh/<page>.json` is acceptable ad hoc (no dependency added); record scores + LCP/CLS/TBT; fix failures (typical: image `sizes`, unused JS (split), font display, contrast, `aria` names, tap targets, `<meta viewport>`, links without discernible names, `robots.txt` validity (must be reachable from the app origin → for the served build, `public/robots.txt` placeholder exists; note the production proxy), canonical mismatches); re-run until targets pass; final table in `docs/PERFORMANCE.md` and the report.
3. **Without Chrome**: write `46-lighthouse-howto.md` with exact steps/commands and expected pages; perform a static review of the same audit categories (bundle report, image attributes, aria names via the a11y script "skipped" path → manual) and record "measured: no".
4. **JSON-LD + links + sitemap**: `npm run check:jsonld`, `npm run check:links`, `npm run check:sitemap` — all green (fix issues found: missing alt, duplicate descriptions (e.g. two localities with the same short description → adjust seed? — seed changes are allowed here for uniqueness; run `validate:seed`), invalid dates, missing `@id`s, listing canonical/noindex errors); human step: paste the JSON-LD (or URLs after deployment) of property 1, the RERA article and the Whitefield locality into Google's Rich Results Test and `validator.schema.org` — the report has a table to fill (URL, tool, result, date).
5. **Robots/RSS/llms**: fetch `/api/robots.txt` (allow-list present, sitemap lines), `/api/rss.xml` (parse with a minimal XML check: 20 items, valid pubDate), `/api/llms.txt` (sections present with absolute links); confirm `seoSettings` edits change them (37 verified; re-check after settings changes made in 45).
6. **Prerender dry run (with Chrome)**: `npm run build:prerender` with the mock running → record page count, time, failures (must be 0); open `build/index.html`, `build/properties/<slug>/index.html`, `build/insights/articles/<slug>/index.html` → head contains the resolved title/JSON-LD; serve the prerendered build (`serve:build`) and verify client-side navigation still works and no console errors; document Nginx fallback (`index.spa.html`). Without Chrome: document "not executed" with the commands.
7. **Cross-device/browser**: execute the width grid from prompt 42 again on the production build for the six key pages + admin login/dashboard/property form in Chrome and Edge (and Firefox if present); record; fix any regression.
8. **Evidence**: screenshots are optional (no binary bloat) — record numbers/tables; update `docs/PERFORMANCE.md`.

## 5. Data contract touched
None (seed uniqueness fixes allowed; `validate:seed` must pass). Script: `check:sitemap`.

## 6. UI/UX requirements
N/A (fixes only).

## 7. Edge cases that must work
- Lighthouse "SEO" audit on a CSR app: title/description present in the initial HTML? — CRA's `index.html` has the default title/description (02), so the audit passes; document that prerender improves it further.
- `check:sitemap` treats `noindex` pages (shortlist, search, previews) as non-indexable → not required in sitemaps.
- Article scheduled in the future → not in the sitemap; property inactive → not in the sitemap.
- Duplicate meta descriptions across category pages → templates adjusted (`%title% Articles`) rather than seed edits when possible.
- Prerender of pages with lead modals closed by default → no modal HTML in the snapshot.

## 8. Acceptance criteria
- [ ] `docs/QA/46-cross-device-lighthouse-seo.md` contains the Lighthouse table meeting the targets (or the documented "requires Chrome" section with the static review), the JSON-LD/links/sitemap script results (all pass), the Rich Results/Schema validator table, robots/rss/llms checks, the prerender dry-run results, the cross-browser grid.
- [ ] `npm run check:jsonld`, `npm run check:links`, `npm run check:sitemap` pass; `docs/PERFORMANCE.md` final.
- [ ] `npm run lint`, `npm run test:ci`, `npm run build:ci`, `npm run check:traces`, `npm run validate:seed`, `npm run test:mock`, `npm run smoke` pass.
- [ ] One commit; clean tree.

## 9. Verification
```
npm run build:ci
npm run mock          (terminal 2)
npm run serve:build   (terminal 3)
npm run check:jsonld
npm run check:links
npm run check:sitemap
npm run build:prerender   (with CHROME_PATH)
npm run lint
npm run test:ci
npm run check:traces
npm run validate:seed
npm run smoke
```
Manual QA: Lighthouse runs; Rich Results Test (human); cross-browser grid; prerendered pages spot-check.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 46 report (scores, script results, prerender status, browsers tested); next prompt: 47.
- `docs/DECISIONS.md`: measurement method, any template/seed adjustments.

## 11. Commit
`git add -A && git commit -m "test(qa): cross-device, Lighthouse, JSON-LD/link/sitemap validation and prerender dry run with fixes"`

## 12. Guardrails
- Do not touch: `theme.js`, `global.css` tokens, data contracts (except documented sitemap fixes).
- Do not add dependencies other than: none (`npx lighthouse` ad hoc is not a dependency).
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality.
