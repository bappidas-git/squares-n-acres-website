# Prompt 01 — Repository audit, tooling baseline and project state files

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (this is the first prompt: `docs/PROJECT_STATE.md` and `docs/DECISIONS.md` do not exist yet — you create them here).
- Confirm prerequisites: you are at the repository root on branch `main`; `git status` is clean; Node ≥ 18.18 and npm ≥ 9 are installed (`node -v`, `npm -v`); `node_modules/` may be missing — run `npm install` first.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `git status` / `git log -5` and any existing `docs/PROJECT_STATE.md` say it stopped; do not redo finished work.

## 1. Context
The repository is the untouched "H.O.M Advisory" boilerplate: Create React App (`react-scripts 5.0.1`), React 18, react-router v6, MUI v7, CSS Modules, `framer-motion`, `react-helmet-async`, `axios`, `@iconify/react`, `react-slick`, `react-countup`, `react-intersection-observer`, `sweetalert2`. `package.json` name is `hom-real-eastate-website`, `devDependencies` is empty, scripts are `start/build/test/eject/dev` (`dev` = `react-scripts start`). There is no ESLint config beyond CRA's `eslintConfig`, no Prettier, no `.editorconfig`, no `.nvmrc`, `.gitattributes` has `* text=auto` without `eol=lf`. Root `db.json` (8 collections: `properties` 9, `leads` 28, `neighborhoods` 6, `partners` 6, `faqs` 16, `articles` 10, `siteSettings` object, `adminUsers` 3) has no server to serve it. Source tree: `src/App.js`, `src/index.js`, `src/theme.js`, `src/routes/index.js`, `src/assets/styles/global.css`, `src/components/{admin,common,layout,sections/home,sections/property}`, `src/config/{adminConstants,rbac}.js`, `src/contexts/AdminAuthContext.js`, `src/hooks/{useDebounce,useThrottledScroll}.js`, `src/pages/{admin,public}`, `src/pages/admin/property-tabs/*`, `src/services/{api,seoService}.js`, `src/utils/{leadStorage,seoGenerator,seoScoring,validators}.js`. Known lint-relevant facts: 7 `console.log` in `src/pages/admin/PropertyForm.jsx`, one `console.error` in `src/pages/admin/Dashboard.js`, unused imports (`memo`, `useInView` in `src/pages/public/PropertyListing.jsx`; `LinearProgress` in `src/pages/admin/property-tabs/SeoTagsTab.jsx`; `sanitizeInput` in `src/components/sections/property/EnquiryForm.jsx`), unused variables (`isMobile` in `src/pages/admin/LeadDetail.js`, `index` in `src/components/common/ToastProvider.jsx`, `videoRef`/`inputRef` in `src/components/sections/home/HeroSection.jsx`, `resultRef` in `src/components/sections/property/FinanceGuide.jsx`, ~12 `catch (err)` with unused `err`), one `// eslint-disable-next-line react-hooks/exhaustive-deps` in `src/pages/admin/property-tabs/GalleryTab.jsx`, a `useCallback(..., [])` with a stale closure in `src/components/sections/property/StickyNav.jsx`.

## 2. Objective
When this prompt is finished the repository has a reproducible engineering baseline: pinned Node/npm, Prettier + ESLint (0 errors/0 warnings on the whole tree), cross-platform npm scripts (`lint`, `lint:fix`, `format`, `format:check`, `test:ci`, `build:ci`, `check:traces`, `check:all`), editor/git normalisation files, the executor's own complete inventory of the codebase in `docs/CODEBASE_INVENTORY.md`, a recorded build/lint baseline, and the two state files every later prompt depends on (`docs/PROJECT_STATE.md`, `docs/DECISIONS.md`). Nothing about the product changes yet (no rebrand, no feature work).

## 3. Scope
### Files to create
- `docs/PROJECT_STATE.md`, `docs/DECISIONS.md`, `docs/CODEBASE_INVENTORY.md`
- `.editorconfig`, `.nvmrc`, `.prettierrc`, `.prettierignore`
- `scripts/check-traces.js`
### Files to modify
- `package.json` (name stays for now — renamed in prompt 02; add `engines`, scripts, `devDependencies`, `eslintConfig`, `jest`), `package-lock.json` (via npm), `.gitattributes`, `.gitignore`
- Every `src/**/*.{js,jsx}` file that has a lint error or warning under the new config (minimal, behaviour-preserving fixes only)
### Files to delete
- none
### May also touch
- nothing else

