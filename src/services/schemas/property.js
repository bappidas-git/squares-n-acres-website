/**
 * Property write schemas (00_MASTER_CONTEXT.md §6.1).
 *
 * `create` and `update` share one shape: `PUT` replaces the whole record and
 * the form always sends every field (§5.8). `patch` is the same shape with
 * nothing required — it backs toggles, bulk edits and SEO-panel saves.
 *
 * Read-only fields (`propertyType`, `amenities`, `badges`, `location.locality`,
 * `location.city`, `project.developer`, `viewCount`, `enquiryCount`,
 * `publishedAt`, `createdBy`, `updatedBy`, timestamps) are not writable and are
 * therefore absent here; the API ignores them when a client sends them (§5.5).
 */

const {
  AREA_UNITS,
  AVAILABILITY,
  CONSTRUCTION_STATUS,
  DOCUMENT_TYPES,
  FACING,
  FURNISHING,
  KITCHEN_TYPES,
  LISTING_TYPES,
  NEARBY_CATEGORIES,
  OWNERSHIP,
  PROJECT_APPROVALS,
  SECTION_VISIBILITY_KEYS,
  SEGMENTS,
  SPEC_GROUPS,
  TIMELINE_STATUS,
} = require('../../config/enums');
const { seo } = require('./seo');

/** Every key optional, one level deep — the `PATCH` variant of a write shape. */
const allOptional = (shape) =>
  Object.fromEntries(
    Object.entries(shape).map(([name, descriptor]) => {
      const { required: _required, ...rest } = descriptor;
      return [name, rest];
    })
  );

const sectionVisibilityShape = Object.fromEntries(
  SECTION_VISIBILITY_KEYS.map(({ key }) => [key, { type: 'bool', default: true }])
);

