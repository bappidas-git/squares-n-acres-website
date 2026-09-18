# Prompt 42 — mobile UX and accessibility pass: findings and fixes

Every public and admin page was audited at the seven test widths of
`00_MASTER_CONTEXT.md` §8.1, by hand against the grid in
[`42-mobile-a11y-checklist.md`](./42-mobile-a11y-checklist.md) and by machine
with `npm run a11y:audit`. This file is the list of what was wrong and what was
changed; the grid is the coverage, and
[`42-a11y-audit.md`](./42-a11y-audit.md) / [`42-a11y-widths.md`](./42-a11y-widths.md)
are the raw runs.

---

## 1. How it was audited

| Layer                     | What it is                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/a11y-audit.js`   | Opens every sitemap URL, the routes no sitemap carries (`/shortlist`, the 404) and — after signing in through the login form — every admin screen, in a real Chrome. Writes `docs/QA/42-a11y-audit.json` and a markdown summary, and exits non-zero on any `error`-level finding. Without Chrome it prints "skipped" and exits 0, which is why it is not in `npm run check:all` (§3.4). |
| `scripts/lib/inPageAudit.js` | The audit itself, injected into the page: contrast of every run of visible text (compositing scrims and translucent layers the way the browser does), missing `alt`, unlabelled controls, controls with no accessible name, duplicate ids, tap targets, the `h1` count, landmarks, positive `tabindex`, horizontal overflow, mobile text size, and the focus ring at thirty Tab stops.  |
| `src/test-utils/a11y.js`  | The same rules as Jest assertions, for the states a crawl cannot reach: an open drawer, a filter sheet, a table in its mobile card layout, the SEO panel's fourth tab. Used by nine new `a11y.test.jsx` suites (32 cases), none of which emits console output — every asynchronous settle is awaited, so the `act(…)` notices of NEW-33 are not added to. |
| `scripts/__tests__/inPageAudit.test.js` | The colour arithmetic against the WCAG worked examples, in Node. A contrast checker that is quietly wrong is worse than none.                                                                                                                                                                                                                                             |

No new dependency was added: §3.3 allows none, so there is no `axe-core` and no
`jest-axe` (`npm run a11y:audit` is roughly 300 lines of our own).

**The run of record** was made against the production build (`npm run build`,
served by `npm run serve:build` on port 5000) with the mock API running, at
390 px and 1280 px, over every public URL and every admin route. A second run
swept the other five test widths — 360, 414, 768, 1024 and 1536 — over one page
of every route shape (`--sample=1 --outName=42-a11y-widths`).

---

## 2. Findings and fixes

### 2.1 Layout and contrast

| #   | Finding                                                                                                                                                                                                                                                                                                                              | Fix                                                                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | **The locality and builder heroes put white text on a light grey.** `LazyImage`'s placeholder is `--color-surface-2`; with the 60 % scrim over it the breadcrumb and the hero copy sat on `rgb(114, 114, 115)` at **3.63:1** for as long as the photograph was missing, slow or simply absent. 40 pages, both widths.                  | `src/components/sections/locality/LocalitySections.module.css`, `src/components/sections/developer/DeveloperSections.module.css`: the hero image box carries the hero's charcoal, the way the home hero already did. |
| F2  | **The dashboard's donut legend painted its labels in the series colour.** Recharts reuses the slice fill for the legend text, and the status tones are swatch colours: `--color-warning` is 2.68:1 on white and `--color-success` 4.14:1 — §2.4 says neither may carry text.                                                          | `src/pages/admin/dashboard/charts/LeadsByStatusChart.jsx`: a `Legend` `formatter` keeps the coloured dot and renders the word in `--color-text`.                                                 |
| F3  | **Captions read at 11–12 px on a phone.** `--font-size-xs` is 12 px; `PropertyCard` carried a further half-dozen literal `rem` values down to `0.7rem` (11.2 px); and `Avatar` sized its initials at 38 % of the circle, which is 11 px in a 28 px one. 346 runs of text at 390 px.                                                     | `src/assets/styles/global.css`: `--font-size-xs` becomes 13 px below 900 px. `src/components/common/PropertyCard.module.css`: its literals join the tokens on the phone tier. `src/theme.js`: MUI's `caption`, `overline` and `FormHelperText` follow the same token. `src/components/ui/Avatar.jsx`: a 13 px floor. |
| F4  | No page at any of the seven widths produced horizontal scroll.                                                                                                                                                                                                                                                                       | —                                                                                                                                                                                                |

### 2.2 Structure

| #   | Finding                                                                                                                                                                                                                                                                                              | Fix                                                                                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F5  | **Opening a property page scrolled the visitor 1 300 px down it.** `SectionNav` kept the active chip in view with `chip.scrollIntoView({ block: 'nearest' })`, and `scrollIntoView` scrolls *every* scrollable ancestor including the document — so the one run on mount jumped past the gallery, the price and the `<h1>`. | `src/components/sections/property/SectionNav.jsx`: the strip moves its own `scrollLeft`, which cannot move the page.                                                                                 |
| F6  | **`/admin/403` had no `<h1>`.** `EmptyState` renders its title as a paragraph, which is right inside a page that has a heading and wrong when the empty state *is* the page.                                                                                                                         | `src/components/ui/EmptyState.jsx` takes `titleAs`; `src/components/admin/Forbidden.jsx` passes `h1`.                                                                                                |
| F7  | **The 404 page's search box was placeholder-only** and its magnifier was announced as an image. §8.3 forbids both.                                                                                                                                                                                    | `src/pages/public/NotFound.jsx`: an off-screen `<label for>`, `role="search"` on the form, `aria-hidden` on the glyph, `type="search"`. `src/pages/public/NotFound.module.css` gains the `srOnly` class. |
| F8  | **The skip link moved the scroll position but not focus.** `#main-content` was not focusable, so the next Tab went back into the navigation the visitor had just skipped.                                                                                                                             | `src/components/layout/MainLayout.jsx` and `src/components/layout/AdminLayout.jsx`: `tabIndex={-1}` on `<main>`, plus its focus styling in `global.css`.                                             |
| F9  | **The admin had no skip link at all** — thirty sidebar links stand between the topbar and the page.                                                                                                                                                                                                   | `src/components/layout/AdminLayout.jsx`: the same `.skip-to-main` anchor, pointing at `#admin-main`.                                                                                                 |

