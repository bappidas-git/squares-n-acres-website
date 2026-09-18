# Prompt 46 — how to run the Lighthouse pass

The runbook for the six mobile audits of `00_MASTER_CONTEXT.md` §8.6. It exists
because the container prompts 41 and 46 ran in **cannot produce a valid
Performance score** — it cannot reach Cloudinary, Google Fonts or the Iconify
API, so the LCP image never arrives (the reason is in
[`46-cross-device-lighthouse-seo.md`](./46-cross-device-lighthouse-seo.md) §3.2
and `docs/PERFORMANCE.md` §4.3). Accessibility, Best Practices, SEO and CLS
were measured there and are recorded. **Performance, LCP and TBT have to be
measured on a machine with ordinary network access**, and this file is how.

Follow it top to bottom; it takes about fifteen minutes.

---

## 1. What you need

| Thing              | Why                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Chrome or Chromium | Lighthouse drives a real browser; any recent version is fine                                                              |
| Node 18+           | `node -v` — the mock server and the build need it                                                                         |
| Ordinary network   | `res.cloudinary.com`, `fonts.googleapis.com`, `picsum.photos`, `api.iconify.design` must all load in a normal browser tab |

No dependency is installed into the repository for this. `npx lighthouse` is
run ad hoc and `package.json` is not touched (prompt 41 §12, prompt 46 §12).

Check the network first, because everything below is wasted if it is blocked:

```
curl -sI https://res.cloudinary.com/dn9gyaiik/image/upload/v1789465791/sna-icon_efty7z.png | head -1
curl -sI https://fonts.googleapis.com/css2?family=Inter:wght@400 | head -1
curl -sI https://picsum.photos/seed/sna-hero-background/1920/1080 | head -1
```

Three `HTTP/2 200` (or `302`) lines mean you are good. Anything else — a
proxy error, a certificate warning — and the Performance number you get will
be the container's number again, not the application's.

---

## 2. Start the three processes

Three terminals, in this order. **The `REACT_APP_API_URL` on the build line is
not optional**: `src/services/http.js` throws at module load without it (D48),
and `.env.development` is not read by a production build.

```
# terminal 1 — the API
npm install
npm run mock                                   # http://localhost:4000/api

# terminal 2 — the build (do this once, then leave the terminal)
REACT_APP_API_URL=http://localhost:4000/api npm run build:ci

# terminal 3 — serve the build
npm run serve:build                            # http://localhost:5000
```

Confirm before measuring anything:

```
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5000/          # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4000/api/properties?perPage=1   # 200
```

Then open `http://localhost:5000/` in the browser and look at it. The hero
photograph, the wordmark and the icons must all be visible. If any of them is
missing, stop — fix the network, not the application.

---

## 3. The six pages

The set is fixed by §8.6. The slugs are the seed's; if you reseeded, take any
record of the same kind.

| #   | Page             | URL                                                                           |
| --- | ---------------- | ----------------------------------------------------------------------------- |
| 1   | Home             | `http://localhost:5000/`                                                      |
| 2   | Listing          | `http://localhost:5000/buy`                                                   |
| 3   | Property details | `http://localhost:5000/properties/lakeview-heights-3-bhk-whitefield`          |
| 4   | Locality         | `http://localhost:5000/localities/whitefield`                                 |
| 5   | Article index    | `http://localhost:5000/insights/articles`                                     |
| 6   | Article          | `http://localhost:5000/insights/articles/karnataka-rera-guide-for-homebuyers` |

---

## 4. Running it

### 4.1 The CLI (what to use for the record)

One command per page. `--preset=perf` is **not** what you want for the full
table — it drops the other three categories — so the categories are named
explicitly:

```
mkdir -p docs/QA/lh

npx --yes lighthouse@latest http://localhost:5000/ \
  --form-factor=mobile --screenEmulation.mobile \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=json --output=html \
  --output-path=docs/QA/lh/home \
  --chrome-flags="--headless=new --no-sandbox"
```

Repeat with the other five, changing the URL and the `--output-path` basename
(`listing`, `property`, `locality`, `article-index`, `article`). Lighthouse
appends `.report.json` / `.report.html` itself.

Defaults worth knowing, because they are the ones §8.6 assumes: mobile form
factor, simulated throttling (1.6 Mbps down, 150 ms RTT, 4× CPU slowdown), and
a fresh profile per run, so storage is clear without asking.

`docs/QA/lh/` is git-ignored — the reports are evidence for the run, not
repository content. Copy the numbers into the tables and leave the files.

### 4.2 The DevTools panel (the human path)

