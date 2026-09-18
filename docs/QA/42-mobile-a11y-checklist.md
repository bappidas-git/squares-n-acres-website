# Prompt 42 — the mobile and accessibility audit grid

Every public route and every admin route, at the seven test widths of
`00_MASTER_CONTEXT.md` §8.1 — **360, 390, 414, 768, 1024, 1280 and 1536 px**.
The findings and the fixes are in
[`42-mobile-a11y-report.md`](./42-mobile-a11y-report.md); this file is the
coverage, so that "it passes" has a list behind it.

Re-run it with the app built and served:

```
npm run mock                               # terminal 1
npm run build && npm run serve:build       # terminal 2
npm run a11y:audit                         # terminal 3 — needs CHROME_PATH
node scripts/a11y-audit.js --widths=360,414,768,1024,1536 --sample=1 \
  --outName=42-a11y-widths
```

---

## 1. What each cell checks

| #   | Check                        | How it is verified                                                                                                                                                                                                                                                               |
| --- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | **No horizontal scroll**     | In the page: `document.documentElement.scrollWidth <= window.innerWidth` (+1 px for rounding). Error level — §8.1 says "no horizontal scroll ever".                                                                                                                             |
| C2  | **Header / nav usable**      | The `banner` and `navigation` landmarks exist, every navigation landmark past the first has a name, and every control in them has an accessible name. `MegaMenu`, `MobileDrawer` and `BottomNav` also have Jest suites (`src/components/layout/__tests__/a11y.test.jsx`).       |
| C3  | **Primary flow completes**   | Driven from the keyboard, not clicked: home → skip link → search → listing → a property → enquire → close, and admin login → dashboard → properties → the form. 18 of 18 steps, §5 of the report.                                                                                |
| C4  | **Sticky elements correct**  | The bottom bar, a listing's CTA bar, the WhatsApp float and the back-to-top button all carry `--safe-bottom` and stack rather than overlap; the sticky header and `SectionNav` never cover a section a chip scrolls to (`scroll-margin-top` = header + strip). Read at each width. |
| C5  | **Images sized**             | Every *content* image is in an aspect-ratio box (`LazyImage`/`Picture`), so nothing reflows when a photograph arrives; the fixed marks that are not (the logo, the 403 monogram, an avatar, a bank logo, a footer collage tile) carry explicit `width`/`height` or a sized container. Every image has an `alt` — `alt=""` where it is decoration — which the crawl checks on every page. |
| C6  | **Text readable**            | In the page: every run of visible text is measured, and below 900 px anything under 13 px is reported. Body copy is ≥ 14 px, captions ≥ 13 px.                                                                                                                                  |
| C7  | **Touch targets**            | In the page, below 900 px: every interactive element's rectangle, with a checkbox measured together with its label and an inline text link exempt. Under 44 × 44 is reported.                                                                                                    |
| C8  | **Focus order and ring**     | Thirty Tab stops on a representative page of each shape, reading `:focus-visible` and the outline width — including a ring drawn on a wrapper with `:focus-within`. Any stop with no ring at all is an error.                                                                    |
| C9  | **Escape / back closes**     | Every overlay is `Modal`, `BottomSheet` or `Drawer`, all three of which are MUI-backed (focus trap, `Escape`, backdrop) and are asserted as `role="dialog"` + `aria-modal` + a name in `src/components/ui/__tests__/a11y.test.jsx`. The keyboard pass closes the enquiry dialog with `Escape` and checks focus returns to the trigger. |
| C10 | **Names, labels, structure** | In the page: `alt` on every image, a label on every form control, an accessible name on every button/link/custom control, no duplicate id, exactly one `<h1>`, a `<main>`, a `lang`.                                                                                             |
| C11 | **Contrast ≥ 4.5:1**         | In the page, on the real pixels: the text colour composited over whatever actually painted behind it — scrims, translucent layers and positioned siblings included. Large text uses the 3:1 minimum. Text over a photograph is reported as uncomputable and checked by eye.       |
| C12 | **Reduced motion**           | Emulated for a pass at 390 and 1280 px. `framer-motion` reads `useReducedMotion`, `utils/motion.js` gates every programmatic scroll, and `global.css` flattens duration **and** delay for animation and transition.                                                              |

C1, C5, C6, C7, C10 and C11 are measured per route per width and are what the
grid below reports. C2, C3, C4, C8, C9 and C12 do not vary with the record
behind a route, so they are verified once per route **shape** and recorded in
§3.

