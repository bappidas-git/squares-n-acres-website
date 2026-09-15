# Prompt 42 — Mobile UX and accessibility pass: every page at every breakpoint; touch targets; sheets; sticky bars; focus/ARIA/contrast; reduced motion; keyboard

## 0. Before you start
- Read `prompts/00_MASTER_CONTEXT.md` fully (especially §8.1 breakpoints/test widths, §8.3 accessibility, §2.2 logo rules, §13 D51/D52), then `docs/PROJECT_STATE.md` and `docs/DECISIONS.md`.
- Confirm prerequisites: prompts 01–41 are done; working tree clean; `npm install` run; `npm run dev` running (and `npm run serve:build` for production checks).
- Never ask the human questions. If something is ambiguous, follow `00_MASTER_CONTEXT.md`; if still ambiguous, choose the simplest robust option and log it in `docs/DECISIONS.md`.
- If this prompt was partially executed in an earlier crashed session, continue from where `docs/PROJECT_STATE.md` and `git log` say it stopped; do not redo finished work.

## 1. Context
All modules are implemented. The public routes: `/`, `/properties`, `/buy…`, `/rent…`, `/lease`, `/commercial…`, `/plots`, `/properties/:slug`, `/localities`, `/localities/:slug`, `/builders`, `/builders/:slug`, `/insights/articles` (+ category/tag/author), `/insights/articles/:slug`, `/insights/faqs`, `/insights/real-estate-awareness`, `/about`, `/contact`, `/sell-let`, `/careers`, `/careers/:slug`, `/partnership`, `/buyer-assistance/*`, `/flexible-workspace`, `/direct-lease-retails`, `/privacy-policy`, `/terms-of-use`, `/disclaimer`, `/shortlist`, 404. Admin routes per `adminRouteConfig.js`. `scripts/contrast-check.js` covers tokens only. `useBreakpoint` = 900 px switch. Components use `Modal`/`BottomSheet`/`Drawer`, `FilterSheet`, `MobileCtaBar`, `BottomNav`, `WhatsAppButton`, `MobileDrawer`, `MegaMenu`.

## 2. Objective
When this prompt is finished every public and admin page passes a documented responsive + accessibility audit at 360, 390, 414, 768, 1024, 1280 and 1536 px: no horizontal scroll, every flow usable by touch and keyboard, sticky elements correct (header, section nav, price card, CTA bar, bottom nav, WhatsApp float, admin save bars) without overlaps and with safe-area insets, sheets/drawers/modals with focus traps and `Escape`, ≥ 44 px targets, visible focus rings, one `<h1>` per page, landmarks, `aria-*` on custom controls (menus, tabs, accordions, carousels, filter chips, switches, sortable lists, star ratings, sliders), labelled forms with linked errors, colour contrast ≥ 4.5:1 for text (computed on real pages, not just tokens), `prefers-reduced-motion` respected everywhere, skip link working, correct reading order; findings fixed; an automated a11y test layer added (`jest-axe`-free: use a lightweight custom checker in Jest tests for key components: labels for inputs, `aria-label` for icon buttons, roles for menus — plus a Node script `scripts/a11y-audit.js` that, with Chrome, injects a small in-page audit (contrast of visible text, missing alt, missing labels, duplicate ids, target sizes) across sitemap URLs + admin pages after login and prints a report; without Chrome it exits 0 with "skipped" and the manual checklist is used). Results in `docs/QA/42-mobile-a11y-report.md`.

