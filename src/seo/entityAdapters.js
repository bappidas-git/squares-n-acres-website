/**
 * Eight record shapes in, one shape out.
 *
 * A property keeps its body in `description`, an article in `content`, a page
 * in twenty-three kinds of block, a locality and a developer in `description`,
 * an author in `bio`. The analysers must not know any of that: they ask for
 * `contentHtml`, `images`, `headings` and `links` and get the same answer
 * whatever they are pointed at. Everything a type-specific test needs — a
 * property's price, an article's tags, a locality's connectivity table — is
 * gathered once into `extras`, so no analyser reaches into a raw record.
 */

import { AREA_UNITS, LISTING_TYPES } from '../config/enums';
import {
  headings as htmlHeadings,
  images as htmlImages,
  links as htmlLinks,
  stripHtml,
  wordCount,
} from './text';
import { canonicalForEntity, publicPathFor } from './urls';
import { buildVariables, resolveTemplate, templateKeyFor } from './variables';

/** The `seo` branch of §9.6, with the fields the engine reads always present. */
export function readSeo(entity = {}) {
  const seo = entity?.seo ?? {};
  return {
    focusKeyword: seo.focusKeyword ?? '',
    secondaryKeywords: Array.isArray(seo.secondaryKeywords) ? seo.secondaryKeywords : [],
    title: seo.title ?? '',
    description: seo.description ?? '',
    slug: seo.slug ?? entity?.slug ?? '',
    canonicalUrl: seo.canonicalUrl ?? null,
    robots: { index: true, follow: true, ...(seo.robots ?? {}) },
    og: { title: null, description: null, imageUrl: null, ...(seo.og ?? {}) },
    twitter: { card: 'summary_large_image', ...(seo.twitter ?? {}) },
    schema: { type: 'auto', custom: '', disabledAutoTypes: [], ...(seo.schema ?? {}) },
    sitemap: { include: true, priority: null, changefreq: null, ...(seo.sitemap ?? {}) },
    redirect: { enabled: false, toPath: '', statusCode: 301, ...(seo.redirect ?? {}) },
  };
}

const findById = (records, id) =>
  (Array.isArray(records) ? records : []).find((row) => String(row?.id) === String(id)) ?? null;

const escapeAttribute = (value) =>
  String(value ?? '')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');

/** The block fields that read as prose, as a heading, as markup or as a link. */
const BLOCK_HEADING_KEYS = ['title', 'heading', 'question', 'name', 'milestone'];
const BLOCK_TEXT_KEYS = [
  'subtitle',
  'text',
  'intro',
  'summary',
  'detail',
  'caption',
  'label',
  'answer',
  'explanation',
  'stat',
  'note',
  'quote',
  'unit',
  'price',
];
const BLOCK_HTML_KEYS = ['html', 'content', 'body', 'bio'];
const BLOCK_LINK_KEYS = {
  ctaHref: 'ctaLabel',
  buttonHref: 'buttonLabel',
  href: 'label',
  linkUrl: 'linkLabel',
};

/**
 * A CMS page's blocks as one body of HTML.
 *
 * The analysers measure what a visitor reads, and what a visitor reads on a
 * page is its blocks: the headings become headings, the prose becomes
 * paragraphs, an image keeps its `alt`, a call to action keeps its link. Block
 * types that render other records — properties, articles, testimonials — carry
 * only their own title here, because their body is not this page's content.
 *
 * @param {object} page
 * @returns {string}
 */
export function blocksToHtml(page = {}) {
  const blocks = Array.isArray(page?.blocks) ? [...page.blocks] : [];
  blocks.sort((a, b) => (Number(a?.order) || 0) - (Number(b?.order) || 0));

  const out = [];

  const walk = (value, depth) => {
    if (value === null || value === undefined) return;

    if (Array.isArray(value)) {
      value.forEach((item) =>
        typeof item === 'string' ? out.push(`<li>${item}</li>`) : walk(item, depth + 1)
      );
      return;
    }
    if (typeof value !== 'object') return;

    const image = value.imageUrl ?? value.url ?? value.photoUrl ?? null;
    if (typeof image === 'string' && image && 'alt' in value) {
      out.push(`<img src="${escapeAttribute(image)}" alt="${escapeAttribute(value.alt ?? '')}" />`);
    }

    for (const key of BLOCK_HEADING_KEYS) {
      if (typeof value[key] === 'string' && value[key].trim()) {
        out.push(`<h${Math.min(depth + 2, 6)}>${value[key]}</h${Math.min(depth + 2, 6)}>`);
        break;
      }
    }
    for (const key of BLOCK_HTML_KEYS) {
      if (typeof value[key] === 'string' && value[key].trim()) out.push(value[key]);
    }
    for (const key of BLOCK_TEXT_KEYS) {
      if (typeof value[key] === 'string' && value[key].trim()) out.push(`<p>${value[key]}</p>`);
    }
    for (const [hrefKey, labelKey] of Object.entries(BLOCK_LINK_KEYS)) {
      const href = value[hrefKey];
      if (typeof href === 'string' && href.trim()) {
        out.push(`<a href="${escapeAttribute(href)}">${value[labelKey] ?? href}</a>`);
      }
    }

    for (const [key, child] of Object.entries(value)) {
      if (BLOCK_HEADING_KEYS.includes(key) || BLOCK_TEXT_KEYS.includes(key)) continue;
      if (BLOCK_HTML_KEYS.includes(key) || key in BLOCK_LINK_KEYS) continue;
      if (child && typeof child === 'object') walk(child, depth + 1);
    }
  };

  for (const block of blocks) walk(block?.data ?? {}, 0);
  return out.join('');
}

