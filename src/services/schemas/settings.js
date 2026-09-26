/**
 * Settings write schemas — `siteSettings` (00_MASTER_CONTEXT.md §6.13) and
 * `seoSettings` (§6.14). Both are singletons, and `PUT` deep-merges the known
 * keys only (§5.14), so every branch is optional and carries its default.
 */

const {
  HERO_SEARCH_TABS,
  LEAD_AUTO_ASSIGN,
  LEAD_PRIORITY,
  SITEMAP_CHANGEFREQ,
} = require('../../config/enums');
const { DEFAULT_WHATSAPP_TEMPLATE } = require('../../config/leadWhatsapp');

const siteSettings = {
  general: {
    type: 'object',
    shape: {
      siteName: { type: 'string', required: true, maxLength: 120, default: 'Squares N Acres' },
      tagline: { type: 'string', maxLength: 200, default: '' },
      logoUrl: { type: 'url', nullable: true, default: null },
      iconUrl: { type: 'url', nullable: true, default: null },
      siteUrl: { type: 'url', required: true },
      defaultLanguage: { type: 'string', maxLength: 10, default: 'en-IN' },
      contactEmail: { type: 'email', required: true },
      contactPhone: { type: 'phone', required: true },
      alternatePhone: { type: 'phone', nullable: true, default: null },
      whatsappNumber: { type: 'phone', nullable: true, default: null },
      whatsappDefaultMessage: { type: 'string', maxLength: 300, default: '' },
      address: {
        type: 'object',
        shape: {
          line1: { type: 'string', maxLength: 200, default: '' },
          line2: { type: 'string', nullable: true, maxLength: 200, default: null },
          locality: { type: 'string', nullable: true, maxLength: 120, default: null },
          city: { type: 'string', maxLength: 120, default: '' },
          state: { type: 'string', maxLength: 120, default: '' },
          pincode: { type: 'string', maxLength: 6, default: '' },
          country: { type: 'string', maxLength: 120, default: 'India' },
        },
      },
      mapEmbedUrl: { type: 'url', nullable: true, default: null },
      latitude: { type: 'number', nullable: true, min: -90, max: 90, default: null },
      longitude: { type: 'number', nullable: true, min: -180, max: 180, default: null },
      workingHours: {
        type: 'array',
        default: [],
        items: {
          type: 'object',
          shape: {
            days: { type: 'string', required: true, maxLength: 60 },
            hours: { type: 'string', required: true, maxLength: 60 },
          },
        },
      },
      reraNumber: { type: 'string', nullable: true, maxLength: 80, default: null },
      gstNumber: { type: 'string', nullable: true, maxLength: 30, default: null },
      establishedYear: { type: 'int', nullable: true, min: 1800, max: 2100, default: null },
    },
  },
  hero: {
    type: 'object',
    shape: {
      title: { type: 'string', maxLength: 150, default: '' },
      subtitle: { type: 'string', maxLength: 300, default: '' },
      backgroundImageUrl: { type: 'url', nullable: true, default: null },
      backgroundVideoUrl: { type: 'url', nullable: true, default: null },
      mobileImageUrl: { type: 'url', nullable: true, default: null },
      searchTabs: {
        type: 'array',
        items: { type: 'enum', enum: HERO_SEARCH_TABS.values },
        default: ['sale', 'rent'],
      },
      stats: {
        type: 'array',
        default: [],
        items: {
          type: 'object',
          shape: {
            label: { type: 'string', required: true, maxLength: 80 },
            value: { type: 'string', required: true, maxLength: 40 },
            suffix: { type: 'string', nullable: true, maxLength: 20, default: null },
          },
        },
      },
      badges: { type: 'array', items: { type: 'string', maxLength: 60 }, default: [] },
    },
  },
  navigation: {
    type: 'object',
    shape: {
      headerCtaLabel: { type: 'string', maxLength: 40, default: 'Post Requirement' },
      headerCtaHref: { type: 'string', maxLength: 200, default: '#post-requirement' },
      showCallButton: { type: 'bool', default: true },
      showWhatsappButton: { type: 'bool', default: true },
    },
  },
  social: {
    type: 'object',
    shape: {
      facebook: { type: 'url', nullable: true, default: null },
      instagram: { type: 'url', nullable: true, default: null },
      linkedin: { type: 'url', nullable: true, default: null },
      youtube: { type: 'url', nullable: true, default: null },
      x: { type: 'url', nullable: true, default: null },
      pinterest: { type: 'url', nullable: true, default: null },
    },
  },
  footer: {
    type: 'object',
    shape: {
      aboutText: { type: 'string', maxLength: 600, default: '' },
      columns: {
        type: 'array',
        default: [],
        items: {
          type: 'object',
          shape: {
            title: { type: 'string', required: true, maxLength: 60 },
            links: {
              type: 'array',
              default: [],
              items: {
                type: 'object',
                shape: {
                  label: { type: 'string', required: true, maxLength: 60 },
                  href: { type: 'string', required: true, maxLength: 300 },
                  external: { type: 'bool', default: false },
                },
              },
            },
          },
        },
      },
      disclaimer: { type: 'string', maxLength: 1000, default: '' },
      copyrightText: { type: 'string', maxLength: 200, default: '' },
      showNewsletter: { type: 'bool', default: true },
      showGallery: { type: 'bool', default: false },
      galleryImageUrls: { type: 'array', items: { type: 'url' }, default: [] },
    },
  },
  newsletter: {
    type: 'object',
    shape: {
      enabled: { type: 'bool', default: true },
      title: { type: 'string', maxLength: 120, default: '' },
      subtitle: { type: 'string', maxLength: 300, default: '' },
      successMessage: { type: 'string', maxLength: 300, default: '' },
    },
  },
  integrations: {
    type: 'object',
    shape: {
      googleAnalyticsId: { type: 'string', nullable: true, maxLength: 40, default: null },
      googleTagManagerId: { type: 'string', nullable: true, maxLength: 40, default: null },
      facebookPixelId: { type: 'string', nullable: true, maxLength: 40, default: null },
      googleMapsApiKey: { type: 'string', nullable: true, maxLength: 120, default: null },
      cloudinaryCloudName: { type: 'string', nullable: true, maxLength: 80, default: null },
      cloudinaryUploadPreset: { type: 'string', nullable: true, maxLength: 80, default: null },
      recaptchaSiteKey: { type: 'string', nullable: true, maxLength: 120, default: null },
    },
  },
  // Admin-only branch: never part of the public `GET /settings` subset (§5.10).
  leads: {
    type: 'object',
    shape: {
      notificationEmails: { type: 'array', items: { type: 'email' }, default: [] },
      autoAssign: { type: 'enum', enum: LEAD_AUTO_ASSIGN.values, default: 'none' },
      // The message the desk's WhatsApp buttons open with (prompt 51):
      // `{name}`, `{property}`, `{agent}`, `{link}` and `{brand}` are filled in.
      whatsappTemplate: {
        type: 'string',
        maxLength: 500,
        default: DEFAULT_WHATSAPP_TEMPLATE,
      },
      defaultPriority: {
        type: 'enum',
        enum: LEAD_PRIORITY.values,
        default: 'medium',
      },
    },
  },
};

