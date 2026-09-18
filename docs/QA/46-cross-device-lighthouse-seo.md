# Prompt 46 — cross-device, Lighthouse, SEO validation and the prerender dry run

The release-quality evidence for `00_MASTER_CONTEXT.md` §8.6 (the performance
budget), §9 (SEO) and §8.1 (the seven test widths), plus the prerender of §9.9.
Everything below was produced against **one build**: the production bundle,
served statically, talking to the mock API.

Companion: [`46-lighthouse-howto.md`](./46-lighthouse-howto.md) — the runbook
for the Performance numbers this container cannot honestly produce.

---

## 1. The environment of record

| Thing      | Value                                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| Date       | 2026-09-18                                                                                                              |
| Node       | v22.22.2                                                                                                                |
| Browser    | Chromium **141.0.7390.37** (`CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`)                           |
| Lighthouse | 13.5.0, run ad hoc — **no dependency added to `package.json`**                                                          |
| Build      | `REACT_APP_API_URL=http://localhost:4000/api npm run build:ci` — exit 0, 0 warnings                                     |
| Served     | `npm run serve:build` → `http://localhost:5000`                                                                         |
| API        | `npm run mock` → `http://localhost:4000/api`, runtime db reset from `db.json`                                           |
| CORS       | preflight and GET from `http://localhost:5000` both answer `Access-Control-Allow-Origin: http://localhost:5000` (§5.12) |
| Bundle     | `npm run analyze` — entry 286.03 kB / 300 kB gzip, no admin markers in it                                               |

`REACT_APP_API_URL` has to be on the build line: `src/services/http.js` throws
at module load without it (D48) and `.env.development` is not read by a
production build. Canonicals still resolve against
`seoSettings.siteUrl` = `https://www.squaresnacres.com`, which is correct — a
canonical names the production URL wherever the build happens to be served.

**Run the browser-driven checks one at a time.** Two of them were first run in
parallel to save wall-clock, and `serve` died partway through with
`EMFILE: too many open files` — the file-descriptor ceiling here is 20 000 and
cannot be raised, and two crawls plus their assets reach it. `check:links`
aborted with `ERR_CONNECTION_REFUSED` and the width grid spent part of its run
talking to a dead port, so both were discarded and re-run sequentially against
a freshly started `serve`. Every number in this document comes from a
sequential run.

---

## 2. The three validation scripts

All three green on the build above.

| Script                  | Result                                                 |
| ----------------------- | ------------------------------------------------------ |
| `npm run check:sitemap` | **0 missing, 0 extra** — see §2.1                      |
| `npm run check:jsonld`  | **0 errors**, 36 warnings, all title length — see §2.2 |
| `npm run check:links`   | **0 broken links** — see §2.3                          |

### 2.1 `check:sitemap` — the new script, and the defect it found

`scripts/check-sitemap-coverage.js` (`npm run check:sitemap`) answers the
question neither of the other two could: **does the site render an indexable
page that no sitemap lists?** `check:links` walks outwards from the sitemaps
and `check:jsonld` judges what it finds there; a page missing from the sitemaps
is invisible to both, because nothing about it looks wrong.

With Chrome it crawls from `/` to `--depth` (4), following internal links, and
reads the `robots` meta and the canonical each page actually published; every
sitemap URL the crawl did not reach is then opened directly, so both directions
are covered. Without Chrome it compares `src/routes/paths.js` plus the public
API endpoints against the sitemaps and resolves each listed URL through the
same SEO modules the browser runs. Both paths were exercised.

**It found seventeen indexable pages in no sitemap at all.** The property-type
landing pages — `/buy/apartments`, `/buy/villas`, … `/commercial/warehouses`
(D25) — are linked from the home page and listed in `llms.txt`, and
`sitemapBuilder.js` even had a `PUBLIC_PATHS.propertyType` entry, but nothing
ever put them in a `<urlset>`. They are now in `sitemap-pages.xml` beside the
status routes they belong with, and two regression tests in
`mock-server/__tests__/sitemap.test.js` hold them there.

| Run                                | Sitemap URLs | Indexable rendered routes | Missing | Extra |
| ---------------------------------- | ------------ | ------------------------- | ------- | ----- |
| Before the fix (depth 1)           | 127          | —                         | **17**  | 0     |
| After the fix (depth 4)            | 144          | 144                       | **0**   | 0     |
| Without Chrome (route table + API) | 144          | 140 derived               | **0**   | 0     |

(The first run was a depth-1 smoke test while the script was being written, so
it has no full route count to report; the seventeen it named are the seventeen
below.)

145 pages were opened in the depth-4 crawl; the 145th is `/shortlist`, which
renders `noindex` by contract (§9.4) and is therefore correctly absent from
both sets.

