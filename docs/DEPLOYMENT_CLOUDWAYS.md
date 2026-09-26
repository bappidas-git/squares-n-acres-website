# Deploying the site on Cloudways

The frontend's half of a Cloudways deployment: which layout, what goes in
`.env.production`, how to build, what to upload where, and what `postbuild` did
to `robots.txt`. The API's half — the Laravel application, `.htaccess`, cron,
queue, Varnish, the go-live list — is
[`backend_developer_guidelines/07_DEPLOYMENT.md`](../backend_developer_guidelines/07_DEPLOYMENT.md).

## The two layouts

**Layout A — one host (recommended).** One Cloudways Laravel application on
`www.squaresnacres.com` answers `/api/*` and serves this build for every other
path. Same origin: no CORS, and `robots.txt`, the sitemaps, `rss.xml` and
`llms.txt` are Laravel routes on the host crawlers read. The build goes into
Laravel's `public/` folder.

**Layout B — two hosts.** A plain PHP application serves the build on
`www.squaresnacres.com`; Laravel serves the API on `api.squaresnacres.com`. It
needs CORS on the API, an `.htaccess` SPA rewrite on the static host, and a
`robots.txt` file that names the API's sitemaps. Use it only when the client
asks for separate hosts.

## `.env.production`

Copy `.env.production.example` to `.env.production` on the machine that builds
(it is git-ignored) and keep the lines for your layout:

```bash
# Layout A
REACT_APP_API_URL=https://www.squaresnacres.com/api
REACT_APP_SITE_URL=https://www.squaresnacres.com

# Layout B
REACT_APP_API_URL=https://api.squaresnacres.com/api
REACT_APP_SITE_URL=https://www.squaresnacres.com
```

Plus `REACT_APP_SITE_NAME`, and the Cloudinary and Maps keys when the client has
them. Every value is baked into the bundle, so a change needs a rebuild.

## Build

On a laptop or in CI — the server has no Node:

```bash
npm ci
npm run build              # or: npm run build:prerender (needs Chrome and a running API)
```

The build has **no source maps** (`GENERATE_SOURCEMAP=false`), so none is
published. For a debug build with maps, run `npx react-scripts build` yourself —
and never upload it.

## What `postbuild` did

npm runs `scripts/postbuild.js` after the build. It reads the same two addresses
and settles `build/robots.txt`:

| Layout                 | `build/robots.txt` after the build                                             | Why                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| A (one origin)         | **deleted**                                                                    | Laravel answers `/robots.txt` with the admin's text; a file in `public/` would be served first and hide it |
| B (two origins)        | the API's `robots.txt`, every `Sitemap:` line moved to `api.squaresnacres.com` | the static host must serve a file, and the sitemaps live on the API host                                   |
| B, API not answering   | the seed's default text, with a warning                                        | build again once the API is up, so the admin's text ships                                                  |
| no `REACT_APP_API_URL` | left as committed                                                              | a fresh clone — nothing to decide against                                                                  |

`public/robots.txt` in the repository is never changed.

## Upload

**Layout A** — the **contents** of `build/` into the Laravel application's
`public_html/public/`, without touching Laravel's own files and without deleting
the previous release's chunks:

```bash
APP=<master-user>@<server-ip>:/home/master/applications/<application>/public_html/public
rsync -av build/static/ "$APP/static/"
rsync -av --delete \
  --exclude='/static/' --exclude='/index.php' --exclude='/.htaccess' \
  --exclude='/storage' --exclude='/vendor' --exclude='/favicon.ico' \
  build/ "$APP/"
```

On the **first** deploy, delete the Laravel skeleton's `public/robots.txt` by
hand. `--delete` removes it only while no `--exclude` matches it (an excluded
file survives `--delete`, and older guides exclude `robots.txt`), and a file
there is served before Laravel's route — the admin's text would never ship.

**Layout B** — the contents of `build/` into the static application's
`public_html/`, with the `.htaccess` from `07_DEPLOYMENT.md` → "Layout B — the
static application", and the same rule for `static/`.

Keep the chunks of the last two or three releases in `static/` (a visitor holding
yesterday's page still needs them), and keep the last three `build/` folders
zipped with their commit hash for a rollback.

## After the upload

- `https://www.squaresnacres.com/robots.txt` shows the admin's text and its
  `Sitemap:` lines.
- A deep link opened in a fresh window renders, and `curl -I` on it shows no long
  cache time.
- The smoke test against production runs its **read** checks only — the full walk
  and the Postman collection write, and belong on staging. Once the seed
  passwords are rotated, sign in as a real account of each role (Layout B:
  `https://api.squaresnacres.com/api`):

  ```bash
  npm run smoke -- --baseUrl=https://www.squaresnacres.com/api \
    --email=<admin> --password=<…> \
    --managerEmail=<manager> --managerPassword=<…> \
    --salesEmail=<sales> --salesPassword=<…>
  ```

  Without `--allow-writes` a host other than this machine only ever gets the
  reads; `--allow-writes` is for staging.

The rest of the go-live list is `07_DEPLOYMENT.md` → "Go-live checklist —
Cloudways" and [`docs/RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md).