### 2.3 Overlays

| #   | Finding                                                                                                                                                                                                                                             | Fix                                                                                                                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F10 | **`BottomSheet` and `Drawer` were not announced as dialogs.** MUI's drawer paper is a plain panel — the modality lives on the wrapper — so a screen reader met an unnamed group rather than a modal.                                                 | `src/components/ui/BottomSheet.jsx`, `src/components/ui/Drawer.jsx`: `role="dialog"`, `aria-modal="true"` and a name (`aria-labelledby` from the title, or a `label` prop). `MobileDrawer` passes `label="Menu"`; the admin's own drawer is labelled "Admin menu". |
| F11 | **iOS rubber-banding behind an open sheet.** MUI's scroll lock is `overflow: hidden` on the body, which every engine but iOS Safari honours; there the page scrolls with the finger and lands somewhere else when the sheet closes.                  | New `src/hooks/useScrollLock.js` (counted, iOS-only, restores the offset), used by `Modal`, `BottomSheet` and `Drawer`.                                                                                     |
| F12 | **An autoplaying carousel had no pause control** (WCAG 2.2.2). Hover and focus paused it; a keyboard alone could not stop it.                                                                                                                       | `src/components/ui/Carousel.jsx` + `.module.css`: a Pause/Play button whenever `autoplay` is on and motion is not reduced.                                                                                  |

