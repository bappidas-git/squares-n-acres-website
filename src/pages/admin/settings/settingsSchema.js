/**
 * The client half of the settings contract (00_MASTER_CONTEXT.md §6.13).
 *
 * It starts from `schemas['settings.update']` — the descriptor the mock
 * validator enforces — and tightens it where a browser can be stricter than the
 * API: the counts the layouts can actually render (four hero stats, four footer
 * columns of eight links, six gallery pictures) and the shapes of the seven
 * integration ids, which the model stores as plain strings because a Laravel
 * migration has no opinion about what a GA4 measurement id looks like.
 *
 * Stricter in one direction only: everything this file accepts, the API accepts
 * too, so the screen never sends a body it believes in and the server refuses.
 *
 *   useForm({ schema: settingsSchema, validate: validateSettings,
 *             normalize: normalizeSettings })
 *
 * `validateSettings` carries the rules the descriptor mini-language cannot
 * state — a `wa.me`-able number, an embed address that is an embed address, a
 * CTA target that resolves — and the sentences a person would rather read than
 * "The general.contactPhone must be a valid Indian mobile number."
 */

import { schemas } from '../../../services/schemas';
import { EMAIL_PATTERN, URL_PATTERN, validate } from '../../../utils/validation';
import { WHATSAPP_PLACEHOLDERS } from '../../../config/leadWhatsapp';

const contract = schemas['settings.update'];

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A branch descriptor with some of its fields replaced. */
const withShape = (descriptor, overrides) => ({
  ...descriptor,
  shape: { ...descriptor.shape, ...overrides },
});

/** The year an "established in" cannot be later than. */
export const CURRENT_YEAR = new Date().getFullYear();

/** What the public layouts can render, which is less than the API will store. */
export const LIMITS = {
  heroStats: 4,
  heroBadges: 4,
  footerColumns: 4,
  footerLinks: 8,
  footerGallery: 6,
  /** Fewer than this and the footer collage is not a collage (D79). */
  footerGalleryMinimum: 3,
};

/** The one address Google's "Embed a map" dialog produces. */
export const MAP_EMBED_PREFIX = 'https://www.google.com/maps/embed';

/**
 * What each integration id looks like when it is real.
 *
 * None of them is a secret (§6.13): every one of these ends up in the HTML of
 * a public page, which is exactly why a typo is expensive — a mistyped
 * measurement id does not fail, it silently collects nothing.
 */
export const INTEGRATION_PATTERNS = {
  googleAnalyticsId: {
    label: 'GA4 measurement ID',
    pattern: /^G-[A-Z0-9]{6,12}$/,
    example: 'G-ABCD123456',
    message: 'A GA4 measurement ID looks like “G-ABCD123456”.',
    uppercase: true,
  },
  googleTagManagerId: {
    label: 'Tag Manager container ID',
    pattern: /^GTM-[A-Z0-9]{4,10}$/,
    example: 'GTM-ABCD123',
    message: 'A Tag Manager container ID looks like “GTM-ABCD123”.',
    uppercase: true,
  },
  facebookPixelId: {
    label: 'Meta pixel ID',
    pattern: /^\d{8,20}$/,
    example: '123456789012345',
    message: 'A Meta pixel ID is 8 to 20 digits.',
  },
  googleMapsApiKey: {
    label: 'Google Maps browser key',
    pattern: /^AIza[\w-]{20,60}$/,
    example: 'AIzaSy…',
    message: 'A Google Maps browser key starts with “AIza”.',
  },
  cloudinaryCloudName: {
    label: 'Cloudinary cloud name',
    pattern: /^[A-Za-z0-9][A-Za-z0-9_-]{2,40}$/,
    example: 'dn9gyaiik',
    message: 'A cloud name is letters, digits, hyphens and underscores.',
  },
  cloudinaryUploadPreset: {
    label: 'Cloudinary unsigned upload preset',
    pattern: /^[\w-]{3,80}$/,
    example: 'sna-unsigned',
    message: 'A preset name is letters, digits, hyphens and underscores.',
  },
  recaptchaSiteKey: {
    label: 'reCAPTCHA site key',
    pattern: /^6L[\w-]{20,60}$/,
    example: '6Lc…',
    message: 'A reCAPTCHA site key starts with “6L”.',
  },
};

