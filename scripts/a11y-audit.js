#!/usr/bin/env node
/**
 * The accessibility audit of every page, in a real browser (prompt 42 §4.2).
 *
 *   npm run dev            # in one terminal — the mock and the app
 *   npm run a11y:audit     # in another
 *
 * It opens every URL the sitemaps name, plus the routes no sitemap lists
 * (`/shortlist`, the 404) and — after signing in through the login form — every
 * admin screen, at a phone width and a desktop width, and asks each page what
 * is wrong with it (`scripts/lib/inPageAudit.js`). Then it presses Tab through
 * a handful of representative pages and reports any stop that lights up no
 * focus ring.
 *
 * The results land in `docs/QA/42-a11y-audit.json` (every finding) and
 * `docs/QA/42-a11y-audit.md` (the summary a human reads). It exits non-zero
 * when anything is `error` level: a missing `alt`, an unlabelled control, a
 * control with no accessible name, a duplicate id, an `h1` count that is not
 * one, text under its contrast minimum, horizontal scroll, a missing `<main>`
 * or a missing `lang`.
 *
 * **It is optional.** `puppeteer-core` downloads no browser (D16), so without
 * `CHROME_PATH` — or a Chrome in one of the usual places — it prints
 * "skipped" and exits 0, and the manual grid in
 * `docs/QA/42-mobile-a11y-checklist.md` is the record instead. That is why it
 * is not part of `npm run check:all`.
 *
 *   node scripts/a11y-audit.js --baseUrl=http://localhost:5000 --widths=390,768,1280
 *   node scripts/a11y-audit.js --sample=2 --admin=false --verbose
 *   node scripts/a11y-audit.js --widths=360,414,768,1024,1536 --sample=1 \
 *     --outName=42-a11y-widths     # the other five test widths of §8.1
 *   node scripts/a11y-audit.js --paths=/,/buy,/admin/dashboard --widths=390,1280
 *                                   # exactly these routes, nothing else
 *
 * @module scripts/a11y-audit
 */

const fs = require('fs');
const path = require('path');

const { describe: describeChrome, hasChrome, launchChrome } = require('./lib/chrome');
const { buildAuditSource } = require('./lib/inPageAudit');
const PATHS = require('../src/routes/paths');

/* ------------------------------------------------------------------ *
 * Arguments
 * ------------------------------------------------------------------ */

const DEFAULTS = {
  baseUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:4000/api',
  // 390 is the iPhone 14 width of §8.1 and the one the checklist calls the
  // phone tier; 1280 is the desktop container width.
  widths: '390,1280',
  email: 'admin@squaresnacres.com',
  password: 'Admin@123',
  admin: true,
  // 0 = every record the sitemaps carry. A small number keeps one page of each
  // shape (a property, a locality, a builder, an article, a CMS page) while a
  // fix is being iterated on; the run of record uses the default.
  sample: 0,
  limit: 0,
  // A comma-separated route list to audit instead of the crawl — the way a
  // fixed grid (prompt 46 §4.7) is expressed. Admin routes in it still need
  // `--admin` and a sign-in.
  paths: '',
  timeout: 45000,
  // The navigation gets `timeout`; the wait for the page to say it has
  // rendered gets this, because a screen that never announces itself is
  // audited as it stands rather than costing the whole budget.
  readyTimeout: 8000,
  focusStops: 30,
  // How many navigations one tab takes before it is replaced. A tab that has
  // loaded a hundred and fifty documents starts timing out on the next one —
  // measured: every admin route after roughly the 155th navigation failed,
  // identically at both widths — and a fresh tab costs a few hundred
  // milliseconds. Storage is per origin, so a new tab is still signed in.
  recycle: 40,
  // The pair of files this run writes into `docs/QA/`. The default is the run
  // of record; a sweep across the other five test widths writes its own.
  outName: '42-a11y-audit',
  verbose: false,
};

function parseArgs(argv) {
  const options = { ...DEFAULTS };

  for (const argument of argv) {
    const match = /^--([a-zA-Z]+)(?:=(.*))?$/.exec(argument);
    if (!match) continue;
    const [, key, value] = match;
    if (!(key in options)) continue;
    options[key] = value === undefined ? true : value;
  }

  options.baseUrl = String(options.baseUrl).replace(/\/+$/, '');
  options.apiUrl = String(options.apiUrl).replace(/\/+$/, '');
  options.admin = options.admin !== 'false' && options.admin !== false;
  options.limit = Number(options.limit) || 0;
  options.sample = Number(options.sample) || 0;
  options.timeout = Number(options.timeout) || DEFAULTS.timeout;
  options.readyTimeout = Number(options.readyTimeout) || DEFAULTS.readyTimeout;
  options.focusStops = Number(options.focusStops) || DEFAULTS.focusStops;
  options.recycle = Number(options.recycle) || DEFAULTS.recycle;
  options.widths = String(options.widths)
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => value > 0);

  return options;
}

