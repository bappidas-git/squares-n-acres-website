/**
 * Master-data write schemas (00_MASTER_CONTEXT.md §6.2–§6.6, §6.8–§6.9,
 * §6.11–§6.12, §6.14).
 *
 * Every entity exposes `create` and `update` with the same shape: `PUT`
 * replaces the whole record (§5.8) and the admin forms always send it whole.
 * Computed read fields (`propertyCount`, `articleCount`, `usedIn`, `hits`,
 * `lastLoginAt`) are server-owned and absent here.
 */

const {
  AMENITY_CATEGORIES,
  BADGE_TONES,
  EMPLOYMENT_TYPES,
  FAQ_CATEGORIES,
  LOCALITY_ZONES,
  MEDIA_PROVIDERS,
  MEDIA_TYPES,
  PARTNER_CATEGORIES,
  REDIRECT_CODES,
  ROLES,
  SEGMENTS,
} = require('../../config/enums');
const { segmentRef } = require('./refs');
const { seo } = require('./seo');

const socialLinks = {
  type: 'object',
  shape: {
    linkedin: { type: 'url', nullable: true, default: null },
    twitter: { type: 'url', nullable: true, default: null },
    facebook: { type: 'url', nullable: true, default: null },
    instagram: { type: 'url', nullable: true, default: null },
    website: { type: 'url', nullable: true, default: null },
  },
  default: {},
};

const locality = {
  name: { type: 'string', required: true, min: 2, maxLength: 120 },
  slug: { type: 'slug', maxLength: 75, default: '' },
  cityId: { type: 'int', required: true },
  zone: { type: 'enum', enum: LOCALITY_ZONES.values, nullable: true, default: null },
  description: { type: 'html', default: '' },
  shortDescription: { type: 'string', maxLength: 300, default: '' },
  heroImageUrl: { type: 'url', nullable: true, default: null },
  latitude: { type: 'number', nullable: true, min: -90, max: 90, default: null },
  longitude: { type: 'number', nullable: true, min: -180, max: 180, default: null },
  pincodes: {
    type: 'array',
    items: { type: 'string', maxLength: 6, pattern: '^\\d{6}$' },
    default: [],
  },
  highlights: { type: 'array', items: { type: 'string', maxLength: 200 }, default: [] },
  connectivity: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      shape: {
        label: { type: 'string', required: true, maxLength: 120 },
        value: { type: 'string', required: true, maxLength: 200 },
      },
    },
  },
  avgPricePerSqft: { type: 'int', nullable: true, min: 0, default: null },
  priceTrendNote: { type: 'string', nullable: true, maxLength: 300, default: null },
  isFeatured: { type: 'bool', default: false },
  isActive: { type: 'bool', default: true },
  order: { type: 'int', min: 0, default: 0 },
  seo,
};

const city = {
  name: { type: 'string', required: true, min: 2, maxLength: 120 },
  slug: { type: 'slug', maxLength: 75, default: '' },
  state: { type: 'string', required: true, maxLength: 120 },
  isActive: { type: 'bool', default: true },
};

/**
 * A segment (QA-52): the first choice on the property form. `kind` is the
 * layout its listings get — one of the three built-in segments' — and the slug
 * is what a listing and a property type store, so the API keeps it once the
 * segment exists. The three built-ins also keep their `kind` and cannot be
 * deleted (`src/config/segments.js`).
 */
const segment = {
  name: { type: 'string', required: true, min: 2, maxLength: 60 },
  slug: { type: 'slug', maxLength: 75, default: '' },
  kind: { type: 'enum', enum: SEGMENTS.values, required: true, default: 'residential' },
  description: { type: 'string', nullable: true, maxLength: 300, default: null },
  icon: { type: 'string', nullable: true, maxLength: 80, default: null },
  isActive: { type: 'bool', default: true },
  order: { type: 'int', min: 0, default: 0 },
};

const propertyType = {
  name: { type: 'string', required: true, min: 2, maxLength: 120 },
  slug: { type: 'slug', maxLength: 75, default: '' },
  segment: segmentRef,
  icon: { type: 'string', required: true, maxLength: 80 },
  description: { type: 'string', nullable: true, maxLength: 500, default: null },
  // The header's Rent and Commercial menus list the active types with these
  // on, in their order (prompt 51).
  showInRentMenu: { type: 'bool', default: false },
  showInCommercialMenu: { type: 'bool', default: false },
  isActive: { type: 'bool', default: true },
  order: { type: 'int', min: 0, default: 0 },
  seo,
};

