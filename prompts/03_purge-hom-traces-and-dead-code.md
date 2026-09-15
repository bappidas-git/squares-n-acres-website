# Prompt 03 — Purge every HOM trace and all dead code; make `check:traces` strict

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §11 Known defects and §13 D17), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–02 are done; working tree clean; `npm install` run.
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
`npm run check:traces:report` still lists HOM traces. Known locations (from the analysis; re-verify with the script): `src/assets/styles/global.css` (Google Fonts `@import` for Playfair/DM Sans/Outfit, `.hom-swal-*` classes, HOM palette variables), `src/theme.js` (HOM palette/fonts — **left for prompt 04**, exempt from `check:traces` until then), `src/components/common/SkeletonLoaders.jsx` (`PageLoader` prints "H.O.M Advisory" in Playfair), `src/components/layout/AdminLayout.jsx` (brand block ×2, `admin@homadvisory.com`), `src/components/layout/Footer.jsx` (defaults `'H.O.M Advisory'`, `'HOME OFFICE MARKET'`, description, tagline), `src/components/layout/Header.jsx`/`MobileHeader.jsx` (`sideMenuItems` "Sign In" → `/admin/login`), `src/components/sections/home/WhyChoose.jsx` ("Why Choose H.O.M Advisory"), `src/pages/admin/AdminLogin.js` (brand + commented demo credentials `admin@homadvisory.com / admin@123` …), `src/pages/admin/AdminSeo.js` (`homadvisory.com` ×2), `src/pages/admin/ArticleForm.jsx` (`author: 'H.O.M Advisory Team'` ×2, preview `homadvisory.com`), `src/pages/admin/property-tabs/constants.js` (`DRAFT_STORAGE_KEY = 'hom_property_draft'`), `src/pages/admin/property-tabs/SeoTagsTab.jsx` (placeholder `homadvisory.com`), all public pages' Helmet titles (`| H.O.M Advisory`), `src/pages/public/PropertyDetails.jsx` (`og:site_name "HOM Advisory"`, `hom-swal-*` customClass), `src/pages/public/PropertyListing.jsx` (9 seoTitles), `src/pages/public/Contact.jsx` (`info@homadvisory.com`), `src/pages/public/FAQs.js` (`info@homadvisory.com`, `(555) 123-4567`), `src/pages/public/About.jsx` (7 occurrences incl. testimonials), `src/utils/leadStorage.js` (`hom_lead_data`), `src/utils/seoGenerator.js` (`SITE_NAME 'HOM Advisory'`, `SITE_URL 'https://homadvisory.com'`), `db.json` (49: FAQ answers, article author `H.O.M Advisory Team`, `siteSettings` name/subtitle/e-mail/social handles, `adminUsers` e-mails, canonical URLs `homadvisory.com`, `placehold.co/.../goldenrod` and `dzbiw7t4i` images, Gumlet video). Dead code (from `docs/CODEBASE_INVENTORY.md`): `src/pages/public/PropertyDetail.js` (unrouted stub), `adminService` and `visitService` in `src/services/api.js`, `extractPaginationMeta`, `handleOpenLeadForm` + the unreachable `showLeadForm` modal in `PropertyDetails.jsx`, `AnimatedSection.jsx` (verify with `grep -rn "AnimatedSection" src` — delete if only self-referenced), `stats.missing` in `AdminSeo.js`, `.notificationDot` in `AdminLayout.module.css`, `.qualities*` in `BuilderOverview.module.css`, `.breakdownBar*` in `FinanceGuide.module.css`, `.skeletonGrid/.skeletonCard` in `PropertyListing.module.css`, the `specificationsArray` prop of `PropertySpecs.jsx`, the unused `index` prop of `PropertyFaq.FaqItem`, `team[].image` in `About.jsx`, `@mui/icons-material` in `package.json` (0 imports). Public navigation exposes "Sign In" (`/admin/login`) in `Header.jsx` and `MobileHeader.jsx` `sideMenuItems`.

## 2. Objective
When this prompt is finished, `npm run check:traces` (strict) exits 0 with `src/theme.js` and `global.css` palette lines temporarily allow-listed (removed from the allow-list by prompt 04); every HOM/H.O.M/HOM Advisory/homadvisory/Home Office Market string, key, class, e-mail, URL, image host and constant is gone from `src/`, `public/`, `db.json`, `README.md` and `package.json`; storage keys are `sna_*`; dead code is deleted; the admin login link is no longer reachable from the public UI; the whole tree is Prettier-formatted; the unused `@mui/icons-material` dependency is removed. Behaviour is otherwise unchanged (the app still uses the old data shapes — that changes from prompt 05/11).

