# Prompt 50 — a second pass over the running site and the admin panel

The same method as prompt 49 and the same rule: nothing is a defect until the
live page has been measured, and nothing is fixed until the live page has been
measured again. The site was built, served and driven in Chromium at 390, 768,
1280 and 1920 px with the console captured, every control on a dozen admin
screens was clicked one at a time, and the write paths — login, filters, forms,
CRUD, the guards — were driven the way a person drives them.

**Eleven defects found and fixed**, three of them systemic: more than half the
elements on an admin form were using the wrong box model, every form that
carries the SEO panel claimed to have unsaved changes before anybody had typed
anything, and every grouped control in the panel was drawing the browser's own
1990s `<fieldset>` rectangle around itself.

| Environment  | Value                                      |
| ------------ | ------------------------------------------ |
| Date         | 2026-09-21                                 |
| Node · npm   | v22.22.2 · 10.9.7                          |
| Chromium     | 141.0.7390.37, driven through Playwright   |
| Mock API     | `http://localhost:4000/api`                |
| Dev server   | `http://localhost:3000`                    |
| Served build | `http://localhost:5000` (`serve -s build`) |

---

## 1. What was run

| Sweep                  | Coverage                                                                                                                                                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public route walk      | 95 routes × 4 viewports = **380 runs** against the served build                                                                                                                                                                                                                       |
| Admin route walk       | 41 routes × 4 viewports = **164 runs**, signed in as `admin`                                                                                                                                                                                                                          |
| Control probe          | 12 admin screens, every visible button / tab / switch clicked one at a time, the page reloaded between clicks — **≈500 clicks**                                                                                                                                                       |
| Public flows           | header search, listing filters, sort, view toggle, pagination, shortlist, gallery and lightbox, accordions, lead form validation and submission, newsletter, FAQ search, mobile drawer, bottom navigation                                                                             |
| Admin flows            | the login guard, a wrong password, the redirect back, dashboard, table search / sort / bulk selection, all 16 property-form tabs, all 10 SEO-settings tabs, all 7 site-settings tabs, the lead detail, the media library, the rich-text editor, all 32 sidebar destinations, sign-out |
| Admin CRUD             | create / validate / delete through the interface on 13 modules, plus site settings and redirects                                                                                                                                                                                      |
| Dev-mode console sweep | the same routes against `npm start`, where React and MUI print their warnings                                                                                                                                                                                                         |
| Project checks         | `check:all`, `smoke`, `check:links`, `check:sitemap`, `check:jsonld`, `a11y:audit`, `e2e`, `build:prerender`                                                                                                                                                                          |

Each run recorded console errors and warnings, uncaught exceptions, failed
requests, document-level horizontal scroll, elements outside the viewport,
broken images, missing accessible names, heading order, duplicate ids,
unlabelled fields, clipped text and target sizes — with every `<details>` in
the page opened first, so nothing was missed for being folded away.

---

## 2. The defects

### 2.1 Every property card printed "Verified" twice — new

`PropertyCard` draws a green `Verified` chip from the record's `isVerified`
flag **and** the master-data badges the API embeds, one of which the seed calls
"Verified". A property carrying both showed the word twice, side by side, in two
different tones — on the listing, the home page, the shortlist, the similar
strip and every embedded results grid.

`TitleBlock` had already met this and suppressed its own chip when a badge said
the same thing, which left the two surfaces disagreeing: the card showed the
green shield, the details page a grey badge. The rule now lives once, in
`utils/propertyBadges.js`, and both read it: the built-in chip wins and the
badge that repeats it is dropped — **before** the card's two-badge limit is
applied, so the freed slot goes to a badge that says something new.

Measured on `/properties` at 390 and 1280 px: card one went from
`Ready to Move · Verified · Verified` to `Ready to Move · Verified`, and
`RERA Approved` — which the old slice had pushed out — is back.

### 2.2 The listing's heading was squeezed into a third of its column — new

`.resultsHeader` is a wrapping flex row, and `.headingBlock` had
`flex: 1 1 280px` beside the search box (`1 1 260px`) and the sort and view
controls. All three fitted on one line at every desktop width, which left the
`<h1>` about **304 px wide inside a 920 px results column**: "Properties in
Bengaluru" broke over two lines, its intro over four, and beside them sat an
empty band with the controls bottom-aligned under it.

Every other index on the site — articles, localities, builders — gives the
title the full width. The listing does now too: `flex: 1 1 100%` puts the
heading on its own row and wraps the search and the controls onto the second,
with `margin-left: auto` holding sort and view over the right edge of the grid
they act on. The search box's placeholder, which used to be clipped
mid-word, fits.

