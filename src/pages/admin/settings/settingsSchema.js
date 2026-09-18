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
import {
  EMAIL_PATTERN,
  INDIAN_MOBILE_PATTERN,
  URL_PATTERN,
  validate,
} from '../../../utils/validation';

const contract = schemas['settings.update'];

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
    pattern: /^G-[A-Z0-9]{6,12}$/,
    example: 'G-ABCD123456',
    message: 'A GA4 measurement ID looks like “G-ABCD123456”.',
    uppercase: true,
  },
  googleTagManagerId: {
    pattern: /^GTM-[A-Z0-9]{4,10}$/,
    example: 'GTM-ABCD123',
    message: 'A Tag Manager container ID looks like “GTM-ABCD123”.',
    uppercase: true,
  },
  facebookPixelId: {
    pattern: /^\d{8,20}$/,
    example: '123456789012345',
    message: 'A Meta pixel ID is 8 to 20 digits.',
  },
  googleMapsApiKey: {
    pattern: /^AIza[\w-]{20,60}$/,
    example: 'AIzaSy…',
    message: 'A Google Maps browser key starts with “AIza”.',
  },
  cloudinaryCloudName: {
    pattern: /^[A-Za-z0-9][A-Za-z0-9_-]{2,40}$/,
    example: 'dn9gyaiik',
    message: 'A cloud name is letters, digits, hyphens and underscores.',
  },
  cloudinaryUploadPreset: {
    pattern: /^[\w-]{3,80}$/,
    example: 'sna-unsigned',
    message: 'A preset name is letters, digits, hyphens and underscores.',
  },
  recaptchaSiteKey: {
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
const digitsOf = (value) => compactNumber(value).replace(/^\+/, '');

/** Whether a phone number is one the API's `phone` type would accept. */
export const isIndianMobile = (value) => INDIAN_MOBILE_PATTERN.test(compactNumber(value));

/**
 * `9876543210` or `+919876543210` → `+91 98765 43210`.
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
  const compact = compactNumber(value);
  if (!INDIAN_MOBILE_PATTERN.test(compact)) return text(value);
  const digits = compact.replace(/^\+91/, '');
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

/** A site address with no trailing slash — what canonicals are built from. */
export const trimTrailingSlash = (value) => text(value).replace(/\/+$/, '');

/**
 * Whether a link target resolves: an in-app path, an anchor on the current
 * page (`#post-requirement` opens the lead modal, D82), a full address, or a
 * `mailto:` / `tel:`.
 */
export const isUsableHref = (value) =>
  /^\//.test(text(value)) ||
  /^#[\w-]+$/.test(text(value)) ||
  /^(https?:\/\/|mailto:|tel:)/i.test(text(value));

const HREF_MESSAGE = 'Use a path (/buy), an anchor (#post-requirement) or a full https:// address.';

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

  if (filled(general.whatsappNumber)) {
    const digits = digitsOf(general.whatsappNumber);
    if (
      !/^\+?[\d\s-]+$/.test(text(general.whatsappNumber)) ||
      digits.length < 10 ||
      digits.length > 15
    ) {
      errors['general.whatsappNumber'] =
        'Digits only, 10 to 15 of them, with the country code — for example +91 98765 43210.';
    } else if (!isIndianMobile(general.whatsappNumber)) {
      errors['general.whatsappNumber'] = PHONE_MESSAGE;
    }
  }

  if (filled(address.pincode) && !/^\d{6}$/.test(text(address.pincode))) {
    errors['general.address.pincode'] = 'An Indian PIN code is six digits.';
  }

  if (filled(general.mapEmbedUrl) && !text(general.mapEmbedUrl).startsWith(MAP_EMBED_PREFIX)) {
    errors['general.mapEmbedUrl'] =
      `Paste the address from Google Maps → Share → Embed a map; it starts with ${MAP_EMBED_PREFIX}.`;
  }

  /* Hero ---------------------------------------------------------- */

  const longBadge = (hero.badges ?? []).find((badge) => text(badge).length > 60);
  if (longBadge) {
    errors['hero.badges'] =
      `“${text(longBadge).slice(0, 24)}…” is too long — keep a badge under 60 characters.`;
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

  return errors;
}

/* ------------------------------------------------------------------ *
 * The body the API receives
 * ------------------------------------------------------------------ */

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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

  return payload;
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

export default settingsSchema;