## 4. Detailed tasks
1. `npm install` (installs the boilerplate's dependencies). Record `node -v`, `npm -v` and the install warnings in `docs/PROJECT_STATE.md` → "Baseline".
2. **Baseline measurements (before changing anything):** run `npm run build` and `npx eslint "src/**/*.{js,jsx}"`; copy the warning/error summary (counts + the first 30 lines) into "Baseline". Run `node -e` counters and record: number of files under `src/`, total lines (`git ls-files src | xargs wc -l`), count of hex literals in JS/JSX outside `src/theme.js` (`grep -rnoE "#[0-9A-Fa-f]{3,8}\b" src --include=*.js --include=*.jsx | grep -v theme.js | wc -l` → expected ≈ 1206) and in CSS outside `global.css` (≈ 290), count of HOM traces per the regex in `00_MASTER_CONTEXT.md` §13 D17 (≈ 49 in `db.json`, ≈ 90 in `src/`).
3. **Inventory** — write `docs/CODEBASE_INVENTORY.md` from your own reading of every file (not from memory): (a) a table of every route → page component → data endpoints called; (b) every component under `src/components/**` with one line each: purpose, props, endpoints, hardcoded content (brand strings, e-mails, phones, copy blocks), hex-literal count, third-party libs; (c) every page under `src/pages/**` the same way, plus for the static pages the list of sections (heading + content type); (d) every service function in `src/services/api.js` and `src/services/seoService.js` with method + path + params; (e) every util/hook/constant export; (f) every `db.json` collection with its field list and record count, noting mixed id types and inconsistent fields; (g) every lead `source` value found in `src/` with the file that emits it; (h) every `localStorage`/`sessionStorage` key; (i) all third-party dependency usages (which files import `react-slick`, `react-countup`, `react-intersection-observer`, `sweetalert2`, `framer-motion`, `@mui/icons-material` — expect 0 — and `web-vitals` — expect 0); (j) a "Defects observed" list: everything in `00_MASTER_CONTEXT.md` §11 that you can confirm plus anything new you find (mark new ones `NEW-nn`). Be exhaustive: this file is the evidence for the coverage matrix in `prompts/00_INDEX.md`.
4. **Node/npm pins:** create `.nvmrc` with `20`; add to `package.json`: `"engines": { "node": ">=18.18", "npm": ">=9" }`.
5. **Editor & git normalisation:** `.editorconfig` (`root = true`, `[*]` `indent_style = space`, `indent_size = 2`, `end_of_line = lf`, `charset = utf-8`, `trim_trailing_whitespace = true`, `insert_final_newline = true`, `[*.md]` `trim_trailing_whitespace = false`). `.gitattributes` → `* text=auto eol=lf` plus `*.png binary`, `*.jpg binary`, `*.ico binary`, `*.woff2 binary`. Run `git add --renormalize .` and commit the renormalisation as part of this prompt's single commit (if it touches many files, that is expected — mention it in the state file). `.gitignore`: add `/mock-server/.runtime/`, `/backend_developer_guidelines/.tmp/`, `.env`, `.env.production`, `/e2e/test-results/`, `/playwright-report/`, `*.log`.
6. **Prettier:** `npm i -D prettier@3.9.6 eslint-config-prettier@10.1.8 cross-env@7.0.3 rimraf@5.0.10`. `.prettierrc` = `{ "singleQuote": true, "semi": true, "printWidth": 100, "trailingComma": "es5", "endOfLine": "lf" }`. `.prettierignore` = `build`, `node_modules`, `package-lock.json`, `public/brand`, `mock-server/.runtime`, `backend_developer_guidelines`, `db.json`, `*.min.*`. **Do not run `prettier --write` on the whole tree in this prompt** (it would create a giant noisy diff before the rebrand); run it only on files you touch. Prompt 03 formats the whole tree after the purge.
7. **ESLint (in `package.json` → `eslintConfig`):**
   ```json
   "eslintConfig": {
     "extends": ["react-app", "react-app/jest", "prettier"],
     "rules": {
       "no-console": ["error", { "allow": ["warn", "error"] }],
       "no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_", "ignoreRestSiblings": true }],
       "react-hooks/exhaustive-deps": "error",
       "no-restricted-imports": ["error", { "paths": [
         { "name": "axios", "message": "Import the shared client from src/services/http.js" },
         { "name": "@mui/icons-material", "message": "Use @iconify/react icons" }
       ], "patterns": ["@mui/icons-material/*"] }]
     },
     "overrides": [
       { "files": ["src/services/api.js", "src/services/http.js"], "rules": { "no-restricted-imports": "off" } },
       { "files": ["scripts/**/*.js", "mock-server/**/*.js"], "env": { "node": true }, "rules": { "no-console": "off" } }
     ]
   }
   ```
   Also add `"jest": { "transformIgnorePatterns": ["node_modules/(?!(yet-another-react-lightbox)/)"] }` (harmless now; needed from prompt 23).
8. **Scripts** (add/replace in `package.json`; keep `start`, `build`, `test`, `eject`, `dev` for now — `dev` and `mock*` are replaced in prompt 06):
   `"lint": "eslint \"src/**/*.{js,jsx}\" \"scripts/**/*.js\" --max-warnings=0"`, `"lint:fix": "eslint \"src/**/*.{js,jsx}\" \"scripts/**/*.js\" --fix"`, `"format": "prettier --write \"src/**/*.{js,jsx,css,json}\" \"scripts/**/*.js\" \"docs/**/*.md\""`, `"format:check": "prettier --check \"src/**/*.{js,jsx,css,json}\" \"scripts/**/*.js\""`, `"test:ci": "cross-env CI=true react-scripts test --watchAll=false"`, `"build:ci": "cross-env CI=true react-scripts build"`, `"check:traces": "node scripts/check-traces.js"`, `"check:all": "npm run lint && npm run test:ci && npm run build:ci && npm run check:traces"`. (`mock-server/**` globs are added to `lint` in prompt 06.)
9. **`scripts/check-traces.js`** (Node, no dependencies, cross-platform): walks `src`, `public`, `mock-server`, `scripts`, `docs` (excluding `docs/archive/**`), `db.json`, `README.md`, `package.json` and every `.env*` file; skips `node_modules`, `build`, `prompts`, binary files; applies the case-insensitive regexes of `00_MASTER_CONTEXT.md` §13 D17 (brand strings, Cloudways, HOM palette hexes, HOM fonts, `dzbiw7t4i`, `video.gumlet.io`, `placehold.co`, `goldenrod`) with the allow-list (`home`, `homes`, `homepage`, `home-loan`, `home loan`, `hometown`); additionally reports any hex colour literal (`#[0-9a-f]{3,8}` as a CSS/JS colour, ignoring `&#8377;`-style entities and URL fragments after `?`/`#` in strings that start with `http`) in files other than `src/assets/styles/global.css`, `src/theme.js`, `src/seo/data/*` and `public/brand/*`; prints `file:line: match` grouped by file with totals; exit code 1 when there are findings unless `--report` is passed (exit 0, summary only). Add `"check:traces:report": "node scripts/check-traces.js --report"`. **In this prompt `check:all` is expected to fail at `check:traces`; run `npm run check:traces:report` and record the totals in the state file.** From prompt 03 onward the strict script must pass.
10. **Make lint green without changing behaviour:** remove the 7 `console.log` lines in `PropertyForm.jsx` and the `console.error` in `Dashboard.js` (replace with nothing — the surrounding `try/catch` already sets UI state), remove unused imports/variables listed in §1 (and any others ESLint reports), rename unused catch bindings to `catch {` (optional catch binding) or `catch (_err)`, fix `react-hooks/exhaustive-deps` findings by adding the missing dependencies **or** by moving the value into a ref when adding it would loop (document each in a code comment-free way: no comments needed — just correct code), fix the stale `useCallback` in `StickyNav.jsx` by adding `navItems` to its dependency array, and delete the `eslint-disable-next-line` in `GalleryTab.jsx` by restructuring the effect (compute `getDefaultCoverUrl(formData.title)` inside the effect and depend on `[formData.title, formData.gallery, updateField]`, guarding against loops with an equality check before calling `updateField`). Do not fix product bugs here; do not touch styling.
11. **State files:** create `docs/PROJECT_STATE.md` using the exact template of `00_MASTER_CONTEXT.md` §12.4 with `Status: IN PROGRESS`, the Baseline section filled (versions, build/lint output summary, counters, HOM-trace totals, hex totals), the cumulative lists initialised, "Pending rewrites" empty, and **"Known issues (open)"** pre-filled with every item of `00_MASTER_CONTEXT.md` §11 (BUG-01…BUG-21 and the 28 additional defects) plus your own `NEW-nn` findings, each with its owner prompt. Create `docs/DECISIONS.md` with a header and the first ADR lines: the decisions you took in this prompt (at least: ESLint rule set, Prettier options, the choice to defer whole-tree formatting to prompt 03, `.nvmrc` 20 with engines ≥ 18.18).

## 5. Data contract touched
None (no endpoints, no `db.json` changes). npm scripts added: `lint`, `lint:fix`, `format`, `format:check`, `test:ci`, `build:ci`, `check:traces`, `check:traces:report`, `check:all`. Env vars: none.

## 6. UI/UX requirements
N/A (no UI changes; the app must still render exactly as before).

## 7. Edge cases that must work
- `npm run lint` on Windows (quotes in globs are double quotes; no shell-specific syntax).
- `git add --renormalize .` converts CRLF files; the app still builds afterwards.
- A file with only unused-catch-binding errors compiles under CRA's Babel (optional catch binding is supported).
- `check-traces.js` handles files with non-UTF-8 bytes without crashing (read as `utf8`, ignore decode errors) and never reports its own regex source file.
- `react-scripts test` with no test files present exits 0 in CI mode (`--passWithNoTests` is implied by CRA; if it exits 1, add `--passWithNoTests` to `test:ci`).

## 8. Acceptance criteria
- [ ] `npm run lint` → 0 errors, 0 warnings across `src/**` and `scripts/**`.
- [ ] `npm run build:ci` succeeds (warnings would fail it — there must be none).
- [ ] `npm run test:ci` passes (no tests yet is acceptable).
- [ ] `npm run check:traces:report` prints totals; `npm run check:traces` exits 1 (findings still exist — expected until prompt 03).
- [ ] `.editorconfig`, `.nvmrc` (`20`), `.prettierrc`, `.prettierignore`, `.gitattributes` (`* text=auto eol=lf`) exist; `package.json` has `engines`, the scripts of task 8, `eslintConfig` of task 7 and the `jest` key.
- [ ] `docs/CODEBASE_INVENTORY.md` lists every route, page, component, section, service function, util, constant, hook and `db.json` collection (spot-check: it mentions `FinanceGuide.jsx` (1808 lines), `PropertyDetails.jsx` (24 `useState`), `PropertyDetail.js` (dead stub), `adminService` (dead duplicate), the `?search=`/`?q=` mismatch, the 900–960 px header gap).
- [ ] `docs/PROJECT_STATE.md` and `docs/DECISIONS.md` exist in the prescribed format; "Known issues (open)" contains BUG-01…BUG-21 and the 28 additional defects with owner prompts.
- [ ] The app behaves exactly as before (`npm start` → home page renders; no new runtime errors in the console other than pre-existing network errors against the unreachable HOM API).
- [ ] One commit; `git status` clean.

## 9. Verification
```
npm install
npm run lint
npm run test:ci
npm run build:ci
npm run check:traces:report
```
Manual QA:
1. `npm start`, open `http://localhost:3000/` — the HOM home page renders (network errors for the old API are expected); open the console: no new errors introduced by the lint fixes.
2. Open `/admin/login` — the login page renders.
3. Open `/properties` — the listing page renders its empty/error state without crashing.
4. Resize to 390 px — no crash.
5. `git diff --stat` — confirm only the files of §3 changed (plus renormalised line endings).

## 10. Update project state
- `docs/PROJECT_STATE.md`: "Executed prompts" row for 01; Baseline filled; Prompt report 01 (files added/changed, scripts added, known issues list, "next prompt: 02").
- `docs/DECISIONS.md`: ADR lines for this prompt.

## 11. Commit
`git add -A && git commit -m "chore(tooling): add lint/prettier/ci scripts, project state and codebase inventory"`

## 12. Guardrails
- Do not touch: product behaviour, styling, `db.json`, routes, `README.md`, `.env`, `public/`.
- Do not add dependencies other than: `prettier@3.9.6`, `eslint-config-prettier@10.1.8`, `cross-env@7.0.3`, `rimraf@5.0.10` (dev).
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or new HOM/H.O.M traces (existing ones are purged in prompts 02–03).
- Do not reduce or remove existing functionality.
