/**
 * The knowledge graph against Site settings (prompt 51).
 *
 * Every page's structured data names the firm, its phone, its address, its
 * hours and its profiles — and so does Site settings, which the header, the
 * footer and the contact page print. The two were typed separately and nothing
 * compared them, so a number corrected in one stayed wrong in the other, and
 * search engines believe neither when they disagree.
 *
 * These functions read Site settings as a knowledge graph, say which fields
 * differ, and copy them over. They are pure, so the tab only draws what they
 * answer.
 */

/** Two-letter schema.org day codes, Monday first. */
const DAYS = [
  ['monday', 'Mo'],
  ['tuesday', 'Tu'],
  ['wednesday', 'We'],
  ['thursday', 'Th'],
  ['friday', 'Fr'],
  ['saturday', 'Sa'],
  ['sunday', 'Su'],
];

/** Day phrases that stand for several days at once. */
const DAY_PHRASES = {
  daily: 'Mo-Su',
  everyday: 'Mo-Su',
  'every day': 'Mo-Su',
  'all days': 'Mo-Su',
  'all week': 'Mo-Su',
  '7 days': 'Mo-Su',
  '7 days a week': 'Mo-Su',
  weekdays: 'Mo-Fr',
  weekends: 'Sa,Su',
  weekend: 'Sa,Su',
};

/** Hours that mean open around the clock. */
const ALL_DAY = /^(open )?(24 hours|24 hrs|24x7|24\/7|round the clock)$/;

/** Site settings' profile links, in the order the knowledge graph lists them. */
const SOCIAL_KEYS = ['facebook', 'instagram', 'linkedin', 'youtube', 'x', 'pinterest'];

/** Country names Site settings may hold, as the two letters schema.org wants. */
const COUNTRY_CODES = { india: 'IN', bharat: 'IN' };

/** The fields the two are compared on, as the warning names them. */
export const SYNCED_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'E-mail' },
  { key: 'address', label: 'Address' },
  { key: 'geo', label: 'Map position' },
  { key: 'openingHours', label: 'Opening hours' },
  { key: 'sameAs', label: 'Profiles' },
];

const ADDRESS_KEYS = [
  'streetAddress',
  'addressLocality',
  'addressRegion',
  'postalCode',
  'addressCountry',
];

/** Text with its runs of space made one, and none around it. */
const squash = (value) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);

/**
 * The two-letter code of a day as people write it — "Mon", "Tues",
 * "Thursday" — or `null`.
 *
 * @param {string} word
 * @returns {string|null}
 */
function dayCode(word) {
  const text = String(word ?? '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  if (text.length < 2) return null;
  const found = DAYS.find(([name]) => name.startsWith(text) || text.startsWith(name));
  return found ? found[1] : null;
}

/**
 * "Monday to Saturday" as `Mo-Sa`, "Sat & Sun" as `Sa,Su`, "Weekdays" as
 * `Mo-Fr`; `null` when the words are not days.
 *
 * @param {string} value
 * @returns {string|null}
 */
export function daysOf(value) {
  const text = squash(value).toLowerCase().replace(/[–—]/g, '-');
  if (!text) return null;
  if (DAY_PHRASES[text]) return DAY_PHRASES[text];

  const parts = text.split(/\s*(?:,|&|\band\b|\/)\s*/).filter(Boolean);
  const codes = parts.map((part) => {
    const range = part.match(
      /^([a-z.]+)\s*(?:-|\bto\b|\bthrough\b|\bthru\b|\btill\b|\buntil\b)\s*([a-z.]+)$/
    );
    if (range) {
      const from = dayCode(range[1]);
      const to = dayCode(range[2]);
      if (!from || !to) return null;
      return from === to ? from : `${from}-${to}`;
    }
    return dayCode(part);
  });
  return codes.length > 0 && codes.every(Boolean) ? codes.join(',') : null;
}

/**
 * One time of day as `HH:MM`, with whether it said am or pm.
 *
 * @param {string} value
 * @param {'start'|'end'} end which end of a range it is — "midnight" closes a day
 * @returns {{hour: number, minute: number, meridiem: boolean}|null}
 */
function timeOf(value, end) {
  const text = squash(value).toLowerCase();
  if (text === 'noon' || text === '12 noon') return { hour: 12, minute: 0, meridiem: true };
  if (text === 'midnight' || text === '12 midnight') {
    return end === 'end'
      ? { hour: 23, minute: 59, meridiem: true }
      : { hour: 0, minute: 0, meridiem: true };
  }

  const match = text.match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?$/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const meridiem = match[3] ? match[3][0] : null;
  if (minute > 59) return null;
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (meridiem === 'p' ? 12 : 0);
  } else if (hour > 23) {
    return null;
  }
  return { hour, minute, meridiem: Boolean(meridiem) };
}