const amenity = {
  name: { type: 'string', required: true, min: 2, maxLength: 120 },
  slug: { type: 'slug', maxLength: 75, default: '' },
  category: {
    type: 'enum',
    enum: AMENITY_CATEGORIES.values,
    required: true,
    default: 'basic',
  },
  icon: { type: 'string', required: true, maxLength: 80 },
  isActive: { type: 'bool', default: true },
  order: { type: 'int', min: 0, default: 0 },
};

const badge = {
  name: { type: 'string', required: true, min: 2, maxLength: 60 },
  slug: { type: 'slug', maxLength: 75, default: '' },
  color: { type: 'enum', enum: BADGE_TONES.values, required: true, default: 'primary' },
  icon: { type: 'string', nullable: true, maxLength: 80, default: null },
  isActive: { type: 'bool', default: true },
  order: { type: 'int', min: 0, default: 0 },
};

const developer = {
  name: { type: 'string', required: true, min: 2, maxLength: 150 },
  slug: { type: 'slug', maxLength: 75, default: '' },
  logoUrl: { type: 'url', nullable: true, default: null },
  coverImageUrl: { type: 'url', nullable: true, default: null },
  description: { type: 'html', default: '' },
  shortDescription: { type: 'string', maxLength: 300, default: '' },
  establishedYear: { type: 'int', nullable: true, min: 1800, max: 2100, default: null },
  headquarters: { type: 'string', nullable: true, maxLength: 150, default: null },
  website: { type: 'url', nullable: true, default: null },
  totalProjects: { type: 'int', nullable: true, min: 0, default: null },
  ongoingProjects: { type: 'int', nullable: true, min: 0, default: null },
  completedProjects: { type: 'int', nullable: true, min: 0, default: null },
  reraIds: { type: 'array', items: { type: 'string', maxLength: 80 }, default: [] },
  highlights: { type: 'array', items: { type: 'string', maxLength: 200 }, default: [] },
  isFeatured: { type: 'bool', default: false },
  isActive: { type: 'bool', default: true },
  order: { type: 'int', min: 0, default: 0 },
  seo,
};

const bank = {
  name: { type: 'string', required: true, min: 2, maxLength: 150 },
  slug: { type: 'slug', maxLength: 75, default: '' },
  logoUrl: { type: 'url', nullable: true, default: null },
  interestRateMin: { type: 'number', required: true, min: 0, max: 30 },
  interestRateMax: { type: 'number', required: true, min: 0, max: 30 },
  processingFeeNote: { type: 'string', nullable: true, maxLength: 200, default: null },
  maxTenureYears: { type: 'int', required: true, min: 1, max: 40 },
  maxLtvPercent: { type: 'int', required: true, min: 1, max: 100 },
  minLoanAmount: { type: 'number', nullable: true, min: 0, default: null },
  maxLoanAmount: { type: 'number', nullable: true, min: 0, default: null },
  features: { type: 'array', items: { type: 'string', maxLength: 200 }, default: [] },
  applyUrl: { type: 'url', nullable: true, default: null },
  isActive: { type: 'bool', default: true },
  order: { type: 'int', min: 0, default: 0 },
};

const articleCategory = {
  name: { type: 'string', required: true, min: 2, maxLength: 120 },
  slug: { type: 'slug', maxLength: 75, default: '' },
  description: { type: 'string', nullable: true, maxLength: 500, default: null },
  seo,
  order: { type: 'int', min: 0, default: 0 },
  isActive: { type: 'bool', default: true },
};

const articleTag = {
  name: { type: 'string', required: true, min: 2, maxLength: 60 },
  slug: { type: 'slug', maxLength: 75, default: '' },
};

