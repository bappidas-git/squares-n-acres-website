# PERFORMANCE — the budget, how it is measured, and what it measures at

> The performance half of `00_MASTER_CONTEXT.md` §8.6 and the optional
> prerender of §9.9, as prompt 41 implemented them. Prompt 46 re-measures
> everything here on real hardware; this document is what it re-measures
> against.

---

## 1. The budget

| Thing                                | Budget                         | Enforced by                                    |
| ------------------------------------ | ------------------------------ | ---------------------------------------------- |
| Public entry chunk (`main.*.js`)     | ≤ 300 kB gzip                  | `npm run analyze` — fails the check            |
| Admin code in the public entry chunk | none                           | `npm run analyze` — fails the check            |
| Largest Contentful Paint             | < 2.5 s                        | Lighthouse mobile, §4                          |
| Cumulative Layout Shift              | < 0.1                          | Lighthouse mobile, §4                          |
| Total Blocking Time                  | < 200 ms                       | Lighthouse mobile, §4                          |
| Lighthouse mobile — Performance      | ≥ 85                           | §4, on the six pages of §8.6                   |
| Lighthouse mobile — SEO              | ≥ 95                           | §4                                             |
| Lighthouse mobile — Accessibility    | ≥ 95                           | §4                                             |
| Lighthouse mobile — Best Practices   | ≥ 95                           | §4                                             |
| Items per request                    | ≤ 24                           | `perPage` caps (D23, §5.6)                     |
| Cloudinary images                    | `f_auto,q_auto,w_…` + `srcSet` | `utils/cloudinary.js`, `LazyImage` (prompt 39) |

`kB` is 1000 bytes throughout, the unit `react-scripts build` prints. The
budget check uses 300 000 bytes rather than 307 200 deliberately, so a report
that passes passes under either reading of "300 KB".

---

## 2. What makes the budget

### 2.1 Code splitting

Every route is `React.lazy` (`src/routes/`), and so is everything heavy inside
a route:

| Chunk                                                 | Split at                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------- |
| every `pages/admin/**` screen                         | `routes/adminRouteConfig.js` (route level)                  |
| `components/editor/RichTextEditor` (Tiptap)           | `components/editor/RichTextField.jsx`                       |
| `components/seo/SeoPanel`                             | `components/seo/SeoPanel/index.jsx`                         |
| `pages/admin/dashboard/charts/*` (recharts)           | `pages/admin/dashboard/DashboardPage.jsx`                   |
| `PropertyLightbox` (`yet-another-react-lightbox`, D7) | the six sections that open it                               |
| `MediaPickerDialog`                                   | `components/admin/ImageField.jsx`, `RichTextField`, gallery |
| `MapPinPicker` (Google Maps loader)                   | `property-form/tabs/LocationTab.jsx`                        |
| `LeadCaptureModal`                                    | `contexts/LeadCaptureContext.js`                            |
| `domAnimation` (framer-motion features)               | `utils/motionFeatures.js`                                   |
| the three CMS blocks + the video facade               | `components/editor/SafeHtml.jsx`                            |
| `web-vitals`                                          | `utils/vitals.js`                                           |

Two of those are worth spelling out.

**`LeadCaptureModal`** is reachable from every page and opened on none of them
until somebody asks. It is `React.lazy`, and every trigger spreads
`leadTriggerProps` from `LeadCaptureContext` — `onMouseEnter`, `onFocus` and
`onPointerDown` — so the chunk is fetched while the pointer is still moving and
the dialog opens with no pause. Hover and focus cover a mouse and a keyboard;
`pointerdown` covers a finger, which never hovers.

