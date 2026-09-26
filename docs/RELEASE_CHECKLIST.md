# Release checklist — Squares N Acres website

The go-live list for the **frontend**: what to verify on the build machine, at
the DNS and hosting layer, and on the live host once the site is up. It is
reusable — run it for 1.0.0 and for every release after it.

Three companion documents do the other halves, and this file does not repeat
them:

- [`docs/DEPLOYMENT_CLOUDWAYS.md`](./DEPLOYMENT_CLOUDWAYS.md) → the frontend's
  half of the Cloudways deployment: the layout, `.env.production`, the build,
  what to upload where, and what `postbuild` did to `robots.txt`.
- `backend_developer_guidelines/07_DEPLOYMENT.md` → the Cloudways layouts in
  full, the self-managed Nginx alternative, the rollback, and the **API's** own
  go-live lists (`APP_DEBUG`, CORS, rate limiting, migrations, Varnish, cron).
- `docs/CONTENT_TO_BE_PROVIDED_BY_CLIENT.md` → every placeholder the client
  replaces in Admin, with its screen. §5 below is only the sign-off gate.

Boxes marked **blocker** stop a launch. The rest can trail the first release by
a day if somebody owns them.

---

## 1. Build

- [ ] **blocker** Working tree clean, on the release tag: `git status --short`
      is empty and `git describe --tags` names the release.
- [ ] **blocker** Clean install from the lockfile: `npm ci` (not `npm install` —
      it would resolve new minors that nothing has tested).
- [ ] **blocker** `npm run check:all` passes. It is the whole gate: lint,
      3 000+ unit tests, the CI build, the trace/seed/contrast/guidelines/env
      checks.
- [ ] `npm run mock` in a second terminal, then `npm run smoke` → every check
      passes against the mock before anything is pointed at production.
- [ ] `npm run analyze` → `main.*.js` is still within the 300 KB gzip budget
      (`docs/PERFORMANCE.md` records the history).
- [ ] Build for production: `npm run build` — or `npm run build:prerender` when
      Chrome is on the build machine and static HTML is wanted for crawlers.
- [ ] **blocker** The built bundle really contains the production API, not the
      mock: `grep -r 'www.squaresnacres.com/api' build/static/js | head -1` (one
      host) or `grep -r 'api.squaresnacres.com/api' build/static/js | head -1`
      (two hosts) prints a match, and `grep -r 'localhost:4000' build/static/js`
      prints nothing.
- [ ] `postbuild` settled `build/robots.txt` for the layout: gone on one host,
      present with its `Sitemap:` lines on the API host on two
      (`docs/DEPLOYMENT_CLOUDWAYS.md` → "What `postbuild` did"). No `.map`
      file is in `build/static`.

## 2. Environment

- [ ] **blocker** `.env.production` exists on the build machine, is **not**
      committed, and sets `REACT_APP_API_URL`, `REACT_APP_SITE_URL` and
      `REACT_APP_SITE_NAME` (copy `.env.production.example`).
- [ ] **blocker** `REACT_APP_API_URL` ends in `/api` and uses `https://`.
- [ ] `REACT_APP_SITE_URL` is the canonical host **without** a trailing slash,
      and matches the host everything else redirects to.
- [ ] Optional keys set only if the client supplied them — Cloudinary cloud and
      unsigned preset, Google Maps browser key. Each is embedded in the bundle
      at build time, so a change needs a rebuild, not a restart.
- [ ] `npm run check:env` passes (it is in `check:all`) — every variable the
      code reads is documented in `.env.example`.
- [ ] No secret in any `REACT_APP_*` variable. Everything with that prefix is
      **public**: it ships inside the JavaScript. Server keys belong to Laravel.

## 3. DNS, hosting and TLS

On Cloudways, the platform's own checks are in `07_DEPLOYMENT.md` → "Go-live
checklist — Cloudways" (Varnish, cron, the Authorization header, the
trailing-slash rule); the lines below hold on any host.

- [ ] **blocker** `A`/`AAAA` records for `www` and the apex point at the web
      host; on two hosts, `api` points at the API host. Check with `dig`, not
      the registrar's dashboard.