Chrome → the page → F12 → **Lighthouse**. Mode "Navigation", device
**Mobile**, all four categories, **"Clear storage" ticked**, then _Analyse page
load_. Same numbers, nicer trace to read when something fails.

---

## 5. Reading the result

```
node -e "const r=require('./docs/QA/lh/home.report.json');
  const s=c=>Math.round(r.categories[c].score*100);
  const a=i=>r.audits[i].numericValue;
  console.log('perf',s('performance'),'a11y',s('accessibility'),
    'bp',s('best-practices'),'seo',s('seo'),
    '| LCP',(a('largest-contentful-paint')/1000).toFixed(2)+'s',
    'CLS',r.audits['cumulative-layout-shift'].numericValue.toFixed(3),
    'TBT',Math.round(a('total-blocking-time'))+'ms');"
```

The targets, all six pages:

| Metric         | Target   |
| -------------- | -------- |
| Performance    | ≥ 85     |
| Accessibility  | ≥ 95     |
| Best Practices | ≥ 95     |
| SEO            | ≥ 95     |
| LCP            | < 2.5 s  |
| CLS            | < 0.1    |
| TBT            | < 200 ms |

**Run each page twice and keep the second run.** The first pays for a cold
`serve` cache and a cold mock, and it is the run that makes people think a
number is worse than it is.

---

## 6. If a target fails

In the order that pays off, with what prompt 41 already knows about this
bundle (`docs/PERFORMANCE.md` §4.4):

| Failure                               | Look at first                                                                                                                                                                                                                                                           |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LCP > 2.5 s**                       | The hero preload of `PERFORMANCE.md` §2.3. In the network trace the LCP image should be a high-priority request beside the stylesheet, _before_ the route chunk — not after it. If it is after, the preload is not matching the `srcSet` candidate the browser picked.  |
| **TBT > 200 ms**                      | `main.js` evaluation. Prompt 41 measured 1 504 ms at 4× with two long tasks inside `main.js` (427 ms, 256 ms). The lever is splitting more out of the entry chunk — the admin panel is already out, the public UI kit is not. `npm run analyze` shows what is in there. |
| **CLS ≥ 0.1**                         | Something rendered outside an aspect-ratio box. Every image goes through `LazyImage`; a raw `<img>` added later is the usual cause. CLS measured **0 on all six pages**, so any movement here is a regression, not a tuning problem.                                    |
| **Performance < 85 but LCP/TBT pass** | Usually `unused-javascript`. 107 kB of the entry chunk is unused on the home page — the route-split shape, not a defect, but it is the only opportunity with a saving attached.                                                                                         |
| **SEO < 95**                          | Almost certainly `robots.txt is not valid`. See §7.                                                                                                                                                                                                                     |
| **Best Practices < 95**               | `errors-in-console`. Open the console: in the container every blocked CDN request lands there. On a real network it should be empty.                                                                                                                                    |
| **Accessibility < 95**                | Re-run `npm run a11y:audit`, which is stricter than Lighthouse and names the element.                                                                                                                                                                                   |

After any fix: rebuild, restart `serve:build`, and re-measure **the page that
failed and the home page** (the home page is the one that regresses when the
entry chunk is touched).

---

## 7. The two things that are environment, not application

**`robots.txt`.** Lighthouse fetches `/robots.txt` from the origin it is
measuring. The real document is served by the API
(`GET /api/robots.txt`, and mirrored at `/robots.txt` on the API origin, D21) —
the static build on port 5000 is a different origin, so `public/robots.txt`
carries a permissive placeholder to keep the audit valid. In production the
web server proxies `/robots.txt`, `/sitemap*.xml`, `/rss.xml` and `/llms.txt`
to the API — `docs/PERFORMANCE.md` §5.4 has the Nginx block that prompt 47
carries into the backend guidelines. A local Lighthouse run is measuring the
placeholder, and that is expected.

**Canonical URLs point at `https://www.squaresnacres.com`.** They come from
`seoSettings.siteUrl`, not from the host you are serving on, which is correct:
a canonical has to name the production URL. Lighthouse does not fail a page
for it.

---

## 8. Recording the run

Put the numbers in two places, both of which have a table waiting:

- `docs/QA/46-cross-device-lighthouse-seo.md` §3 — the run of record, with the
  date, the machine and the Chrome version.
- `docs/PERFORMANCE.md` §4 — replaces the "not validly measured" table.

State the hardware and the Chrome version next to the numbers. A Lighthouse
score without them is not a measurement, and the next person to run this will
want to know whether they are comparing like with like.