## 3. Scope
### Files to create
- `docs/QA/42-mobile-a11y-checklist.md` (the audit grid: page × width × checks), `docs/QA/42-mobile-a11y-report.md` (findings + fixes)
- `scripts/a11y-audit.js`, `scripts/lib/inPageAudit.js` (the injected script: text contrast via computed styles, `img` without alt, form controls without labels, buttons without accessible names, duplicate ids, interactive elements < 44×44 (excluding inline text links), `h1` count, landmarks presence, `tabindex > 0`, focus visibility check by tabbing 30 stops and reading `:focus-visible` outline width)
- `src/test-utils/a11y.js` (helpers: `expectAccessibleName`, `expectLabelledInputs(container)`, `expectNoDuplicateIds`) + tests added to key components (`Header`, `MobileDrawer`, `BottomNav`, `FilterSheet`, `LeadForm`, `LeadCaptureModal`, `PropertyGallery`, `SectionNav`, `Carousel`, `FaqAccordion`, `Tabs`, `DataTable`, `SortableList`, `IconPicker`, `RichTextEditor` toolbar, `SeoPanel` tabs)
### Files to modify
- Any component/page/css needed to fix findings (expected: safe-area paddings, `MobileCtaBar` vs `WhatsAppButton` offsets, `SectionNav` chip bar scroll padding, admin `DataTable` mobile cards actions, `MegaMenu` keyboard, `MobileDrawer` focus trap, `FilterSheet` scroll lock, `Carousel` `aria-roledescription` + slide labels, `Rating` input keyboard, sliders (`aria-valuetext` with ₹ formatting), `Modal` return focus, `Toast` `aria-live`, skip link target, admin sidebar collapse button label, contrast of muted text on surface-2, chips on tints), `global.css` (focus ring/skip link tweaks; `@media (prefers-reduced-motion)` extensions), `docs/*`
### Files to delete
- none
### May also touch
- `scripts/lib/chrome.js` (reuse)

## 4. Detailed tasks
1. **Checklist grid** (`42-mobile-a11y-checklist.md`): rows = every public route (with a representative entity) and every admin route; columns = the seven widths; checks per cell: no horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`), header/nav usable, primary flow completes (search → details → enquire; login → create → save), sticky elements correct, images sized, text readable (≥ 14 px body on mobile), touch targets, focus order, `Escape`/back closes overlays. Fill it in as you test (✓/✗ + note); every ✗ gets a fix and a re-test.
2. **Automated in-page audit** (`scripts/a11y-audit.js`): with Chrome: crawl sitemap URLs (+ `/shortlist`, 404) and, after logging in via the UI, the admin routes; at 390 and 1280 px; inject `inPageAudit.js`; aggregate a report (`docs/QA/42-a11y-audit.json` + markdown summary); exit non-zero on `error`-level findings (missing alt/label/name, duplicate ids, `h1` count ≠ 1, contrast < 4.5 for normal text) — fix all; without Chrome print "skipped" (exit 0) and rely on the manual grid.
3. **Fix categories (apply everywhere found):** safe-area (`padding-bottom: calc(var(--bottom-nav-height) + var(--safe-bottom))` on pages with the bottom nav; `MobileCtaBar` uses `--safe-bottom`; `WhatsAppButton` sits above the CTA bar/bottom nav (`bottom: calc(var(--bottom-nav-height) + var(--safe-bottom) + 16px)`); sticky header + `SectionNav` + admin sticky save bars never overlap content (scroll-margin-top on anchors = header + nav height); overlays: focus trap, `aria-modal`, initial focus, return focus, `Escape`, body scroll lock (`useScrollLock` hook — create if missing) and iOS rubber-band prevention; menus: `role="menu"`/`menuitem`, arrow keys, `Home/End`, typeahead optional; tabs: `role="tablist"`/`tab`/`tabpanel` with roving tabindex; accordions: `aria-expanded`/`aria-controls`/`region`; carousels: `aria-roledescription="carousel"`, slides `aria-roledescription="slide"` + "1 of 8", pause button when autoplaying; sliders (`EmiCalculator`, `MapPinPicker` none, `AssessmentForm` down payment): `aria-valuemin/max/now/valuetext`; star `Rating` input: radio group; sortable lists: keyboard buttons + live region; switches: `role="switch"` + `aria-checked`; icon buttons: `aria-label`; tables: `scope`, captions; forms: `<label for>`, `aria-describedby`, `aria-invalid`, error summary `role="alert"`; images: alt from data, decorative `alt=""`; links: descriptive text (no "click here"); landmarks: `header/nav/main/aside/footer` + `aria-label` for multiple navs; headings: one H1, no skipped levels in sections; language `lang="en-IN"`; skip link → `#main-content` focusable; reduced motion: `framer-motion` `useReducedMotion` → variants disabled; marquee/autoplay off; smooth scroll off; tap targets ≥ 44 px (chips, pagination buttons, thumbnails, table icons on mobile cards); font sizes ≥ 14 px body/13 px captions on mobile; contrast: replace `--color-text-muted` on `--color-surface-2` where < 4.5 (use `--color-text`), chips on tints use `-dark` text tones, placeholder text ≥ 4.5 (`--color-text-muted`), disabled states exempt but readable; touch scrolling: horizontal chip bars with `scroll-snap`, `-webkit-overflow-scrolling` default, visible affordance (fade edges); `100vh` → `100dvh` with fallback for sheets; viewport `viewport-fit=cover` (already).
4. **Admin-specific**: tables → cards below 900 with all actions reachable; forms with sticky save bars not covering fields (extra bottom padding); block editor and property tabs usable at 390 (scrollable tabs, collapsible sections); `RichTextEditor` toolbar horizontal scroll with visible edges; dialogs full-screen below 600; sidebar drawer with focus trap.
5. Component tests with `src/test-utils/a11y.js`; run `scripts/a11y-audit.js`; record.