- [ ] **blocker** TLS certificate covers `www`, the apex (and `api`, on two
      hosts), and renews automatically. Verify the expiry date, not just the
      padlock.
- [ ] **blocker** HTTP → HTTPS is a 301, and the apex → `www` is a 301 (or the
      reverse — pick one and make `REACT_APP_SITE_URL` and `seoSettings.siteUrl`
      agree with it).
- [ ] **blocker** The SPA fallback is in place: a deep link opened in a fresh
      tab renders, e.g. `https://www.squaresnacres.com/properties/<slug>`, with
      its own title — not a 404, and not the home page's title (a fallback to
      the prerendered `index.html` instead of `index.spa.html`). See
      `07_DEPLOYMENT.md` → "Layout A — Laravel application" or, on Nginx, the
      `try_files` line of "Self-managed server (Nginx)".
- [ ] Hashed assets under `/static/` are served with a one-year immutable
      cache; `index.html` is served with `no-cache`. A stale `index.html` is how
      a deployment appears to do nothing.
- [ ] Security headers answer on a real response (`curl -I`): HSTS,
      `X-Content-Type-Options`, `Referrer-Policy`, and the CSP from
      `07_DEPLOYMENT.md` → "Security headers".
- [ ] `/sitemap.xml`, `/robots.txt`, `/rss.xml` and `/llms.txt` come from the
      API — Laravel routes on one host, proxied on Nginx — not swallowed by the
      SPA fallback; `robots.txt` shows the admin's text and its `Sitemap:`
      lines.

## 4. API smoke — staging writes, production reads

The smoke walk and the Postman collection **write** — they post enquiries that
e-mail the desk, create an account and send deletes the guards must refuse. They
run on this machine and on staging; production only ever gets the read checks
and the comparison. Against any host but this machine the smoke test runs the
read-only subset unless `--allow-writes` is passed.

- [ ] **blocker** The full walk and the Postman collection pass on **staging**:

      npm run smoke -- --baseUrl=https://staging.example/api --allow-writes