const options = parseArgs(process.argv.slice(2));

const QA_DIR = path.join(__dirname, '..', 'docs', 'QA');
const OUT_NAME = String(options.outName).replace(/[^a-zA-Z0-9._-]/g, '');
const JSON_OUT = path.join(QA_DIR, `${OUT_NAME}.json`);
const MD_OUT = path.join(QA_DIR, `${OUT_NAME}.md`);

const AUDIT_SOURCE = buildAuditSource('audit');
const FOCUS_SOURCE = buildAuditSource('readFocusRing');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ------------------------------------------------------------------ *
 * The list of URLs
 * ------------------------------------------------------------------ */

/**
 * The public routes no sitemap carries.
 *
 * The sitemaps list the records; these are the indexes those records are
 * reached through, plus the two pages that are deliberately `noindex` — the
 * shortlist (different for every visitor) and the 404, which is a page a
 * visitor sees and so a page that has to pass.
 */
const EXTRA_ROUTES = [
  '/',
  '/properties',
  '/buy',
  '/buy/ready-to-move',
  '/rent',
  '/lease',
  '/commercial',
  '/plots',
  '/localities',
  '/builders',
  '/insights/articles',
  '/insights/faqs',
  '/insights/real-estate-awareness',
  '/shortlist',
  '/this-page-does-not-exist',
];

/** The pages the Tab walk runs on — one of each shape, not all of them. */
const FOCUS_ROUTES = ['/', '/properties', '/contact', '/admin/dashboard', '/admin/properties'];