const author = {
  name: { type: 'string', required: true, min: 2, maxLength: 120 },
  slug: { type: 'slug', maxLength: 75, default: '' },
  designation: { type: 'string', nullable: true, maxLength: 120, default: null },
  bio: { type: 'html', default: '' },
  avatarUrl: { type: 'url', nullable: true, default: null },
  email: { type: 'email', nullable: true, default: null },
  socialLinks,
  isActive: { type: 'bool', default: true },
  seo,
};

/**
 * A FAQ. `order` is a position (QA-59): the API settles the collection `1..n`
 * around every write that places one, so the ceiling is only there to refuse a
 * number nobody meant — the pages' own bound (QA-56).
 */
const faq = {
  question: { type: 'string', required: true, min: 5, maxLength: 300 },
  answer: { type: 'html', required: true },
  category: { type: 'enum', enum: FAQ_CATEGORIES.values, required: true, default: 'general' },
  order: { type: 'int', min: 0, max: 100000, default: 0 },
  isActive: { type: 'bool', default: true },
  showOnHome: { type: 'bool', default: false },
  propertyTypeId: { type: 'int', nullable: true, default: null },
};

const testimonial = {
  name: { type: 'string', required: true, min: 2, maxLength: 80 },
  designation: { type: 'string', nullable: true, maxLength: 120, default: null },
  location: { type: 'string', nullable: true, maxLength: 120, default: null },
  rating: { type: 'int', required: true, min: 1, max: 5, default: 5 },
  message: { type: 'string', required: true, min: 10, maxLength: 1000 },
  avatarUrl: { type: 'url', nullable: true, default: null },
  propertyId: { type: 'int', nullable: true, default: null },
  isFeatured: { type: 'bool', default: false },
  isActive: { type: 'bool', default: true },
  order: { type: 'int', min: 0, default: 0 },
  // Seeded placeholders never render in a production build (decision D41).
  isSample: { type: 'bool', default: false },
};

const teamMember = {
  name: { type: 'string', required: true, min: 2, maxLength: 80 },
  slug: { type: 'slug', maxLength: 75, default: '' },
  designation: { type: 'string', required: true, maxLength: 120 },
  phone: { type: 'phone', nullable: true, default: null },
  whatsapp: { type: 'phone', nullable: true, default: null },
  email: { type: 'email', nullable: true, default: null },
  photoUrl: { type: 'url', nullable: true, default: null },
  bio: { type: 'html', nullable: true, default: null },
  reraId: { type: 'string', nullable: true, maxLength: 80, default: null },
  socialLinks,
  order: { type: 'int', min: 0, default: 0 },
  isActive: { type: 'bool', default: true },
  showOnAbout: { type: 'bool', default: true },
  // The admin account behind the card (prompt 51): a lead about one of their
  // listings goes to it when "the listing's advisor" assigns leads.
  userId: {
    type: 'int',
    nullable: true,
    default: null,
    exists: { collection: 'adminUsers', field: 'id' },
  },
};

const partner = {
  name: { type: 'string', required: true, min: 2, maxLength: 150 },
  logoUrl: { type: 'url', required: true },
  websiteUrl: { type: 'url', nullable: true, default: null },
  category: {
    type: 'enum',
    enum: PARTNER_CATEGORIES.values,
    required: true,
    default: 'developer',
  },
  order: { type: 'int', min: 0, default: 0 },
  isActive: { type: 'bool', default: true },
};

const job = {
  slug: { type: 'slug', maxLength: 75, default: '' },
  title: { type: 'string', required: true, min: 3, maxLength: 150 },
  department: { type: 'string', required: true, maxLength: 120 },
  location: { type: 'string', required: true, maxLength: 120 },
  employmentType: {
    type: 'enum',
    enum: EMPLOYMENT_TYPES.values,
    required: true,
    default: 'full-time',
  },
  experience: { type: 'string', nullable: true, maxLength: 80, default: null },
  description: { type: 'html', required: true },
  responsibilities: { type: 'array', items: { type: 'string', maxLength: 300 }, default: [] },
  requirements: { type: 'array', items: { type: 'string', maxLength: 300 }, default: [] },
  salaryRange: { type: 'string', nullable: true, maxLength: 80, default: null },
  isActive: { type: 'bool', default: true },
  postedAt: { type: 'date', nullable: true, default: null },
  closesAt: { type: 'date', nullable: true, default: null },
};