- [ ] **blocker** The production API passes the read checks, signed in as a
      real account of each role (the seed's passwords are rotated by now):

      npm run smoke -- --baseUrl=<production API> \
        --email=<admin> --password=<…> \
        --managerEmail=<manager> --managerPassword=<…> \
        --salesEmail=<sales> --salesPassword=<…>

- [ ] **blocker** The production API answers the same contract as the mock:

      npm run mock                                                   # terminal 1
      npm run smoke -- --baseUrl=<production API> \
        --email=<admin> --password=<…> \
        --compare=http://localhost:4000/api \
        --compareEmail=admin@squaresnacres.com --comparePassword=Admin@123   # terminal 2

      An empty difference table is the go signal. A difference is a launch
      blocker, not a note for later. The production API is
      `https://www.squaresnacres.com/api` on one host and
      `https://api.squaresnacres.com/api` on two.
- [ ] **blocker** `/api/nonexistent` returns the documented error envelope, not
      a stack trace (`APP_DEBUG=false`).
- [ ] CORS allows the production origin and not `*` — verify from a browser's
      network tab, not from `curl`, because `curl` does not enforce it.
- [ ] Rate limiting is live: eleven enquiries in a minute, the eleventh is a
      429 with the documented message.

## 5. Content sign-off

`docs/CONTENT_TO_BE_PROVIDED_BY_CLIENT.md` is the full list with the Admin
screen for each row. These are the gates:

- [ ] **blocker** Every row marked **Required** in that document is done. The
      site is legally or practically wrong without them — RERA number, office
      address, phone, WhatsApp, e-mail, the three legal pages.
- [ ] **blocker** The seeded catalogue is replaced: invented properties,
      developers, banks, partners, team members are gone or overwritten.
      Nothing fictional may be live as if it were real.
- [ ] **blocker** Sample testimonials (`isSample`) and the synthetic leads are
      deleted.
- [ ] **blocker** Every `picsum.photos` placeholder photograph is replaced —
      hero, listings, localities, builders, articles, team, partners, banks.
- [ ] **blocker** Any legal or tax figure an article quotes (stamp duty,
      registration charges, tax treatment) has been verified by a CA or a
      lawyer **on the date of launch**, or the figure is removed. These change
      by budget cycle and the site carries the liability for them.
- [ ] Logo renders correctly on dark surfaces (footer, dark bands) — confirmed
      against the client's brand rules, not by eye alone.
- [ ] No `[Placeholder — client to provide]` or `[Client legal text required]`
      string survives on the live site: crawl it, or search each CMS page.

## 6. Accounts and security

- [ ] **blocker** The three seed admin passwords are rotated. `Admin@123`,
      `Manager@123` and `Sales@123` are in this repository, in the seed, and in
      the handover package — treat them as public.
- [ ] **blocker** The three seed accounts are renamed to real people or
      deactivated in Admin → Settings → Users.
- [ ] Each real user has the **lowest** role that lets them work: `sales` for
      the CRM, `manager` for content, `admin` only for those who manage users
      and settings (`docs/RBAC.md`).
- [ ] The admin panel is reachable only over HTTPS, and no public page links to
      it (by design — `/admin` is unlinked).

## 7. SEO and analytics, on the live host

- [ ] **blocker** `https://www.squaresnacres.com/robots.txt` is the real file
      and **not** the blanket `Disallow: /` that staging serves. Fetch it and
      read it. This is the single most common launch mistake.
- [ ] **blocker** Staging, if it stays up, serves the blanket disallow and is
      password-protected. Two hosts serving the same content is a duplicate-
      content problem.
- [ ] `/sitemap.xml` returns the index; one child document opens and its URLs
      are absolute and use the canonical host.
- [ ] Submit the sitemap index in Google Search Console, and verify the
      property (DNS record or the HTML tag in Admin → SEO → Settings).
- [ ] Rich Results Test (`https://search.google.com/test/rich-results`) passes
      on one property page, one article and the home page — the
      `RealEstateAgent`, `Product`/`Residence`, `Article` and `BreadcrumbList`
      blocks. `npm run check:jsonld` proves the shape locally; this proves
      Google accepts it.
- [ ] Mobile-Friendly and Core Web Vitals: run Lighthouse against the live host
      at mobile preset. `docs/QA/46-lighthouse-howto.md` has the procedure and
      the recorded baseline to compare against.
- [ ] GA4 / Tag Manager / Meta pixel IDs are set in Admin → Settings →
      Integrations, and a real visit shows up: open the site in a private
      window, then confirm it in GA4 Realtime. An ID that is set but not
      reporting is worse than none, because nobody looks again.
- [ ] `seoSettings.siteUrl` equals the canonical host. A mismatch makes every
      canonical tag on the site point at the wrong origin.

## 8. Functional pass on the live site

- [ ] **blocker** Sign in to `/admin`, create a draft property, publish it, find
      it on the public listing, then delete it. This proves the whole write
      path, cache and all.
- [ ] **blocker** Submit the public enquiry form: the lead appears in the CRM
      with its source, the property's `enquiryCount` moves, and the
      notification e-mail arrives at a mailbox somebody reads.
- [ ] Walk the site at 390 px with the console open: home, one listing, one
      property, one article, contact. No console errors.
- [ ] The WhatsApp button, the `tel:` links and the map open correctly **on a
      real phone**. Emulation does not test the handset's URL handlers.
- [ ] The 404 page renders for an unknown path and offers a way back.

## 9. After launch

- [ ] Tag the release and push the tag: `git tag -a vX.Y.Z -m "…" && git push
      --tags`.
- [ ] Record the release in `docs/PROJECT_STATE.md` — what shipped, and the
      commit.
- [ ] Take a database dump **before** the first content edit, so there is a
      known-good restore point from day one.
- [ ] Uptime check on the home page and on `/api/health`, alerting somewhere a
      human reads.
- [ ] Re-check Search Console coverage after a week: pages indexed, and no
      "Discovered — currently not indexed" pile-up.
