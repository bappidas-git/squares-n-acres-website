# Prompt 49 — UI, UX and accessibility audit of the running site

A pass over the built product rather than the source: the site and the admin
panel were served, driven in Chromium at 390, 768, 1280 and 1920 px with the
console open, and every finding confirmed by measuring the live page before it
was called a defect — and measured again afterwards.

**Nine defects found and fixed.** Two of them were the pair prompt 48 deferred
(NEW-53, NEW-54), and one of those had the wrong cause recorded against it. Two
were new and visible on every desktop screen. `npm run a11y:audit`, the one
check 1.0.0 shipped amber, now exits 0.

| Environment  | Value                                                             |
| ------------ | ----------------------------------------------------------------- |
| Date         | 2026-09-21                                                        |
| Node · npm   | v22.22.2 · 10.9.7                                                 |
| Chromium     | 141 (`CHROME_PATH`), driven through Playwright                    |
| Mock API     | `http://localhost:4000/api`                                       |
| Dev server   | `http://localhost:3000`                                           |
| Served build | `http://localhost:5000` (`npm run serve:build`)                   |

---

## 1. What was run

| Sweep                     | Coverage                                                                      |
| ------------------------- | ----------------------------------------------------------------------------- |
| Route walk                | 91 routes × 4 viewports = **364 runs**, public and admin, console captured     |
| Supplementary walk        | 44 more: query strings, unknown slugs, `/admin` and `/admin/403`               |
| Served-build walk         | the same routes against `build/` at 390 and 1280                               |
| Interaction suites        | 161 scripted checks across navigation, filters, forms, CRUD, RBAC and the editor |
| Project checks            | `check:all`, `e2e`, `a11y:audit`, `smoke`, `check:links`, `check:jsonld`, `check:sitemap`, `build:prerender` |

Each run recorded console errors and warnings, uncaught exceptions, failed
requests, root horizontal scroll (by attempting the scroll and measuring how far
the body moved), elements outside the viewport, broken images, missing
accessible names read from **Chrome's own accessibility tree** rather than
guessed, heading order, unlabelled fields, target sizes and placeholder
contrast composited over its real background.

---

## 2. The defects

### 2.1 The admin shell scrolled sideways — NEW-53, closed

`/admin/properties` could be dragged **788 px** to the right, past the sidebar
and into blank space; `/admin/articles` 328, `/admin/leads` 237, `/admin/jobs`
104, `/admin/seo` 12, and `/admin/properties` 252 at 1920 px.

Prompt 48 recorded the fix as `overflow-x: clip` (or `hidden`) on the document,
and deferred it as too broad to land on a tagged commit. **That fix does not
work**, which is why it was tried before it was written down: `html` and `body`
already carry `overflow-x: clip`, and adding `hidden` on either or both changes
the number by zero. Measured:

| Applied to the live page                  | body moves |
| ----------------------------------------- | ---------- |
| nothing (baseline)                        | 788 px     |
| `html { overflow-x: hidden }`             | 788 px     |
| `body { overflow-x: hidden }`             | 788 px     |
| `html, body { overflow-x: hidden }`       | 788 px     |
| `html { max-width: 100% }`                | 788 px     |
| **`contain: paint` on the table scroller** | **0 px**   |

Every ancestor of the wide table reported `scrollWidth === clientWidth`; only
`document.documentElement` did not (2068 against a 1280 client). Paint
containment is the boundary that takes the subtree out of its ancestors'
scrollable overflow. It is one declaration on `.scroller` in
`DataTable.module.css`, the element that actually holds the oversized table, and
the table keeps its own horizontal scrollbar (`scrollLeft` still reaches 829).

### 2.2 Placeholder contrast — NEW-54, closed, and the cause corrected

Eight error-level findings at 4.30:1. Prompt 48 blamed `.control::placeholder`
in `FormField.module.css` and concluded the fix meant darkening
`--color-text-muted` — muted text everywhere — or adding a token.

Measured on the page, `.control` placeholders are **6.05:1** and were never the
problem. The fields that failed are the ones whose CSS module sets no
placeholder colour at all — `ImageField`, the SEO panel's schema box — so they
fall back to the browser's own grey. One rule in `global.css` gives every input
the muted token the explicit fields already use. No token changed, and no field
is missed.