### 2.2 `check:jsonld`

144 pages, **0 errors**. Every page has one `<h1>`, a canonical, a unique
title and description, one `application/ld+json` block that parses, breadcrumbs
everywhere but the home page, and an `alt` on every `<img>`.

The 43 warnings the first run reported were **all** title length — no duplicate
title, no duplicate description, no length complaint about a description
anywhere. The two fixes of §5.2 took that to **36**:

| Warning                   | Before | After  | What is left                                                                                    |
| ------------------------- | ------ | ------ | ----------------------------------------------------------------------------------------------- |
| Title under 30 characters | 22     | **15** | 12 properties, 2 localities, 1 author — all seeded `seo.title`s                                 |
| Title over 60 characters  | 21     | **21** | 4 base listings, 4 status listings, 9 property-type listings, 3 article tags, the article index |

The seven that went are the CMS pages. The twenty-one long ones did not move in
count because they share one cause: §9.5's own `listing` template ends in
`– %count% Listings %sep% %sitename%`, which is 30 characters of suffix, so
every listing route lands at 61–73 whatever its subject. The four status pages
did get 9 characters shorter (§5.2) — they are simply still over the guide.
Changing that template is a deliberate change to a spec-pinned default rather
than a defect fix, so it is left for prompt 48.

None of the 36 is an error: `check:jsonld` exits 0.

### 2.3 `check:links`

**144 pages opened at `http://localhost:5000`, 143 internal links followed,
0 broken.** Every URL in the sitemaps opens a real page, and every internal
link on every one of those pages resolves. NEW-41 (the two seeded links to
unpublished articles) stays closed.

---

## 3. Lighthouse — mobile, six pages

### 3.1 Measured, and passing

Mobile form factor, simulated throttling, fresh profile per run,
`benchmarkIndex` 2170–2242.

| Page             | Accessibility | Best Practices | SEO      | CLS       |
| ---------------- | ------------- | -------------- | -------- | --------- |
| Home             | 100           | 96             | 100      | 0.000     |
| Listing (`/buy`) | 100           | 96             | 100      | 0.000     |
| Property details | 100           | 96             | 100      | 0.001     |
| Locality         | 100           | 96             | 100      | 0.000     |
| Article index    | 100           | 96             | 100      | 0.000     |
| Article          | 100           | 96             | 100      | 0.000     |
| **Target**       | **≥ 95**      | **≥ 95**       | **≥ 95** | **< 0.1** |

**All four pass on all six pages.** CLS is 0 to three decimals on five of the
six and 0.001 on the sixth — the fixed-ratio boxes, reserved carousel heights
and layout-identical skeletons doing their job.

Locality was 97 on the first pass, from a real contrast defect; it is 100 after
the fix in §5.3. The single Best-Practices deduction on every page is
`errors-in-console`, and **every console error on every page is a blocked
third-party request** — 0 of them come from application code:

| Page             | Console errors | Not a blocked CDN |
| ---------------- | -------------- | ----------------- |
| Home             | 16             | **0**             |
| Listing          | 14             | **0**             |
| Property details | 25             | **0**             |
| Locality         | 19             | **0**             |
| Article index    | 17             | **0**             |
| Article          | 23             | **0**             |

### 3.2 Performance, LCP and TBT: **not validly measurable in this container**

| Page             | Performance | FCP   | LCP         | TBT          | Requests failed |
| ---------------- | ----------- | ----- | ----------- | ------------ | --------------- |
| Home             | 50          | 2.9 s | 7.2 s       | 751 ms       | 16 / 68         |
| Listing (`/buy`) | 59          | 2.2 s | 6.3 s       | 605 ms       | 14 / 41         |
| Property details | 55          | 2.2 s | 5.4 s       | 1 027 ms     | 25 / 56         |
| Locality         | 52          | 3.0 s | 6.0 s       | 733 ms       | 20 / 55         |
| Article index    | 57          | 2.8 s | 5.7 s       | 556 ms       | 17 / 50         |
| Article          | 55          | 3.0 s | 6.1 s       | 610 ms       | 23 / 60         |
| **Target**       | **≥ 85**    |       | **< 2.5 s** | **< 200 ms** |                 |

**These numbers do not measure the application, and they are not the verdict
on §8.6.** The container routes outbound HTTPS through a proxy that
re-terminates TLS with a CA Chromium does not trust, so every request to
`fonts.googleapis.com`, `res.cloudinary.com`, `picsum.photos` and the Iconify
API fails with `ERR_CERT_AUTHORITY_INVALID` — **including every page's LCP
image**. With no LCP image, LCP becomes whatever text paints last, and
Performance is 40 % LCP-weighted, so the score follows it down.