## 3. Scope
### Files to create
- none
### Files to modify
- `scripts/check-traces.js` (temporary allow-list for `src/theme.js` and the `:root` palette block of `src/assets/styles/global.css` — implemented as an `--allow` list read from `scripts/check-traces.allow.json` so prompt 04 can empty it)
- `scripts/check-traces.allow.json` (new: `{ "files": ["src/theme.js"], "lines": { "src/assets/styles/global.css": [<line numbers of the palette/font @import lines>] } }`)
- Every file listed in §1 plus any other file the strict script reports; `db.json` (string replacements only — no shape changes); `package.json` (remove `@mui/icons-material`); `package-lock.json` (via npm)
### Files to delete
- `src/pages/public/PropertyDetail.js`, `src/components/common/AnimatedSection.jsx` (if unused — expected)
### May also touch
- import lists of files that referenced deleted code

## 4. Detailed tasks
1. Run `npm run check:traces:report` and save the full output to `docs/QA/03-traces-before.txt` (create `docs/QA/`).
2. **Strings.** Replace every brand string with the SNA equivalent, reading from constants where possible: import `{ BRAND, SITE } from '../../config/site'` (adjust path) and use `BRAND.name` / `SITE.name`; Helmet titles become `` `${pageTitle} | ${SITE.name}` `` (prompt 38 replaces them with `<Seo>`); `og:site_name` → `SITE.name`; e-mails → `info@squaresnacres.com` (placeholder; prompt 30/31 make them settings-driven); `homadvisory.com` URLs → `SITE.placeholderDomain`; `'H.O.M Advisory Team'` → `'Editorial Team'`; Footer defaults → `BRAND.name` / `''` (drop "HOME OFFICE MARKET", keep the description/tagline as neutral placeholders `"Bengaluru real-estate advisory. Buy, sell, rent and invest with confidence."` / `"Your trusted partner for Bengaluru property"`); AdminLayout fallback e-mail → `''` (show nothing when unknown); About/testimonials copy → neutral placeholders that do not mention any brand (they are replaced by CMS content in prompt 30, so keep it short); FAQ answers in `db.json` → replace "H.O.M Advisory" with "Squares N Acres"; `siteSettings` → `companyName: 'Squares N Acres'`, `companySubtitle: ''`, `contactInfo.email: 'info@squaresnacres.com'`, `contactInfo.phone: '+91 98XXX XXXXX'`, social handles `https://www.instagram.com/squaresnacres` etc. (placeholders); `adminUsers` e-mails → `admin@squaresnacres.com`, `manager@squaresnacres.com`, `sales@squaresnacres.com` and passwords → `Admin@123`, `Manager@123`, `Sales@123` (plaintext; mock only); article `author` → `'Editorial Team'`; canonical/og URLs in `db.json` → `https://www.squaresnacres.com/...`; `seoGenerator.js` `SITE_NAME`/`SITE_URL` → read from `SITE` (`import { SITE } from '../config/site'`).
3. **Images and hosts in `db.json`:** replace every `placehold.co/...goldenrod...` and every `res.cloudinary.com/dzbiw7t4i/...` image URL with `https://picsum.photos/seed/<slug>-<n>/800/600` (property galleries), `/1200/600` (article images), `/400/300` (neighborhoods), `/200/80` (partner logos → keep as `https://picsum.photos/seed/partner-<n>/200/80`), floor plans `/600/400`; remove the Gumlet `.mp4` entries (`heroText.backgroundMedia` → `''`; the property `b998` gallery `.mp4` entry → removed). Replace `unsplash` footer gallery URLs with picsum seeds. The record shapes stay identical (prompt 10 rewrites the seed completely).
4. **Keys/classes:** `hom_lead_data` → `sna_lead` (sessionStorage), `hom_property_draft` → `sna_property_draft`, `.hom-swal-*` → delete the CSS block in `global.css` and the `customClass` object in `PropertyDetails.jsx` (SweetAlert2 keeps default styling until prompt 04 removes it entirely).
5. **Fonts:** remove the `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display…')` line from `global.css` (fonts are loaded by `index.html` since prompt 02); leave `--font-heading/--font-body/--font-number` values and `theme.js` for prompt 04 (allow-listed lines). Remove every inline `fontFamily: '"DM Sans", sans-serif'` / `'"Playfair Display", serif'` literal in JSX (`PropertyDetails.jsx` ×17, `ToastProvider.jsx`, `SkeletonLoaders.jsx`, `Dashboard.js`) and the `font-family: 'DM Sans'` in `AdminLayout.module.css` → replace with `var(--font-body)` / `var(--font-heading)`.
6. **Public admin link:** remove the "Sign In" (`/admin/login`) entries from `sideMenuItems` in `Header.jsx` and `MobileHeader.jsx` (and their `mdi:login-variant` icon).
7. **Dead code:** delete `src/pages/public/PropertyDetail.js`; delete `adminService`, `visitService`, `extractPaginationMeta` from `api.js` (grep for usages first — `UserManagement.jsx` uses `userService`, keep it); delete `handleOpenLeadForm`, `showLeadForm` state and the unreachable modal JSX in `PropertyDetails.jsx`; delete `AnimatedSection.jsx` if unused; delete the dead CSS classes listed in §1; remove the `specificationsArray` prop from `PropertySpecs.jsx` and its usage in `PropertyDetails.jsx` (keep the legacy-object branch working); remove `index` from `PropertyFaq.FaqItem`; remove `team[].image` from `About.jsx`; remove the commented demo-credential block from `AdminLogin.js`; `npm uninstall @mui/icons-material`.
8. **`check-traces` strictness:** implement `scripts/check-traces.allow.json` support as described in §3; the allow-list must contain **only** `src/theme.js` (whole file) and the specific `global.css` lines for the palette variables and font variables. Run `npm run check:traces` — it must exit 0. Also confirm `grep -rn "goldenrod\|placehold.co\|dzbiw7t4i\|gumlet" src public db.json` returns nothing.
9. **Format the whole tree:** `npm run format` (Prettier over `src/**`, `scripts/**`, `docs/**`), then `npm run lint` (fix anything Prettier exposes). Commit includes the formatting diff.
10. Update `docs/CODEBASE_INVENTORY.md` → mark deleted files/functions as "removed in prompt 03".

