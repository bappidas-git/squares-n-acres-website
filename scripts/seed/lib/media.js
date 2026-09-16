/**
 * The media library is derived, not written.
 *
 * `scripts/validate-seed.js` enforces both halves of the rule: every image the
 * seed shows has a `media` record, and `media` holds nothing the seed does not
 * show. Hand-maintaining that list across forty properties is a losing game,
 * so every image URL in the seed is minted through this registry — the URL and
 * its metadata are decided in the same expression — and `records()` emits the
 * collection at the end of the build.
 *
 * Photographs are `picsum.photos` seeds (§10): the seed string is part of the
 * URL, so the same record always gets the same photograph and a rebuild does
 * not reshuffle the site's imagery.
 */

const { daysAgo } = require('./dates');

/** The brand assets, the only Cloudinary URLs in the seed (§2.1). */
const BRAND = {
  logoUrl: 'https://res.cloudinary.com/dn9gyaiik/image/upload/v1789465788/sna-logo_o09ugt.png',
  iconUrl: 'https://res.cloudinary.com/dn9gyaiik/image/upload/v1789465791/sna-icon_efty7z.png',
  ogImageUrl:
    'https://res.cloudinary.com/dn9gyaiik/image/upload/w_1200,h_630,c_pad,b_white/v1789465788/sna-logo_o09ugt.png',
};

/** The placeholder document every brochure, approval and price list points at. */
const PLACEHOLDER_PDF = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

/** A neutral, permanently available YouTube id used for listing videos. */
const PLACEHOLDER_VIDEO = 'https://www.youtube.com/watch?v=ysz5S6PUM-U';

/** A placeholder 360° tour link (three listings carry one). */
const PLACEHOLDER_TOUR = 'https://www.squaresnacres.com/virtual-tour/placeholder';

function createMediaRegistry() {
  /** @type {Map<string, object>} url → the record fields, first registration wins */
  const entries = new Map();

  /**
   * Registers a URL and returns it, so a caller can write
   * `heroImageUrl: media.photo({ … })` and never hold the string twice.
   */
  function register(url, fields) {
    if (!entries.has(url)) entries.set(url, { url, ...fields });
    return url;
  }

  return {
    /**
     * A `picsum.photos` photograph.
     *
     * @param {object} input
     * @param {string} input.seed the picsum seed — unique per photograph
     * @param {number} input.width
     * @param {number} input.height
     * @param {string} input.alt
     * @param {string} input.folder the collection the image belongs to
     * @param {string[]} [input.tags]
     * @returns {string} the URL
     */
    photo({ seed, width, height, alt, folder, tags = [] }) {
      const url = `https://picsum.photos/seed/${seed}/${width}/${height}`;
      return register(url, {
        publicId: null,
        provider: 'external',
        type: 'image',
        width,
        height,
        bytes: null,
        format: 'jpg',
        alt,
        title: null,
        folder,
        tags,
      });
    },

    /** One of the brand assets (§2.1) — the seed's only Cloudinary images. */
    brand(url, { alt, folder, tags = [], width = null, height = null }) {
      return register(url, {
        publicId: url.includes('sna-icon') ? 'sna-icon_efty7z' : 'sna-logo_o09ugt',
        provider: 'cloudinary',
        type: 'image',
        width,
        height,
        bytes: null,
        format: 'png',
        alt,
        title: null,
        folder,
        tags,
      });
    },

    /** The placeholder PDF, registered once however many records point at it. */
    document({ alt, folder, tags = [] }) {
      return register(PLACEHOLDER_PDF, {
        publicId: null,
        provider: 'external',
        type: 'document',
        width: null,
        height: null,
        bytes: null,
        format: 'pdf',
        alt,
        title: null,
        folder,
        tags,
      });
    },

    /** The placeholder walkthrough video. */
    video({ alt, folder, tags = [] }) {
      return register(PLACEHOLDER_VIDEO, {
        publicId: null,
        provider: 'external',
        type: 'video',
        width: null,
        height: null,
        bytes: null,
        format: null,
        alt,
        title: null,
        folder,
        tags,
      });
    },

    /** Every registered URL, for the build's cross-check against the data. */
    urls: () => [...entries.keys()],

    /**
     * The `media` collection: one record per registered URL, ids in
     * registration order so a rebuild keeps them stable.
     */
    records() {
      return [...entries.values()].map((fields, index) => ({
        id: index + 1,
        ...fields,
        createdBy: 1,
        createdAt: daysAgo(180, 9, 0),
        updatedAt: daysAgo(180, 9, 0),
      }));
    },
  };
}

module.exports = {
  createMediaRegistry,
  BRAND,
  PLACEHOLDER_PDF,
  PLACEHOLDER_VIDEO,
  PLACEHOLDER_TOUR,
};