### 2.3 Half of every admin form was using the wrong box model — new

`getComputedStyle` on `/admin/master-data/localities/add` at 390 px:
**549 of 1 038 elements were `content-box`**. The visible consequence was a
`<select>` 372 px wide inside a 314 px column — `width: 100%` plus 16 px and
40 px of padding and 2 px of border — clipped at the right edge of the phone,
and past the panel's edge at 768, 1280 and 1920 px too.

Nothing in `src/` sets `content-box`. The chain is:

1. `global.css` resets `*, *::after, *::before { box-sizing: border-box }`.
2. MUI's `CssBaseline` emits `*, *::before, *::after { box-sizing: inherit }`
   from Emotion at runtime, into a `<style>` that lands after `main.css`. At
   equal specificity the later rule wins, so every element **inherits** rather
   than being told.
3. `inherit` resolves against the parent box, and Chrome puts UA pseudo-elements
   between an element and its parent in two places this app uses heavily:
   `::details-content`, and the box a `<select>` keeps its `<option>`s in. Their
   own value is the initial `content-box`, and the whole subtree falls back with
   it. The SEO panel is built from `<details>` groups, which is why it was the
   panel that broke.

The fix is the same reset one specificity step up — `:root *` is (0, 1, 0)
against the `*` rules' (0, 0, 0), so it wins wherever Emotion chooses to inject.
`!important` would also have worked, at the cost of taking the property away
from every component that may one day need it.

Measured after: **0 of 1 038 elements `content-box`**, the `<select>` 314 px in
a 314 px column, and no control overflowing the viewport at any width.

### 2.4 Every SEO-bearing form claimed unsaved changes before anyone typed — new

Open Add page, click any link in the sidebar, and the panel asked "Discard
unsaved changes?" — on a form nobody had touched. The same on Add locality and
Add developer on load, and on Add property and Add article as soon as the SEO
tab was opened. A guard that cries wolf is a guard people learn to dismiss.

`useSeoAnalysis` writes six fields it computes — `score`, `scoreBand`,
`testsPassed`, `testsTotal`, `analysis`, `lastAnalyzedAt` — back into the record
it analysed, through the same `onChange` an editor's typing uses, and the first
analysis runs on mount. `dirty` is `values !== baseline`, so the panel's own
arithmetic read as an edit.

`SeoEditDialog` had already met this and answered it with a set of keys to
ignore. The answer is now general and lives with the forms rather than beside
one dialog: the panel marks those writes `{ computed: true }`, `useForm` gained
`setComputed` and the property reducer a `SET_COMPUTED` action, and both move
the baseline along with the value. Every other path still differs exactly as
much as the editor made it differ, so a real edit still raises the guard and
undoing it still clears the form — both verified on the running page.

The first version of this was wrong in a way worth recording. `PropertyFormShell`
builds its context object field by field rather than spreading the hook, so
`setComputed` reached `SeoTab` as `undefined`, the analysis write threw, and the
score never arrived. **Nothing in the route walk saw it** — the SEO tab is the
sixteenth of sixteen and nothing opens it — and the form looked _more_ correct
for it, because a write that throws also leaves the form clean. `npm run e2e`
caught it on the assertion that the rail says "N of M passed" before a save. The
check that now stands in for it, run against every one of the eight screens that
carry the panel: the analysis has landed (a score is on screen) **and** the form
is still clean **and** the console is empty.

### 2.5 The "image unavailable" mark was itself a network image — new

`LazyImage` draws a monogram when a picture fails, and the monogram was a
Cloudinary URL. It is requested at exactly the moment a picture has already
failed to load — often from the same CDN, often for the same reason — so the
placeholder for a broken image could be a second broken image, which is what a
network-throttled run showed. It is now `/brand/icon-192.png`, the copy
`npm run generate:brand-assets` writes into `public/brand/` and the repository
commits, so it resolves from this origin on a fresh clone with no build step.

### 2.6 Eleven controls were under the WCAG 2.2 target minimum — new

SC 2.5.8 asks for 24 × 24 px at every width, not only where a media query
already grows a control to 44 px for a finger. Measured on the running page:

