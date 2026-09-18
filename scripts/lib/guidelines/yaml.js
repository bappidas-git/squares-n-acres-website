/**
 * A YAML emitter for the subset the generated `openapi.yaml` uses: maps,
 * sequences, strings, numbers, booleans and `null`.
 *
 * Writing one by hand keeps the handover package dependency-free (prompt 47
 * §12 allows no new packages) and keeps the output deterministic: keys are
 * emitted in the order the object declares them, two spaces per level, LF
 * endings, and a string is quoted only when YAML would otherwise read it as
 * something else.
 */

/** Strings YAML 1.1 readers turn into booleans or null if left bare. */
const RESERVED = new Set([
  'true',
  'false',
  'yes',
  'no',
  'on',
  'off',
  'null',
  '~',
  'y',
  'n',
  'True',
  'False',
  'Null',
  'NULL',
  'TRUE',
  'FALSE',
]);

/** Whether a scalar string can be written without quotes. */
function isPlain(value) {
  if (value === '') return false;
  if (RESERVED.has(value)) return false;
  if (/^[-?:,[\]{}#&*!|>'"%@`]/.test(value)) return false;
  if (/^\s|\s$/.test(value)) return false;
  if (/:\s|\s#/.test(value)) return false;
  if (/[:#]$/.test(value)) return false;
  if (/^[-+]?(\d[\d_]*(\.\d*)?([eE][-+]?\d+)?)$/.test(value)) return false;
  if (/^0[xob]/i.test(value)) return false;
  // A control character has to be quoted; writing the class as a regular
  // expression would need an escape ESLint rightly refuses.
  return ![...value].some((character) => character.charCodeAt(0) < 0x20);
}

/** One scalar, quoted only when it has to be. */
function scalar(value, indent) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';

  const text = String(value);

  if (text.includes('\n')) {
    // A block scalar keeps Markdown in the descriptions readable.
    const pad = ' '.repeat(indent + 2);
    const body = text
      .replace(/\s+$/, '')
      .split('\n')
      .map((line) => (line === '' ? '' : `${pad}${line}`))
      .join('\n');
    return `|-\n${body}`;
  }

  if (isPlain(text)) return text;
  return `'${text.replace(/'/g, "''")}'`;
}

const isMap = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Renders a value as YAML.
 *
 * @param {*} value
 * @param {number} [indent] the current indentation, in spaces
 * @returns {string} YAML without a document marker and without a trailing newline
 */
function toYaml(value, indent = 0) {
  const pad = ' '.repeat(indent);

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return value
      .map((item) => {
        if (isMap(item) || Array.isArray(item)) {
          const body = toYaml(item, indent + 2);
          return `${pad}- ${body.slice(indent + 2)}`;
        }
        return `${pad}- ${scalar(item, indent)}`;
      })
      .join('\n');
  }

  if (isMap(value)) {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined);
    if (entries.length === 0) return '{}';

    return entries
      .map(([key, item]) => {
        const name = isPlain(key) ? key : `'${key.replace(/'/g, "''")}'`;
        if (Array.isArray(item)) {
          if (item.length === 0) return `${pad}${name}: []`;
          return `${pad}${name}:\n${toYaml(item, indent + 2)}`;
        }
        if (isMap(item)) {
          if (Object.keys(item).length === 0) return `${pad}${name}: {}`;
          return `${pad}${name}:\n${toYaml(item, indent + 2)}`;
        }
        return `${pad}${name}: ${scalar(item, indent)}`;
      })
      .join('\n');
  }

  return `${pad}${scalar(value, indent)}`;
}

/** A whole document: YAML plus the final newline a file needs. */
const document = (value) => `${toYaml(value, 0)}\n`;

module.exports = { document, isPlain, toYaml };