This was not accepted on prompt 41's word. It was re-verified here
(`res.cloudinary.com` 4 failures on the home page, `picsum.photos` 2,
`fonts.googleapis.com` 1, Iconify's three hosts 9), and two ways out were
tried: Chromium's `CACertificates` enterprise policy, which this build ignores,
and adding the CA to the NSS store with `certutil`, which is not permitted in
this environment. Turning certificate verification off would have produced a
number that is wrong in a different way. So the measurement is labelled rather
than published.

**The Performance half of §8.6 is therefore open**, and
[`46-lighthouse-howto.md`](./46-lighthouse-howto.md) is the fifteen-minute
runbook that closes it on a machine with ordinary network access: exact
commands, the six URLs, the targets, and what to look at first for each
possible failure.

### 3.3 What the run does say about performance

Two things in the trace are the application's own and survive the caveat:

- **The bundle is inside budget.** `npm run analyze`: entry chunk 286.03 kB of
  a 300 kB gzip budget, 174 lazy chunks, and none of the admin markers
  (`SeoPanel`, `RichTextEditor`, `recharts`, `MediaLibrary`) in the entry.
- **CLS is 0 with the images missing.** That is the harder case, not the
  easier one: a layout that does not move when a photograph never arrives is
  a layout with real boxes reserved for it. Prompt 41's checklist item
  "confirm CLS stays 0 with the images actually loading" still needs the
  runbook.

The static review of the performance audits found nothing to fix that is not
already known: `unused-javascript` on the home page is the route-split shape
(prompt 41 measured 107 kB), `render-blocking-resources` is the Google Fonts
stylesheet (already `display=swap` + preconnect), and every image already goes
through `LazyImage` with `sizes`, `srcSet` and an aspect-ratio box.

---

## 4. Structured data validated by a human

`check:jsonld` proves the graph is _structurally_ valid — known `@type`s,
absolute URLs, ISO dates, stable `@id`s, one `@graph` per page. It cannot
prove Google will grant a rich result. That needs the two public validators,
and it is a human step.

**How to do it.** The site is not deployed yet, so paste the JSON-LD rather
than the URL. With the mock and `serve:build` running, extract a page's block:

```
node -e "const p=require('puppeteer-core');(async()=>{const b=await p.launch({executablePath:process.env.CHROME_PATH,headless:'new',args:['--no-sandbox']});const g=await b.newPage();await g.goto('http://localhost:5000/properties/lakeview-heights-3-bhk-whitefield',{waitUntil:'networkidle0'});await g.waitForFunction(()=>document.head.querySelector('script[type=\"application/ld+json\"]'));console.log(await g.evaluate(()=>document.head.querySelector('script[type=\"application/ld+json\"]').textContent));await b.close()})()"
```

Then paste it into both:

- **Google Rich Results Test** — <https://search.google.com/test/rich-results>, "Code" tab
- **Schema Markup Validator** — <https://validator.schema.org/>, "Code snippet" tab

Once the site is live, use the URL tab instead and record the live URL.

| #   | Page                | Path                                                     | Tool                 | Result | Date |
| --- | ------------------- | -------------------------------------------------------- | -------------------- | ------ | ---- |
| 1   | Property 1          | `/properties/lakeview-heights-3-bhk-whitefield`          | Rich Results Test    |        |      |
| 2   | Property 1          | `/properties/lakeview-heights-3-bhk-whitefield`          | validator.schema.org |        |      |
| 3   | RERA article        | `/insights/articles/karnataka-rera-guide-for-homebuyers` | Rich Results Test    |        |      |
| 4   | RERA article        | `/insights/articles/karnataka-rera-guide-for-homebuyers` | validator.schema.org |        |      |
| 5   | Whitefield locality | `/localities/whitefield`                                 | Rich Results Test    |        |      |
| 6   | Whitefield locality | `/localities/whitefield`                                 | validator.schema.org |        |      |

What each page should offer, so the result can be judged rather than just
recorded:

| Page                | `@graph` should contain                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Property 1          | `RealEstateListing` + `Apartment`, `Offer` (INR), `PostalAddress`, `BreadcrumbList`, `FAQPage`, `Organization`, `WebSite`            |
| RERA article        | `Article`/`BlogPosting` with `author` `Person`, `publisher` `Organization` + logo, `datePublished`, `dateModified`, `BreadcrumbList` |
| Whitefield locality | `Place`, `ItemList` of the listings shown, `BreadcrumbList`                                                                          |

Rich Results Test reports only the types it can render a result for
(`FAQPage`, `Article`, `BreadcrumbList`); `validator.schema.org` reports on the
whole graph, which is why both are in the table.

---

## 5. Fixes made in this prompt

### 5.1 Seventeen property-type pages missing from every sitemap

`mock-server/lib/sitemapBuilder.js` — described in §2.1. Two regression tests
added (active types are listed under their segment; an inactive type is not).

### 5.2 `NEW-40` — listing and CMS titles

Two separate causes behind one warning class:

- **The four `/buy/<status>` pages said "for Sale" twice.**
  `listingSeo.js` resolved `%listingtype%` straight from the listing type,
  ignoring the route's own `verb` — which the `<h1>` and the description have
  always honoured, and which the route table sets to `''` for exactly this
  reason. `titleVerbOf()` now makes the title agree with the heading.

  | Page                      | Before                                                 | After |
  | ------------------------- | ------------------------------------------------------ | ----- |
  | `/buy/pre-launch`         | 72 — "Pre-launch projects **for Sale** in Bengaluru …" | 63    |
  | `/buy/under-construction` | 82 — "Under-construction properties **for Sale** …"    | 73    |
  | `/buy/ready-to-move`      | 73 — "Ready-to-move homes **for Sale** …"              | 64    |
  | `/buy/resale`             | 70 — "Resale properties **for Sale** …"                | 61    |

  `/buy` itself keeps "for Sale", which is correct: its noun does not carry the
  listing type.

- **Seven CMS pages had a title too short to say anything.** §9.3 uses an
  explicit `seo.title` verbatim, so `"Disclaimer"` — ten characters — was the
  whole of what a result would show. Rewritten in `scripts/seed/data/pages.js`
  and rebuilt with `npm run seed:build`; the page `title` (the `<h1>`) is
  untouched, and `npm run validate:seed` passes.

  | Page              | Before | After                                               | Chars |
  | ----------------- | ------ | --------------------------------------------------- | ----- |
  | `/about`          | 21     | About Squares N Acres – Bengaluru Property Advisory | 51    |
  | `/contact`        | 23     | Contact Squares N Acres – Bengaluru Property Team   | 49    |
  | `/careers`        | 26     | Careers at Squares N Acres – Jobs in Bengaluru      | 46    |
  | `/partnership`    | 28     | Partner With Squares N Acres – Channel Partners     | 47    |
  | `/privacy-policy` | 14     | Privacy Policy – How We Use Your Data               | 37    |
  | `/terms-of-use`   | 12     | Terms of Use – Squares N Acres Website Terms        | 44    |
  | `/disclaimer`     | 10     | Disclaimer – Listings and Guidance on This Site     | 47    |

### 5.3 `NEW-43` reopened and closed properly — the hero placeholder

Lighthouse scored the locality page **97** on Accessibility with five
`color-contrast` failures, all on `rgb(114, 114, 115)` — the exact colour
NEW-43 named in prompt 42. The fix recorded there set
`background-color: var(--color-charcoal)` on `.heroImage`, but that class lands
on the _same element_ as `LazyImage`'s `.wrapper`, which sets
`background: var(--color-surface-2)`. Two single-class selectors on one
element: whichever CSS-module chunk loads second wins, and in the production
build that was `.wrapper`. The charcoal never painted, and `.fallback` — the
state where the image has actually failed — was never covered at all.

`LazyImage` now reads its placeholder tone from
`var(--lazy-image-placeholder, var(--color-surface-2))` on both `.wrapper` and
`.fallback`, and the locality and developer heroes set that property instead of
fighting over `background-color`. A custom property resolves at use time, so
there is no specificity race left to lose. **Locality Accessibility: 97 → 100.**

### 5.4 Favicon links were absolute against the production domain

`useSeoResolved.js` built the three local favicon hrefs with
`absolute(siteUrl, …)`, so every host that is not production — a staging
deploy, a preview, `serve:build` on port 5000 — fetched its icons from
`https://www.squaresnacres.com`. A canonical and an `og:image` must be
absolute because they are read off-site; a favicon is fetched by the browser
that already has the page. They are root-relative now, which is what
`public/index.html` already emitted. The Cloudinary 192 px fallback stays
absolute, correctly.

### 5.5 The "Status" filter had no focus ring

`MultiSelect` (the MUI `Autocomplete` behind every admin multi-select) showed
focus only as MUI's own red fieldset, while the native `<select>`s beside it
used the design system's 2 px `--color-focus` ring. Found by the keyboard pass
of the grid, confirmed by hand, fixed in `src/components/admin/MultiSelect.jsx`
— see §8.2. The ring is written as `sx` rather than in the CSS module because
a `:global(.MuiOutlinedInput-root)` rule there reorders the admin CSS chunk and
`build:ci` refuses the build (`mini-css-extract` "Conflicting order"); that was
tried first and reverted.

### 5.6 `NEW-48` — the a11y audit's horizontal-scroll false positive

`scripts/lib/inPageAudit.js` read `document.documentElement.scrollWidth`, which
in Chromium counts a wide element inside its **own** `overflow-x: auto`
scroller. `/admin/properties` therefore reported 721 px of overflow in a
1280 px viewport while the page did not move a pixel. The rule now tries the
scroll — remember `scrollX`, ask the window to move, read it back, restore —
and reports the distance it actually moved.

**The first version of that fix was wrong, and the self-review caught it.** It
used a positional `window.scrollTo(clientWidth, y)`, and `global.css` sets
`scroll-behavior: smooth` on the document: a smooth scroll is asynchronous, so
the position read on the next line is still the starting one. Measured in
Chromium 141 on a 390 px viewport over a 3000 px document, the positional call
answers **0** and `scrollTo({ left, behavior: 'instant' })` answers **390** —
the rule had been silently dead on every page, which is a worse failure than
the false positive it replaced, because nothing looks wrong. It now passes
`behavior: 'instant'`, `scripts/__tests__/inPageAudit.test.js` asserts the
built source does so (the behaviour itself needs a browser, and the browser is
optional per D16), and the grid in §8 was re-run with the rule alive.

---

## 6. robots.txt, RSS and llms.txt

All served by the API and mirrored at the root (D21).

### 6.1 `GET /api/robots.txt`

`200`, `text/plain; charset=utf-8`, `Cache-Control: public, max-age=3600`.

| Check                                    | Result                                             |
| ---------------------------------------- | -------------------------------------------------- |
| `User-agent` blocks                      | **20** — `*` plus the 19 named in §9.8             |
| `Disallow` lines                         | 4 — `/admin`, `/shortlist`, `/*?preview=`, `/*?q=` |
| `Sitemap:` lines                         | 6 — the index plus all five children               |
| `%siteurl%` placeholders left unresolved | **0**                                              |

### 6.2 `GET /api/rss.xml`

| Check                    | Result                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| XML declaration, RSS 2.0 | both present                                                                             |
| `<item>` count           | **10** — every live article; `RSS_LIMIT` is 20, so the cap is not the binding constraint |
| `pubDate`                | 10/10 parse, 10/10 match RFC 822, newest first                                           |
| `link`                   | 10/10 present and absolute                                                               |
| `guid`                   | 10/10 present, unique, `isPermaLink="true"`, absolute                                    |
| `title` / `description`  | 10/10 each                                                                               |
| `atom:link rel="self"`   | present                                                                                  |
| Unescaped `&`            | **0**                                                                                    |

Ten rather than twenty is correct, not short: the seed holds 12 articles, one
`draft` and one `scheduled` for 2026-10-31. Both are properly excluded — the
edge case §7 of the prompt asks for.

### 6.3 `GET /api/llms.txt`

5 778 bytes. `# Squares N Acres`, a one-paragraph summary, then all five
sections of §9.8 — **Localities** (20 links), **Property types** (17),
**Featured properties** (10), **Guides** (10), **Contact** (1). **58 links,
58 absolute, 0 relative.**

### 6.4 `seoSettings` edits still drive all four documents

Re-verified after the settings work of prompt 45, by writing through
`PUT /api/admin/seo/settings` and reading the documents back. The runtime db
was reset afterwards.

| Edit                               | Effect                                                                            |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| `siteUrl`                          | re-resolved in robots.txt, llms.txt links, RSS `<link>` and every sitemap `<loc>` |
| `robotsTxt` (custom body)          | served verbatim, with `%siteurl%` still resolved                                  |
| `llmsTxt` (stored document)        | served instead of the generated one                                               |
| `sitemap.includeDevelopers: false` | `sitemap-developers.xml` drops to 0 `<loc>`                                       |

---

## 7. Prerender dry run

`REACT_APP_API_URL=http://localhost:4000/api npm run build:prerender` with
`CHROME_PATH` set and the mock running.

| Measure                        | Result                                           |
| ------------------------------ | ------------------------------------------------ |
| Pages prerendered              | **144 of 144**                                   |
| Failures                       | **0** — "Every page was saved."                  |
| Wall clock                     | 2 min 30 s for `build` + crawl (1 min 51 s user) |
| Concurrency                    | 3 browsers, one page each (the script's default) |
| `build/index.spa.html`         | written — the SPA fallback of §5.4               |
| `index.html` files in `build/` | 144                                              |

### 7.1 Spot-check of three saved files

Read straight off disk, not from a running app:

| File                                                                     | Size   | `<title>`                                | Description | Canonical | JSON-LD `@graph` types                                                                                     | `<h1>` |
| ------------------------------------------------------------------------ | ------ | ---------------------------------------- | ----------- | --------- | ---------------------------------------------------------------------------------------------------------- | ------ |
| `build/index.html`                                                       | 142 kB | Buy, Sell and Rent Property in Bengaluru | 144 chars   | ✓         | `RealEstateAgent`, `WebSite`, `WebPage`                                                                    | 1      |
| `build/properties/lakeview-heights-3-bhk-whitefield/index.html`          | 106 kB | 3 BHK Apartment in Whitefield            | 160 chars   | ✓         | `RealEstateAgent`, `WebSite`, `RealEstateListing`, `Apartment`, `FAQPage`, `VideoObject`, `BreadcrumbList` | 1      |
| `build/insights/articles/karnataka-rera-guide-for-homebuyers/index.html` | 51 kB  | Karnataka RERA: A Guide for Homebuyers   | 149 chars   | ✓         | `RealEstateAgent`, `WebSite`, `BlogPosting`, `FAQPage`, `BreadcrumbList`                                   | 1      |

Each file carries the fully resolved head — title, description, canonical and
one `application/ld+json` block that parses — plus 14 000–18 000 characters of
real body text where the SPA shell has an empty `<div id="root">`. That is the
whole point of the exercise: a social-card scraper, an LLM crawler or a link
preview gets the page rather than the shell.

**The §7 edge case holds.** A lead modal is closed by default, and the
snapshots prove nothing of it is saved: `role="dialog"` appears **0** times and
`aria-modal` **0** times in all three files.

### 7.2 Serving the prerendered build

`npm run serve:build` over the prerendered `build/`, driven in Chromium:

| Check                                                   | Result                                                     |
| ------------------------------------------------------- | ---------------------------------------------------------- |
| Prerendered home page loads with its resolved title     | ✓ "Buy, Sell and Rent Property in Bengaluru"               |
| Client-side navigation (`/` → `/localities/whitefield`) | ✓ title becomes "Property in Whitefield, Bengaluru"        |
| It is a route change, not a document reload             | ✓ a value set on `window` before the click survives it     |
| One `<h1>` after the client-side navigation             | ✓                                                          |
| Browser Back returns to the home page                   | ✓                                                          |
| Console errors that are **not** a blocked CDN           | **0** (48 entries, every one `ERR_CERT_AUTHORITY_INVALID`) |

`createRoot` is untouched, so React re-renders into `#root` rather than
hydrating (§9.9, D16) — there is no hydration contract to break, and the
navigation test above is what confirms it.

**Nginx fallback.** `build/index.html` is now the rendered home page and can no
longer be the catch-all, which is why the script also writes
`build/index.spa.html`. The `try_files $uri $uri/index.html /index.spa.html`
block, the immutable `/static/` caching and the `must-revalidate` on
`index.html` are in `docs/PERFORMANCE.md` §5.4; prompt 47 carries them into the
backend guidelines.

---

## 8. The cross-device grid

The nine routes of §4.7 at the seven test widths of §8.1 — **63 audits** —
driven by `scripts/a11y-audit.js` against the production build. Every cell is
`scripts/lib/inPageAudit.js` running inside the page: `alt` on every image, a
label on every control, an accessible name on every button and link, no
duplicate id, exactly one `<h1>`, a `<main>`, a `lang`, tap targets, mobile
text size, composited contrast, and horizontal scroll.

```
node scripts/a11y-audit.js --baseUrl=http://localhost:5000 \
  --widths=360,390,414,768,1024,1280,1536 \
  --paths='/,/buy,/properties/lakeview-heights-3-bhk-whitefield,/localities/whitefield,/insights/articles,/insights/articles/karnataka-rera-guide-for-homebuyers,/admin/dashboard,/admin/properties/add' \
  --admin=true --outName=46-cross-device-widths
```

| Route                                                    | 360 | 390 | 414 | 768 | 1024 | 1280 | 1536 |
| -------------------------------------------------------- | --- | --- | --- | --- | ---- | ---- | ---- |
| `/` (home)                                               | ✓   | ✓   | ✓   | ✓   | ✓    | ✓    | ✓    |
| `/buy` (listing)                                         | ✓   | ✓   | ✓   | ✓   | ✓    | ✓    | ✓    |
| `/properties/lakeview-heights-3-bhk-whitefield`          | ✓   | ✓   | ✓   | ✓   | ✓    | ✓    | ✓    |
| `/localities/whitefield`                                 | ✓   | ✓   | ✓   | ✓   | ✓    | ✓    | ✓    |
| `/insights/articles`                                     | ✓   | ✓   | ✓   | ✓   | ✓    | ✓    | ✓    |
| `/insights/articles/karnataka-rera-guide-for-homebuyers` | ✓   | ✓   | ✓   | ✓   | ✓    | ✓    | ✓    |
| `/admin/login`                                           | ✓   | ✓   | ✓   | ✓   | ✓    | ✓    | ✓    |
| `/admin/dashboard`                                       | ✓   | ✓   | ✓   | ✓   | ✓    | ✓    | ✓    |
| `/admin/properties/add` (the property form)              | ✓   | ✓   | ✓   | ✓   | ✓    | ✓    | ✓    |

`✓` = no error-level finding. **63 of 63 clean; no horizontal scroll at any
width on any route** — and that last clause is load-bearing, so it was earned
twice: the grid was re-run after §5.6 revealed the horizontal-scroll rule had
been silently answering 0 for every page. The figures here come from the run
with the rule alive.

### 8.1 Two tooling defects this grid exposed

Neither is in the product, and both would have made the grid impossible to
trust, so they were fixed rather than worked around.

- **The admin screens had never been audited past the first width.** Each
  width opens a new page in the _same_ browser, so the session from the first
  width is still in storage at the second, and `/admin/login` correctly sends
  an authenticated visitor to the dashboard. `signIn()` waited for a login
  form that was not there and threw — uncaught — which in prompt 46's
  seven-width run aborted the whole audit before a single admin screen was
  read. It now recognises an existing session and returns it. The three admin
  screens above are audited at all seven widths because of that fix.
- **`--paths`.** The grid §4.7 asks for is nine named routes; the script could
  only express "everything" or "a sample of everything", and `--limit`
  truncates the admin list as well as the sitemap. `--paths` audits exactly the
  routes it is given.

### 8.2 The one error, found and fixed

| Route               | Width | Finding                                                    |
| ------------------- | ----- | ---------------------------------------------------------- |
| `/admin/properties` | 1280  | Tab stop 25 (the "Status" filter) showed **no focus ring** |

Real, and confirmed by hand: the Tab stops either side of it are native
`<select>`s that light up the 2 px `--color-focus` ring, while the Status
filter is a MUI `Autocomplete` whose `<input>` MUI gives `outline: none`,
showing focus instead by thickening its own fieldset to 2 px of
`--color-primary`. Visible, but a different marker in a different colour
halfway along one row of controls. `MultiSelect` now carries the project's
ring. **Re-measured: 63 audits, 0 errors.**

### 8.3 The 446 warnings

Warnings do not fail the audit. All five classes are known and none is new:

| Rule                                    | Count | What it is                                                                                                                                                                                |
| --------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Text under the mobile minimum           | 327   | `recharts` axis ticks render at 11 px inside the dashboard's SVGs. Accepted in prompt 42 — every figure is repeated in the table beside the chart.                                        |
| Text contrast below the minimum         | 63    | The breadcrumb `/` separator at 1.47:1. It is `aria-hidden="true"` decoration, which axe's own contrast rule skips; ours does not, so this is a **false-positive class**, recorded below. |
| Accessible names that omit visible text | 27    | The property gallery stage — **NEW-51**, §9.1.                                                                                                                                            |
| Missing landmark                        | 22    | Admin screens have no `<header role="banner">`. Accepted in prompt 42: the admin shell is a sidebar, not a site header.                                                                   |
| Tap targets under 44 px                 | 7     | `StatusRail`'s save-group buttons at 42 × 46 px on the property form — 2 px short on one axis, admin-only.                                                                                |

### 8.4 Cross-browser: what could and could not be run

| Browser        | Available here | Result                                                    |
| -------------- | -------------- | --------------------------------------------------------- |
| Chromium 141   | yes            | the grid above, all 63 audits clean                       |
| Microsoft Edge | **no**         | not installed and not installable in this Linux container |
| Firefox        | **no**         | not installed                                             |

Edge is Chromium-based and shares the engine that produced the grid, so the
layout risk it carries is small; Firefox is a genuinely different engine and
its pass is **outstanding**. Both are named in §9 as owed rather than
implied. `docs/QA/46-lighthouse-howto.md` §2 sets up the same build on a
Windows machine, where both browsers are a click away — the routes and widths
are the table in §8 above.

---

## 9. Findings left open

| Id         | Finding                                                                                                                                                                                                                                                                                                                                                                         | Owner                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **QA-02**  | Performance, LCP and TBT are unmeasured — see §3.2 and the runbook                                                                                                                                                                                                                                                                                                              | 48 / a machine with network |
| **QA-07**  | The width grid was run in Chromium only; **Firefox is outstanding**, Edge nominally so (§8.4)                                                                                                                                                                                                                                                                                   | 48 / a Windows machine      |
| **NEW-51** | The property gallery stage fails `label-content-name-mismatch` — see below                                                                                                                                                                                                                                                                                                      | 48                          |
| **NEW-52** | The audit's contrast rule measures `aria-hidden` decoration — 63 of the grid's 446 warnings are the breadcrumb `/` separator, which axe's own rule skips. Either skip `aria-hidden` subtrees as axe does, or teach the rule that an inactive separator is incidental text. Left alone here because loosening a contrast rule is a deliberate decision, not a tail-end QA tweak. | 48                          |
| NEW-42     | The home page's 25 `perPage=1` count requests — specification below                                                                                                                                                                                                                                                                                                             | 47 (document), backend      |
| NEW-47     | Contrast over a photograph cannot be computed from CSS                                                                                                                                                                                                                                                                                                                          | 48                          |

### 9.1 NEW-51 — the gallery stage's name does not contain its visible text

Lighthouse, property details, `label-content-name-mismatch` (1 node):

```
<div class="PropertyGallery_stage" role="button" tabindex="0"
     aria-label="1 / 8 — Lakeview Heights – 3 BHK Apartment in Whitefield photograph. Press Enter…">
```

Prompt 42 fixed NEW-45 by making the name _begin_ with the visible counter,
which is right. What it could not anticipate is that the stage also contains a
nested `<button>` reading **"View all 8 photos"**, and axe collects the visible
text of the whole subtree — so the name is still not a superset of it.

The real defect underneath is the nesting: a `role="button"` region that
contains three real `<button>`s (previous, next, view-all) is invalid widget
semantics whatever the labels say. The fix is to lift the counter and the three
controls out of the clickable region and position them over it against a new
wrapper, which leaves the stage with no visible text at all and makes the rule
inapplicable rather than merely satisfied.

It is recorded rather than fixed here deliberately: **Accessibility is 100 on
that page and every target passes**, and restructuring a gallery that prompt 44
bug-bashed — with swipe handlers, a lightbox and absolute positioning — at the
end of a QA pass, with no way to verify the result visually, would risk more
than it buys.

### 9.2 NEW-42 — specifying the aggregate count endpoint

Prompt 46 owns the specification; prompt 47 documents it for the Laravel
developer. `useCategoryCounts` (prompt 27) issues **25**
`GET /properties?…&perPage=1` requests on the home page purely to read
`meta.total` for six segment tiles and seventeen property-type tiles.

Proposed, consistent with §5 of the master context:

```
GET /properties/counts?by=segment,propertyTypeId[&listingType=sale]
→ 200 { "data": { "segment": { "residential": 26, "commercial": 5, "land": 5 },
                  "propertyTypeId": { "1": 8, "2": 4, … } },
        "meta": null }
```

Public, cacheable, no auth; the same `isActive` scoping every public read
applies; one round trip and one state update in place of 25. `useCategoryCounts`
becomes a single call with the existing per-tile behaviour as the fallback when
the endpoint 404s, so the frontend works against a backend that has not shipped
it yet.

---

## 10. Acceptance checklist

- [x] `docs/QA/46-cross-device-lighthouse-seo.md` records the Lighthouse table,
      the script results, the Rich Results/Schema validator table, the
      robots/rss/llms checks, the prerender dry run and the cross-browser grid
- [x] `npm run check:jsonld` — 0 errors
- [x] `npm run check:links` — 0 broken
- [x] `npm run check:sitemap` — 0 missing, 0 extra
- [x] `docs/PERFORMANCE.md` final table replaced
- [x] Every public page: one `<h1>`, unique title/description, canonical,
      breadcrumbs (except home), valid JSON-LD, `alt` on every image
- [x] Sitemaps, robots, RSS and llms.txt verified against the rendered routes
- [x] `npm run lint`, `test:ci`, `build:ci`, `check:traces`, `validate:seed`,
      `test:mock`, `smoke` all pass
- [x] Prerender dry run: 144/144 pages, 0 failures, three files spot-checked,
      client-side navigation verified on the prerendered build
- [x] Cross-device grid: 9 routes × 7 widths = 63 audits, **0 errors**
- [ ] **Lighthouse Performance ≥ 85, LCP < 2.5 s, TBT < 200 ms** — requires
      Chrome on a network that can reach Cloudinary, Google Fonts and Iconify;
      run [`46-lighthouse-howto.md`](./46-lighthouse-howto.md)
- [ ] **Firefox** (and nominally Edge) pass of the §8 grid — neither browser
      exists in this container (§8.4)
- [ ] Rich Results Test / `validator.schema.org` — the human step of §4