/**
 * The descriptor the form validates against: the contract, with the counts and
 * the id formats the browser knows about.
 */
export const settingsSchema = {
  ...contract,

  general: withShape(contract.general, {
    establishedYear: {
      ...contract.general.shape.establishedYear,
      min: 1900,
      max: CURRENT_YEAR,
    },
  }),

  hero: withShape(contract.hero, {
    stats: { ...contract.hero.shape.stats, max: LIMITS.heroStats },
    badges: { ...contract.hero.shape.badges, max: LIMITS.heroBadges },
  }),

  footer: withShape(contract.footer, {
    columns: {
      ...contract.footer.shape.columns,
      max: LIMITS.footerColumns,
      items: {
        ...contract.footer.shape.columns.items,
        shape: {
          ...contract.footer.shape.columns.items.shape,
          links: {
            ...contract.footer.shape.columns.items.shape.links,
            max: LIMITS.footerLinks,
          },
        },
      },
    },
    galleryImageUrls: {
      ...contract.footer.shape.galleryImageUrls,
      max: LIMITS.footerGallery,
    },
  }),

  integrations: withShape(
    contract.integrations,
    Object.fromEntries(
      Object.entries(INTEGRATION_PATTERNS).map(([field, rule]) => [
        field,
        { ...contract.integrations.shape[field], pattern: rule.pattern.source },
      ])
    )
  ),
};

/* ------------------------------------------------------------------ *
 * The rules a descriptor cannot state
 * ------------------------------------------------------------------ */

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const filled = (value) => text(value) !== '';
const compactNumber = (value) => text(value).replace(/[\s-]/g, '');

/**
 * The ten digits of an Indian mobile number however it was written — `98765
 * 43210`, `+91-98765-43210`, `919876543210`, `09876543210` — or `null`.
 *
 * The WhatsApp box asked for "digits with the country code", and
 * `919876543210` — exactly that — was refused, as was the `0` a number is
 * dialled with inside India (QA-64).
 *
 * @param {string} value
 * @returns {string|null}
 */
function mobileDigits(value) {
  const compact = compactNumber(value);
  const match = /^(?:\+91|91|0)?([6-9]\d{9})$/.exec(compact);
  return match ? match[1] : null;
}

/** Whether a phone number is an Indian mobile — what the API's `phone` type accepts, once formatted. */
export const isIndianMobile = (value) => mobileDigits(value) !== null;

/**
 * `9876543210`, `+919876543210`, `919876543210` or `09876543210` →
 * `+91 98765 43210`.
 *
 * The record keeps what a person would read, because the footer, the contact
 * page and the agent card print this string as it is stored; `tel:` and
 * `wa.me` targets are derived from it by `utils/format.js`, which strips the
 * spaces again. A number that is not an Indian mobile is left exactly as typed,
 * so the message says what is wrong rather than the field rewriting it.
 *
 * @param {string} value
 * @returns {string}
 */
