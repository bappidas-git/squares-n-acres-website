/**
 * Expands a compact property spec into the full §6.1 record.
 *
 * `scripts/seed/data/properties.js` holds what only a human can decide about a
 * listing — the project's name, what it is like, who it suits, the two or
 * three lines that are not derivable from anything else. Everything a listing
 * *implies* is computed here: the title from the configuration, the carpet
 * area from the super built-up area, the price per square foot from the price,
 * the badges from the status, the FAQs from the numbers already in the record.
 *
 * Doing it this way is what keeps forty listings internally consistent. A
 * price and a `pricePerSqft` that disagree, a "Ready to Move" badge on an
 * under-construction project, a timeline on a resale flat — each of those is a
 * bug the public pages would render faithfully, and none of them can happen if
 * the record is derived rather than typed.
 */

const { PLACEHOLDER_TOUR } = require('./media');
const { fitDescription, makeSeo } = require('./seo');
const { area: formatArea, inr, paragraphs, sentenceList } = require('./text');
const { daysAgo, dateDaysAgo, monthStartAgo, monthStartAhead } = require('./dates');
const { NEARBY } = require('../data/nearby');

/** The singular noun each property type uses in a title (§6.3 names are plural). */
const SINGULAR = {
  apartments: 'Apartment',
  villas: 'Villa',
  'independent-houses': 'Independent House',
  'row-houses': 'Row House',
  penthouses: 'Penthouse',
  duplexes: 'Duplex',
  studios: 'Studio Apartment',
  'builder-floors': 'Builder Floor',
  'residential-plots': 'Residential Plot',
  'farm-land': 'Farm Land',
  'office-spaces': 'Office Space',
  'co-working-spaces': 'Co-working Space',
  'retail-shops': 'Retail Shop',
  warehouses: 'Warehouse',
  'industrial-sheds': 'Industrial Shed',
  'commercial-plots': 'Commercial Plot',
  'pg-co-living': 'Co-living Residence',
};

/** The photograph a gallery slot shows, per segment (used in every `alt`). */
const ASPECTS = {
  home: [
    'exterior',
    'living room',
    'kitchen',
    'bedroom',
    'balcony view',
    'clubhouse',
    'amenities',
    'master plan',
  ],
  land: [
    'site frontage',
    'master plan',
    'layout roads',
    'entrance arch',
    'amenities',
    'exterior',
    'open plots',
    'landscaping',
  ],
  office: [
    'exterior',
    'reception',
    'work floor',
    'meeting room',
    'cafeteria',
    'parking',
    'lift lobby',
    'terrace',
  ],
  retail: [
    'exterior',
    'shop frontage',
    'interior',
    'signage frontage',
    'common corridor',
    'parking',
    'entrance',
    'service corridor',
  ],
  shed: [
    'exterior',
    'warehouse floor',
    'loading dock',
    'office block',
    'yard',
    'entry gate',
    'roof structure',
    'driveway',
  ],
  coliving: [
    'exterior',
    'common lounge',
    'bedroom',
    'kitchen',
    'study area',
    'terrace',
    'amenities',
    'corridor',
  ],
};