**`domAnimation`** is the decision recorded in `docs/DECISIONS.md`: every
animated element is an `m.*` component rather than `motion.*`, and the one
`LazyMotion` in `routes/index.js` supplies the DOM-animation feature bundle
through a dynamic `import()`. `motion.div` carries every feature the library
has — layout projection, drag, pan, scroll linking, SVG morphing — because it
cannot know which the element will use. Measured: **305.99 kB → 280.35 kB gzip
in the public entry chunk** at the moment of the change, the single largest saving of
prompt 41 (the chunk is 281.92 kB once the rest of the prompt's code is in it). The
`LazyMotion` is `strict`, so a future `motion.div` fails at the point somebody
writes it.

### 2.2 Rendering

- `React.memo` on `PropertyCard`, `ArticleCard`, `LocalityCard`,
  `DeveloperCard`, and on the admin table's `DataRow` and `MobileCard`.
- Below-the-fold home bands fetch when they are near the viewport
  (`useDeferredSection`, `rootMargin: '200px'`): the four `PropertyRow`s, the
  insights strip, the FAQ band, the partner logos and the testimonials. Six
  requests that used to race the hero image now arrive as the visitor scrolls
  towards them.
- `content-visibility: auto` on carousel slides, with a `contain-intrinsic-size`
  fallback smaller than any card so the rail's height is set by the cards on
  screen and a skipped one can never make it jump.
- `SiteSettingsContext`'s three getters are `useCallback`s with no dependencies
  reading the record through a ref, so their identity is stable for the life of
  the provider. Every context value in `src/contexts/` is a `useMemo`.

### 2.3 Images

- `priority` — `loading="eager"` + `fetchpriority="high"` — on exactly one
  image per page: the home hero, the property gallery's first slide, an
  article's featured image, a locality hero, a builder hero (prompt 39).
- `<Seo preloadImage={{ src, ratio, sizes }}>` names that image in the head as
  `<link rel="preload" as="image">`. The candidates come from
  `responsiveImage()` — the same helper `LazyImage` uses — so the file the
  preload fetches is the file the element then asks for. Wired on the home,
  property, article, locality and builder pages.
- `sizes` on every grid card, every hero and every logo; explicit `width` and
  `height` on the wordmark.
- `LazyImage` draws inside a fixed-ratio box, so a picture that has not
  arrived yet still occupies its space (CLS 0).
- Videos: `preload="none"` plus the listing's cover as the poster.
- YouTube embeds are click-to-load facades (`components/ui/VideoEmbed.jsx`):
  YouTube's own still plus a play button, and the real iframe only after the
  click. It replaces the embed in the property gallery, the virtual-tour tab
  and anywhere in `.prose` (`SafeHtml` lifts a `data-youtube-video` wrapper or
  a bare YouTube iframe out of the markup and renders the facade instead). An
  embedded player is roughly a megabyte across a dozen requests; the facade is
  one image.

### 2.4 The head and third-party scripts

- Google Fonts stays a `<link>` with `display=swap` (D49), behind `preconnect`
  to `fonts.googleapis.com` and `fonts.gstatic.com`.
- `preconnect` to `res.cloudinary.com`, which serves every picture on the site.
  `picsum.photos` is deliberately absent: it is the seed photography, not what
  production serves.
- GA4, GTM and the Meta pixel are injected **after `load`, in an idle slot**
  (`AnalyticsScripts` + `utils/idle.js`), and only when
  `siteSettings.integrations` configures an id. The page view is not deferred
  with them: `track()` pushes onto `window.dataLayer` immediately and a
  container reads what is already in the array when it loads.
- `reportWebVitals()` runs after `render`, in an idle slot, and imports
  `web-vitals` dynamically (`src/index.js`).

### 2.5 `web-vitals`

`src/utils/vitals.js` subscribes to the five metrics `web-vitals@2` reports —
`getCLS`, `getFID`, `getLCP`, `getFCP`, `getTTFB` — and sends each one through
`track()` as a `web_vitals` event carrying `{ name, value, id, rating }`. That
means `window.dataLayer` always, and GA4 as well when a measurement id is
configured. `rating` is `good` / `needs-improvement` / `poor` against Google's
own thresholds, so a report says what the number means.

`web-vitals@2` has no INP: `onINP` arrived in v3 and §3.3 pins v2, so FID is
what stands in for responsiveness. To read the events in a browser, open the
production build and type `window.dataLayer.filter((e) => e.event ===
'web_vitals')` in the console.

---

## 3. How to measure

```
npm run build                     # or: npm run build:prerender
npm run analyze                   # the budget check — no browser needed
npm run mock                      # terminal 2 — the pages need the API
npm run serve:build               # terminal 3 → http://localhost:5000
```

**`REACT_APP_API_URL` has to be set for the build.** `src/services/http.js`
throws at module load without it (D48), and `.env.development` is not read in
a production build. The committed files are examples, so a local measurement
run needs either a `.env` or an inline variable:

```
REACT_APP_API_URL=http://localhost:4000/api npm run build
```

Then, per §8.6, Lighthouse **mobile** on the six pages:

| Page             | URL                         |
| ---------------- | --------------------------- |
| Home             | `/`                         |
| Listing          | `/properties`               |
| Property details | `/properties/<slug>`        |
| Locality         | `/localities/<slug>`        |
| Article index    | `/insights/articles`        |
| Article          | `/insights/articles/<slug>` |

Two ways to run it, and **neither adds a dependency** — §12 of prompt 41
forbids putting `lighthouse` in `package.json`:

- **Chrome DevTools → Lighthouse panel**, device "Mobile", categories
  Performance / Accessibility / Best Practices / SEO. This is the human path
  and the one prompt 46 uses.
- **`npx lighthouse@latest`**, ad hoc:

  ```
  npx --yes lighthouse@latest http://localhost:5000/ \
    --only-categories=performance,accessibility,best-practices,seo \
    --output=html --output-path=./lighthouse-home.html \
    --chrome-flags="--headless=new"
  ```

  (`lighthouse-*.html` is not committed; `.gitignore` keeps the repository
  clean of measurement output.)

---

## 4. Results

_Measured by prompt 41. Prompt 46 re-measures on real hardware and replaces
this table._

### 4.1 What was measured

`npx lighthouse@latest 13.4.1`, mobile preset (Moto-G-class emulation, 1.6 Mbps
/ 150 ms RTT, `cpuSlowdownMultiplier: 4`), Chromium 141 headless, against
`serve -s build -l 5000` with the mock running. `benchmarkIndex: 1698`.

Both variants of the build were run so the prerender could be compared with the
single-page app it replaces: `npm run build` (SPA) and `npm run build:prerender`.

### 4.2 The two categories that were measurable

| Page             | Accessibility | Best Practices | SEO      | CLS       |
| ---------------- | ------------- | -------------- | -------- | --------- |
| Home             | 100           | 96             | 100      | 0         |
| Listing          | 100           | 96             | 100      | 0         |
| Property details | 97            | 96             | 100      | 0         |
| Locality         | 97            | 96             | 100      | 0         |
| Article index    | 96            | 96             | 100      | 0         |
| Article          | 100           | 96             | 100      | 0         |
| **Target**       | **≥ 95**      | **≥ 95**       | **≥ 95** | **< 0.1** |

All four pass on all six pages, in both variants (the figures above are the
SPA build; the prerendered build scored the same, ±0). **CLS is 0 on every one
of the twelve runs** — the fixed-ratio boxes of `LazyImage`, the reserved
carousel heights and the layout-identical skeletons do what they were built to
do.

The single Best-Practices deduction on every page is `errors-in-console`, and
every one of those errors is a blocked external request — see §4.4.

### 4.3 Performance: **not validly measured here**

| Page             | Performance | FCP   | LCP         | TBT          | Requests blocked |
| ---------------- | ----------- | ----- | ----------- | ------------ | ---------------- |
| Home             | 53          | 2.2 s | 7.1 s       | 830 ms       | 16 / 68          |
| Listing          | 60          | 2.2 s | 6.1 s       | 610 ms       | 18 / 45          |
| Property details | 55          | 2.2 s | 5.3 s       | 1 140 ms     | 31 / 62          |
| Locality         | 56          | 2.2 s | 6.1 s       | 760 ms       | 23 / 58          |
| Article index    | 60          | 2.1 s | 5.8 s       | 630 ms       | 20 / 53          |
| Article          | 49          | 2.9 s | 6.1 s       | 960 ms       | 23 / 60          |
| **Target**       | **≥ 85**    |       | **< 2.5 s** | **< 200 ms** |                  |

Prerendered, for comparison: Performance 47–57, FCP 3.0–3.4 s, LCP 5.9–7.5 s,
TBT 480–810 ms. Parsing 70–146 kB of saved markup costs about a second of FCP
against an empty shell; the TBT difference is inside the run-to-run noise of a
shared machine, so no claim is made about it.

**These numbers do not measure the application.** The container this was run in
routes outbound HTTPS through a proxy that re-terminates TLS, and Chromium
cannot be made to trust that proxy's CA — its trust store is NSS and the image
has no `certutil` to import a certificate with. So between **16 and 41 of every
page's requests fail**, and they are the same ones every time:

- the Google Fonts stylesheet,
- every Cloudinary image, including the wordmark,
- every `picsum.photos` seed photograph — **including the page's LCP image**,
- the Iconify icon API.

With no LCP image, LCP is whatever text paints last. On every page it came out
equal to Time to Interactive to the millisecond, which is the signature of that
substitution rather than of a slow image. Performance is 40 % LCP-weighted, so
the score follows it down. Verified, so that this is not a guess: every request
the mock answers completes inside **750 ms**, the last request of any kind ends
at **1.9 s**, and the failures fail fast (200–270 ms each) rather than timing
out. The 7 s is not the network.

`--ignore-certificate-errors` would have made the assets load and the numbers
meaningful. It was not used: this session's rules forbid disabling TLS
verification, and a measurement taken that way would be worth less than an
honest "not measured".

### 4.4 What the trace does say

Two things in the trace are the app's own and survive the caveat:

- **`main.js` evaluation is 1 504 ms of the main thread** at 4× throttling
  (≈ 375 ms unthrottled), with two long tasks over 200 ms — 427 ms and 256 ms —
  both inside `main.js`. The manual-QA target of §9 ("no long tasks > 200 ms")
  passes unthrottled and fails at 4×.
- **107 kB of the 275 kB entry chunk is unused on the home page.** That is the
  only opportunity Lighthouse reports with a saving attached (600 ms), and it is
  the shape of a route-split bundle: the chunk carries the UI kit, the router,
  MUI and the SEO resolver, and one page uses a subset.

### 4.5 Checklist for prompt 46

Re-measure on real hardware, on a network that can reach Cloudinary, Google
Fonts and the Iconify API, and then:

- [ ] Performance ≥ 85 on all six pages. If LCP is still over 2.5 s with the
      hero image loading, the preload of §2.3 is the first thing to check in
      the trace — it should appear as a high-priority image request beside the
      stylesheet, not after the route chunk.
- [ ] TBT < 200 ms. The lever is §4.4: split more out of the entry chunk. The
      admin panel is already out; what is left is the public site's own UI kit.
- [ ] The home page fires **25 `GET /properties?…&perPage=1` requests** for the
      category tiles' counts (`useCategoryCounts`, prompt 27). They complete in
      under 100 ms each against the mock and they are 25 round trips and 25
      state updates against a real API. Recorded as **NEW-42**.
- [ ] Confirm CLS stays 0 with the images actually loading.
- [ ] The four accessibility findings recorded as **NEW-43** to **NEW-45** are
      prompt 42's; re-run this table after that pass.

---

## 5. Prerender (optional)

### 5.1 What it is

`npm run build:prerender` = `npm run build` and then `node scripts/prerender.js`.
The script serves the build, opens every public URL in a real Chrome, waits for
the page to say it has its data, and writes the rendered HTML back over the
static file at that address (§9.9, D16).

`createRoot` is untouched. React re-renders into `#root` on load rather than
hydrating, so there is no hydration contract to break — and no
`ReactDOM.hydrateRoot` anywhere in `src/`.

### 5.2 Running it

```
npm run mock                      # terminal 1 — the crawl renders real records
set CHROME_PATH=…                 # Windows;  export CHROME_PATH=… elsewhere
npm run build:prerender
```

| Requirement      | Why                                                                                                                                                                                                                                                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CHROME_PATH`    | `puppeteer-core` downloads no browser (D16). Without it — and without a Chrome in one of the usual install locations, which `scripts/lib/chrome.js` also checks — the script exits 1 with `Set CHROME_PATH to run the prerender (optional step).` **`npm run build` never needs Chrome.**                                                |
| the mock running | Every page is rendered by a browser making real requests. `MOCK_URL` sets the API (default `http://localhost:4000/api`); its sitemaps are the list of URLs.                                                                                                                                                                              |
| port 5000        | §5.12 pins the mock's CORS allow-list to `localhost:3000`, `127.0.0.1:3000` and `localhost:5000`. Served anywhere else every page renders its error state, so the default is 5000 — the same port as `serve:build`, and a server already running there is reused. `--port=<other>` works only if that origin is added to the allow-list. |

Options: `--port`, `--mockUrl`, `--concurrency` (3), `--timeout` (10 000 ms for
the page's own data), `--headTimeout` (20 000 ms for the head to stop being
rewritten), `--limit`, `--keepServer`, `--verbose`.

### 5.3 What it writes

| URL                    | File                                    |
| ---------------------- | --------------------------------------- |
| `/`                    | `build/index.html` — **replaces** CRA's |
| `/properties`          | `build/properties/index.html`           |
| `/properties/<slug>`   | `build/properties/<slug>/index.html`    |
| …and so on             | `build/<path>/index.html`               |
| the original app shell | `build/index.spa.html`                  |

The URL list is the static routes (the home page, the six listing indexes and
their category pages, `/localities`, `/builders`, `/insights/articles`,
`/insights/faqs`) plus every record in the mock's sitemaps. `/shortlist` is not
prerendered: it is `noindex` and it is different for every visitor (§9.4).

Every page emits `data-prerender-ready` on `<main>` once its primary query has
settled — `usePrerenderReady(loading)` in each page component — **including
when it settled on an error state**, so a crawl never hangs on a URL the API
cannot answer. The injected analytics tags are stripped from the saved HTML:
the prerendered file carries the markup, never the measurement.

### 5.4 Serving it

`build/index.html` is now the rendered home page, so it can no longer be the
SPA fallback for a URL that was not prerendered. `build/index.spa.html` is that
fallback. In Nginx:

```nginx
location / {
    root /var/www/squaresnacres/build;
    # A prerendered file first, then the directory's index.html,
    # then the app shell for everything else.
    try_files $uri $uri/index.html /index.spa.html;
}

# Hashed assets are immutable.
location /static/ {
    root /var/www/squaresnacres/build;
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# A prerendered page is only as fresh as the last crawl.
location ~* /index\.html$ {
    root /var/www/squaresnacres/build;
    add_header Cache-Control "public, max-age=0, must-revalidate";
}
```

Prompt 47 carries these rules into the backend guidelines.

### 5.5 Two things the crawl taught us

Both are written down because they are invisible until the saved HTML is read
by a crawler, and both would come back the moment somebody "simplified" the
script.

**Nothing may be written into `build/` while the crawl is running.** `serve -s`
answers a path it has no file for with `build/index.html`. The moment the
rendered home page is written there, every URL not yet crawled is served _that_
page as its shell — and what gets saved for a property is the home page's head
with the property's body under it. So every page is captured into memory and
written after the crawl, and a second run over the same build restores the
shell from `index.spa.html` first.

**One browser per worker, one tab per browser.** A tab that is not the visible
one gets no `requestAnimationFrame` at all, and react-helmet-async commits the
head inside a `requestAnimationFrame`. Sharing one Chrome between three tabs
saved two pages in three with the static `index.html` head and no canonical —
not slowly, never — and which two changed on every run. No throttling flag
fixes it: a hidden tab has no frames to throttle.

---

## 6. Checks

| Command                   | What it answers                                                      |
| ------------------------- | -------------------------------------------------------------------- |
| `npm run analyze`         | Is the public entry chunk inside the budget, and free of admin code? |
| `npm run test:scripts`    | Do `scripts/lib/chrome.js` and `scripts/bundle-report.js` behave?    |
| `npm run build:prerender` | Does every public URL render and save? (needs Chrome and the mock)   |
| `npm run check:links`     | Does every link on every page go somewhere? (prompt 38)              |
| `npm run check:jsonld`    | Is the structured data on every page valid? (prompt 38)              |