const redirect = {
  fromPath: { type: 'string', required: true, maxLength: 500, pattern: '^/' },
  toPath: { type: 'string', required: true, maxLength: 500 },
  statusCode: { type: 'enum', enum: REDIRECT_CODES.values, required: true, default: 301 },
  isActive: { type: 'bool', default: true },
  note: { type: 'string', nullable: true, maxLength: 300, default: null },
};

/**
 * `POST /admin/redirects/import` — the rows a pasted or uploaded CSV parses to.
 *
 * Deliberately looser than `redirect.create`: an import is a bulk paste from a
 * spreadsheet, and a row the rules refuse is counted as skipped rather than
 * failing the whole file (§4.12 of prompt 37). The envelope is checked here;
 * each row is checked by the same rules a single create is.
 */
const redirectImport = {
  rows: {
    type: 'array',
    required: true,
    min: 1,
    max: 5000,
    items: {
      type: 'object',
      shape: {
        fromPath: { type: 'string', required: true, maxLength: 500 },
        toPath: { type: 'string', required: true, maxLength: 500 },
        statusCode: { type: 'int', nullable: true, default: 301 },
        note: { type: 'string', nullable: true, maxLength: 300, default: null },
      },
    },
  },
};

/**
 * A media record. The address is the record, so it is unique — a second
 * record for the same file listed the picture twice and split its usages
 * between them — and it fits the `VARCHAR(500)` it is stored in (QA-63).
 */
const media = {
  url: { type: 'url', required: true, maxLength: 500, unique: true },
  publicId: { type: 'string', nullable: true, maxLength: 200, default: null },
  provider: {
    type: 'enum',
    enum: MEDIA_PROVIDERS.values,
    required: true,
    default: 'cloudinary',
  },
  type: { type: 'enum', enum: MEDIA_TYPES.values, required: true, default: 'image' },
  width: { type: 'int', nullable: true, min: 0, default: null },
  height: { type: 'int', nullable: true, min: 0, default: null },
  bytes: { type: 'int', nullable: true, min: 0, default: null },
  format: { type: 'string', nullable: true, maxLength: 20, default: null },
  alt: { type: 'string', required: true, maxLength: 200 },
  title: { type: 'string', nullable: true, maxLength: 200, default: null },
  folder: { type: 'string', nullable: true, maxLength: 120, default: null },
  tags: { type: 'array', items: { type: 'string', maxLength: 60 }, default: [] },
};

/**
 * `POST /admin/media/folders/rename` — refiles every record of a folder, and of
 * the folders inside it, under another name (prompt 51). `merge` says to move
 * them in beside the files a folder of that name already holds; without it a
 * name in use is a 422 on `to`.
 */
const mediaFolderRename = {
  from: { type: 'string', required: true, maxLength: 120 },
  to: { type: 'string', required: true, maxLength: 120 },
  merge: { type: 'bool', default: false },
};

const user = {
  name: { type: 'string', required: true, min: 2, maxLength: 80 },
  email: { type: 'email', required: true },
  password: { type: 'string', required: true, min: 8, maxLength: 100 },
  role: { type: 'enum', enum: ROLES.values, required: true, default: 'sales' },
  phone: { type: 'phone', nullable: true, default: null },
  avatarUrl: { type: 'url', nullable: true, default: null },
  isActive: { type: 'bool', default: true },
};

/** On update the password is only sent when it is being changed. */
const userUpdate = { ...user, password: { type: 'string', min: 8, maxLength: 100 } };

const entity = (shape, updateShape) => ({ create: shape, update: updateShape || shape });

module.exports = {
  locality: entity(locality),
  city: entity(city),
  segment: entity(segment),
  propertyType: entity(propertyType),
  amenity: entity(amenity),
  badge: entity(badge),
  developer: entity(developer),
  bank: entity(bank),
  articleCategory: entity(articleCategory),
  articleTag: entity(articleTag),
  author: entity(author),
  faq: entity(faq),
  testimonial: entity(testimonial),
  teamMember: entity(teamMember),
  partner: entity(partner),
  job: entity(job),
  redirect: { ...entity(redirect), import: redirectImport },
  media: { ...entity(media), renameFolder: mediaFolderRename },
  user: entity(user, userUpdate),
};