const locations = (xml) =>
  [...String(xml).matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((match) => match[1]);

async function text(url) {
  const response = await fetch(url, { headers: { Accept: '*/*' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.text();
}

async function json(url, token) {
  const response = await fetch(url, {
    headers: token
      ? { Accept: 'application/json', Authorization: `Bearer ${token}` }
      : { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.json();
}

/**
 * Every public path to audit: the indexes, then the sitemaps' records.
 *
 * @returns {Promise<string[]>}
 */
async function collectPublicPaths() {
  let index;
  try {
    index = await text(`${options.apiUrl}/sitemap.xml`);
  } catch (thrown) {
    throw new Error(
      `The mock API did not answer at ${options.apiUrl}/sitemap.xml (${thrown.message}).\n` +
        'Start it with `npm run dev` — the audit reads real pages, so it needs the API.'
    );
  }

  const records = [];
  for (const child of locations(index)) {
    const childPath = new URL(child).pathname.replace(/^\/api/, '');
    const found = locations(await text(`${options.apiUrl}${childPath}`));
    records.push(...(options.sample > 0 ? found.slice(0, options.sample) : found));
  }

  const paths = [
    ...EXTRA_ROUTES,
    ...records.map((url) => new URL(url).pathname.replace(/\/+$/, '') || '/'),
  ];

  const unique = [...new Set(paths)];
  return options.limit > 0 ? unique.slice(0, options.limit) : unique;
}

/**
 * Every admin path to audit, with the `:id` routes resolved to real records.
 *
 * The list is `src/routes/paths.js` itself — the map the app navigates by —
 * rather than a copy that would drift from it. The string entries are the
 * screens; the function entries are the ones that need a record, and each is
 * given the first id the API has.
 *
 * @param {string} token
 * @returns {Promise<string[]>}
 */
async function collectAdminPaths(token) {
  const firstId = async (resource) => {
    try {
      const body = await json(`${options.apiUrl}/admin/${resource}?perPage=1`, token);
      const rows = Array.isArray(body?.data) ? body.data : [];
      return rows.length ? rows[0].id : null;
    } catch {
      return null;
    }
  };

  const [property, lead, article, page, locality, developer] = await Promise.all([
    firstId('properties'),
    firstId('leads'),
    firstId('articles'),
    firstId('pages'),
    firstId('localities'),
    firstId('developers'),
  ]);

  const byKey = {
    adminPropertyEdit: property,
    adminLead: lead,
    adminArticleEdit: article,
    adminPageEdit: page,
    adminLocalityEdit: locality,
    adminDeveloperEdit: developer,
  };

  const paths = [];
  for (const [key, value] of Object.entries(PATHS)) {
    if (!key.startsWith('admin')) continue;
    // `/admin` itself only redirects, and the login screen is audited before
    // the session exists.
    if (key === 'adminRoot' || key === 'adminLogin') continue;

    if (typeof value === 'string') paths.push(value);
    else if (typeof value === 'function' && byKey[key]) paths.push(value(byKey[key]));
  }

  return [...new Set(paths)];
}

/* ------------------------------------------------------------------ *
 * Driving one page
 * ------------------------------------------------------------------ */

/**
 * Opens a path, waits for it to have finished rendering, and audits it.
 *
 * The wait is `[data-prerender-ready]` — the attribute `usePrerenderReady`
 * puts on `<main>` once a public page's primary query has settled, including
 * when it settled on an error state. Admin screens do not carry it, so an
 * `<h1>` plus a short settle is the signal there.
 *
 * @param {import('puppeteer-core').Page} page
 * @param {string} pathname
 * @param {number} width
 * @returns {Promise<{findings: object[], stats: object}>}
 */
async function auditPage(page, pathname, width) {
  const consoleMessages = [];
  const onConsole = (message) => {
    if (message.type() !== 'error' && message.type() !== 'warning') return;
    const body = message.text();
    // A blocked seed photograph or a font the sandbox cannot reach is the
    // network the audit runs on, not something the page did.
    if (/^Failed to load resource: net::/.test(body)) return;
    consoleMessages.push(body);
  };
  const onPageError = (error) => consoleMessages.push(error.message);

  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  try {
    try {
      await page.goto(`${options.baseUrl}${pathname}`, {
        waitUntil: 'domcontentloaded',
        timeout: options.timeout,
      });
    } catch (thrown) {
      // One slow page is a finding, not the end of the run: the development
      // server compiles a lazy chunk the first time it is asked for it, and a
      // route behind a cold chunk can outlast the budget.
      return {
        findings: [
          {
            level: 'warn',
            rule: 'navigation',
            message: `The page did not load within ${options.timeout}ms (${thrown.message}).`,
            selector: '',
            path: pathname,
            width,
          },
        ],
        stats: {},
      };
    }

    try {
      await page.waitForFunction(
        () =>
          document.querySelector('[data-prerender-ready]') ||
          document.querySelector('main h1, h1') ||
          document.querySelector('[data-a11y-empty]'),
        { polling: 'mutation', timeout: options.readyTimeout }
      );
    } catch {
      // A page that never announced itself is audited as it stands: a missing
      // heading is a finding in its own right, not a reason to skip the page.
    }

    // `data-prerender-ready` means the record arrived, not that the section
    // carrying the `<h1>` has been imported — several of them are their own
    // chunk (prompt 41). Waiting for the heading separately is the difference
    // between auditing the page and auditing the shell; a page that genuinely
    // has none costs this budget once and is still reported.
    try {
      await page.waitForFunction(() => document.querySelector('h1'), {
        polling: 'mutation',
        timeout: options.readyTimeout,
      });
    } catch {
      // Reported by the `h1-count` rule below, which is where it belongs.
    }

    // The tail: deferred bands, lazily imported panels, the fonts.
    await sleep(1000);

    const result = await page.evaluate(
      `(${AUDIT_SOURCE})(${JSON.stringify({
        touchTargets: width < 900,
        minBodyFontSize: width < 900 ? 13 : 0,
      })})`
    );

    const findings = result.findings.map((finding) => ({ ...finding, path: pathname, width }));

    for (const message of [...new Set(consoleMessages)]) {
      findings.push({
        level: 'warn',
        rule: 'console',
        message: message.slice(0, 300),
        selector: '',
        path: pathname,
        width,
      });
    }

    return { findings, stats: result.stats };
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
  }
}

/**
 * Tabs through a page and reports any stop with no visible focus ring.
 *
 * @param {import('puppeteer-core').Page} page
 * @param {string} pathname
 * @returns {Promise<object[]>}
 */
async function auditFocusRing(page, pathname) {
  const findings = [];
  const seen = new Set();

  await page.evaluate(() => {
    document.body.focus();
    if (document.activeElement && document.activeElement !== document.body) {
      document.activeElement.blur();
    }
  });

  for (let stop = 0; stop < options.focusStops; stop += 1) {
    await page.keyboard.press('Tab');
    const state = await page.evaluate(`(${FOCUS_SOURCE})()`);
    if (!state) continue;
    if (seen.has(state.selector)) continue;
    seen.add(state.selector);

    if (!state.hasRing) {
      findings.push({
        level: 'error',
        rule: 'focus-ring',
        message: `Tab stop ${stop + 1} (${state.tag}${state.name ? ` "${state.name}"` : ''}) shows no focus ring.`,
        selector: state.selector,
        path: pathname,
        width: 1280,
      });
    } else if (state.hasRing && state.outlineWidth > 0 && state.outlineWidth < 2) {
      findings.push({
        level: 'warn',
        rule: 'focus-ring',
        message: `Tab stop ${stop + 1} outlines at ${state.outlineWidth}px, under the 2px house ring.`,
        selector: state.selector,
        path: pathname,
        width: 1280,
      });
    }
  }

  return findings;
}

/**
 * Forgets everything the site remembers about this visitor.
 *
 * `signIn` below survives a live session, which is what kept the admin screens
 * in the sweep. This is the other half: storage belongs to the origin rather
 * than to the tab, so without it `/admin/login` — a route the *public* pass
 * audits — redirects to the dashboard at every width after the first, and the
 * audit records having seen a login screen it never rendered. Each width opens
 * as a stranger so that page is the page it claims to be.
 *
 * @param {import('puppeteer-core').Page} page
 */
async function forgetSession(page) {
  await page.goto(`${options.baseUrl}/`, {
    waitUntil: 'domcontentloaded',
    timeout: options.timeout,
  });
  await page.evaluate(() => {
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch {
      // A browser with storage blocked has nothing to forget.
    }
  });
}

/**
 * Signs in through the login form, exactly as a person would.
 *
 * **Unless there is already a session.** Every width opens a new page but the
 * same browser, so the token written at the first width is still in storage at
 * the second, and `/admin/login` then does the right thing and sends an
 * authenticated visitor to the dashboard. There is no login form on that
 * screen to fill in, which used to abort the whole audit on an uncaught
 * `waitForSelector` — so the sweep only ever covered the admin screens at the
 * first width, and from prompt 46's seven-width run it covered them at none.
 * Landing anywhere but the login screen *is* the signed-in answer.
 *
 * @param {import('puppeteer-core').Page} page
 * @returns {Promise<boolean>}
 */
async function signIn(page) {
  const onDashboard = () => page.evaluate(() => window.location.pathname.startsWith('/admin/'));

  await page.goto(`${options.baseUrl}${PATHS.adminLogin}`, {
    waitUntil: 'domcontentloaded',
    timeout: options.timeout,
  });

  try {
    await page.waitForFunction(
      () =>
        document.querySelector('input[name="email"]') ||
        !window.location.pathname.startsWith('/admin/login'),
      { polling: 'mutation', timeout: options.timeout }
    );
  } catch {
    return false;
  }

  // Redirected off the login screen: the session from an earlier width is
  // still good, and there is nothing to type.
  const hasForm = await page.$('input[name="email"]');
  if (!hasForm) return onDashboard();

  await page.type('input[name="email"]', options.email);
  await page.type('input[name="password"]', options.password);
  await page.click('form button[type="submit"]');

  try {
    await page.waitForFunction(() => window.location.pathname.startsWith('/admin/dashboard'), {
      polling: 'mutation',
      timeout: options.timeout,
    });
    return true;
  } catch {
    return false;
  }
}

/** A token for the API calls that resolve the `:id` routes. */
async function apiToken() {
  const response = await fetch(`${options.apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: options.email, password: options.password }),
  });
  if (!response.ok) throw new Error(`Login failed with ${response.status}.`);
  const body = await response.json();
  return body?.data?.token ?? body?.token ?? '';
}

/* ------------------------------------------------------------------ *
 * The report
 * ------------------------------------------------------------------ */

const RULE_TITLES = {
  console: 'Console errors and warnings',
  navigation: 'Pages that did not load in time',
  contrast: 'Text contrast below the minimum',
  'control-label': 'Form controls without a label',
  'control-name': 'Controls without an accessible name',
  'duplicate-id': 'Duplicate ids',
  'focus-ring': 'Tab stops without a focus ring',
  'font-size': 'Text under the mobile minimum',
  'h1-count': 'Pages without exactly one H1',
  'horizontal-scroll': 'Horizontal scroll',
  'html-lang': 'Missing document language',
  'image-alt': 'Images without alt',
  'label-in-name': 'Accessible names that omit the visible text',
  'landmark-main': 'Missing main landmark',
  'landmark-missing': 'Missing landmark',
  'nav-label': 'Unnamed navigation landmarks',
  'placeholder-contrast': 'Placeholder contrast below the minimum',
  'positive-tabindex': 'Positive tabindex',
  'target-size': 'Tap targets under 44 px',
};

function groupBy(items, key) {
  const groups = new Map();
  for (const item of items) {
    const value = item[key];
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(item);
  }
  return groups;
}

/** The markdown a human reads, from the findings a browser produced. */
function renderMarkdown(report) {
  const { findings, pages, widths, startedAt } = report;
  const errors = findings.filter((finding) => finding.level === 'error');
  const warnings = findings.filter((finding) => finding.level === 'warn');
  const lines = [];

  // The prompt number comes from the file the run was told to write, so a
  // sweep started with `--outName=46-…` does not title itself "42".
  const prompt = /^(\d+)/.exec(OUT_NAME)?.[1] ?? OUT_NAME;
  lines.push(`# ${prompt} — automated accessibility audit`);
  lines.push('');
  lines.push(
    'Generated by `npm run a11y:audit` (`scripts/a11y-audit.js`). Every number below comes',
    'from `scripts/lib/inPageAudit.js` running inside a real Chrome on the rendered page —',
    'no fixtures, no static analysis. Re-run it after any change to the layout, the tokens',
    'or a shared control.'
  );
  lines.push('');
  lines.push(`- Run: ${startedAt}`);
  lines.push(`- Pages audited: ${pages} at ${widths.join(' px, ')} px`);
  lines.push(`- Error-level findings: **${errors.length}**`);
  lines.push(`- Warning-level findings: **${warnings.length}**`);
  lines.push('');

  const section = (title, items) => {
    lines.push(`## ${title} (${items.length})`);
    lines.push('');
    if (!items.length) {
      lines.push('None.');
      lines.push('');
      return;
    }

    lines.push('| Rule | Count | Pages | Example |');
    lines.push('| --- | --- | --- | --- |');
    for (const [rule, group] of [...groupBy(items, 'rule')].sort(
      (a, b) => b[1].length - a[1].length
    )) {
      const routes = [...new Set(group.map((finding) => finding.path))];
      const example = group[0];
      const cell = `${example.message} ${example.selector ? `(\`${example.selector}\`)` : ''}`
        .replace(/\|/g, '\\|')
        .trim();
      lines.push(`| ${RULE_TITLES[rule] || rule} | ${group.length} | ${routes.length} | ${cell} |`);
    }
    lines.push('');
  };

  section('Errors', errors);
  section('Warnings', warnings);

  lines.push('## Where the warnings are');
  lines.push('');
  if (!warnings.length) {
    lines.push('None.');
  } else {
    lines.push('| Page | Width | Rule | Detail |');
    lines.push('| --- | --- | --- | --- |');
    for (const finding of warnings.slice(0, 120)) {
      const detail = `${finding.message} ${finding.selector ? `\`${finding.selector}\`` : ''}`
        .replace(/\|/g, '\\|')
        .trim();
      lines.push(
        `| \`${finding.path}\` | ${finding.width} | ${RULE_TITLES[finding.rule] || finding.rule} | ${detail} |`
      );
    }
    if (warnings.length > 120) {
      lines.push('');
      lines.push(`_${warnings.length - 120} further warnings are in the JSON._`);
    }
  }
  lines.push('');

  return `${lines.join('\n')}\n`;
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

async function main() {
  if (!hasChrome()) {
    console.log('a11y audit: skipped — no Chrome. Set CHROME_PATH to run it.');
    console.log('The manual grid in docs/QA/42-mobile-a11y-checklist.md is the record instead.');
    return 0;
  }

  console.log(`a11y audit: ${describeChrome()}`);
  console.log(`Auditing ${options.baseUrl} at ${options.widths.join(', ')} px.`);

  // `--paths` audits exactly the routes it names and nothing else. The sweeps
  // above answer "is anything wrong anywhere?"; a grid like prompt 46 §4.7 —
  // six public pages and three admin screens at seven widths — is a different
  // question, and expressing it through `--sample`/`--limit` was not possible:
  // `--limit` truncates the admin list as well as the sitemap.
  const chosen = String(options.paths)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  const publicPaths = chosen.length
    ? chosen.filter((path) => !path.startsWith('/admin'))
    : await collectPublicPaths();

  let adminPaths = [];
  let token = '';

  if (options.admin) {
    try {
      token = await apiToken();
      if (chosen.length) {
        adminPaths = chosen.filter((path) => path.startsWith('/admin'));
      } else {
        adminPaths = await collectAdminPaths(token);
        if (options.limit > 0) adminPaths = adminPaths.slice(0, options.limit);
      }
    } catch (thrown) {
      console.warn(`a11y audit: admin screens skipped — ${thrown.message}`);
    }
  }

  const browser = await launchChrome({ what: 'the accessibility audit' });
  const findings = [];
  const stats = [];
  let audited = 0;

  /** A tab at this width, ready to be audited in. */
  const openPage = async (width) => {
    const tab = await browser.newPage();
    const isPhone = width < 900;
    await tab.setViewport({
      width,
      height: isPhone ? 844 : 900,
      isMobile: isPhone,
      hasTouch: isPhone,
      deviceScaleFactor: 1,
    });
    return tab;
  };

  // The tab in use, and how many documents it has loaded — held here rather
  // than in the width loop so `visit` is declared once.
  const tab = { page: null, sinceFresh: 0 };

  /** Audits one route, replacing the tab before it gets tired. */
  const visit = async (width, pathname) => {
    if (tab.sinceFresh >= options.recycle) {
      await tab.page.close();
      tab.page = await openPage(width);
      tab.sinceFresh = 0;
    }
    tab.sinceFresh += 1;

    const result = await auditPage(tab.page, pathname, width);
    findings.push(...result.findings);
    stats.push({ path: pathname, width, ...result.stats });
    audited += 1;
    if (options.verbose) {
      const errors = result.findings.filter((finding) => finding.level === 'error').length;
      console.log(`  ${width}px ${pathname} — ${errors} error(s)`);
    }
  };

  try {
    for (const width of options.widths) {
      tab.page = await openPage(width);
      tab.sinceFresh = 0;

      // Every width starts as a stranger, so `/admin/login` is the login
      // screen rather than a redirect to the dashboard.
      await forgetSession(tab.page);

      const routes = [...publicPaths];

      if (adminPaths.length) {
        // The login screen is a public page until it is used; audit it, then
        // sign in and keep the session for every admin route at this width.
        routes.push(PATHS.adminLogin);
      }

      for (const pathname of routes) await visit(width, pathname);

      if (adminPaths.length) {
        const signedIn = await signIn(tab.page);
        if (!signedIn) {
          console.warn(`a11y audit: could not sign in at ${width}px; admin screens skipped.`);
        } else {
          for (const pathname of adminPaths) await visit(width, pathname);
        }
      }

      await tab.page.close();
    }

    // The keyboard pass, on one width: a focus ring does not change with the
    // viewport, and thirty stops on every page would double the run.
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    const needsSession = FOCUS_ROUTES.some((route) => route.startsWith('/admin'));
    if (needsSession && adminPaths.length) await signIn(page);
    else await forgetSession(page);

    for (const pathname of FOCUS_ROUTES) {
      if (pathname.startsWith('/admin') && !adminPaths.length) continue;
      await auditPage(page, pathname, 1280);
      findings.push(...(await auditFocusRing(page, pathname)));
    }
    await page.close();
  } finally {
    await browser.close();
  }

  const report = {
    startedAt: new Date().toISOString(),
    baseUrl: options.baseUrl,
    widths: options.widths,
    pages: audited,
    counts: {
      error: findings.filter((finding) => finding.level === 'error').length,
      warn: findings.filter((finding) => finding.level === 'warn').length,
    },
    findings,
    stats,
  };

  fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
  fs.writeFileSync(JSON_OUT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(MD_OUT, renderMarkdown(report), 'utf8');

  console.log('');
  console.log(`Pages audited: ${audited}`);
  console.log(`Errors:   ${report.counts.error}`);
  console.log(`Warnings: ${report.counts.warn}`);
  console.log(`Report:   ${path.relative(process.cwd(), MD_OUT)}`);

  if (report.counts.error > 0) {
    const byRule = groupBy(
      findings.filter((finding) => finding.level === 'error'),
      'rule'
    );
    console.log('');
    for (const [rule, group] of byRule) {
      console.log(`  ${rule}: ${group.length}`);
      for (const finding of group.slice(0, 5)) {
        console.log(`    ${finding.width}px ${finding.path} — ${finding.message}`);
      }
    }
    return 1;
  }

  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(`a11y audit failed: ${error.message}`);
    process.exitCode = 1;
  });