export function formatIndianPhone(value) {
  const digits = mobileDigits(value);
  if (!digits) return text(value);
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

/** The three phone boxes of the record, which are stored in the readable form. */
export const PHONE_FIELDS = ['contactPhone', 'alternatePhone', 'whatsappNumber'];

/** A copy of `general` with its phone numbers in the readable form. */
const withReadablePhones = (general) => {
  if (!isPlainObject(general)) return general;
  const next = { ...general };
  for (const field of PHONE_FIELDS) {
    if (typeof next[field] === 'string' && isIndianMobile(next[field])) {
      next[field] = formatIndianPhone(next[field]);
    }
  }
  return next;
};

/**
 * The record as the form holds it: what the API stores, with the phone
 * numbers in the form the boxes write them.
 *
 * The seed stores `+919800000001`, and the box rewrites a number to `+91 98000
 * 00001` when the cursor leaves it — so tabbing through the Contact tab, or
 * clicking into the phone box and out again, raised "You have unsaved
 * changes" over a form nobody had changed (QA-64). Starting from the readable
 * form, leaving a box changes nothing; and since a save sends only what
 * changed, the number is not rewritten on the server either until somebody
 * edits it.
 *
 * @param {object|null} record the settings as `GET /admin/settings` answers them
 * @returns {object}
 */
export function prepareSettings(record) {
  if (!isPlainObject(record)) return {};
  return { ...record, general: withReadablePhones(record.general) };
}

/** A site address with no trailing slash — what canonicals are built from. */
export const trimTrailingSlash = (value) => text(value).replace(/\/+$/, '');

/**
 * Whether a link target resolves: an in-app path, an anchor on the current
 * page (`#post-requirement` opens the lead modal, D82), a full address, or a
 * `mailto:` / `tel:`.
 *
 * `//host` is not a path: a browser reads it as an address on another site
 * without saying which protocol, and it passed as one (QA-64).
 */
export const isUsableHref = (value) =>
  /^\/(?!\/)/.test(text(value)) ||
  /^#[\w-]+$/.test(text(value)) ||
  /^(https?:\/\/|mailto:|tel:)/i.test(text(value));

const HREF_MESSAGE = 'Use a path (/buy), an anchor (#post-requirement) or a full https:// address.';

/** Whether a number box holds a number (an empty one holds `null` or `''`). */
const isNumberSet = (value) =>
  value !== null && value !== undefined && value !== '' && !Number.isNaN(Number(value));

/** What a hero badge may run to (`hero.badges.*`, §6.13). */
export const BADGE_MAX_LENGTH = 60;

/**
 * Everything the schema cannot say, as the flat dotted map a 422 uses.
 *
 * @param {object} values the whole settings record as the form holds it
 * @returns {Record<string, string>}
 */
export function validateSettings(values = {}) {
  const errors = {};
  const general = values.general ?? {};
  const address = general.address ?? {};
  const navigation = values.navigation ?? {};
  const footer = values.footer ?? {};
  const hero = values.hero ?? {};
  const integrations = values.integrations ?? {};
  const leads = values.leads ?? {};

  /* General ------------------------------------------------------- */

  if (!filled(general.siteName)) {
    errors['general.siteName'] = 'Name the site — it is the brand name in every title and tab.';
  }

  if (!filled(general.siteUrl)) {
    errors['general.siteUrl'] = 'The site address is what every canonical URL is built from.';
  } else if (!URL_PATTERN.test(trimTrailingSlash(general.siteUrl))) {
    errors['general.siteUrl'] = 'Start with https:// — for example https://www.squaresnacres.com.';
  }

  if (filled(general.establishedYear) || typeof general.establishedYear === 'number') {
    const year = Number(general.establishedYear);
    if (!Number.isInteger(year) || year < 1900 || year > CURRENT_YEAR) {
      errors['general.establishedYear'] = `Use a year between 1900 and ${CURRENT_YEAR}.`;
    }
  }

  /* Contact ------------------------------------------------------- */

  if (!filled(general.contactEmail)) {
    errors['general.contactEmail'] = 'The address the footer and the contact page print.';
  } else if (!EMAIL_PATTERN.test(text(general.contactEmail))) {
    errors['general.contactEmail'] = 'That is not an e-mail address.';
  }

  const PHONE_MESSAGE = 'Enter a 10-digit Indian mobile number, with or without +91.';
  if (!filled(general.contactPhone)) {
    errors['general.contactPhone'] =
      'The number in the header, the footer and every property page.';
  } else if (!isIndianMobile(general.contactPhone)) {
    errors['general.contactPhone'] = PHONE_MESSAGE;
  }

  if (filled(general.alternatePhone) && !isIndianMobile(general.alternatePhone)) {
    errors['general.alternatePhone'] = PHONE_MESSAGE;
  }

  // The API stores an Indian mobile here (`phone`), so that is what is asked
  // for — the hint used to promise "10 to 15 digits with the country code" and
  // the check then refused every number that was not Indian (QA-64).
  if (filled(general.whatsappNumber) && !isIndianMobile(general.whatsappNumber)) {
    errors['general.whatsappNumber'] =
      'Enter the Indian mobile number WhatsApp runs on — 10 digits, with or without +91.';
  }

  if (filled(address.pincode) && !/^\d{6}$/.test(text(address.pincode))) {
    errors['general.address.pincode'] = 'An Indian PIN code is six digits.';
  }

  if (filled(general.mapEmbedUrl) && !text(general.mapEmbedUrl).startsWith(MAP_EMBED_PREFIX)) {
    errors['general.mapEmbedUrl'] =
      `Paste the address from Google Maps → Share → Embed a map; it starts with ${MAP_EMBED_PREFIX}.`;
  }

  // One coordinate is no place: the map drew nothing and the knowledge graph
  // was handed half a position (QA-64).
  const hasLatitude = isNumberSet(general.latitude);
  const hasLongitude = isNumberSet(general.longitude);
  if (hasLatitude && !hasLongitude) {
    errors['general.longitude'] = 'Add the longitude too — the map needs both, or neither.';
  } else if (hasLongitude && !hasLatitude) {
    errors['general.latitude'] = 'Add the latitude too — the map needs both, or neither.';
  }

  (Array.isArray(general.workingHours) ? general.workingHours : []).forEach((row, index) => {
    const at = `general.workingHours.${index}`;
    if (!filled(row?.days)) errors[`${at}.days`] = 'Say which days this row is for.';
    if (!filled(row?.hours)) errors[`${at}.hours`] = 'Say the hours for these days.';
  });

  /* Hero ---------------------------------------------------------- */

  (Array.isArray(hero.stats) ? hero.stats : []).forEach((stat, index) => {
    const at = `hero.stats.${index}`;
    if (!filled(stat?.label)) errors[`${at}.label`] = 'Name what this counter counts.';
    if (!filled(stat?.value)) errors[`${at}.value`] = 'Give the counter its number.';
  });

  const longBadge = (hero.badges ?? []).find((badge) => text(badge).length > BADGE_MAX_LENGTH);
  if (longBadge) {
    errors['hero.badges'] =
      `“${text(longBadge).slice(0, 24)}…” is too long — keep a badge to ${BADGE_MAX_LENGTH} characters.`;
  }

  /* Navigation and footer ----------------------------------------- */

  if (!filled(navigation.headerCtaLabel)) {
    errors['navigation.headerCtaLabel'] = 'The button needs a label.';
  }
  if (!filled(navigation.headerCtaHref)) {
    errors['navigation.headerCtaHref'] = 'The button needs somewhere to go.';
  } else if (!isUsableHref(navigation.headerCtaHref)) {
    errors['navigation.headerCtaHref'] = HREF_MESSAGE;
  }

  (footer.columns ?? []).forEach((column, index) => {
    if (!filled(column?.title)) {
      errors[`footer.columns.${index}.title`] = 'Name the column.';
    }
    (column?.links ?? []).forEach((link, position) => {
      const at = `footer.columns.${index}.links.${position}`;
      if (!filled(link?.label)) errors[`${at}.label`] = 'The link needs a label.';
      if (!filled(link?.href)) errors[`${at}.href`] = 'The link needs a target.';
      else if (!isUsableHref(link.href)) errors[`${at}.href`] = HREF_MESSAGE;
    });
  });

  // "Add a picture" adds an empty slot to fill; left empty it was refused as
  // "The footer.galleryImageUrls.0 must be a valid URL." (QA-64).
  (Array.isArray(footer.galleryImageUrls) ? footer.galleryImageUrls : []).forEach((url, index) => {
    if (!filled(url)) {
      errors[`footer.galleryImageUrls.${index}`] =
        'Choose a picture for this slot, or remove the slot.';
    }
  });

  /* Integrations --------------------------------------------------- */

  for (const [field, rule] of Object.entries(INTEGRATION_PATTERNS)) {
    const value = text(integrations[field]);
    if (value !== '' && !rule.pattern.test(value)) errors[`integrations.${field}`] = rule.message;
  }

  /* Lead notifications --------------------------------------------- */

  const badEmail = (leads.notificationEmails ?? []).find(
    (email) => !EMAIL_PATTERN.test(text(email))
  );
  if (badEmail !== undefined) {
    errors['leads.notificationEmails'] = `“${badEmail}” is not an e-mail address.`;
  }

  // A placeholder the buttons do not know would be sent to the lead as typed,
  // braces and all (prompt 51).
  const unknownPlaceholder = (text(leads.whatsappTemplate).match(/\{[^{}]*\}/g) ?? []).find(
    (token) => !WHATSAPP_PLACEHOLDERS.some((placeholder) => `{${placeholder.key}}` === token)
  );
  if (unknownPlaceholder) {
    errors['leads.whatsappTemplate'] =
      `${unknownPlaceholder} is not a placeholder — use ${WHATSAPP_PLACEHOLDERS.map(
        (placeholder) => `{${placeholder.key}}`
      ).join(', ')}.`;
  }

  return errors;
}

/* ------------------------------------------------------------------ *
 * The body the API receives
 * ------------------------------------------------------------------ */

/**
 * One branch, trimmed and reduced to the keys the model declares — the same
 * "known keys only" rule the mock applies to what arrives (§5.14), applied
 * before it leaves, so an empty optional box travels as `null` rather than as
 * an empty string the contract never described.
 */
function normalizeBranch(value, descriptor) {
  if (!descriptor) return value;

  if (descriptor.type === 'object' && descriptor.shape) {
    if (!isPlainObject(value)) return value;
    const result = {};
    for (const [key, child] of Object.entries(descriptor.shape)) {
      if (!(key in value)) continue;
      result[key] = normalizeBranch(value[key], child);
    }
    return result;
  }

  if (descriptor.type === 'array' && descriptor.items) {
    return Array.isArray(value)
      ? value.map((entry) => normalizeBranch(entry, descriptor.items))
      : value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' && descriptor.nullable ? null : trimmed;
  }

  return value;
}

/**
 * The whole settings object as the `PUT` should carry it.
 *
 * @param {object} values
 * @returns {object}
 */
export function normalizeSettings(values = {}) {
  const payload = normalizeBranch(values, { type: 'object', shape: settingsSchema });

  if (payload.general && typeof payload.general.siteUrl === 'string') {
    payload.general.siteUrl = trimTrailingSlash(payload.general.siteUrl);
  }

  // A number typed as `919876543210` passes the form's check, and the API's
  // `phone` type would refuse it as typed: it leaves as `+91 98765 43210`
  // even when the box was never left (QA-64).
  if (isPlainObject(payload.general)) payload.general = withReadablePhones(payload.general);

  return payload;
}

const sameJson = (left, right) => JSON.stringify(left) === JSON.stringify(right);

/**
 * The part of a settings body that differs from the one the form started from.
 *
 * Objects are compared key by key and descended into; anything else — text, a
 * number, `null`, a switch, and a whole array, which the API replaces rather
 * than merges (§5.14) — travels whole when it differs. The API deep-merges
 * what it receives, so what is not sent is left as it is on the server.
 *
 * Sending the whole record meant a form opened before a colleague's save put
 * their change back when it saved something else: two admins, or one admin in
 * two tabs, and the hero title saved in one was silently reverted by a tagline
 * saved in the other (QA-64).
 *
 * @param {object} next the body the form would send (`normalizeSettings`)
 * @param {object} base the same for the values the form started from
 * @returns {object} only the keys whose value changed; `{}` when none did
 */
export function changedSettings(next = {}, base = {}) {
  const changes = {};
  for (const [key, value] of Object.entries(next ?? {})) {
    const before = base?.[key];
    if (isPlainObject(value) && isPlainObject(before)) {
      const nested = changedSettings(value, before);
      if (Object.keys(nested).length > 0) changes[key] = nested;
    } else if (!sameJson(value, before)) {
      changes[key] = value;
    }
  }
  return changes;
}

/**
 * Every message a set of values would produce — the schema's and the rules
 * above, in the one flat map `useForm` builds internally.
 *
 * The screen asks for it before a save so it knows which tab to open when the
 * save does not happen; `useForm` runs the same two checks itself.
 *
 * @param {object} values
 * @returns {Record<string, string>}
 */
export function settingsErrors(values = {}) {
  return {
    ...validate(normalizeSettings(values), settingsSchema),
    ...validateSettings(values),
  };
}

/* ------------------------------------------------------------------ *
 * What the messages call each field
 * ------------------------------------------------------------------ */

/**
 * The words for each key of the record, as a sentence says them.
 *
 * The schema and the API name a field by its key — "The general.siteName may
 * not be greater than 120 characters.", "The hero.stats.0.label field is
 * required." — and those sentences reached the screen as they were (QA-64).
 */
const FIELD_LABELS = {
  'general.siteName': 'site name',
  'general.tagline': 'tagline',
  'general.logoUrl': 'logo address',
  'general.iconUrl': 'icon address',
  'general.siteUrl': 'site URL',
  'general.defaultLanguage': 'default language',
  'general.contactEmail': 'contact e-mail',
  'general.contactPhone': 'phone number',
  'general.alternatePhone': 'alternate phone number',
  'general.whatsappNumber': 'WhatsApp number',
  'general.whatsappDefaultMessage': 'default WhatsApp message',
  'general.address': 'office address',
  'general.address.line1': 'address line 1',
  'general.address.line2': 'address line 2',
  'general.address.locality': 'locality',
  'general.address.city': 'city',
  'general.address.state': 'state',
  'general.address.pincode': 'PIN code',
  'general.address.country': 'country',
  'general.mapEmbedUrl': 'map embed URL',
  'general.latitude': 'latitude',
  'general.longitude': 'longitude',
  'general.workingHours': 'opening hours',
  'general.reraNumber': 'RERA number',
  'general.gstNumber': 'GST number',
  'general.establishedYear': 'year the firm was established',
  'hero.title': 'hero title',
  'hero.subtitle': 'hero subtitle',
  'hero.backgroundImageUrl': 'background image address',
  'hero.backgroundVideoUrl': 'background video address',
  'hero.mobileImageUrl': 'mobile image address',
  'hero.searchTabs': 'search tabs',
  'hero.stats': 'counters',
  'hero.badges': 'badges',
  'navigation.headerCtaLabel': 'call-to-action label',
  'navigation.headerCtaHref': 'call-to-action target',
  'navigation.showCallButton': 'call button switch',
  'navigation.showWhatsappButton': 'WhatsApp button switch',
  'social.facebook': 'Facebook address',
  'social.instagram': 'Instagram address',
  'social.linkedin': 'LinkedIn address',
  'social.youtube': 'YouTube address',
  'social.x': 'X address',
  'social.pinterest': 'Pinterest address',
  'footer.aboutText': 'about text',
  'footer.columns': 'footer columns',
  'footer.disclaimer': 'disclaimer',
  'footer.copyrightText': 'copyright line',
  'footer.showNewsletter': 'newsletter switch',
  'footer.showGallery': 'gallery switch',
  'footer.galleryImageUrls': 'footer gallery',
  'newsletter.enabled': 'newsletter switch',
  'newsletter.title': 'newsletter title',
  'newsletter.subtitle': 'newsletter subtitle',
  'newsletter.successMessage': 'success message',
  'leads.notificationEmails': 'notification e-mails',
  'leads.autoAssign': 'automatic assignment',
  'leads.defaultPriority': 'default priority',
  'leads.whatsappTemplate': 'WhatsApp message',
  ...Object.fromEntries(
    Object.entries(INTEGRATION_PATTERNS).map(([field, rule]) => [
      `integrations.${field}`,
      rule.label,
    ])
  ),
};

/** The rows of the repeaters, numbered from 1 as the screen numbers them. */
const ROW_LABELS = [
  [/^general\.workingHours\.(\d+)\.days$/, (row) => `days of opening-hours row ${row}`],
  [/^general\.workingHours\.(\d+)\.hours$/, (row) => `hours of opening-hours row ${row}`],
  [/^general\.workingHours\.(\d+)$/, (row) => `opening-hours row ${row}`],
  [/^hero\.searchTabs\.(\d+)$/, (row) => `search tab ${row}`],
  [/^hero\.stats\.(\d+)\.label$/, (row) => `label of counter ${row}`],
  [/^hero\.stats\.(\d+)\.value$/, (row) => `value of counter ${row}`],
  [/^hero\.stats\.(\d+)\.suffix$/, (row) => `suffix of counter ${row}`],
  [/^hero\.stats\.(\d+)$/, (row) => `counter ${row}`],
  [/^hero\.badges\.(\d+)$/, (row) => `badge ${row}`],
  [/^footer\.columns\.(\d+)\.title$/, (row) => `title of footer column ${row}`],
  [/^footer\.columns\.(\d+)\.links$/, (row) => `links of footer column ${row}`],
  [
    /^footer\.columns\.(\d+)\.links\.(\d+)\.label$/,
    (row, link) => `label of link ${link} in footer column ${row}`,
  ],
  [
    /^footer\.columns\.(\d+)\.links\.(\d+)\.href$/,
    (row, link) => `target of link ${link} in footer column ${row}`,
  ],
  [/^footer\.columns\.(\d+)$/, (row) => `footer column ${row}`],
  [/^footer\.galleryImageUrls\.(\d+)$/, (row) => `gallery picture ${row}`],
  [/^leads\.notificationEmails\.(\d+)$/, (row) => `notification e-mail ${row}`],
];

/**
 * What a sentence calls a key of the settings record — `useForm`'s `labels`.
 *
 * @param {string} key a dotted path, `hero.stats.2.label`
 * @returns {string|undefined}
 */
export function settingsLabel(key) {
  const path = String(key ?? '');
  if (FIELD_LABELS[path]) return FIELD_LABELS[path];
  for (const [pattern, label] of ROW_LABELS) {
    const match = pattern.exec(path);
    if (match) return label(...match.slice(1).map((index) => Number(index) + 1));
  }
  return undefined;
}

/**
 * The fields that show one message for a whole list — the badges and the
 * notification e-mails are chips, the search tabs checkboxes — so a message
 * about one entry (`hero.badges.2`, an API's 422) is shown, and counted, on
 * the list (QA-64). It was counted twice beside the list's own message, and a
 * server's message about one address was never shown at all.
 */
const LIST_FIELDS = ['hero.badges', 'hero.searchTabs', 'leads.notificationEmails'];

/**
 * The field that shows the message of a key.
 *
 * @param {string} key
 * @returns {string}
 */
export function displayedAt(key) {
  const path = String(key ?? '');
  return LIST_FIELDS.find((list) => path.startsWith(`${list}.`)) ?? path;
}

/**
 * The message a list field shows: its own, or the first about one of its entries.
 *
 * @param {Record<string, string>} errors the form's flat map
 * @param {string} path the list's key, `hero.badges`
 * @returns {string|undefined}
 */
export function listError(errors, path) {
  if (errors?.[path]) return errors[path];
  const entry = Object.keys(errors ?? {}).find((key) => displayedAt(key) === path);
  return entry ? errors[entry] : undefined;
}

export default settingsSchema;
