# Prompt 45 — QA bug bash 2: leads/CRM, articles/blog, SEO Manager, CMS pages, careers, media, settings, users/profile, auth/RBAC/expiry — console clean, all checks green

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §7 RBAC, §5.4 auth, §9, §12, QA-06 (master spec 16.2 "every admin module round-trip, 422 inline, RBAC for three roles, token expiry")), then `docs/PROJECT_STATE.md`, `docs/DECISIONS.md`, `docs/QA/44-property-bug-bash.md`.
- Confirm prerequisites: prompts 01–44 are done; working tree clean; `npm install` run; `npm run dev` running.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
Prompt 44 verified the property path and logged out-of-module defects in "Known issues" (owner 45). Remaining modules: leads/CRM + dashboard (29), lead capture (28), articles admin/blog + editor (32–34), SEO engine/panel/dashboard/settings/redirects/public wiring (35–38), CMS (30), careers/jobs/awareness/contact/newsletter (31), media (39), settings/users/profile (40, 13, 12), auth/RBAC/expiry (07, 12), FAQs/testimonials/team/partners (17), localities/developers (14, 16). Playwright may exist (44).

## 2. Objective
When this prompt is finished every remaining module has been round-tripped (create → list → edit → view public → toggle → bulk → delete) for admin, manager and sales with 422 errors displayed inline, RBAC verified in the UI **and** the API for all three roles on every admin route/action, token expiry verified (`MOCK_TOKEN_TTL_HOURS=0.01`) including auto-logout with toast and post-login redirect, every public entry point verified to produce the right lead, the SEO Manager verified against `docs/SEO_ENGINE.md` (a property/article improved from Poor to Good by following the hints; bulk tools; settings effects on the public head; redirects live), the CMS verified (every block type rendered on a test page), articles verified (schedule → auto-publish on the mock after the time passes; preview; editor blocks round-trip), media verified, settings/users/profile verified, careers/newsletter verified; all defects fixed; the browser console is clean on every route (public + admin) for all roles; every automated check passes; Playwright specs (if installed) extended with: publish article, SEO panel save, CMS page publish, settings save; `docs/QA/45-modules-bug-bash.md` records everything; "Known issues (open)" is empty or contains only items explicitly deferred with a reason (must be none of severity high).

## 3. Scope
### Files to create
- `docs/QA/45-modules-bug-bash.md`, `docs/QA/45-rbac-matrix-verified.md` (route/action × role → expected/actual, UI + API)
- Tests: `src/__tests__/rbac.routes.test.jsx` (renders every admin route config entry for each role and asserts `Forbidden`/page), `src/seo/__tests__/seedEntities.analyze.test.js` (analyze every seed property/article/page/locality/developer → no exceptions, score numeric), `src/components/cms/__tests__/allBlocks.render.test.jsx` (each `BLOCK_TYPES` default data renders), e2e specs (optional): `e2e/tests/article-publish.spec.js`, `seo-panel.spec.js`, `cms-page.spec.js`, `settings.spec.js`
### Files to modify
- Any file needing a fix; `docs/*`
### Files to delete
- none
### May also touch
- `mock-server/*` for contract fixes (keep `test:mock`/`smoke` green; document)