const clock = ({ hour, minute }) =>
  `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

/**
 * "9:30 am – 6:30 pm" as `09:30-18:30`; `null` when the words are not a span
 * of time ("By appointment"), and `'closed'` when they say so.
 *
 * @param {string} value
 * @returns {string|null}
 */
export function hoursOf(value) {
  const text = squash(value).toLowerCase().replace(/[–—]/g, '-');
  if (!text) return null;
  if (text === 'closed' || text === 'holiday') return 'closed';
  if (ALL_DAY.test(text)) return '00:00-23:59';

  const pieces = text.split(/\s*(?:-|\bto\b|\btill\b|\buntil\b)\s*/);
  if (pieces.length !== 2) return null;
  const start = timeOf(pieces[0], 'start');
  const finish = timeOf(pieces[1], 'end');
  if (!start || !finish) return null;

  // "10 – 7" and "10 am – 7" close in the evening: an end with no am or pm
  // that comes before the start is the afternoon's.
  if (!finish.meridiem && finish.hour * 60 + finish.minute <= start.hour * 60 + start.minute) {
    if (finish.hour + 12 > 23) return null;
    finish.hour += 12;
  }
  if (finish.hour * 60 + finish.minute <= start.hour * 60 + start.minute) return null;
  return `${clock(start)}-${clock(finish)}`;
}

/**
 * Site settings' working hours as schema.org `openingHours` strings, and the
 * lines that have no such form ("Sunday: By appointment"). A closed day is
 * simply not listed, which is how structured data says it.
 *
 * @param {Array<{days: string, hours: string}>} workingHours
 * @returns {{hours: string[], leftOut: string[]}}
 */
export function openingHoursOf(workingHours = []) {
  const hours = [];
  const leftOut = [];
  for (const line of Array.isArray(workingHours) ? workingHours : []) {
    const days = daysOf(line?.days);
    const span = hoursOf(line?.hours);
    if (span === 'closed') continue;
    if (days && span) {
      hours.push(`${days} ${span}`);
    } else if (squash(line?.days) || squash(line?.hours)) {
      leftOut.push([squash(line?.days), squash(line?.hours)].filter(Boolean).join(': '));
    }
  }
  return { hours, leftOut };
}

/** A country as two letters: `IN` for "India"; `null` when it cannot be told. */
function countryCode(value) {
  const text = squash(value);
  if (/^[a-z]{2}$/i.test(text)) return text.toUpperCase();
  return COUNTRY_CODES[text.toLowerCase()] ?? null;
}

/**
 * What Site settings say, as a knowledge graph: every field they have a value
 * for, and `null` (or an empty list) where they have none.
 *
 * @param {object|null} settings the site settings record
 * @returns {{name: string|null, phone: string|null, email: string|null,
 *   address: object, geo: {latitude: number, longitude: number}|null,
 *   openingHours: string[], sameAs: string[], leftOut: string[]}}
 */
export function graphFromSiteSettings(settings) {
  const general = settings?.general ?? {};
  const address = general.address ?? {};
  const social = settings?.social ?? {};
  const { hours, leftOut } = openingHoursOf(general.workingHours);
  const street = [address.line1, address.line2, address.locality]
    .map(squash)
    .filter(Boolean)
    .join(', ');

  return {
    name: squash(general.siteName) || null,
    phone: squash(general.contactPhone) || null,
    email: squash(general.contactEmail) || null,
    address: {
      streetAddress: street || null,
      addressLocality: squash(address.city) || null,
      addressRegion: squash(address.state) || null,
      postalCode: squash(address.pincode) || null,
      addressCountry: countryCode(address.country),
    },
    geo:
      isNumber(general.latitude) && isNumber(general.longitude)
        ? { latitude: general.latitude, longitude: general.longitude }
        : null,
    openingHours: hours,
    sameAs: SOCIAL_KEYS.map((key) => squash(social[key])).filter(Boolean),
    leftOut,
  };
}

/** A phone number as its last ten digits, whatever spacing or `+91` it carries. */
const phoneKey = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
};

/** An address compares without case or trailing slash. */
const urlKey = (value) => squash(value).toLowerCase().replace(/\/+$/, '');

const sameText = (left, right) => squash(left).toLowerCase() === squash(right).toLowerCase();

/**
 * Whether one field of the graph says what Site settings say. A field Site
 * settings leave empty is not compared: there is nothing to disagree with.
 */
const AGREES = {
  name: (graph, site) => !site.name || squash(graph.name) === site.name,
  phone: (graph, site) => !site.phone || phoneKey(graph.phone) === phoneKey(site.phone),
  email: (graph, site) => !site.email || sameText(graph.email, site.email),
  address: (graph, site) =>
    ADDRESS_KEYS.every(
      (key) => !site.address[key] || sameText(graph.address?.[key], site.address[key])
    ),
  geo: (graph, site) =>
    !site.geo ||
    (isNumber(graph.geo?.latitude) &&
      isNumber(graph.geo?.longitude) &&
      Math.abs(graph.geo.latitude - site.geo.latitude) < 1e-6 &&
      Math.abs(graph.geo.longitude - site.geo.longitude) < 1e-6),
  openingHours: (graph, site) => {
    if (site.openingHours.length === 0) return true;
    const listed = new Set((graph.openingHours ?? []).map(squash));
    return (
      listed.size === site.openingHours.length &&
      site.openingHours.every((line) => listed.has(line))
    );
  },
  sameAs: (graph, site) => {
    const listed = new Set((graph.sameAs ?? []).map(urlKey));
    return site.sameAs.every((url) => listed.has(urlKey(url)));
  },
};

/**
 * The fields of the knowledge graph that say something other than Site
 * settings, as the warning names them.
 *
 * @param {object} graph `seoSettings.knowledgeGraph`, as the form holds it
 * @param {object|null} settings the site settings record
 * @returns {Array<{key: string, label: string}>}
 */
export function graphMismatches(graph, settings) {
  if (!settings) return [];
  const site = graphFromSiteSettings(settings);
  return SYNCED_FIELDS.filter(({ key }) => !AGREES[key](graph ?? {}, site));
}

/**
 * The knowledge graph with what Site settings say copied in: every field they
 * have a value for, the address a line at a time; profiles are added to the
 * list rather than replacing it, since the graph may name ones Site settings
 * have no box for.
 *
 * @param {object} graph `seoSettings.knowledgeGraph`, as the form holds it
 * @param {object|null} settings the site settings record
 * @returns {{graph: object, copied: string[], leftOut: string[]}} the new
 *   graph, the labels of the fields it changed, and the working-hours lines
 *   that have no opening-hours form
 */
export function copyFromSiteSettings(graph, settings) {
  const current = graph ?? {};
  if (!settings) return { graph: current, copied: [], leftOut: [] };

  const site = graphFromSiteSettings(settings);
  const next = { ...current };
  const copied = [];

  for (const { key, label } of SYNCED_FIELDS) {
    if (AGREES[key](current, site)) continue;
    copied.push(label);
    if (key === 'address') {
      const filled = Object.fromEntries(
        ADDRESS_KEYS.filter((part) => site.address[part]).map((part) => [part, site.address[part]])
      );
      next.address = { ...(current.address ?? {}), ...filled };
    } else if (key === 'sameAs') {
      const listed = new Set((current.sameAs ?? []).map(urlKey));
      next.sameAs = [
        ...(current.sameAs ?? []),
        ...site.sameAs.filter((url) => !listed.has(urlKey(url))),
      ];
    } else if (key === 'openingHours') {
      next.openingHours = [...site.openingHours];
    } else if (key === 'geo') {
      next.geo = { ...site.geo };
    } else {
      next[key] = site[key];
    }
  }

  return { graph: next, copied, leftOut: site.leftOut };
}

/** "Name, Phone and Address". */
export function listOf(labels = []) {
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}
