# Prompt 48 — Final audit and release checklist: every check re-run, every route walked, seed reset, prerender, guidelines regenerated, client content checklist, README final, inventory archived, version 1.0.0, tag

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §12 definition of done, §14 placeholders policy, QA-09 (master spec 16.4), §3.4 scripts, §13), then `docs/PROJECT_STATE.md`, `docs/DECISIONS.md`, every `docs/QA/*` report, `docs/CONTENT_TO_BE_PROVIDED_BY_CLIENT.md` (started in 43).
- Confirm prerequisites: prompts 01–47 are done; working tree clean; `npm install` run; `npm run mock` running; Chrome availability recorded (`CHROME_PATH`).
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
All modules, QA passes and the handover package exist. `docs/CODEBASE_INVENTORY.md` still describes the HOM boilerplate (with "removed in prompt NN" notes). `README.md` was rewritten in 02 and updated in 47. `package.json` version is `0.2.0`. `docs/PROJECT_STATE.md` status is IN PROGRESS. Scripts: `check:all` (lint, test:ci, build:ci, check:traces, validate:seed, check:contrast, test:mock, test:scripts, check:guidelines), `smoke`, `check:links`, `check:jsonld`, `check:sitemap`, `a11y:audit`, `build:prerender`, `generate:backend-guidelines`, `e2e` (optional).