### 2.4 Focus

| #   | Finding                                                                                                                                                                                                                                                                                  | Fix                                                                                                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F13 | **Six wrapper-focus controls showed a border-colour change instead of a ring.** The Tab walk reported the listing's search box with no focus indicator at all; the same pattern was in the admin's filter bar, the entity picker, the icon picker, the media drop zone and the editor shell. | A 2 px `--color-focus` ring on `:focus-within` in `GlobalSearch`, `FilterBar`, `EntityPicker`, `IconPicker`, `MediaLibraryPage` and `RichTextEditor` module CSS.                                                 |
| F14 | **The amenities chip ringed itself in red.** §6 fixes the ring at `--color-focus`.                                                                                                                                                                                                        | `src/pages/admin/properties/property-form/tabs/AmenitiesTab.module.css`.                                                                                                                                         |
| F15 | **The blue ring disappears on the dark surfaces the `onDark` variants exist for.**                                                                                                                                                                                                        | A white ring for `.onDark` in `IconButton`, `MegaMenu`, `Header`, `MobileHeader` and `Breadcrumbs` module CSS.                                                                                                   |
| F17 | **The design system's own text field suppressed the ring it had been given.** `FormField`'s `.control:focus` set `outline: none` and drew a 3 px `--color-primary-ring` halo in its place; that halo is `rgba(207, 63, 56, 0.22)` over white — **1.36:1**, under the 3:1 WCAG 1.4.11 asks of a focus indicator. `.control:focus` outranks the global `:focus-visible`, so every input, select and textarea in the kit *lost* the ring rather than gaining a second one. | `src/components/ui/FormField.module.css`: the `outline: none` and the halo are gone. The border still warms on focus; the ring is the global one (2 px `--color-focus`, offset 2 px). |
| F18 | **MUI's outlined inputs answered focus by thickening their own fieldset border.** That is MUI's default and it is not the ring §8.3 fixes; a keyboard found it on the admin's autocompletes and selects, which are MUI rather than the kit. | `src/theme.js`: `MuiOutlinedInput` draws the ring on `&:has(:focus-visible)`, so it stays a keyboard affordance and a browser without `:has` falls back to MUI's border rather than to nothing. |

### 2.5 Tap targets (≥ 44 px, phone tier)

Twenty-two groups of controls measured under 44 × 44 px at 390 px. All are now at or
above it; none of the fixes changes the desktop rendering, and none changes a
visual size that the layout depends on — the breadcrumb bar, for instance,
absorbs its new padding with a matching negative margin.