const titleTemplateKeys = [
  'default',
  'home',
  'property',
  'listing',
  'locality',
  'developer',
  'article',
  'articleCategory',
  'page',
  'author',
  'search',
];

const sitemapEntityKeys = ['property', 'locality', 'developer', 'article', 'page'];

const seoSettings = {
  siteUrl: { type: 'url', required: true },
  separator: { type: 'string', maxLength: 3, default: '|' },
  titleTemplates: {
    type: 'object',
    shape: Object.fromEntries(
      titleTemplateKeys.map((key) => [key, { type: 'string', maxLength: 200, default: '' }])
    ),
  },
  defaults: {
    type: 'object',
    shape: {
      metaDescription: { type: 'string', maxLength: 320, default: '' },
      ogImageUrl: { type: 'url', nullable: true, default: null },
      twitterCard: {
        type: 'enum',
        enum: ['summary', 'summary_large_image'],
        default: 'summary_large_image',
      },
      robots: {
        type: 'object',
        shape: {
          index: { type: 'bool', default: true },
          follow: { type: 'bool', default: true },
        },
      },
    },
  },
  knowledgeGraph: {
    type: 'object',
    shape: {
      type: {
        type: 'enum',
        enum: ['Organization', 'RealEstateAgent', 'LocalBusiness'],
        default: 'RealEstateAgent',
      },
      name: { type: 'string', maxLength: 150, default: '' },
      legalName: { type: 'string', nullable: true, maxLength: 200, default: null },
      logoUrl: { type: 'url', nullable: true, default: null },
      description: { type: 'string', maxLength: 600, default: '' },
      phone: { type: 'phone', nullable: true, default: null },
      email: { type: 'email', nullable: true, default: null },
      address: {
        type: 'object',
        shape: {
          streetAddress: { type: 'string', maxLength: 200, default: '' },
          addressLocality: { type: 'string', maxLength: 120, default: '' },
          addressRegion: { type: 'string', maxLength: 120, default: '' },
          postalCode: { type: 'string', maxLength: 10, default: '' },
          addressCountry: { type: 'string', maxLength: 2, default: 'IN' },
        },
      },
      geo: {
        type: 'object',
        shape: {
          latitude: { type: 'number', nullable: true, min: -90, max: 90, default: null },
          longitude: { type: 'number', nullable: true, min: -180, max: 180, default: null },
        },
      },
      openingHours: { type: 'array', items: { type: 'string', maxLength: 60 }, default: [] },
      priceRange: { type: 'string', nullable: true, maxLength: 20, default: null },
      areaServed: { type: 'array', items: { type: 'string', maxLength: 120 }, default: [] },
      sameAs: { type: 'array', items: { type: 'url' }, default: [] },
    },
  },
  verification: {
    type: 'object',
    shape: {
      google: { type: 'string', nullable: true, maxLength: 200, default: null },
      bing: { type: 'string', nullable: true, maxLength: 200, default: null },
      pinterest: { type: 'string', nullable: true, maxLength: 200, default: null },
      yandex: { type: 'string', nullable: true, maxLength: 200, default: null },
    },
  },
  robotsTxt: { type: 'string', maxLength: 10000, default: '' },
  llmsTxt: { type: 'string', maxLength: 20000, default: '' },
  sitemap: {
    type: 'object',
    shape: {
      enabled: { type: 'bool', default: true },
      includeProperties: { type: 'bool', default: true },
      includeLocalities: { type: 'bool', default: true },
      includeDevelopers: { type: 'bool', default: true },
      includeArticles: { type: 'bool', default: true },
      includePages: { type: 'bool', default: true },
      changefreq: {
        type: 'object',
        shape: Object.fromEntries(
          sitemapEntityKeys.map((key) => [
            key,
            { type: 'enum', enum: SITEMAP_CHANGEFREQ.values, default: 'monthly' },
          ])
        ),
      },
      priority: {
        type: 'object',
        shape: Object.fromEntries(
          sitemapEntityKeys.map((key) => [key, { type: 'number', min: 0, max: 1, default: 0.5 }])
        ),
      },
      excludeUrls: { type: 'array', items: { type: 'string', maxLength: 500 }, default: [] },
    },
  },
  breadcrumbs: {
    type: 'object',
    shape: {
      enabled: { type: 'bool', default: true },
      homeLabel: { type: 'string', maxLength: 40, default: 'Home' },
    },
  },
  noindex: {
    type: 'object',
    shape: {
      searchResults: { type: 'bool', default: true },
      paginatedListings: { type: 'bool', default: false },
      filteredListings: { type: 'bool', default: true },
      adminAndAuth: { type: 'bool', default: true },
    },
  },
  customHeadHtml: { type: 'string', nullable: true, maxLength: 20000, default: null },
  customBodyEndHtml: { type: 'string', nullable: true, maxLength: 20000, default: null },
};

module.exports = {
  siteSettings: { update: siteSettings },
  seoSettings: { update: seoSettings },
  titleTemplateKeys,
  sitemapEntityKeys,
};