## 4. Detailed tasks
1. **RBAC matrix verification**: for every entry in `adminRouteConfig.js` and every admin action (create/edit/delete/bulk/export/assign/claim/settings edit/users/custom HTML), test UI (visible? enabled? 403 page?) and API (curl/smoke with each role's token → 200/403) — fill `45-rbac-matrix-verified.md`; fix mismatches on either side.
2. **Auth/expiry**: restart the mock with `MOCK_TOKEN_TTL_HOURS=0.01` → login → wait → auto-logout toast + login page; deep link restore after login; logout in tab A logs out tab B; revoked token (delete `apiTokens` in the runtime db) → next call → single redirect; password change revokes other sessions; inactive user cannot log in; login rate limit 429 UI message.
3. **Leads**: submit from every entry point of `ENTRY_POINTS` (public pages + header CTA + bottom nav + floating WhatsApp for identified visitor + call click) → correct `source`, `propertyId/articleId/pageSlug`, `requirement`, `meta`, `utm` (visit with `?utm_source=test`); admin list filters/sort/bulk/export/assign/claim/notes/timeline/follow-up/duplicate chip; sales scoping; notifications (badge/toast/pause hidden).
4. **Articles/editor/blog**: create with all block types (figure with alt, table, YouTube, CTA, property embed, FAQ block, internal/external links) → schedule 1 minute ahead → wait → public page appears (mock lazy flip) → RSS contains it → TOC/related/prev-next/share; preview token; archive; taxonomy CRUD + guards; author page; category/tag pages; search.
5. **SEO Manager**: take property 3 and an article: run the panel hints until Good (record the steps); dashboard bulk re-analyse/auto-generate; duplicates/issues; settings templates → public `<title>` changes; knowledge graph → home JSON-LD; robots/llms editors → served endpoints; sitemap toggles → `sitemap-*.xml`; redirects → live redirect + hits; manager cannot edit custom HTML (UI + API 403); `check:jsonld` + `check:links` green.
6. **CMS**: create a test page with every `BLOCK_TYPES` type → preview → publish → renders (delete afterwards); nested slug; header/footer placement toggles reflect in nav; reserved slug refused; legal pages.
7. **Careers/newsletter/contact/FAQs/testimonials/team/partners/localities/developers**: CRUD + guards + public rendering; job apply (URL mode); subscribers export; contact form; FAQ reorder under filter; sample testimonials hidden in a production build (`serve:build`).
8. **Media/settings/users/profile**: media URL add/edit/delete guard/picker in 3 fields; settings tabs save + public reflection + manager read-only; users safety rules; profile/password.
9. **Console cleanliness**: walk every public route (all listing routes, one entity per type, all CMS pages, 404) and every admin route for each role with the console open; zero errors/warnings (React keys, act(), MUI props, 404 assets, mixed content).
10. **Fix everything**; add regression tests for pure logic; extend Playwright if installed; update docs; ensure "Known issues (open)" is empty (or explicitly deferred low-severity items with owner 48 and reason).

## 5. Data contract touched
Only fixes (documented in `docs/API_CONTRACT.md` when the mock changes).

## 6. UI/UX requirements
N/A (fixes respect the design system).

## 7. Edge cases that must work
- Manager editing settings via devtools → API 403; sales exporting own leads → 200 (scoped).
- Scheduled article whose time passes while the public list is open → appears on the next fetch.
- SEO panel with a 20 000-character article → analysis < 200 ms, UI responsive.
- Redirect created for a page slug that later changes → old path still redirects (redirect record persists).
- Media deletion blocked when used by a page block.
- Deleting the only admin refused; deactivating the current user refused.
- Property/article slugs with unicode/special characters in titles → clean ASCII slugs.

## 8. Acceptance criteria
- [ ] `docs/QA/45-modules-bug-bash.md` and `45-rbac-matrix-verified.md` complete with ✓ everywhere; every defect fixed and referenced.
- [ ] Console clean on every route for all roles (statement + list of routes walked).
- [ ] New Jest suites pass; e2e extended (or documented skip).
- [ ] `npm run lint`, `npm run test:ci`, `npm run build:ci`, `npm run check:traces`, `npm run check:contrast`, `npm run test:mock`, `npm run test:scripts`, `npm run smoke`, `npm run check:links`, `npm run check:jsonld` pass.
- [ ] "Known issues (open)" empty (or only explicitly deferred low-severity items); one commit; clean tree.

## 9. Verification
```
npm run lint
npm run test:ci
npm run build:ci
npm run check:traces
npm run check:contrast
npm run test:mock
npm run test:scripts
npm run dev   (then)
npm run smoke
npm run check:links
npm run check:jsonld
npm run e2e   (if installed)
```
Manual QA: tasks 1–9 executed at 1280 and 390 px; expiry test with `MOCK_TOKEN_TTL_HOURS=0.01`; production build sample-testimonial check via `npm run serve:build`.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 45 report (defects found/fixed, routes walked, e2e status); Known issues closed; next prompt: 46.
- `docs/DECISIONS.md`: any contract/behaviour decisions taken while fixing.

## 11. Commit
`git add -A && git commit -m "test(qa): modules bug bash — leads, articles, SEO, CMS, careers, media, settings, auth/RBAC fixes and tests"`

## 12. Guardrails
- Do not touch: `theme.js`, `global.css` tokens.
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces; never skip/disable a failing test.
- Do not reduce or remove existing functionality.
