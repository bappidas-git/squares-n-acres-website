/**
 * The hand-written half of the package.
 *
 * `backend_developer_guidelines/` is generated, so nothing in it may be edited:
 * the next run would throw the edit away. Everything a person wants to say to
 * the Laravel developer is written in `docs/backend-notes/*.md` instead, and
 * this module merges those files into the generated documents section by
 * section.
 *
 * A notes file is ordinary Markdown whose `##` headings are the merge points.
 * A template asks for one by its anchor — `{{notes.02_auth.token-lifetime}}`
 * is the `## Token lifetime` section of `docs/backend-notes/02_auth.md` — and
 * the generator fails when the section is missing, so a template can never
 * render a hole.
 */

const fs = require('fs');
const path = require('path');

const { anchor } = require('./markdown');

/**
 * Splits one notes file into `{ anchor: { heading, body } }`.
 *
 * Anything above the first `##` is the file's preamble and is returned under
 * the `''` key; `###` and deeper headings belong to the section above them.
 *
 * @param {string} markdown the file's contents
 * @returns {Record<string, {heading: string, body: string, level: number}>}
 */
function splitSections(markdown) {
  const sections = {};
  const lines = String(markdown).replace(/\r\n/g, '\n').split('\n');

  let current = { heading: '', body: [], level: 0, key: '' };
  let fenced = false;

  const close = () => {
    sections[current.key] = {
      heading: current.heading,
      level: current.level,
      body: current.body.join('\n').trim(),
    };
  };

  for (const line of lines) {
    if (/^\s*```/.test(line)) fenced = !fenced;

    const heading = fenced ? null : /^(#{2})\s+(.*)$/.exec(line);
    if (heading) {
      close();
      const text = heading[2].trim();
      current = { heading: text, body: [], level: heading[1].length, key: anchor(text) };
      continue;
    }

    current.body.push(line);
  }
  close();

  return sections;
}

/**
 * Reads every `*.md` of a notes directory.
 *
 * @param {string} directory absolute path of `docs/backend-notes`
 * @returns {Record<string, Record<string, object>>} file stem → sections
 */
function readNotes(directory) {
  if (!fs.existsSync(directory)) {
    throw new Error(
      `The hand-written notes are missing: ${directory}\n` +
        '  The package merges them into the generated documents; create them first.'
    );
  }

  const notes = {};
  for (const file of fs.readdirSync(directory).sort()) {
    if (!file.endsWith('.md')) continue;
    const stem = file.replace(/\.md$/, '');
    notes[stem] = splitSections(fs.readFileSync(path.join(directory, file), 'utf8'));
  }
  return notes;
}

/**
 * One section's body, or a loud failure.
 *
 * @param {object} notes the map {@link readNotes} returned
 * @param {string} reference `<file stem>.<anchor>`
 * @returns {string}
 */
function section(notes, reference) {
  const dot = reference.lastIndexOf('.');
  const stem = reference.slice(0, dot);
  const key = reference.slice(dot + 1);

  const file = notes[stem];
  if (!file) {
    throw new Error(`docs/backend-notes/${stem}.md does not exist (asked for "${reference}")`);
  }

  const found = file[key];
  if (!found || found.body === '') {
    const available = Object.keys(file)
      .filter(Boolean)
      .map((name) => `    ${stem}.${name}`)
      .join('\n');
    throw new Error(
      `docs/backend-notes/${stem}.md has no "## ${key}" section.\n  It has:\n${available}`
    );
  }

  return found.body;
}

/** Every `<stem>.<anchor>` a notes directory offers, sorted. */
const sectionKeys = (notes) =>
  Object.entries(notes)
    .flatMap(([stem, file]) =>
      Object.keys(file)
        .filter(Boolean)
        .map((key) => `${stem}.${key}`)
    )
    .sort();

/**
 * Renders a template: `{{token}}` is replaced by `values[token]`.
 *
 * A token with no value is an error rather than an empty string, so a
 * generated document can never contain `undefined` or a silent gap.
 *
 * @param {string} template the template's text
 * @param {Record<string, string>} values
 * @param {string} name the template's file name, for the error message
 * @returns {string}
 */
function render(template, values, name) {
  const missing = [];

  const out = String(template).replace(/\{\{([a-zA-Z0-9_.-]+)\}\}/g, (match, token) => {
    const value = values[token];
    if (value === undefined || value === null) {
      missing.push(token);
      return match;
    }
    return String(value);
  });

  if (missing.length > 0) {
    throw new Error(`${name}: nothing to put in ${[...new Set(missing)].join(', ')}`);
  }

  return out;
}

module.exports = { readNotes, render, section, sectionKeys, splitSections };