| Where                            | Was     | File                                                                        |
| -------------------------------- | ------- | --------------------------------------------------------------------------- |
| Header logo link                 | 40 tall | `src/components/layout/MobileHeader.module.css`                             |
| Hero BHK pills                   | 36 tall | `src/components/sections/home/HeroSearch.module.css`                        |
| Breadcrumb links                 | 37 × 22 | `src/components/ui/Breadcrumbs.module.css`                                  |
| Footer column links, contact rows| 38 / 22 | `src/components/layout/Footer.module.css`                                   |
| Global search box (compact)      | 40 tall | `src/components/common/GlobalSearch.module.css`                             |
| Carousel dots                    | 24 × 24 | `src/components/ui/Carousel.module.css`                                     |
| Property section chips           | 40 tall | `src/components/sections/property/SectionNav.module.css`                    |
| "View all" under similar         | 22 tall | `src/components/sections/property/SimilarSection.module.css`                |
| EMI and down-payment sliders     | 16 tall | `src/components/sections/property/finance/finance.module.css`               |
| Article tags, category pills, hero CTA, byline links | 22–32 | `src/components/sections/article/*.module.css`, `src/pages/public/ArticleDetail.module.css` |
| Trending headlines               | 38 tall | `src/components/sections/article/TrendingList.module.css`                   |
| Article share buttons            | 40 × 40 | `src/components/sections/article/ArticleShareBar.module.css`                |
| Table-of-contents toggle         | 32 × 32 | `src/components/sections/article/TableOfContents.module.css`                |
| FAQ tabs, locality chips and sort| 40      | `src/pages/public/FAQs.module.css`, `src/pages/public/Localities.module.css`|
| Consent checkbox (with its label)| 38 tall | `src/components/common/LeadForm.module.css`                                 |
| 404 search box, button, quick links | 22–40| `src/pages/public/NotFound.module.css`                                      |
| Design-system switch             | 44 × 24 | `src/components/ui/FormField.module.css` — the button is 44 square; the 24 px track is painted by `::before` |
| Admin "View site"                | 16 wide | `src/components/layout/AdminTopbar.module.css`                              |
| Admin rows-per-page select       | 36 tall | `src/components/admin/DataTable.module.css`                                 |
| Admin search input               | 16 tall | `src/components/admin/FilterBar.module.css` — the input stretches to fill its box, so the padding around it is tappable |
| Dashboard row links, `Button` link variant, media copy button, SEO band buttons, the editor's empty surface | 19–32 | `DashboardPage.module.css`, `Button.module.css`, `MediaLibraryPage.module.css`, `SeoDashboardPage.module.css`, `RichTextEditor.module.css` |
| Any icon button squeezed by a flex row | 35–40 wide | `src/components/ui/IconButton.module.css` — `flex-shrink: 0` |

### 2.6 ARIA on custom controls

| #   | Finding                                                                                                                                                                | Fix                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| F16 | **The sliders announced a bare number.** A range input supplies `aria-valuemin/max/now` from its own attributes, but "1 800 000" is not what the label on screen says. | `aria-valuetext` on all four: `src/components/sections/property/finance/EmiCalculator.jsx` (loan share with the rupee figure, rate, tenure) and `AssessmentForm.jsx` (down payment). |
| F19 | **Every avatar announced its initials.** `Avatar` hid them only when there were none, so "AU" was read out in front of the account menu's own label and "PS" inside an author's byline — and each one put its control in front of the label-in-name check, because two letters are never the words on the control. | `src/components/ui/Avatar.jsx`: the initials span is always `aria-hidden`. A real photograph still carries the name as its `alt`; asserted in `src/components/ui/__tests__/a11y.test.jsx`. |

### 2.7 The three findings prompt 41's Lighthouse run left here

| Id      | Finding                                                                                                                                                                                                               | Fix                                                                                                                                                                                     |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NEW-43  | Three contrast failures. Its (1) and (2) turned out to be one defect and are **F1** above. (3) the trending numerals on the article index were `--color-border-strong` at **1.47:1** — a watermark, and the only place the ranking is shown, because the `<ol>` hides its own markers. | `src/components/sections/article/TrendingList.module.css`: `--color-text-muted`.                                                                                                        |
| NEW-44  | The property overview's `<dl>` had `<div>` children. Valid HTML5; reported by every checker.                                                                                                                          | `src/components/sections/property/OverviewSection.jsx` + `.module.css`: it is a `<ul>` of facts. A card per pair cannot exist inside a `<dl>` without the wrapper, so the second of the two fixes prompt 41 offered was taken; the grid and the card are unchanged. |
| NEW-45  | Two accessible names did not contain the control's visible text (WCAG 2.5.3): the gallery stage, whose visible label is the "1 / 6" counter, and the brochure button, which reads "Download brochure".                 | `src/components/sections/property/PropertyGallery.jsx`, `src/components/sections/property/DocumentsSection.jsx`: both names now begin with the words on the control. `inPageAudit.js` gained a `label-in-name` rule so the next one is caught in the crawl. |

Contrast is now measured on **everything painted**, `aria-hidden` included —
that is what NEW-43's third case was — but a finding on `aria-hidden` text is a
warning rather than an error, because WCAG exempts *incidental* text and no
tool can tell a breadcrumb's "/" (decoration, like a border) from a numeral
that is the only thing carrying a rank.

