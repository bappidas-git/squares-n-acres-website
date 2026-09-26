/**
 * `siteSettings` and `seoSettings` — the two singletons (§6.13, §6.14).
 *
 * Everything the client owns is a labelled placeholder (§14): the address, the
 * RERA and GST numbers, the legal line in the footer, the hero copy. The
 * statistics arrays are seeded **empty** on purpose — a hero that says "500+
 * families" when nobody counted is the one placeholder that turns into a false
 * claim the moment its origin is forgotten, and the components hide an empty
 * `stats` array.
 *
 * Optional strings that are not set are stored as `null` rather than `''`: the
 * model types them nullable, and the `url`-typed ones (`social.*`) cannot hold
 * an empty string at all.
 *
 * `seoSettings` carries the §9.5 title templates and the §9.8 robots
 * directives verbatim. `llmsTxt` is deliberately empty, because the mock
 * generates `llms.txt` from the live data when the stored document is blank,
 * which keeps it current instead of stale.
 */

const { BRAND } = require('../lib/media');
const { DEFAULT_WHATSAPP_TEMPLATE } = require('../../../src/config/leadWhatsapp');

const ROBOTS_TXT = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /shortlist
Disallow: /*?preview=
Disallow: /*?q=

User-agent: Googlebot
Allow: /
User-agent: Bingbot
Allow: /
User-agent: DuckDuckBot
Allow: /
User-agent: GPTBot
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Claude-User
Allow: /
User-agent: Claude-SearchBot
Allow: /
User-agent: anthropic-ai
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Perplexity-User
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: CCBot
Allow: /
User-agent: Applebot
Allow: /
User-agent: Applebot-Extended
Allow: /
User-agent: Amazonbot
Allow: /
User-agent: meta-externalagent
Allow: /
User-agent: Bytespider
Allow: /

Sitemap: %siteurl%/sitemap.xml`;

const SITE_URL = 'https://www.squaresnacres.com';

module.exports = function settings({ media, dates }) {
  const logoUrl = media.brand(BRAND.logoUrl, {
    alt: 'Squares N Acres',
    folder: 'brand',
    tags: ['brand', 'logo'],
    width: 540,
    height: 231,
  });

  const iconUrl = media.brand(BRAND.iconUrl, {
    alt: 'Squares N Acres monogram',
    folder: 'brand',
    tags: ['brand', 'icon'],
    width: 1254,
    height: 1254,
  });

  const ogImageUrl = media.brand(BRAND.ogImageUrl, {
    alt: 'Squares N Acres',
    folder: 'brand',
    tags: ['brand', 'open-graph'],
    width: 1200,
    height: 630,
  });

  const updatedAt = dates.daysAgo(3, 11, 0);

  const siteSettings = {
    general: {
      siteName: 'Squares N Acres',
      tagline: 'Your trusted partner for Bengaluru property',
      logoUrl,
      iconUrl,
      siteUrl: SITE_URL,
      defaultLanguage: 'en-IN',
      contactEmail: 'info@squaresnacres.com',
      // Synthetic but structurally valid: the model validates Indian mobiles,
      // so the masked `+91 98XXX XXXXX` of §14 cannot be stored literally.
      contactPhone: '+919800000001',
      alternatePhone: null,
      whatsappNumber: '+919800000000',
      whatsappDefaultMessage: 'Hi Squares N Acres, I am interested in a property.',
      address: {
        line1: '[Office address to be provided]',
        line2: null,
        locality: null,
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
        country: 'India',
      },
      mapEmbedUrl: null,
      latitude: 12.9716,
      longitude: 77.5946,
      workingHours: [
        { days: 'Monday to Saturday', hours: '9:30 am – 6:30 pm' },
        { days: 'Sunday', hours: 'By appointment' },
      ],
      reraNumber: 'To be provided',
      gstNumber: 'To be provided',
      establishedYear: null,
    },
    hero: {
      title: 'Find your next home in Bengaluru',
      subtitle:
        'Verified apartments, villas, plots and commercial spaces — with expert guidance at every step.',
      backgroundImageUrl: media.photo({
        seed: 'sna-hero-background',
        width: 1920,
        height: 1080,
        alt: 'Bengaluru skyline at dusk',
        folder: 'settings',
        tags: ['hero'],
      }),
      backgroundVideoUrl: null,
      mobileImageUrl: media.photo({
        seed: 'sna-hero-mobile',
        width: 900,
        height: 1200,
        alt: 'Bengaluru skyline, portrait crop',
        folder: 'settings',
        tags: ['hero', 'mobile'],
      }),
      searchTabs: ['sale', 'rent', 'lease', 'commercial', 'plots'],
      stats: [],
      badges: [],
    },
    navigation: {
      headerCtaLabel: 'Post Requirement',
      headerCtaHref: '#post-requirement',
      showCallButton: true,
      showWhatsappButton: true,
    },
    social: {
      facebook: null,
      instagram: null,
      linkedin: null,
      youtube: null,
      x: null,
      pinterest: null,
    },
    footer: {
      aboutText:
        'Squares N Acres is a property advisory based in Bengaluru. We list what we have seen, verify what we publish, and stay with our clients through the whole transaction.',
      columns: [
        {
          title: 'Buy',
          links: [
            { label: 'Ready to move', href: '/buy/ready-to-move', external: false },
            { label: 'Under construction', href: '/buy/under-construction', external: false },
            { label: 'Pre-launch', href: '/buy/pre-launch', external: false },
            { label: 'Resale', href: '/buy/resale', external: false },
          ],
        },
        {
          title: 'Services',
          links: [
            { label: 'Home loan assistance', href: '/buyer-assistance/home-loan', external: false },
            {
              label: 'Legal assistance',
              href: '/buyer-assistance/legal-assistance',
              external: false,
            },
            {
              label: 'Interior designing',
              href: '/buyer-assistance/interior-designing',
              external: false,
            },
            { label: 'Sell or let', href: '/sell-let', external: false },
          ],
        },
      ],
      disclaimer: 'Listings are subject to availability. [Client legal text]',
      copyrightText: '© %year% Squares N Acres. All rights reserved.',
      showNewsletter: true,
      showGallery: false,
      galleryImageUrls: [],
    },
    newsletter: {
      enabled: true,
      title: 'Property insight, once a month',
      subtitle:
        'Locality notes, new launches and practical guidance. No spam, and you can unsubscribe at any time.',
      successMessage: 'Thank you — please check your inbox to confirm the subscription.',
    },
    integrations: {
      googleAnalyticsId: null,
      googleTagManagerId: null,
      facebookPixelId: null,
      googleMapsApiKey: null,
      cloudinaryCloudName: null,
      cloudinaryUploadPreset: null,
      recaptchaSiteKey: null,
    },
    leads: {
      notificationEmails: ['info@squaresnacres.com'],
      autoAssign: 'none',
      whatsappTemplate: DEFAULT_WHATSAPP_TEMPLATE,
      defaultPriority: 'medium',
    },
    updatedAt,
  };

  const seoSettings = {
    siteUrl: SITE_URL,
    separator: '|',
    titleTemplates: {
      default: '%title% %sep% %sitename%',
      home: '%sitename% – Buy, Sell & Rent Properties in Bangalore',
      property:
        '%bhk% %propertytype% %listingtype% in %locality%, %city% – %price% %sep% %sitename%',
      listing:
        '%propertytype% %listingtype% in %locality%, %city% – %count% Listings %sep% %sitename%',
      locality: 'Properties in %locality%, %city% – Buy, Rent & Invest %sep% %sitename%',
      developer: '%title% – Projects in %city% %sep% %sitename%',
      article: '%title% %sep% %sitename%',
      articleCategory: '%title% Articles %sep% %sitename%',
      page: '%title% %sep% %sitename%',
      author: '%title% – Author %sep% %sitename%',
      search: 'Search results %sep% %sitename%',
    },
    defaults: {
      metaDescription:
        'Squares N Acres is a property advisory in Bengaluru: curated apartments, villas, plots and commercial space, with verified information and one advisor throughout.',
      ogImageUrl,
      twitterCard: 'summary_large_image',
      robots: { index: true, follow: true },
    },
    knowledgeGraph: {
      type: 'RealEstateAgent',
      name: 'Squares N Acres',
      legalName: null,
      logoUrl,
      description:
        'Property advisory in Bengaluru, Karnataka: curated residential and commercial listings, locality research and end-to-end transaction support.',
      phone: '+919800000001',
      email: 'info@squaresnacres.com',
      address: {
        streetAddress: '[Office address to be provided]',
        addressLocality: 'Bengaluru',
        addressRegion: 'Karnataka',
        postalCode: '560001',
        addressCountry: 'IN',
      },
      geo: { latitude: 12.9716, longitude: 77.5946 },
      openingHours: ['Mo-Sa 09:30-18:30'],
      priceRange: null,
      areaServed: ['Bengaluru'],
      sameAs: [],
    },
    verification: { google: null, bing: null, pinterest: null, yandex: null },
    robotsTxt: ROBOTS_TXT,
    // Empty on purpose: the mock generates `llms.txt` from the live data
    // whenever the stored document is blank (§9.8).
    llmsTxt: '',
    sitemap: {
      enabled: true,
      includeProperties: true,
      includeLocalities: true,
      includeDevelopers: true,
      includeArticles: true,
      includePages: true,
      changefreq: {
        property: 'weekly',
        locality: 'weekly',
        developer: 'monthly',
        article: 'monthly',
        page: 'monthly',
      },
      priority: { property: 0.8, locality: 0.7, developer: 0.6, article: 0.6, page: 0.5 },
      excludeUrls: [],
    },
    breadcrumbs: { enabled: true, homeLabel: 'Home' },
    noindex: {
      searchResults: true,
      paginatedListings: false,
      filteredListings: true,
      adminAndAuth: true,
    },
    customHeadHtml: null,
    customBodyEndHtml: null,
    updatedAt,
  };

  return { siteSettings, seoSettings };
};