## 5. Data contract touched
None (no endpoint or shape changes; `db.json` string-only edits). npm: `@mui/icons-material` removed. Storage keys renamed: `sna_lead`, `sna_property_draft`.

## 6. UI/UX requirements
N/A beyond: every place that showed "H.O.M Advisory" now shows "Squares N Acres"; the `PageLoader` shows "Squares N Acres" (font falls back to the body font); the drawer menus no longer show "Sign In".

## 7. Edge cases that must work
- Existing `sessionStorage['hom_lead_data']` in a tester's browser is simply ignored (new key); no migration.
- `db.json` remains valid JSON after replacements (validate with `node -e "JSON.parse(require('fs').readFileSync('db.json','utf8'))"`).
- `check-traces.js` allow-list line numbers: the script must match by **content** as well (store the expected line text hash in the allow file) so that an accidental shift in `global.css` does not silently allow other lines — if the content no longer matches, report the line.
- Removing `AnimatedSection.jsx` must not break any import (grep before deleting).
- SweetAlert2 dialogs still open (default theme) after the class removal.

## 8. Acceptance criteria
- [ ] `npm run check:traces` exits 0 (strict) with the documented allow-list; `docs/QA/03-traces-before.txt` exists.
- [ ] `grep -rniE "h\.o\.m|hom advisory|homadvisory|home office market|hom_|\.hom-|cloudwaysapps|goldenrod|placehold\.co|dzbiw7t4i|gumlet" src public db.json README.md package.json` → 0 matches.
- [ ] No inline `fontFamily`/`font-family` literal outside `global.css` and `theme.js` (`grep -rn "fontFamily\|font-family" src | grep -v "var(--font" | grep -v global.css | grep -v theme.js` → 0).
- [ ] "Sign In" is not present in any public component; `/admin/login` still works by URL.
- [ ] `src/pages/public/PropertyDetail.js`, `adminService`, `visitService`, `extractPaginationMeta`, `handleOpenLeadForm` no longer exist; `@mui/icons-material` is not in `package.json`.
- [ ] `npm run lint`, `npm run test:ci`, `npm run build:ci`, `npm run format:check` pass.
- [ ] Storage keys `sna_lead` and `sna_property_draft` are used (`grep -rn "hom_" src` → 0).
- [ ] One commit; clean tree.

## 9. Verification
```
npm run check:traces
npm run format:check
npm run lint
npm run test:ci
npm run build:ci
```
Manual QA:
1. `npm start` → home: header/footer/loader show "Squares N Acres"; open the mobile drawer (390 px) — no "Sign In".
2. `/admin/login` renders (brand text updated); `/properties/nambiar-district-25-phase-2` renders the details page (data still HOM-shaped; network errors expected); no console errors caused by removed code.
3. `/about`, `/contact`, `/insights/faqs`: no HOM text visible; e-mail shows `info@squaresnacres.com`.
4. Open DevTools → Elements → `<head>`: no Playfair/DM Sans stylesheet request.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 03 report; Known issues: close BUG-16 (dead code), BUG-17 (partially: README/env done in 02, Sign In removed here), BUG-12 (partially: font literals; hex literals remain → prompt 04); note the temporary `check-traces` allow-list (owner prompt 04); next prompt: 04.
- `docs/DECISIONS.md`: D17 (trace regexes + allow-list mechanism), D24 (no admin links), D80 (mock users).

## 11. Commit
`git add -A && git commit -m "refactor(brand): purge HOM traces, dead code and font literals; strict trace check"`

## 12. Guardrails
- Do not touch: `src/theme.js` (except nothing), the `:root` palette values in `global.css`, component structure/styling beyond the string/class changes listed, routes, `package.json` dependencies other than removing `@mui/icons-material`.
- Do not add dependencies other than: none.
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality (deleting unreachable code is not a functionality reduction; document each deletion in the state file).