const create = {
  slug: { type: 'slug', maxLength: 75, default: '' },
  title: { type: 'string', required: true, min: 10, maxLength: 200 },
  projectName: { type: 'string', nullable: true, maxLength: 150, default: null },
  listingType: { type: 'enum', enum: LISTING_TYPES.values, required: true, default: 'sale' },
  segment: { type: 'enum', enum: SEGMENTS.values, required: true, default: 'residential' },
  propertyTypeId: { type: 'int', required: true },
  constructionStatus: {
    type: 'enum',
    enum: CONSTRUCTION_STATUS.values,
    required: true,
    default: 'ready-to-move',
  },
  availability: {
    type: 'enum',
    enum: AVAILABILITY.values,
    required: true,
    default: 'available',
  },
  // §6.1: a date the buyer is being promised. It is only optional while there is
  // nothing to promise — a home that is finished is available now.
  possessionDate: {
    type: 'date',
    nullable: true,
    default: null,
    requiredIf: { field: 'constructionStatus', in: ['pre-launch', 'under-construction'] },
  },
  ageOfPropertyYears: { type: 'int', nullable: true, min: 0, max: 100, default: null },
  furnishing: { type: 'enum', enum: FURNISHING.values, nullable: true, default: null },
  facing: { type: 'enum', enum: FACING.values, nullable: true, default: null },
  floorNumber: { type: 'int', nullable: true, min: -5, max: 200, default: null },
  totalFloors: { type: 'int', nullable: true, min: 0, max: 200, default: null },
  ownership: { type: 'enum', enum: OWNERSHIP.values, nullable: true, default: null },
  reraNumber: { type: 'string', nullable: true, maxLength: 80, default: null },
  reraRegistered: { type: 'bool', default: false },
  description: { type: 'html', default: '' },
  shortDescription: { type: 'string', maxLength: 300, default: '' },
  highlights: { type: 'array', items: { type: 'string', maxLength: 200 }, default: [] },
  amenityIds: { type: 'array', items: { type: 'int' }, default: [] },
  badgeIds: { type: 'array', items: { type: 'int' }, default: [] },
  specifications: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      shape: {
        group: { type: 'enum', enum: SPEC_GROUPS.values, required: true, default: 'other' },
        label: { type: 'string', required: true, maxLength: 120 },
        value: { type: 'string', required: true, maxLength: 300 },
        icon: { type: 'string', nullable: true, maxLength: 80, default: null },
      },
    },
  },
  constructionSpecs: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      shape: {
        group: { type: 'enum', enum: SPEC_GROUPS.values, required: true, default: 'other' },
        label: { type: 'string', required: true, maxLength: 120 },
        value: { type: 'string', required: true, maxLength: 300 },
      },
    },
  },
  unitConfigurations: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      shape: {
        id: { type: 'int', required: true },
        name: { type: 'string', required: true, maxLength: 80 },
        bedrooms: { type: 'int', nullable: true, min: 0, max: 20, default: null },
        bathrooms: { type: 'int', nullable: true, min: 0, max: 20, default: null },
        superBuiltUpArea: { type: 'number', nullable: true, min: 0, default: null },
        carpetArea: { type: 'number', nullable: true, min: 0, default: null },
        areaUnit: { type: 'enum', enum: AREA_UNITS.values, default: 'sqft' },
        price: { type: 'number', nullable: true, min: 0, default: null },
        priceOnRequest: { type: 'bool', default: false },
        floorPlanImageUrl: { type: 'url', nullable: true, default: null },
        floorPlanPdfUrl: { type: 'url', nullable: true, default: null },
        availableUnits: { type: 'int', nullable: true, min: 0, default: null },
        isActive: { type: 'bool', default: true },
      },
    },
  },
  floorPlans: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      shape: {
        id: { type: 'int', required: true },
        title: { type: 'string', required: true, maxLength: 120 },
        imageUrl: { type: 'url', required: true },
        pdfUrl: { type: 'url', nullable: true, default: null },
        area: { type: 'number', nullable: true, min: 0, default: null },
        areaUnit: { type: 'enum', enum: AREA_UNITS.values, default: 'sqft' },
        bedrooms: { type: 'int', nullable: true, min: 0, max: 20, default: null },
        price: { type: 'number', nullable: true, min: 0, default: null },
        order: { type: 'int', min: 0, default: 0 },
      },
    },
  },
  images: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      shape: {
        id: { type: 'int', required: true },
        url: { type: 'url', required: true },
        alt: { type: 'string', required: true, maxLength: 200 },
        caption: { type: 'string', nullable: true, maxLength: 300, default: null },
        order: { type: 'int', min: 0, default: 0 },
        isCover: { type: 'bool', default: false },
      },
    },
  },
  videoUrl: { type: 'url', nullable: true, default: null },
  virtualTourUrl: { type: 'url', nullable: true, default: null },
  brochureUrl: { type: 'url', nullable: true, default: null },
  brochureLeadGated: { type: 'bool', default: true },
  documents: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      shape: {
        id: { type: 'int', required: true },
        title: { type: 'string', required: true, maxLength: 150 },
        url: { type: 'url', required: true },
        type: { type: 'enum', enum: DOCUMENT_TYPES.values, required: true, default: 'other' },
        leadGated: { type: 'bool', default: true },
        order: { type: 'int', min: 0, default: 0 },
      },
    },
  },
  location: {
    type: 'object',
    required: true,
    shape: {
      address: { type: 'string', maxLength: 300, default: '' },
      localityId: { type: 'int', required: true },
      cityId: { type: 'int', required: true },
      // An Indian PIN code is six digits and nothing else; `maxLength` alone let
      // `'12'` through, which the form rejects and the API stored.
      pincode: {
        type: 'string',
        nullable: true,
        maxLength: 6,
        pattern: '^\\d{6}$',
        default: null,
      },
      landmark: { type: 'string', nullable: true, maxLength: 200, default: null },
      latitude: { type: 'number', nullable: true, min: -90, max: 90, default: null },
      longitude: { type: 'number', nullable: true, min: -180, max: 180, default: null },
      mapEmbedUrl: { type: 'url', nullable: true, default: null },
      showExactLocation: { type: 'bool', default: false },
    },
  },
  nearbyPlaces: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      shape: {
        id: { type: 'int', required: true },
        name: { type: 'string', required: true, maxLength: 150 },
        category: {
          type: 'enum',
          enum: NEARBY_CATEGORIES.values,
          required: true,
          default: 'other',
        },
        distanceKm: { type: 'number', nullable: true, min: 0, max: 200, default: null },
        travelTimeMin: { type: 'int', nullable: true, min: 0, max: 600, default: null },
        order: { type: 'int', min: 0, default: 0 },
      },
    },
  },
  pricing: {
    type: 'object',
    required: true,
    shape: {
      price: { type: 'number', nullable: true, min: 0, default: null },
      priceOnRequest: { type: 'bool', default: false },
      priceRangeMin: { type: 'number', nullable: true, min: 0, default: null },
      priceRangeMax: { type: 'number', nullable: true, min: 0, default: null },
      pricePerSqft: { type: 'number', nullable: true, min: 0, default: null },
      priceNegotiable: { type: 'bool', default: false },
      rentPerMonth: { type: 'number', nullable: true, min: 0, default: null },
      securityDeposit: { type: 'number', nullable: true, min: 0, default: null },
      maintenanceChargesMonthly: { type: 'number', nullable: true, min: 0, default: null },
      bookingAmount: { type: 'number', nullable: true, min: 0, default: null },
      otherCharges: {
        type: 'array',
        default: [],
        items: {
          type: 'object',
          shape: {
            label: { type: 'string', required: true, maxLength: 120 },
            amount: { type: 'number', required: true, min: 0 },
            note: { type: 'string', nullable: true, maxLength: 200, default: null },
          },
        },
      },
      currency: { type: 'enum', enum: ['INR'], default: 'INR' },
    },
  },
  area: {
    type: 'object',
    required: true,
    shape: {
      superBuiltUpArea: { type: 'number', nullable: true, min: 0, default: null },
      builtUpArea: { type: 'number', nullable: true, min: 0, default: null },
      carpetArea: { type: 'number', nullable: true, min: 0, default: null },
      plotArea: { type: 'number', nullable: true, min: 0, default: null },
      areaUnit: { type: 'enum', enum: AREA_UNITS.values, default: 'sqft' },
      plotLength: { type: 'number', nullable: true, min: 0, default: null },
      plotWidth: { type: 'number', nullable: true, min: 0, default: null },
      plotDimensionUnit: {
        type: 'enum',
        enum: AREA_UNITS.values,
        nullable: true,
        default: null,
      },
    },
  },
  configuration: {
    type: 'object',
    required: true,
    shape: {
      bedrooms: { type: 'int', nullable: true, min: 0, max: 20, default: null },
      bathrooms: { type: 'int', nullable: true, min: 0, max: 20, default: null },
      balconies: { type: 'int', nullable: true, min: 0, max: 20, default: null },
      parkingCovered: { type: 'int', nullable: true, min: 0, max: 20, default: null },
      parkingOpen: { type: 'int', nullable: true, min: 0, max: 20, default: null },
      servantRoom: { type: 'bool', default: false },
      studyRoom: { type: 'bool', default: false },
      poojaRoom: { type: 'bool', default: false },
      kitchenType: { type: 'enum', enum: KITCHEN_TYPES.values, nullable: true, default: null },
    },
  },
  project: {
    type: 'object',
    required: true,
    shape: {
      developerId: { type: 'int', nullable: true, default: null },
      totalUnits: { type: 'int', nullable: true, min: 0, default: null },
      totalTowers: { type: 'int', nullable: true, min: 0, default: null },
      totalFloors: { type: 'int', nullable: true, min: 0, max: 200, default: null },
      projectAreaAcres: { type: 'number', nullable: true, min: 0, default: null },
      openAreaPercent: { type: 'int', nullable: true, min: 0, max: 100, default: null },
      launchDate: { type: 'date', nullable: true, default: null },
      approvals: {
        type: 'array',
        items: { type: 'enum', enum: PROJECT_APPROVALS.values },
        default: [],
      },
      landmarkProject: { type: 'bool', default: false },
    },
  },
  constructionTimeline: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      shape: {
        id: { type: 'int', required: true },
        milestone: { type: 'string', required: true, maxLength: 150 },
        date: { type: 'date', nullable: true, default: null },
        status: {
          type: 'enum',
          enum: TIMELINE_STATUS.values,
          required: true,
          default: 'upcoming',
        },
        imageUrl: { type: 'url', nullable: true, default: null },
        note: { type: 'string', nullable: true, maxLength: 300, default: null },
        order: { type: 'int', min: 0, default: 0 },
      },
    },
  },
  constructionProgressPercent: { type: 'int', nullable: true, min: 0, max: 100, default: null },
  faqs: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      shape: {
        id: { type: 'int', required: true },
        question: { type: 'string', required: true, maxLength: 300 },
        answer: { type: 'html', required: true },
        order: { type: 'int', min: 0, default: 0 },
      },
    },
  },
  similarPropertyIds: { type: 'array', items: { type: 'int' }, max: 6, default: [] },
  sectionVisibility: {
    type: 'object',
    shape: sectionVisibilityShape,
    default: Object.fromEntries(SECTION_VISIBILITY_KEYS.map(({ key }) => [key, true])),
  },
  agent: {
    type: 'object',
    shape: {
      teamMemberId: { type: 'int', nullable: true, default: null },
      name: { type: 'string', nullable: true, maxLength: 120, default: null },
      phone: { type: 'phone', nullable: true, default: null },
      whatsapp: { type: 'phone', nullable: true, default: null },
      email: { type: 'email', nullable: true, default: null },
      photoUrl: { type: 'url', nullable: true, default: null },
      showOnListing: { type: 'bool', default: false },
    },
    default: { showOnListing: false },
  },
  seo,
  isActive: { type: 'bool', default: false },
  isFeatured: { type: 'bool', default: false },
  isVerified: { type: 'bool', default: false },
  priorityOrder: { type: 'int', min: 0, default: 0 },
};

/**
 * `POST /properties/:id/documents/access` — the token `POST /leads` answered
 * with, for a lead about that listing (docs/API_CONTRACT.md §5.10).
 */
const documentAccess = {
  token: { type: 'string', required: true, maxLength: 200 },
};

module.exports = {
  create,
  update: create,
  patch: allOptional(create),
  documentAccess,
};