| Control                                     | Was    | Where                       |
| ------------------------------------------- | ------ | --------------------------- |
| Footer phone and e-mail rows                | 329×22 | every public page           |
| The three footer legal links                | 86×16  | every public page           |
| "View all" beside the similar strip         | 75×22  | every property page         |
| "Read the guide" on the article hero        | 127×22 | `/insights/articles`        |
| The author link in an article meta row      | 100×22 | article cards and headlines |
| The column-sort button in every admin table | 84×19  | every admin list            |
| A lead's name in the list                   | 123×22 | `/admin/leads`              |
| The entity picker's search box              | 272×17 | article and property forms  |
| The dashboard's recent-lead links           | 80×17  | `/admin/dashboard`          |
| The `Button` component's `link` variant     | 60×19  | dashboard and detail pages  |
| The applications count on the jobs list     | 6×17   | `/admin/jobs`               |

Each grew a floor rather than a new size: a `min-height` the surrounding
padding absorbs, or — where the row is sized by its own text — a 24 px hit area
on a pseudo-element, the treatment prompt 49 used for the chip's remove mark.
The entity picker's input was a special case: `.searchBox` draws a 40 px frame
but is a `<div>` rather than a `<label>`, so a click on its padding reached
nothing; stretching the input to fill the frame makes the whole box clickable
and leaves the text where it was.

### 2.7 The listing's search box was cut mid-word at 768 px — new

`.headerSearch` had `flex: 1 1 260px`, which left room for it and the controls
on one line at every width — and then let it shrink to whatever the controls
did not take. At 768 px that was **236 px against a placeholder needing 238**,
so "Search by locality, project or builder" was cut mid-word; at 1024 px it had
35 px of slack. A 320 px basis is what the box is worth: where the controls no
longer fit beside it they take a line of their own, and at 1280 px and above
nothing moves. Measured at 360, 390, 414, 600, 768, 900, 1024, 1280, 1440 and
1920 px: the placeholder fits at every one, with 35 to 128 px to spare, and the
`<h1>` stays on one line throughout.

### 2.8 The admin account button could not be reached by voice — new

`npm run a11y:audit` reported it 85 times: the button reads "AU Admin User" and
its accessible name was "Account menu", so it contained none of the words on
it. Somebody driving the panel by voice saying "Admin User" activated nothing
(WCAG 2.5.3). The name is now `"<name> — account menu"`, and the avatar beside
it — which was contributing the initials "AU" to the visible text — is
`aria-hidden`, because the name it stands for is written next to it and is in
the button's own label. 85 warnings to 0.

### 2.9 The dashboard's chart labels were 11 px on a phone — new

Hardcoded `fontSize: 11` on every axis of the three Recharts charts, against
§8.1's 13 px floor for a phone — the floor `ui/Avatar` already honours for its
own initials, and the one `a11y:audit` reported 44 times on
`/admin/dashboard` at 390 px. `useAxisTick()` in `ChartFrame.jsx` now holds the
fill and the size in one place and follows the breakpoint. Recharts drops ticks
rather than overlapping them, so the wider labels cost density, not legibility:
measured on the running dashboard at 390 px, the day axis still reads
23 · 27 · 31 · 04 · 08 · 12 · 15 · 18 · 21 with no collision.

### 2.10 Eight grouped controls drew the browser's default fieldset border — new

`CheckboxGroup` and `RadioGroup` render a `<fieldset>`, and the reset in
`global.css` zeroes a fieldset's margin and padding but not its border — so
each of them drew Chrome's own grey `groove` rectangle, with the label touching
it, because the padding that normally holds a legend off the line was gone.
Eight of them: "Listing type" and "Segment" on the property form, the status
radios on the article form and the page form, and the overwrite toggle on the
SEO dashboard, at both widths.

`fieldset { border: 0 }` belongs with the reset: a fieldset that wants a border
asks for one, and `FormSection` — the card every admin form is built from —
already does. Counted across all 41 admin screens afterwards: **0 with the UA
border, 74 still carrying the one their stylesheet gives them.**

### 2.11 Two filters on the SEO dashboard were empty boxes — new

Every `multiselect` filter in the panel carries a placeholder — "Any status",
"Any source" — except Type and Score on `/admin/seo`, which declared none. The
control rendered as an empty rounded box with a chevron, and the only thing
saying what it was, or that it could be opened at all, was the label above it.
They read "Any type" and "Any score" now, beside "All index", which is what the
select next to them already said. A sweep for the same shape — a visible
control whose face is blank — across all 41 admin routes and 36 public ones
finds none left.

---

## 3. Results