## 5. Data contract touched
None. Script: `a11y:audit` (`node scripts/a11y-audit.js`; not in `check:all`; run in 46/48).

## 6. UI/UX requirements
Defined by the audit; no visual redesign — only corrections. Keep the minimal aesthetic; focus rings visible but tasteful (`--color-focus`, 2 px, offset 2 px; inside dark surfaces use white rings).

## 7. Edge cases that must work
- iOS safe area (emulate with DevTools "iPhone 14 Pro"): bottom nav/CTA bar not clipped.
- Keyboard-only run through: home → search → listing filters → property → enquire → submit → close; admin login → property create → save — all without a mouse.
- Screen-reader smoke (NVDA/VoiceOver if available; else rely on ARIA correctness): menus/dialogs announce names/roles.
- Landscape phone (844×390): sticky bars do not consume the whole viewport (CTA bar hides when `innerHeight < 500`? — decision: bars stay but reduce height; record).
- Very long titles/badges wrap without overflow at 360 px.
- Zoom 200 % on desktop (1280 → effective 640): layouts reflow without horizontal scroll.

## 8. Acceptance criteria
- [ ] `docs/QA/42-mobile-a11y-checklist.md` fully filled (all routes × widths) with zero open ✗; `42-mobile-a11y-report.md` lists every finding and its fix (file paths).
- [ ] `scripts/a11y-audit.js` passes with Chrome (or documented "skipped") — zero error-level findings.
- [ ] New a11y component tests pass; `npm run lint`, `npm run test:ci`, `npm run build:ci`, `npm run check:traces`, `npm run check:contrast`, `npm run smoke` pass; no console warnings.
- [ ] One commit; clean tree.

## 9. Verification
```
npm run lint
npm run test:ci
npm run build:ci
npm run check:traces
npm run check:contrast
npm run dev  (then) npm run smoke
node scripts/a11y-audit.js   (with CHROME_PATH)
```
Manual QA: execute the checklist grid (DevTools device toolbar at the seven widths + "Emulate prefers-reduced-motion" + keyboard-only pass + 200 % zoom) for every route; sample 3 pages with the Chrome Accessibility tree.

## 10. Update project state
- `docs/PROJECT_STATE.md`: prompt 42 report (counts of findings fixed by category); Known issues: BUG-20 verified closed; next prompt: 43.
- `docs/DECISIONS.md`: D51/D52 verified, landscape bar rule, `100dvh` fallback.

## 11. Commit
`git add -A && git commit -m "fix(a11y): mobile and accessibility pass across public and admin — focus, ARIA, targets, safe areas, reduced motion"`

## 12. Guardrails
- Do not touch: `db.json`, mock server, data contracts.
- Do not add dependencies other than: none (no `jest-axe`, no `axe-core`).
- Do not leave TODO/FIXME comments, console.log calls, commented-out code, lorem ipsum, or HOM traces.
- Do not reduce or remove existing functionality.