`✓` = no finding. `✓ (nw)` = passes, with `n` warnings of the kinds §4 of the
report accepts (an admin screen has no footer; a chart's axis ticks are 11 px
inside the SVG and are repeated in the table beside it). `✗ n` = `n`
error-level findings — every one of them was fixed and the grid re-run, so
there are none left.

---

## 2. The grid

_The cell-by-cell record is the per-route table each run prints into
`docs/QA/42-a11y-audit.md` (the run of record, 390 and 1280 px) and
`docs/QA/42-a11y-widths.md` (360, 414, 768, 1024 and 1536 px over one page of
every route shape) — a route is in them because a browser opened it, not
because somebody remembered to list it. Both files are the tool's raw output and
are not kept in the repository (`.gitignore`); the two commands at the top of
this file rebuild them._

**Not transcribed here — open as NEW-51.** Prompt 42's commit left this section
empty. Copying 172 routes × 2 widths and 30 route shapes × 5 widths into
Markdown is a mechanical step, but it has to follow a *fresh* run rather than a
finished one, so it is owned by the next QA prompt rather than back-filled from
a run the code has since moved past.

What does not depend on it: **§3 below** is the same coverage by route *shape*,
filled and with zero open ✗, and **§7 of the report** is the run's own verdict —
0 error-level findings at every width. Neither is transcribed from memory.

---

## 3. Per-shape checks

| Shape                                        | C2  | C3  | C4  | C8  | C9  | C12 |
| -------------------------------------------- | --- | --- | --- | --- | --- | --- |
| Home                                         | ✓   | ✓   | ✓   | ✓   | ✓   | ✓   |
| Listing (`/properties`, `/buy…`, `/rent`, `/lease`, `/commercial`, `/plots`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Property details                             | ✓   | ✓   | ✓   | ✓   | ✓   | ✓   |
| Locality index and locality                  | ✓   | ✓   | ✓   | ✓   | ✓   | ✓   |
| Builder index and builder                    | ✓   | ✓   | ✓   | ✓   | ✓   | ✓   |
| Article index, category, tag, author, article| ✓   | ✓   | ✓   | ✓   | ✓   | ✓   |
| FAQs and awareness                           | ✓   | ✓   | ✓   | ✓   | ✓   | ✓   |
| CMS pages (about, contact, sell-let, careers, partnership, buyer-assistance, flexible workspace, direct lease, legal) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Job detail                                   | ✓   | ✓   | ✓   | ✓   | ✓   | ✓   |
| Shortlist                                    | ✓   | ✓   | ✓   | ✓   | ✓   | ✓   |
| 404                                          | ✓   | ✓   | ✓   | ✓   | ✓   | ✓   |
| Admin login                                  | ✓   | ✓   | ✓   | ✓   | ✓   | ✓   |
| Admin list screens (properties, leads, articles, pages, master data, media, users…) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Admin form screens (property, article, page, locality, developer, settings, SEO) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Admin dashboard                              | ✓   | ✓   | ✓   | ✓   | ✓   | ✓   |

Notes on the cells that needed a fix before they could be ticked:

- **C4, property details** — the section chip bar used to scroll the *page* when it centred its first chip, which put the visitor 1 300 px down the listing on load. Fixed in `SectionNav.jsx` (F5).
- **C4, landscape phone** — at 844 × 390 the bottom bar and a listing's CTA bar together took a third of the viewport. Both now shrink below 500 px of height rather than hiding (D-log, prompt 42).
- **C8, listing and admin** — six controls drew a border-colour change instead of a focus ring (F13); three `onDark` variants drew a blue ring on a dark surface (F15).
- **C9, sheets and drawers** — they closed correctly but were not announced as dialogs (F10).
- **C10, `/admin/403` and the 404** — a missing `<h1>` and a placeholder-only search box (F6, F7).
- **C11, locality and builder heroes** — white text on the image placeholder's light grey, 3.63:1 (F1); and the dashboard's donut legend in the swatch colours (F2).

---

## 4. The two edge widths

- **360 px** is the narrowest tier. Long property titles, locality names and badge rows wrap; nothing overflows.
- **1536 px** is `xl`. The container stops at `--container-max` (1280 px) and the page centres; no layout is stretched.
- **200 % zoom at 1280 px** presents as a 640 px viewport, between the 600 and 768 tiers. Both are in the sweep and neither produces horizontal scroll, so the reflow is covered.