### 2.8 Reduced motion

`global.css` already shortened every animation and transition under
`prefers-reduced-motion`. It did not reset the **delays**, so a staggered reveal
still arrived in the same slow ripple; `animation-delay` and `transition-delay`
now go to zero with the durations. Everything else was already in place:
`framer-motion` reads `useReducedMotion`, `utils/motion.js` gates every
`scrollTo`, and the carousel, the bottom bar and the skeleton shimmer each
disable their own transition.

Verified with the media feature emulated, at 390 px and 1280 px, over the home
page, the listing, the locality index, the article index and a property: on all
ten, **no element** has a transition or animation over 50 ms once its delay is
counted, nothing animates infinitely, `scroll-behavior` computes to `auto`, and
the carousel's pause button is correctly absent because nothing is moving.

---

### 2.9 Two corrections to the audit itself

Both were found by the checker disagreeing with the page in front of it, and
both are in `scripts/lib/inPageAudit.js`:

- **Horizontal scroll was read straight off `document.documentElement.scrollWidth`.** Every admin list screen scrolls its table inside its own `overflow-x: auto` box by design (prompt 13 §6), which makes the root's scroll width large while the page itself never moves sideways and nothing is out of reach. That cheap signal now only opens the question; what settles it is whether any element reaches past the viewport **without** a scroller of its own to reach it by. The finding names the first five that do, so it can be acted on rather than only believed.
- **The label-in-name check compared a name against the whole subtree.** `announcedText` is right for computing a name and wrong for reading a *visible label*: the gallery stage holds three buttons of its own, so its label came out as "1 / 6 Previous photograph Next photograph View all 6 photos" and no name could have contained it — 98 warnings, almost all of them that shape. `ownLabelText` stops at a nested control, which is what WCAG 2.5.3 means by the text on *this* control.

Neither changed a verdict: the run of record was already at zero errors with the
coarse check, and the label-in-name findings are warnings. They change what a
**re-run** reports, which is the only thing a checker is for.

---

---

## 3. Checked and already correct

Worth recording, because these are the things this pass did **not** have to fix:

- One `<h1>` on every page but the 403 screen; no skipped heading levels inside a section.
- `lang="en-IN"` on every page; `landmarks` (`header`, `nav`, `main`, `footer`) on every public page.
- `MegaMenu` keyboard: `Enter`/`Space`/`ArrowDown` open, arrows walk, `Home`/`End` jump, `Escape` closes and returns focus, `Tab` out closes behind you.
- `Tabs` roving tabindex; `Accordion` and `FaqAccordion` `aria-expanded` + `aria-controls` + a labelled `region`.
- `Carousel` `aria-roledescription="carousel"`, slides as `1 of 8`, arrow keys.
- `SortableList`: ↑/↓ buttons in the DOM at all times, `Alt+↑`/`Alt+↓`, and every move announced through `aria-live="polite"`.
- `DataTable`: an off-screen `<caption>`, `scope="col"` on every header, and every row action reachable in the mobile card layout through a named kebab.
- `ToastProvider` is an `aria-live` region portalled to the body.
- Forms: visible `<label for>`, `aria-describedby` for hints, `aria-invalid` and `role="alert"` on errors, a honeypot that is `aria-hidden`.
- `Modal` (MUI `Dialog`) focus trap, `Escape`, `aria-modal`, return-focus-to-trigger.
- Safe areas: `--safe-bottom` on the bottom bar, the CTA bar, the floating WhatsApp button, the back-to-top button and the page's own bottom padding. The float sits **above** both the CTA bar and the back-to-top button rather than at the `--bottom-nav-height + 16px` of the prompt, because three fixed things share that corner; the stack is bottom bar → back to top → WhatsApp.

---