/** A property's own gallery, in the `{src, alt}` shape the analysers read. */
const propertyImages = (property) =>
  (Array.isArray(property?.images) ? property.images : []).map((image) => ({
    src: image?.url ?? '',
    alt: image?.alt ?? '',
  }));

/** Everything a property's own tests read. */
function propertyExtras(property, context) {
  const pricing = property?.pricing ?? {};
  const area = property?.area ?? {};
  const locality =
    property?.location?.locality ?? findById(context.localities, property?.location?.localityId);
  const propertyType =
    property?.propertyType ?? findById(context.propertyTypes, property?.propertyTypeId);
  const developer =
    property?.project?.developer ?? findById(context.developers, property?.project?.developerId);

  const hasPrice =
    Number.isFinite(Number(pricing.price)) ||
    Number.isFinite(Number(pricing.rentPerMonth)) ||
    Number.isFinite(Number(pricing.priceRangeMin));

  return {
    localityName: locality?.name ?? '',
    propertyTypeName: propertyType?.name ?? '',
    developerName: developer?.name ?? '',
    listingTypeLabel: LISTING_TYPES.verbOf(property?.listingType),
    areaUnitLabel: AREA_UNITS.labelOf(area.areaUnit ?? 'sqft'),
    hasPrice,
    priceOnRequest: Boolean(pricing.priceOnRequest),
    reraNumber: property?.reraNumber ?? '',
    reraRegistered: Boolean(property?.reraRegistered),
    faqs: Array.isArray(property?.faqs) ? property.faqs : [],
    amenityIds: Array.isArray(property?.amenityIds) ? property.amenityIds : [],
    floorPlans: Array.isArray(property?.floorPlans) ? property.floorPlans : [],
    unitConfigurations: Array.isArray(property?.unitConfigurations)
      ? property.unitConfigurations
      : [],
    videoUrl: property?.videoUrl ?? null,
    coverImageUrl:
      (Array.isArray(property?.images) ? property.images : []).find((image) => image?.isCover)
        ?.url ??
      property?.images?.[0]?.url ??
      null,
  };
}