Measuring also found a case the audit script cannot see. It reads `color` and
`opacity` as separate properties, so MUI's placeholder — the text colour at
`opacity: 0.42` — scored 16.48:1 while rendering at **2.58:1**. Every MUI field
in the admin was under the minimum and none was reported. The theme now sets the
muted token at full opacity.

| Field                  | Before  | After  |
| ---------------------- | ------- | ------ |
| `FormField` control    | 6.05:1  | 6.05:1 |
| `ImageField` input     | 4.30:1  | 6.05:1 |
| SEO panel schema box   | 4.30:1  | 5.65:1 |
| every MUI input        | 2.58:1  | 6.05:1 |

### 2.3 The header overlapped itself on every desktop screen — new

Ten menus asked for 802 px of a 765 px bar. `.nav` is `flex: 1 1 auto` with
`min-width: 0` and centred content, so the overflow neither scrolled nor
clipped: it spilled 21 px out of **both** ends, putting "Buy" under the logo and
"Contact" under the search button. `.inner` is capped at `--container-max`, so
widening the browser never helped — the same 21 px at 1280, 1440 and 1920, and
61 px at 1200.

The fold into "More" existed but was tied to the `md` breakpoint, on the
reasoning that ten labels need about 1200 px of bar; above it everything was
trusted to fit. `useFittedMenus` measures instead, and a wider fixed limit would
only have moved the number: the menus are built from master data and the
published CMS pages, so how many there are is the client's to change.

Two things the measurement had to be taught. `setLimit(total)` when the limit is
already `total` is a no-op to React, so nothing re-renders and the effect never
runs — precisely the case that matters. And `display=swap` draws the bar in the
fallback face first: the ten labels measured 744 px and fitted, then grew to
840 px when Inter arrived, after `document.fonts.ready` had already resolved.
The labels are observed directly, which needs no guess about when that happens.

| Viewport | Before                              | After                                        |
| -------- | ----------------------------------- | -------------------------------------------- |
| 1200 px  | 10 menus, 61 px under the logo      | 8 + More, 31 px clear of logo and buttons     |
| 1280 px  | 10 menus, 21 px under the logo      | 8 + More, 28 px clear at both ends            |
| 1440 px  | 10 menus, 21 px under the logo      | 8 + More, 28 px clear                         |
| 1920 px  | 10 menus, 21 px under the logo      | 8 + More, 28 px clear                         |

Resizing restores them: 7 → 9 → 6 → 9 menus across 1000 → 1600 → 950 → 1440,
fitting exactly at each step. Nothing is lost — "More" carries Company and
Contact with all their links.

### 2.4 The home page clipped its category counts on a phone — new

The six tiles overflowed a 390 px screen by 59 px, cutting the listing count off
every tile in the right-hand column. `1fr` is `minmax(auto, 1fr)`, so a column
can never shrink below its content's min-content width, and the tile's was
230 px. The columns take `minmax(0, 1fr)` and the tile stacks on a phone, so the
count stays on the tile it belongs to: 12 of 12 counts on screen, tiles ending
at 374 px of a 390 px viewport.

### 2.5 Three redirect toggles had no accessible name — new

Chrome's accessibility tree reported three unnamed switches on
`/admin/seo/redirects`. The label was written; MUI 7 stopped forwarding
`inputProps` from `Switch`, so it never reached the input. `slotProps.input`
carries it, with `role="switch"` repeated because those props replace the set
`Switch` would otherwise pass — without it the control drops to a checkbox.
`DataTable`'s row checkboxes already used this form, which is why they were
named and these were not.

### 2.6 Six heading levels were skipped — new

The outline read h1 → h3 with nothing between on the locality, builder and
article card grids, the contact block's cards when the block has no title of its
own, the bank cards, and the SEO panel's own headings. `LocalityCard` and
`DeveloperCard` take a `headingLevel` prop like `ArticleCard` already did. All
91 routes now walk clean at both widths.

### 2.7 A missing API URL served a white page — new