/** Named amenity sets, by slug, so the choice is legible rather than random. */
const AMENITY_SETS = {
  residentialFull: [
    'power-backup',
    'lift',
    'water-supply',
    'intercom',
    'swimming-pool',
    'clubhouse',
    'gymnasium',
    'party-hall',
    'landscaped-gardens',
    '24x7-security',
    'cctv-surveillance',
    'fire-safety',
    'gated-community',
    'jogging-track',
    'kids-play-area',
    'rainwater-harvesting',
    'covered-parking',
    'visitor-parking',
  ],
  residentialCore: [
    'power-backup',
    'lift',
    'water-supply',
    'intercom',
    'landscaped-gardens',
    '24x7-security',
    'cctv-surveillance',
    'gated-community',
    'covered-parking',
    'visitor-parking',
    'kids-play-area',
    'rainwater-harvesting',
  ],
  villa: [
    'power-backup',
    'water-supply',
    'piped-gas',
    'swimming-pool',
    'clubhouse',
    'gymnasium',
    'landscaped-gardens',
    '24x7-security',
    'cctv-surveillance',
    'gated-community',
    'badminton-court',
    'jogging-track',
    'kids-play-area',
    'rainwater-harvesting',
    'sewage-treatment-plant',
    'ev-charging',
    'covered-parking',
  ],
  compact: [
    'power-backup',
    'lift',
    'water-supply',
    'intercom',
    '24x7-security',
    'cctv-surveillance',
    'video-door-phone',
    'wi-fi-connectivity',
    'covered-parking',
  ],
  coliving: [
    'power-backup',
    'lift',
    'water-supply',
    'wi-fi-connectivity',
    '24x7-security',
    'cctv-surveillance',
    'video-door-phone',
    'cafeteria',
    'library',
    'covered-parking',
  ],
  plot: [
    'water-supply',
    'power-backup',
    '24x7-security',
    'cctv-surveillance',
    'gated-community',
    'landscaped-gardens',
    'jogging-track',
    'rainwater-harvesting',
    'kids-play-area',
  ],
  office: [
    'power-backup',
    'lift',
    '24x7-security',
    'cctv-surveillance',
    'fire-safety',
    'fire-sprinklers',
    'covered-parking',
    'visitor-parking',
    'conference-room',
    'reception',
    'pantry',
    'server-room',
    'cafeteria',
    'wi-fi-connectivity',
  ],
  coworking: [
    'power-backup',
    'lift',
    '24x7-security',
    'cctv-surveillance',
    'fire-safety',
    'wi-fi-connectivity',
    'conference-room',
    'reception',
    'pantry',
    'cafeteria',
    'covered-parking',
    'server-room',
  ],
  retail: [
    'power-backup',
    'lift',
    '24x7-security',
    'cctv-surveillance',
    'fire-safety',
    'fire-sprinklers',
    'visitor-parking',
    'reception',
  ],
  warehouse: [
    'power-backup',
    'water-supply',
    '24x7-security',
    'cctv-surveillance',
    'fire-safety',
    'fire-sprinklers',
    'loading-dock',
    'cold-storage',
    'covered-parking',
  ],
};

/**
 * The four amenities each set leads with in its copy. Listing "power backup,
 * lift, water supply" first is accurate and tells a reader nothing; these are
 * the ones somebody actually chooses a building for.
 */
const AMENITY_FEATURES = {
  residentialFull: ['swimming-pool', 'clubhouse', 'gymnasium', 'landscaped-gardens'],
  residentialCore: ['landscaped-gardens', 'gated-community', 'covered-parking', 'kids-play-area'],
  villa: ['swimming-pool', 'clubhouse', 'gymnasium', 'badminton-court'],
  compact: ['wi-fi-connectivity', 'video-door-phone', 'covered-parking', 'cctv-surveillance'],
  coliving: ['wi-fi-connectivity', 'cafeteria', 'library', 'cctv-surveillance'],
  plot: ['gated-community', 'landscaped-gardens', 'jogging-track', 'rainwater-harvesting'],
  office: ['conference-room', 'reception', 'pantry', 'cafeteria'],
  coworking: ['conference-room', 'reception', 'pantry', 'cafeteria'],
  retail: ['fire-sprinklers', 'visitor-parking', 'reception', 'power-backup'],
  warehouse: ['loading-dock', 'cold-storage', 'fire-sprinklers', 'covered-parking'],
};

/** The five stages a construction timeline runs through. */
const MILESTONES = [
  'Land acquisition and approvals',
  'Excavation, piling and foundation',
  'Structure — tower framing',
  'Blockwork, plastering and services',
  'Finishing, testing and handover',
];

/** Construction specification rows for a home (§6.15 maps the old shape here). */
const HOME_CONSTRUCTION_SPECS = [
  ['structure', 'Framing', 'RCC framed structure with concrete block masonry'],
  ['flooring', 'Living and dining', 'Large-format vitrified tiles'],
  ['flooring', 'Bedrooms', 'Laminated wooden flooring in the primary bedroom, vitrified elsewhere'],
  ['kitchen', 'Counter and dado', 'Granite counter with a stainless steel sink and a tiled dado'],
  ['doors-windows', 'Main door', 'Engineered hardwood frame with a veneered, polished shutter'],
  ['doors-windows', 'Windows', 'UPVC sliding windows with mosquito mesh provision'],
  ['bathroom', 'Fittings', 'Ceramic sanitaryware with single-lever mixers and a geyser point'],
  ['electrical', 'Wiring', 'Concealed FR copper wiring with modular switches and an ELCB'],
  ['walls-painting', 'Finish', 'Two coats of emulsion over putty inside, textured exterior paint'],
  [
    'lift-common-areas',
    'Lobbies',
    'Granite-clad ground lobby with tiled floors on the upper levels',
  ],
];