## 2. Objective
When this prompt is finished the repository is release-ready: every automated check re-run and green; every public and admin route walked with the console open for all three roles (final statement in the report); the seed reset flow verified (`mock:reset`, `MOCK_FRESH=1`, `validate:seed`); `npm run build:prerender` documented and executed when Chrome is available; `backend_developer_guidelines/` regenerated and checked (no diff expected); `docs/CONTENT_TO_BE_PROVIDED_BY_CLIENT.md` complete (every placeholder value with its admin location: settings fields, pages, seed records to replace (developers, banks, partners, team, testimonials, legal pages, articles' figures to verify, RERA numbers, phone/e-mail/address/map, social links, hero media, logo confirmation, GA/GTM/Pixel/Maps/Cloudinary/reCAPTCHA keys, production domain/API URL)); `README.md` final (SNA, setup, scripts table, dual mode, environment files, mock server, seed reset, testing, build/prerender, deployment overview linking the guidelines, switch-over procedure, troubleshooting on Windows, license); `docs/CODEBASE_INVENTORY.md` moved to `docs/archive/CODEBASE_INVENTORY.md` (HOM references allowed there and excluded from `check:traces`) with a header explaining it is historical; `.env.example` complete and matching every `process.env` read (script `scripts/check-env-example.js` asserts it; add to `check:all`); `package.json` name `squares-n-acres-website`, version `1.0.0`, `description`, `engines`, no unused dependencies (`npx depcheck` is not allowed as a dependency — verify manually with a grep per dependency and record); `docs/PROJECT_STATE.md` marked **COMPLETE** with the final metrics; git tag `v1.0.0` created.

## 3. Scope
### Files to create
- `docs/QA/48-final-audit.md`, `docs/archive/CODEBASE_INVENTORY.md` (moved), `scripts/check-env-example.js`, `docs/RELEASE_CHECKLIST.md` (the reusable go-live checklist: build, env, DNS/Nginx, API smoke against production, robots/sitemap live checks, Rich Results, GA verification, admin password rotation, seed data replaced)
### Files to modify
- `README.md`, `package.json` (version 1.0.0; `check:all` += `check:env`), `.env.example`, `docs/CONTENT_TO_BE_PROVIDED_BY_CLIENT.md`, `docs/PROJECT_STATE.md`, `docs/DECISIONS.md`, `scripts/check-traces.js` (exclude `docs/archive/**`), `backend_developer_guidelines/*` (regenerated, expected no diff), any file needing a last fix
### Files to delete
- `docs/CODEBASE_INVENTORY.md` (moved), any leftover temporary file/folder (`docs/QA/lh/*.json` keep? — keep JSON reports ≤ 1 MB total; delete larger), `mock-server/.runtime` is ignored
### May also touch
- anything for last fixes (documented in the report)

## 4. Detailed tasks
1. **Re-run everything**: `npm ci` (clean install from the lockfile — must succeed on Node 20 and Node 18.18+), `npm run check:all`, `npm run mock` + `npm run smoke`, `npm run check:links`, `npm run check:jsonld`, `npm run check:sitemap`, `npm run a11y:audit` (or skipped), `npm run e2e` (if installed), `npm run analyze`; record every result with numbers in `48-final-audit.md`.
2. **Route walk**: table of every public route (each listing route, one entity of each type, all CMS pages, taxonomy pages, shortlist, 404) and every admin route for admin/manager/sales at 1280 and 390 px → "console clean ✓"; fix anything found.
3. **Seed reset flow**: modify data in the runtime db via admin → `npm run mock:reset` → data restored; `MOCK_FRESH=1 npm run mock` → re-seeded; `npm run validate:seed` passes; document in README.
4. **Prerender**: with Chrome → `npm run build:prerender` → record; without → document the commands and mark "not executed on this machine".
5. **Guidelines**: `npm run generate:backend-guidelines` → `git diff --stat backend_developer_guidelines` empty (or only the commit line) → `npm run check:guidelines`.
6. **Client content checklist**: complete `docs/CONTENT_TO_BE_PROVIDED_BY_CLIENT.md` as a table: item, current placeholder value, where to change (Admin → Settings → tab/field, Admin → Pages → page/block, seed collection), required before go-live (yes/no), notes (e.g. "verify stamp-duty figures with a CA", "replace sample testimonials", "provide RERA registration", "confirm logo usage on dark surfaces", "rotate admin passwords", "provide production domain and API URL", "Cloudinary cloud/preset", "GA4/GTM/Pixel", "Google Maps key", "reCAPTCHA (optional; not wired)", "social links", "working hours", "legal pages text", "hero media", "developer/bank/partner records", "team members", "articles' facts and figures", "job openings").
7. **README final** per §2; include a "Scripts" table generated from `package.json` (verify every script is listed), "Environment" table from `.env.example`, "Windows notes" (PowerShell env vars `$env:MOCK_DELAY_MS=1500`, `npm run dev` uses concurrently, line endings), "Switch-over" (from the guidelines README), "Troubleshooting" (port in use, runtime db corrupt → reset, Chrome not found → prerender optional).
8. **Inventory archive**: move the inventory; update `check-traces.js` exclusions; ensure `check:traces` passes.
9. **Env check**: `scripts/check-env-example.js` greps `process.env.REACT_APP_*` and `process.env.MOCK_*`/`CHROME_PATH`/`MOCK_URL` across `src/`, `mock-server/`, `scripts/` and asserts each appears in `.env.example` with a comment; `check:env` script added to `check:all`.
10. **Dependencies review**: for each `dependencies`/`devDependencies` entry grep for an import/usage (`@testing-library/*` used by tests; `web-vitals` used; `@emotion/*` required by MUI; `concurrently`/`cross-env`/`rimraf`/`serve`/`puppeteer-core`/`prettier`/`eslint-config-prettier`/`json-server`/`express`/`cors` used by scripts) — remove any unused one; `package.json` version `1.0.0`, `description`, `engines` present; `private: true`.
11. **State files**: `docs/PROJECT_STATE.md` → `Status: COMPLETE`, final metrics (routes, endpoints, tests count, coverage of `src/seo`, bundle sizes, Lighthouse table reference, seed counts), the full "Executed prompts" table (01–48 with commit hashes), "Known issues (open)" empty, "Deferred (post-1.0)" list if any (e.g. reCAPTCHA wiring, compare feature) with rationale; `docs/DECISIONS.md` final entries.
12. Commit, then `git tag -a v1.0.0 -m "Squares N Acres website 1.0.0"`; verify `git status` clean and `git tag` lists `v1.0.0`.

## 5. Data contract touched
None. Script: `check:env` (in `check:all`).

## 6. UI/UX requirements
N/A (final fixes respect the design system).

## 7. Edge cases that must work
- `npm ci` on a clean clone (delete `node_modules` first) succeeds and `npm run check:all` passes from scratch.
- `check:traces` excludes `docs/archive/**` and `prompts/**` but still scans everything else.
- The guidelines regeneration after the version bump produces only the commit line diff (if the generator embeds the commit) — commit the regenerated files.
- Tagging is the last step after the commit; the tree is clean.

## 8. Acceptance criteria
- [ ] `docs/QA/48-final-audit.md` records green results for every check, the route walk for all roles, the seed reset test, prerender status, guidelines regeneration, dependency review.
- [ ] `docs/CONTENT_TO_BE_PROVIDED_BY_CLIENT.md` complete; `README.md` final; `docs/archive/CODEBASE_INVENTORY.md` in place; `.env.example` complete (`check:env` passes).
- [ ] `package.json` version `1.0.0`; `docs/PROJECT_STATE.md` status COMPLETE; `git tag v1.0.0` exists on the final commit; `git status` clean.
- [ ] `npm run check:all` passes on a clean `npm ci`.

## 9. Verification
```
rimraf node_modules   (npx rimraf node_modules)
npm ci
npm run check:all
npm run mock            (terminal 2)
npm run smoke
npm run check:links
npm run check:jsonld
npm run check:sitemap
npm run generate:backend-guidelines
npm run check:guidelines
git status --short
git tag
```
Manual QA: route walk (task 2); seed reset (task 3); README followed literally on a fresh clone in a temp folder (`git clone` → `npm ci` → `npm run dev` → site + admin work).

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 48 report; `Status: COMPLETE`; final metrics; "next prompt: none".
- `docs/DECISIONS.md`: release decisions, deferred items.

## 11. Commit
`git add -A && git commit -m "chore(release): final audit, client content checklist, README, version 1.0.0"` then `git tag -a v1.0.0 -m "Squares N Acres website 1.0.0"`.

## 12. Guardrails
- Do not touch: behaviour beyond last-mile fixes documented in the report.
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces anywhere outside `docs/archive/` and `prompts/`.
- Do not reduce or remove existing functionality.