A production build made without `REACT_APP_API_URL` rendered nothing at all:
`#root` empty, the only text on the page the `<noscript>` fallback, and the
reason a line in the console. `http.js` refusing to start without it is right —
a fallback URL would send a live site's traffic somewhere nobody chose — but the
throw happens while the bundle's modules are still evaluating, before
`createRoot`, so `ErrorBoundary` is not mounted and cannot catch it. A listener
in the shell reaches it, and says so on the page.

### 2.8 The admin filter labels were ragged — new

`MultiSelect` and `EntityPicker` carry their own form label, a size larger and
darker, so "Status", "Source", "Property" and "Role" sat 3–4 px above their
neighbours in a row of native selects. "Created" sat 4 px low for the opposite
reason: a `<legend>` is not a flex item, so `.control`'s `gap` never applied to
it. Every label in every filter row now shares a baseline.

### 2.9 Six controls were under the WCAG 2.2 target minimum — new

The chip's remove mark at 18×18 — squeezed to 12 px wide beside a long label —
"Learn more" in CMS cards, the SEO panel's preview-width toggle and its
clickable hints, "Remove" in the entity picker, and "Open" on a job application.
The chip keeps its 18 px mark, because a taller chip would change every form it
appears on, and carries the 24 px target on a pseudo-element instead.

---

## 3. Results

| Check                  | Before                  | After                              |
| ---------------------- | ----------------------- | ---------------------------------- |
| `npm run check:all`    | exit 0                  | **exit 0** — 148 suites, 3 353 tests |
| `npm run e2e`          | 53 passed               | **53 passed**                      |
| `npm run a11y:audit`   | **exit 1, 12 errors**   | **exit 0, 0 errors** (378 pages)   |
| `npm run smoke`        | —                       | 282/282                            |
| `npm run check:links`  | —                       | 144 pages, 0 broken                |
| `npm run check:jsonld` | —                       | 144 pages, 0 errors                |
| `npm run check:sitemap`| —                       | 0 missing, 0 extra                 |
| `npm run build:prerender` | —                    | 144 of 144 saved                   |
| Route walk, 4 viewports | 6 side-scrolls, 68 heading skips, 8 element overflows, 3 unnamed controls | **none** |

Across all 364 runs and the served-build walk: no console errors, no uncaught
exceptions, no unexpected failed requests. Every unknown slug renders its own
not-found page — "Property not found", "Article not found", "This role is no
longer listed" — rather than an empty one.

---

## 4. Looked at and deliberately left alone

- **The breadcrumb separator**, which `a11y:audit` reports at 1.38:1. It is
  `aria-hidden` decoration and reads correctly on screen; NEW-52 already records
  the reasoning. Changing it is a design decision, not a defect fix.
- **A `position: sticky` rail** on the property form that a test harness could
  not scroll into view. A person can, at 1280×900, 1440×768, 1920×1080 and
  1280×720 — measured at each.
- **The article measure**, 712 px at 16 px. Wide for body copy but within the
  normal range, and narrowing it is a typographic choice for the client.
- **The 16-tab strip** on the property form, which scrolls rather than wrapping.
  The last tab is clipped mid-word, which is the signal that it scrolls, and
  `End`, `Home` and the arrow keys all scroll the focused tab into view.

## 5. One thing the next person should know

Adding a rule to an admin CSS module can fail `build:ci` for reasons that have
nothing to do with the rule. Growing `MultiSelect.module.css` and
`EntityPicker.module.css` shifted chunk composition enough for
`mini-css-extract-plugin` to report a conflicting order, and `CI=true` treats
that as an error. It is not a near-miss: walking the imports shows **252 pairs**
of admin stylesheets registered in conflicting orders across pages already, and
which of them webpack reports depends on which chunk they land in.

The convention in `components/admin/index.js` — import the files directly, in
`MasterDataPage`'s order — does not cover the transitive cases, and reordering
the two pages that break it alphabetically did not clear the conflict. What
worked here was not growing those stylesheets at all: the filter bar hands the
two components its own label class, at a specificity (`.control .fieldLabel`)
that wins whichever order the files are emitted in.

Before believing a build is clean, delete `node_modules/.cache` — a warm cache
hid this conflict on the first run of the day and surfaced it on the second.