/** What one entity type calls its body, its summary and its cover image. */
function readByType(entityType, entity, context) {
  switch (entityType) {
    case 'property': {
      const extras = propertyExtras(entity, context);
      return {
        title: entity.title ?? '',
        summary: entity.shortDescription ?? '',
        contentHtml: entity.description ?? '',
        ownImages: propertyImages(entity),
        coverImageUrl: extras.coverImageUrl,
        isPublished: Boolean(entity.isActive),
        extras,
      };
    }
    case 'article': {
      const featured = entity.featuredImage ?? null;
      return {
        title: entity.title ?? '',
        summary: entity.excerpt ?? '',
        contentHtml: entity.content ?? '',
        ownImages: featured?.url ? [{ src: featured.url, alt: featured.alt ?? '' }] : [],
        coverImageUrl: featured?.url ?? null,
        isPublished: entity.status === 'published',
        extras: {
          excerpt: entity.excerpt ?? '',
          categoryId: entity.categoryId ?? null,
          categoryName:
            (entity.category ?? findById(context.categories, entity.categoryId))?.name ?? '',
          tagIds: Array.isArray(entity.tagIds) ? entity.tagIds : [],
          featuredImage: featured,
          faqs: Array.isArray(entity.faqs) ? entity.faqs : [],
          relatedArticleIds: Array.isArray(entity.relatedArticleIds)
            ? entity.relatedArticleIds
            : [],
          relatedPropertyIds: Array.isArray(entity.relatedPropertyIds)
            ? entity.relatedPropertyIds
            : [],
          tableOfContents: entity.tableOfContents !== false,
          authorName: (entity.author ?? findById(context.authors, entity.authorId))?.name ?? '',
        },
      };
    }
    case 'page':
      return {
        title: entity.title ?? '',
        summary: entity.seo?.description ?? '',
        contentHtml: blocksToHtml(entity),
        ownImages: entity.heroImageUrl
          ? [{ src: entity.heroImageUrl, alt: entity.title ?? '' }]
          : [],
        coverImageUrl: entity.heroImageUrl ?? null,
        isPublished: entity.status === 'published',
        extras: {
          template: entity.template ?? 'standard',
          blocks: Array.isArray(entity.blocks) ? entity.blocks : [],
        },
      };
    case 'locality':
      return {
        title: entity.name ?? '',
        summary: entity.shortDescription ?? '',
        contentHtml: entity.description ?? '',
        ownImages: entity.heroImageUrl
          ? [{ src: entity.heroImageUrl, alt: entity.name ?? '' }]
          : [],
        coverImageUrl: entity.heroImageUrl ?? null,
        isPublished: entity.isActive !== false,
        extras: {
          cityName: findById(context.cities, entity.cityId)?.name ?? '',
          zone: entity.zone ?? '',
          connectivity: Array.isArray(entity.connectivity) ? entity.connectivity : [],
          highlights: Array.isArray(entity.highlights) ? entity.highlights : [],
          pincodes: Array.isArray(entity.pincodes) ? entity.pincodes : [],
        },
      };
    case 'developer':
      return {
        title: entity.name ?? '',
        summary: entity.shortDescription ?? '',
        contentHtml: entity.description ?? '',
        ownImages: entity.coverImageUrl
          ? [{ src: entity.coverImageUrl, alt: entity.name ?? '' }]
          : [],
        coverImageUrl: entity.coverImageUrl ?? entity.logoUrl ?? null,
        isPublished: entity.isActive !== false,
        extras: {
          highlights: Array.isArray(entity.highlights) ? entity.highlights : [],
          reraIds: Array.isArray(entity.reraIds) ? entity.reraIds : [],
          logoUrl: entity.logoUrl ?? null,
          establishedYear: entity.establishedYear ?? null,
        },
      };
    case 'author':
      return {
        title: entity.name ?? '',
        summary: stripHtml(entity.bio ?? '').slice(0, 300),
        contentHtml: entity.bio ?? '',
        ownImages: entity.avatarUrl ? [{ src: entity.avatarUrl, alt: entity.name ?? '' }] : [],
        coverImageUrl: entity.avatarUrl ?? null,
        isPublished: entity.isActive !== false,
        extras: { designation: entity.designation ?? '', socialLinks: entity.socialLinks ?? {} },
      };
    case 'articleCategory':
    case 'propertyType':
    default:
      return {
        title: entity.name ?? entity.title ?? '',
        summary: entity.description ?? '',
        contentHtml: '',
        ownImages: [],
        coverImageUrl: null,
        isPublished: entity.isActive !== false,
        extras: { segment: entity.segment ?? '' },
      };
  }
}

/**
 * One record, normalised into what every analyser reads.
 *
 * @param {string} entityType one of `SEO_ENTITY_TYPES`
 * @param {object} entity the record, possibly empty (a form that has just opened)
 * @param {object} [context] `{ seoSettings, siteSettings, localities, cities,
 *   propertyTypes, developers, categories, authors, siteIndex }`
 * @returns {object}
 */
export function toSeoInput(entityType, entity = {}, context = {}) {
  const record = entity ?? {};
  const byType = readByType(entityType, record, context);
  const seo = readSeo(record);
  const siteUrl = context.siteUrl ?? context.seoSettings?.siteUrl ?? '';

  const contentHtml = byType.contentHtml ?? '';
  const contentText = stripHtml(contentHtml);
  const contentImages = htmlImages(contentHtml);

  const variables = buildVariables(entityType, record, context);
  const templates = context.seoSettings?.titleTemplates ?? {};
  const templateTitle = resolveTemplate(
    templates[templateKeyFor(entityType)] ?? templates.default ?? '%title% %sep% %sitename%',
    variables
  );

  // A record with no title of its own has no effective title. Resolved against
  // an empty form, a template answers with the site's name and whatever
  // punctuation survived the cleaning — which is not a title for anything, and
  // would have the title tests measuring the brand instead of the record.
  const effectiveTitle = seo.title || (byType.title ? templateTitle : '');

  return {
    entityType,
    entity: record,
    id: record.id ?? null,
    title: byType.title,
    templateTitle,
    effectiveTitle,
    slug: seo.slug,
    summary: byType.summary,
    description: seo.description,
    contentHtml,
    contentText,
    wordCount: wordCount(contentText),
    images: [...byType.ownImages, ...contentImages],
    contentImages,
    links: htmlLinks(contentHtml, { siteUrl }),
    headings: htmlHeadings(contentHtml),
    url: publicPathFor(entityType, record),
    canonical: canonicalForEntity(entityType, record, { ...context, siteUrl }),
    coverImageUrl: byType.coverImageUrl,
    isPublished: byType.isPublished,
    seo,
    focusKeyword: seo.focusKeyword,
    extras: byType.extras ?? {},
  };
}

const entityAdapters = { blocksToHtml, readSeo, toSeoInput };

export default entityAdapters;