## 4. Accepted warnings

| Warning                                                | Why it stands                                                                                                                                                                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `landmark-missing: footer` on every admin screen        | The admin panel has no footer and should not be given a decorative one. The check is a warning for exactly this case.                                                                                                |
| Recharts axis ticks at 11 px on a phone                 | The tick labels are inside the SVG and are duplicated in full in the table `ChartFrame` renders beside every chart, which is the accessible reading of the data. Enlarging them would collide the labels on a 390 px axis. |
| Text over a photograph reported as "background unknown" | A photograph's contrast cannot be computed from CSS. Every such case is a hero or a card with a scrim, and each was checked by eye at 390 px; F1 is the one that was wrong. Recorded as NEW-47.                       |
| The breadcrumb separator at 1.47:1                      | A `/` between two crumbs is a divider, not text: the list conveys the hierarchy, the glyph is `aria-hidden`, and WCAG exempts incidental text. It is a warning rather than an error for exactly this reason (§2.7).   |
| An avatar's initials at 11 px                            | Fixed rather than accepted: `Avatar` now floors its font size at 13 px.                                                                                                                                              |

---

## 5. The keyboard pass

Driven rather than described — Tab, Enter, Escape and typing only, at 1280 px
against the production build. 18 of 18 steps pass:

- home: the first Tab stop is the skip link → it moves focus into `<main>` → the hero search box → `Enter` runs the search;
- listing: the sort control → a result card → `Enter` opens the property;
- property: "Enquire now" → the dialog is `aria-modal`, takes focus, traps `Tab`, closes on `Escape` and hands focus back to the button that opened it;
- admin: the email box → the submit button → `Enter` signs in → the skip link is the first stop → the property form's first field is reachable.

---

## 6. Edge cases (prompt 42 §7)

| Case                                        | Result                                                                                                                                                                                                                                       |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iOS safe area                               | The bottom bar, the CTA bar, the WhatsApp float and the back-to-top button all add `--safe-bottom`, and the page reserves `--bottom-nav-height + --safe-bottom`. Nothing is clipped.                                                          |
| Keyboard-only run                           | §5 above.                                                                                                                                                                                                                                     |
| Screen-reader smoke                         | No NVDA or VoiceOver in this environment; the ARIA correctness is asserted instead — `role`, `aria-modal` and an accessible name on every dialog, `role="tablist"`/`tab`/`tabpanel`, `aria-expanded`/`aria-controls`, `aria-live` regions, and the accessible name of every control (`expectNamedControls` over nine suites, plus the crawl). |
| Landscape phone (844 × 390)                 | The bars stay and shrink rather than hiding (D97). At 390 px tall the bottom bar plus the CTA bar would take a third of the viewport, so below 500 px of height both drop to 52 px and lose their labels, leaving the icon and its `aria-label`. |
| Very long titles and badges at 360 px       | No horizontal scroll at 360 px on any route; the property title, the locality name and the badge row all wrap.                                                                                                                                 |
| 200 % zoom on a 1280 px desktop (≈ 640 px)  | Equivalent to the 640 px column, between the 600 px and 768 px tiers; both were swept and neither produces horizontal scroll.                                                                                                                  |

---

## 7. Result

`node scripts/a11y-audit.js --baseUrl=http://localhost:5000 --widths=390,1280`
over every public URL and every admin route: **0 error-level findings**. The
width sweep at 360, 414, 768, 1024 and 1536 px over one page of every route
shape: **0 error-level findings**.

Each run writes its own findings beside this file, as
`docs/QA/42-a11y-audit.{json,md}` and, for the sweep,
`docs/QA/42-a11y-widths.{json,md}`. That pair is the tool's raw output and is
**not** kept in the repository (`.gitignore`, beside `lighthouse-*.json`): it is
regenerated by the commands above and is stale the moment a component changes,
where this report is written to stay true. Re-run it and read it there.
