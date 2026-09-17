/**
 * The redirects as an Nginx configuration (§9.10, D30).
 *
 * On a single-page application a redirect is a client-side `<Navigate replace>`:
 * the browser has already loaded the app before it can look the rule up, so
 * what a crawler sees is a 200 and a JavaScript navigation, not a 301. That is
 * the honest limit of D30, and it is why this file exists — the same rules,
 * written for the server that fronts the build, where a 301 is a real 301.
 *
 * Paste the output into the `server { … }` block of the deployment, or save the
 * file the screen offers and `include` it.
 */

/** A path Nginx reads without quoting: the characters a URL normally uses. */
const SAFE_PATH = /^\/[A-Za-z0-9\-._~/%]*$/;

/** An absolute target, which `return` takes exactly as a path does. */
const ABSOLUTE = /^https?:\/\//i;

/** Quotes a location or a target when it holds anything Nginx would parse. */
function quote(value) {
  const text = String(value ?? '').trim();
  if (SAFE_PATH.test(text) || ABSOLUTE.test(text)) return text;
  return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** A note, as a comment that cannot escape its line. */
const comment = (value) =>
  String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .trim();

/**
 * One `location` block per rule.
 *
 * `location = /old` is an **exact** match, which is what a redirect table
 * holds: `/old-properties` must not also catch `/old-properties-in-whitefield`.
 * The query string is not part of the match and Nginx carries it over on its
 * own, which is the same thing the client-side handler does.
 *
 * Inactive rules are written as comments rather than dropped: an editor who
 * switched one off did not ask for it to disappear from the file they are about
 * to paste into a server (the same reasoning as `deactivateByFromPath`).
 *
 * @param {Array<{fromPath: string, toPath: string, statusCode?: number,
 *   isActive?: boolean, note?: string}>} rows
 * @param {{header?: boolean, generatedAt?: Date}} [options]
 * @returns {string}
 */
export function nginxSnippet(rows = [], options = {}) {
  const { header = true, generatedAt = new Date() } = options;
  const list = Array.isArray(rows) ? rows : [];

  const lines = [];

  if (header) {
    lines.push(
      '# Squares N Acres — redirects',
      `# Generated from Admin → SEO → Redirects on ${generatedAt.toISOString().slice(0, 10)}.`,
      '# Paste inside the server block, or save as redirects.nginx.conf and include it.',
      ''
    );
  }

  for (const row of list) {
    const from = String(row?.fromPath ?? '').trim();
    const to = String(row?.toPath ?? '').trim();
    if (!from.startsWith('/') || to === '') continue;

    const code = Number(row?.statusCode) === 302 ? 302 : 301;
    const note = comment(row?.note);
    if (note) lines.push(`# ${note}`);

    const rule = `location = ${quote(from)} { return ${code} ${quote(to)}; }`;
    lines.push(row?.isActive === false ? `# (inactive) ${rule}` : rule);
  }

  if (lines.length === 0 || (header && lines.length === 4)) {
    lines.push('# No redirects are configured yet.');
  }

  return `${lines.join('\n')}\n`;
}

/** The file name the download offers. */
export const NGINX_FILENAME = 'redirects.nginx.conf';

export default nginxSnippet;