const round = (value, to) => Math.round(value / to) * to;

/** `residential | land | office | retail | shed | coliving` — drives the copy. */
function familyOf(typeSlug) {
  if (typeSlug === 'residential-plots' || typeSlug === 'farm-land') return 'land';
  if (typeSlug === 'commercial-plots') return 'land';
  if (typeSlug === 'office-spaces' || typeSlug === 'co-working-spaces') return 'office';
  if (typeSlug === 'retail-shops') return 'retail';
  if (typeSlug === 'warehouses' || typeSlug === 'industrial-sheds') return 'shed';
  if (typeSlug === 'pg-co-living') return 'coliving';
  return 'home';
}

/**
 * @param {object} spec the entry from `data/properties.js`
 * @param {number} index position in the list; the record's id is `index + 1`
 * @param {object} ctx `{ rng, media, lookup }`
 * @returns {object} a complete `properties` record
 */
function buildProperty(spec, index, ctx) {
  const { rng, media, lookup } = ctx;
  const id = index + 1;

  const type = lookup.propertyTypes[spec.type];
  const locality = lookup.localities[spec.locality];
  const developer = spec.developer ? lookup.developers[spec.developer] : null;
  const family = familyOf(spec.type);
  const singular = SINGULAR[spec.type];
  const forSale = spec.listing === 'sale';
  const isProject = Array.isArray(spec.configs) && spec.configs.length > 0;
  const bedrooms = spec.bedrooms ?? null;

  /* -------------------------------------------------------------- *
   * Title, areas and price
   * -------------------------------------------------------------- */

  const listingSuffix =
    spec.listing === 'rent' ? ' for Rent' : spec.listing === 'lease' ? ' for Lease' : '';
  const headline = spec.headline ?? (bedrooms ? `${bedrooms} BHK ${singular}` : singular);
  const title = `${spec.project} – ${headline}${listingSuffix} in ${locality.name}`;

  const sbua = spec.sbua ?? null;
  const plotArea = spec.plotArea ?? null;
  const areaUnit = spec.areaUnit ?? 'sqft';
  const headlineArea = sbua ?? plotArea;

  const rate = spec.pricePerSqft ?? Math.round(locality.avgPricePerSqft * (spec.priceFactor ?? 1));
  const configPrices = isProject ? spec.configs.map((config) => config.price) : [];
  const salePrice = forSale ? (spec.price ?? round(headlineArea * rate, 50000)) : null;

  const pricing = {
    price: salePrice,
    priceOnRequest: false,
    priceRangeMin: isProject && forSale ? Math.min(...configPrices) : null,
    priceRangeMax: isProject && forSale ? Math.max(...configPrices) : null,
    // Only a square-foot listing has a meaningful rate per square foot; an
    // acre of farm land does not, and a computed one would be nonsense.
    pricePerSqft:
      areaUnit !== 'sqft'
        ? null
        : forSale
          ? Math.round(salePrice / headlineArea)
          : Math.round(spec.rent / sbua),
    priceNegotiable: forSale ? spec.negotiable !== false : false,
    rentPerMonth: forSale ? null : spec.rent,
    securityDeposit: forSale ? null : spec.rent * spec.depositMonths,
    maintenanceChargesMonthly: spec.maintenance ?? null,
    bookingAmount: forSale ? round(salePrice * 0.04, 25000) : null,
    otherCharges:
      spec.listing === 'lease'
        ? [
            {
              label: 'Common area maintenance',
              amount: Math.round(sbua * (spec.camPerSqft ?? 12)),
              note: 'Payable monthly with the rent',
            },
            {
              label: 'Lock-in period',
              amount: 0,
              note: 'Lock-in 3 years',
            },
          ]
        : [],
    currency: 'INR',
  };

  const areaBlock = {
    superBuiltUpArea: sbua,
    builtUpArea: sbua ? Math.round(sbua * 0.87) : null,
    carpetArea: sbua ? Math.round(sbua * 0.72) : null,
    plotArea,
    areaUnit,
    plotLength: spec.plotLength ?? null,
    plotWidth: spec.plotWidth ?? null,
    plotDimensionUnit: spec.plotLength ? 'sqft' : null,
  };

  const configuration = {
    bedrooms,
    bathrooms: spec.bathrooms ?? null,
    balconies: spec.balconies ?? null,
    parkingCovered: spec.parkingCovered ?? null,
    parkingOpen: spec.parkingOpen ?? null,
    servantRoom: Boolean(spec.servantRoom),
    studyRoom: Boolean(spec.studyRoom),
    poojaRoom: Boolean(spec.poojaRoom),
    kitchenType: spec.kitchenType ?? null,
  };

  /* -------------------------------------------------------------- *
   * Images, plans and documents
   * -------------------------------------------------------------- */

  const aspects = ASPECTS[family];
  const imageCount = spec.imageCount ?? (spec.featured ? 7 : 5);
  const images = Array.from({ length: imageCount }, (_, position) => ({
    id: position + 1,
    url: media.photo({
      seed: `sna-property-${spec.slug}-${position + 1}`,
      width: 1200,
      height: 800,
      alt: `${title} – ${aspects[position % aspects.length]}`,
      folder: 'properties',
      tags: ['property', spec.type],
    }),
    alt: `${title} – ${aspects[position % aspects.length]}`,
    caption: position === 0 ? `${spec.project}, ${locality.name}` : null,
    order: position + 1,
    isCover: position === 0,
  }));

  // Rental and lease listings are single units that nobody publishes a plan
  // for; a project publishes one per configuration.
  const planSource = isProject
    ? spec.configs
    : forSale && headlineArea && family !== 'land'
      ? [{ name: headline, bedrooms, sbua, price: salePrice }]
      : [];

  const floorPlans = planSource.map((config, position) => ({
    id: position + 1,
    title: `${config.name} — ${formatArea(config.sbua ?? headlineArea, areaUnit)}`,
    imageUrl: media.photo({
      seed: `sna-property-${spec.slug}-plan-${position + 1}`,
      width: 900,
      height: 600,
      alt: `${title} – ${config.name} floor plan`,
      folder: 'properties',
      tags: ['property', 'floor-plan'],
    }),
    pdfUrl: spec.floorPlanPdf
      ? media.document({ alt: 'Placeholder floor plan document', folder: 'properties' })
      : null,
    area: config.sbua ?? headlineArea,
    areaUnit,
    bedrooms: config.bedrooms ?? null,
    price: forSale ? (config.price ?? salePrice) : null,
    order: position + 1,
  }));

  const unitConfigurations = isProject
    ? spec.configs.map((config, position) => ({
        id: position + 1,
        name: config.name,
        bedrooms: config.bedrooms ?? null,
        bathrooms: config.bathrooms ?? null,
        superBuiltUpArea: config.sbua,
        carpetArea: Math.round(config.sbua * 0.72),
        areaUnit,
        price: forSale ? config.price : null,
        priceOnRequest: false,
        floorPlanImageUrl: floorPlans[position] ? floorPlans[position].imageUrl : null,
        floorPlanPdfUrl: floorPlans[position] ? floorPlans[position].pdfUrl : null,
        availableUnits: config.units ?? null,
        isActive: true,
      }))
    : [];

  const brochureUrl = spec.brochure
    ? media.document({ alt: `${spec.project} brochure (placeholder)`, folder: 'properties' })
    : null;

  const documentTitles = [
    ['Project brochure', 'brochure'],
    [family === 'land' ? 'Layout approval' : 'Approved plan sanction', 'approval'],
    ['Title and encumbrance summary', 'legal'],
    ['Current price list', 'price-list'],
  ];
  const documents = documentTitles
    .slice(0, spec.documentCount ?? 3)
    .map(([label, kind], position) => ({
      id: position + 1,
      title: label,
      url: media.document({ alt: `${spec.project} ${label.toLowerCase()}`, folder: 'properties' }),
      type: kind,
      // Every fifth listing publishes its price list without asking for details.
      leadGated: !(kind === 'price-list' && id % 5 === 0),
      order: position + 1,
    }));

  /* -------------------------------------------------------------- *
   * Specifications
   * -------------------------------------------------------------- */

  const specifications = [];
  if (spec.projectAreaAcres) {
    specifications.push({
      group: 'other',
      label: 'Project area',
      value: `${spec.projectAreaAcres} acres`,
      icon: null,
    });
  }
  if (spec.totalTowers) {
    specifications.push({
      group: 'other',
      label: 'Towers',
      value: String(spec.totalTowers),
      icon: null,
    });
  }
  if (spec.totalUnits) {
    specifications.push({
      group: 'other',
      label: 'Total units',
      value: String(spec.totalUnits),
      icon: null,
    });
  }
  if (spec.openAreaPercent) {
    specifications.push({
      group: 'other',
      label: 'Open area',
      value: `${spec.openAreaPercent}% of the site`,
      icon: null,
    });
  }

  if (family === 'home' || family === 'coliving') {
    specifications.push(
      {
        group: 'structure',
        label: 'Structure',
        value: 'RCC framed structure designed to the applicable seismic zone',
        icon: null,
      },
      {
        group: 'lift-common-areas',
        label: 'Lifts',
        value:
          spec.totalFloors && spec.totalFloors > 4
            ? 'Two passenger lifts and one service lift per block'
            : 'One passenger lift per block',
        icon: null,
      },
      {
        group: 'security',
        label: 'Security',
        value: 'Manned security at entry with camera surveillance in the lobbies',
        icon: null,
      },
      {
        group: 'other',
        label: 'Water supply',
        value: 'Borewell and corporation supply with treated storage',
        icon: null,
      }
    );
  } else if (family === 'land') {
    specifications.push(
      {
        group: 'other',
        label: 'Layout roads',
        value: spec.roadWidth ?? '30 ft and 40 ft blacktopped roads',
        icon: null,
      },
      {
        group: 'other',
        label: 'Utilities',
        value: 'Underground water, sewage and electrical lines laid before handover',
        icon: null,
      },
      {
        group: 'security',
        label: 'Security',
        value: 'Gated entry with manned security and camera surveillance',
        icon: null,
      },
      {
        group: 'other',
        label: 'Katha',
        value: spec.katha ?? 'E-khata in the layout name',
        icon: null,
      }
    );
  } else {
    specifications.push(
      { group: 'other', label: 'Washrooms', value: String(spec.washrooms ?? 4), icon: null },
      {
        group: 'other',
        label: 'Handover condition',
        value: spec.handover ?? 'Warm shell with air-conditioning, fire systems and washrooms',
        icon: null,
      },
      {
        group: 'electrical',
        label: 'Power',
        value: spec.power ?? 'Sanctioned load with full DG backup for the floor plate',
        icon: null,
      },
      {
        group: 'security',
        label: 'Access control',
        value: 'Card access at the lobby with camera surveillance and a manned reception',
        icon: null,
      },
      {
        group: 'lift-common-areas',
        label: 'Lifts',
        value: spec.lifts ?? 'Two passenger lifts and one goods lift',
        icon: null,
      }
    );
  }

  const constructionSpecs =
    family === 'home'
      ? HOME_CONSTRUCTION_SPECS.slice(0, spec.featured ? 10 : 8).map(([group, label, value]) => ({
          group,
          label,
          value,
        }))
      : [];

  /* -------------------------------------------------------------- *
   * Project, timeline and possession
   * -------------------------------------------------------------- */

  const underConstruction = spec.status === 'pre-launch' || spec.status === 'under-construction';

  const possessionDate = underConstruction
    ? monthStartAhead(spec.possessionMonths ?? (spec.status === 'pre-launch' ? 36 : 18))
    : null;

  const ageOfPropertyYears = underConstruction ? null : (spec.ageYears ?? 0);

  const project = {
    developerId: developer ? developer.id : null,
    totalUnits: spec.totalUnits ?? null,
    totalTowers: spec.totalTowers ?? null,
    totalFloors: spec.totalFloors ?? null,
    projectAreaAcres: spec.projectAreaAcres ?? null,
    openAreaPercent: spec.openAreaPercent ?? null,
    launchDate: spec.launchMonthsAgo != null ? monthStartAgo(spec.launchMonthsAgo) : null,
    approvals: spec.approvals ?? [],
    landmarkProject: Boolean(spec.landmark),
  };

  const timelineShape =
    spec.status === 'pre-launch'
      ? ['completed', 'in-progress', 'upcoming', 'upcoming', 'upcoming']
      : spec.status === 'under-construction'
        ? ['completed', 'completed', 'completed', 'in-progress', 'upcoming']
        : [];

  const constructionTimeline = timelineShape.map((status, position) => {
    const monthsFromNow = (position - 2) * 7 + (spec.status === 'pre-launch' ? 6 : 0);
    return {
      id: position + 1,
      milestone: MILESTONES[position],
      date:
        monthsFromNow <= 0
          ? monthStartAgo(Math.abs(monthsFromNow))
          : monthStartAhead(monthsFromNow),
      status,
      imageUrl:
        status === 'completed'
          ? media.photo({
              seed: `sna-property-${spec.slug}-progress-${position + 1}`,
              width: 900,
              height: 600,
              alt: `${title} – ${MILESTONES[position].toLowerCase()}`,
              folder: 'properties',
              tags: ['property', 'construction'],
            })
          : null,
      note: null,
      order: position + 1,
    };
  });

  const constructionProgressPercent =
    spec.status === 'pre-launch'
      ? rng.int(3, 10)
      : spec.status === 'under-construction'
        ? rng.int(38, 76)
        : null;

  /* -------------------------------------------------------------- *
   * Amenities, badges and copy
   * -------------------------------------------------------------- */

  const amenityIds = AMENITY_SETS[spec.amenities].map((slug) => lookup.amenities[slug].id);

  const badgeNames = [];
  if (spec.status === 'ready-to-move') badgeNames.push('Ready to Move');
  if (spec.status === 'pre-launch' || spec.status === 'under-construction') {
    badgeNames.push('New Launch');
  }
  if (spec.reraRegistered) badgeNames.push('RERA Approved');
  if (spec.verified && badgeNames.length < 3) badgeNames.push('Verified');
  if (spec.badge && badgeNames.length < 3) badgeNames.push(spec.badge);
  const badgeIds = badgeNames.slice(0, 3).map((name) => lookup.badges[name].id);

  const amenityNames = AMENITY_FEATURES[spec.amenities].map((slug) =>
    lookup.amenities[slug].name.toLowerCase()
  );

  const sizeSentence = forSale
    ? `${headline} of ${formatArea(headlineArea, areaUnit)}${
        isProject
          ? `, part of a project with ${spec.configs.length} configurations from ${inr(pricing.priceRangeMin)}`
          : ''
      }, priced at ${inr(salePrice)}${
        pricing.pricePerSqft ? ` (about ${inr(pricing.pricePerSqft)} per square foot)` : ''
      }.`
    : `${headline} of ${formatArea(headlineArea, areaUnit)} at ${inr(spec.rent)} a month, with a deposit of ${spec.depositMonths} months.`;

  const statusSentence = underConstruction
    ? `Possession is declared for ${new Date(`${possessionDate}T00:00:00Z`).toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })}, and the construction timeline on this page tracks where the work has actually reached.`
    : spec.status === 'resale'
      ? `This is a resale unit, about ${ageOfPropertyYears} years old, available for immediate registration.`
      : `The property is ready to move into, about ${ageOfPropertyYears} ${ageOfPropertyYears === 1 ? 'year' : 'years'} old, with no construction risk left to carry.`;

  const localitySentence = `${locality.name} sits in ${locality.zone === 'central' ? 'central' : `${locality.zone}`} Bengaluru; ${NEARBY[spec.locality][0][0]} is about ${NEARBY[spec.locality][0][2]} km away and ${NEARBY[spec.locality][1][0]} roughly ${NEARBY[spec.locality][1][2]} km. The locality page sets out the wider picture.`;

  const description = paragraphs(
    `${spec.character} ${sizeSentence}`,
    `${spec.usage} Residents have access to ${sentenceList(amenityNames)} among ${amenityIds.length} listed amenities.`,
    localitySentence,
    `${statusSentence} ${spec.project} is a fictional project created for this dataset: the name, the pricing, the approvals and the photographs are placeholders, and the record should be replaced with a real listing before the site goes live.`
  );

  const shortDescription = `${spec.short}`.slice(0, 300);

  const highlights = [
    ...spec.highlights,
    underConstruction
      ? `Possession declared for ${possessionDate.slice(0, 7)} with a published construction timeline`
      : `Ready for registration and handover, ${ageOfPropertyYears === 0 ? 'newly completed' : `about ${ageOfPropertyYears} years old`}`,
    `${amenityIds.length} amenities including ${sentenceList(amenityNames.slice(0, 3))}`,
  ];

  /* -------------------------------------------------------------- *
   * FAQs — every answer reads a number that is already in the record
   * -------------------------------------------------------------- */

  const faqs = [
    {
      question: forSale
        ? `What does a ${headline} at ${spec.project} cost?`
        : `What is the monthly rent for this ${headline.toLowerCase()}?`,
      answer: forSale
        ? `<p>The ${headline.toLowerCase()} in this listing is priced at ${inr(salePrice)}${pricing.pricePerSqft ? `, which works out to roughly ${inr(pricing.pricePerSqft)} per square foot` : ''}${isProject ? `. Other configurations in the project start at ${inr(pricing.priceRangeMin)}` : ''}. Registration, stamp duty and the statutory charges are payable on top.</p>`
        : `<p>The rent is ${inr(spec.rent)} a month with a deposit of ${spec.depositMonths} months${pricing.maintenanceChargesMonthly ? `, and maintenance of about ${inr(pricing.maintenanceChargesMonthly)} a month is charged separately` : ''}. Both are negotiable against the notice period and the lock-in.</p>`,
    },
    {
      question: underConstruction ? 'When is possession?' : 'Is the property ready to move into?',
      answer: underConstruction
        ? `<p>The declared possession date is ${possessionDate}. Construction is about ${constructionProgressPercent}% complete as recorded on this page; ask for the latest progress photographs before you commit to a payment milestone.</p>`
        : `<p>Yes. The property is complete and ready for registration and handover${ageOfPropertyYears ? `, and is about ${ageOfPropertyYears} years old` : ''}. There is no construction risk left in this transaction.</p>`,
    },
    {
      question: 'Is the project registered under RERA?',
      answer: spec.reraRegistered
        ? `<p>The listing carries the registration number shown in the overview. Check it yourself on the Karnataka RERA portal — the project page there shows the declared plans, the unit inventory and the completion date, which is what makes the number useful.</p>`
        : `<p>This listing is not marked as RERA-registered. Smaller developments and projects completed before the Act came into force can fall outside registration; ask the seller which applies and verify it on the state portal rather than assuming.</p>`,
    },
    {
      question: 'What is included in the amenities?',
      answer: `<p>${amenityIds.length} amenities are listed on this page, including ${sentenceList(amenityNames)}. The amenities section lists them in full, grouped by category.</p>`,
    },
    {
      question: `What is ${locality.name} like to live in?`,
      answer: `<p>${locality.shortDescription} The locality page carries the full picture — connectivity, price band and the landmarks nearby.</p>`,
    },
  ];

  /* -------------------------------------------------------------- *
   * Visibility, agent and SEO
   * -------------------------------------------------------------- */

  const videoUrl = spec.video
    ? media.video({ alt: `${spec.project} walkthrough (placeholder)`, folder: 'properties' })
    : null;
  const virtualTourUrl = spec.tour ? PLACEHOLDER_TOUR : null;

  const sectionVisibility = {
    overview: true,
    highlights: true,
    specifications: true,
    amenities: true,
    unitConfigurations: unitConfigurations.length > 0,
    floorPlans: floorPlans.length > 0,
    gallery: true,
    video: Boolean(videoUrl),
    virtualTour: Boolean(virtualTourUrl),
    documents: true,
    construction: constructionTimeline.length > 0,
    builder: Boolean(developer),
    nearby: true,
    location: true,
    finance: forSale,
    faqs: true,
    similar: true,
    enquiry: true,
  };

  const agentMemberId = 2 + (index % 5);
  const agent = {
    teamMemberId: agentMemberId,
    name: null,
    phone: null,
    whatsapp: null,
    email: null,
    photoUrl: null,
    showOnListing: index % 2 === 0,
  };

  const seoTitle = `${headline}${listingSuffix} in ${locality.name}`;
  const seoDescription = fitDescription(
    forSale
      ? `${headline} at ${spec.project}, ${locality.name}, Bengaluru — ${formatArea(headlineArea, areaUnit)} at ${inr(salePrice)}. ${spec.short}`
      : `${headline} at ${spec.project}, ${locality.name}, Bengaluru — ${formatArea(headlineArea, areaUnit)} at ${inr(spec.rent)} a month. ${spec.short}`,
    'Enquire with Squares N Acres for a visit.'
  );

  const keywordBase = bedrooms
    ? `${bedrooms} bhk ${singular.toLowerCase()}`
    : singular.toLowerCase();
  const focusKeyword =
    spec.keyword ??
    (spec.listing === 'sale'
      ? `${keywordBase} in ${locality.name.toLowerCase()}`
      : `${keywordBase} for ${spec.listing} in ${locality.name.toLowerCase()}`);

  const createdOffset = spec.createdDaysAgo ?? 150 - index * 3;
  const publishedOffset = Math.max(1, createdOffset - 4);

  return {
    id,
    slug: spec.slug,
    title,
    projectName: spec.project,
    listingType: spec.listing,
    segment: type.segment,
    propertyTypeId: type.id,
    constructionStatus: spec.status,
    availability: spec.availability ?? 'available',
    possessionDate,
    ageOfPropertyYears,
    furnishing: spec.furnishing ?? null,
    facing: spec.facing ?? null,
    floorNumber: spec.floorNumber ?? null,
    totalFloors: spec.totalFloors ?? null,
    ownership: spec.ownership ?? null,
    reraNumber: spec.reraRegistered ? `PRM/KA/RERA/1251/446/PR/${300 + id}/placeholder` : null,
    reraRegistered: Boolean(spec.reraRegistered),
    description,
    shortDescription,
    highlights,
    amenityIds,
    badgeIds,
    specifications,
    constructionSpecs,
    unitConfigurations,
    floorPlans,
    images,
    videoUrl,
    virtualTourUrl,
    brochureUrl,
    brochureLeadGated: true,
    documents,
    location: {
      address: `Survey No. ${10 + id}, ${locality.name} Main Road`,
      localityId: locality.id,
      cityId: 1,
      pincode: locality.pincodes[index % locality.pincodes.length],
      landmark: `Near ${NEARBY[spec.locality][0][0]}`,
      latitude: Number((locality.latitude + rng.int(-60, 60) / 10000).toFixed(6)),
      longitude: Number((locality.longitude + rng.int(-60, 60) / 10000).toFixed(6)),
      mapEmbedUrl: null,
      showExactLocation: index % 5 !== 0 && index % 5 !== 1,
    },
    nearbyPlaces: NEARBY[spec.locality].map(
      ([name, category, distanceKm, travelTimeMin], position) => ({
        id: position + 1,
        name,
        category,
        distanceKm,
        travelTimeMin,
        order: position + 1,
      })
    ),
    pricing,
    area: areaBlock,
    configuration,
    project,
    constructionTimeline,
    constructionProgressPercent,
    faqs: faqs.map((entry, position) => ({
      id: position + 1,
      question: entry.question,
      answer: entry.answer,
      order: position + 1,
    })),
    similarPropertyIds: [],
    sectionVisibility,
    agent,
    seo: makeSeo({
      title: seoTitle,
      description: seoDescription,
      focusKeyword,
      secondaryKeywords: [
        `${spec.project.toLowerCase()} ${locality.name.toLowerCase()}`,
        `${type.name.toLowerCase()} in ${locality.name.toLowerCase()}`,
      ],
      slug: spec.slug,
    }),
    isActive: spec.draft !== true,
    isFeatured: Boolean(spec.featured),
    isVerified: Boolean(spec.verified),
    priorityOrder: spec.featured ? rng.int(6, 10) : rng.int(0, 5),
    viewCount: rng.int(40, 2400),
    enquiryCount: 0,
    publishedAt: spec.draft === true ? null : daysAgo(publishedOffset, 9, 30),
    createdBy: 1,
    updatedBy: 1,
    createdAt: daysAgo(createdOffset, rng.int(6, 17), rng.pick([0, 15, 30, 45])),
    updatedAt: daysAgo(rng.int(1, Math.max(2, createdOffset - 10)), rng.int(6, 17), 20),
  };
}

module.exports = { buildProperty, SINGULAR, AMENITY_SETS, AMENITY_FEATURES, familyOf, dateDaysAgo };