| Check                     | Result                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Public walk, 4 viewports  | 380 runs — **0 findings**, 0 console errors                                                                  |
| Admin walk, 4 viewports   | 164 runs — **0 findings**, 0 console errors                                                                  |
| Control probe             | ≈500 clicks, and 150 more on the screens these changes touch — **0 crashes**, 0 blank screens, 0 side-scroll |
| Public flow suite         | 17 scripted checks — **0 issues**                                                                            |
| Admin flow suite          | 18 scripted checks — **0 issues**                                                                            |
| Dev-mode console sweep    | public and admin, dialogs opened — **0 React or MUI warnings**                                               |
| `npm run check:all`       | exit 0 — 150 suites, **3 368 tests**                                                                         |
| `npm run smoke`           | 282/282                                                                                                      |
| `npm run check:links`     | 144 pages, 143 internal links, **0 broken**                                                                  |
| `npm run check:sitemap`   | 145 pages crawled to depth 4 — **0 missing, 0 extra**                                                        |
| `npm run check:jsonld`    | 144 pages — **0 errors** (36 "title over 60 characters" advisories, unchanged)                               |
| `npm run a11y:audit`      | 378 pages at 390 and 1280 px — **0 errors**; warnings 1 121 → **991**                                        |
| `npm run e2e`             | **53 passed** — and one of them caught a mistake in 2.4, above                                               |
| `npm run build:prerender` | 144 of 144 pages saved                                                                                       |

Across all 544 page loads and every scripted flow: no console errors, no
uncaught exceptions, no unexpected failed requests, no element outside its
viewport, no unnamed control, no duplicate id, no skipped heading level and no
target under 24 px.

`a11y:audit`'s remaining warnings are the project's own stricter tiers rather
than failures, and every one of them was read:

| Warning                            | Count | What it is                                                                                                                                                            |
| ---------------------------------- | ----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Text contrast below 4.5:1          |   512 | all one element: the breadcrumb separator, `aria-hidden` decoration prompt 49 §4 already recorded as deliberate                                                       |
| Tap targets under **44** px        |   302 | the phone tier, not SC 2.5.8's 24 px, which every one of them now meets                                                                                               |
| Accessible name omits visible text |    76 | the gallery stage, whose name begins with its own visible counter; the rest of the text belongs to the buttons nested inside it, each named in its own right (NEW-45) |
| Missing landmark                   |    86 | `<footer>` on admin screens, which have no footer content to mark up, and `<header>` on the login card, which has no topbar                                           |
| Text under the mobile minimum      |    12 | the SEO panel's SERP preview, which is a picture of Google's result and is only honest at Google's size                                                               |
| Console                            |     2 | the API answering 404 for an unknown CMS slug on `/this-page-does-not-exist`, which is how the 404 page knows to render                                               |

---

## 4. Looked at and deliberately left alone

- **`api.iconify.design` at runtime.** Icons are fetched rather than bundled.
  A CDN outage would leave gaps where glyphs are; nothing else breaks, because
  every icon in the product sits beside its own text or carries an
  `aria-label`. Bundling them is a dependency decision for the client, not a
  defect fix.
- **`mm/dd/yyyy` in the admin's date fields.** `<input type="date">` is
  formatted by the browser's locale, not the page's `lang`. The only way to
  make it read `dd/mm/yyyy` everywhere is to stop using the native control.
- **`overflow-wrap: anywhere` on a lead's e-mail address**, which breaks it
  mid-word in a narrow column. The alternative is a cell that overflows; this
  is the right trade and it is already deliberate.
- **The admin table clipped at its right edge**, which is the signal that it
  scrolls — `DataTable.module.css` documents the `contain: paint` that makes
  the table rather than the shell do the scrolling.
- **A `<div>` rather than an `<article>` at the root of `PropertyCard`.** A
  semantic improvement, not a defect, and it would change the accessibility
  tree of every grid on the site.

---

## 5. One thing the next person should know

Prompt 49's closing note is still true, and this pass hit it again from the
other side. Adding six lines to `DataTable.module.css` and `EntityPicker.module.css`
— rules that were correct, and that `npm start` served correctly — made
`build:ci` fail with a `mini-css-extract-plugin` "Conflicting order" across four
admin stylesheets. Reverting exactly those two files, with the other four CSS
changes left in place, cleared it.

The way out was not to write the rules better but to write them **somewhere
else**. `global.css` is compiled into `main.css`, which takes no part in the
admin chunks' ordering at all, so two structural selectors live there now
(`thead th > button` and `input[type='search'][role='combobox']`) with a comment
saying why. Neither property is declared by the module rule it lands beside, so
the cascade order between the two files never comes into it.

Delete `node_modules/.cache` before believing any of this, in either direction.
