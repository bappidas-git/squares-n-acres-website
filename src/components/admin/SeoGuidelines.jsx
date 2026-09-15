import React, { useState } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Chip,
} from '@mui/material';
import { Icon } from '@iconify/react';

const guidelines = [
  {
    id: 'titles',
    icon: 'mdi:format-title',
    color: '#3B82F6',
    title: 'How to Write SEO Titles',
    content: [
      'Keep titles between 50–60 characters for optimal display on Google search results.',
      'Place the primary keyword (property name, location) near the beginning of the title.',
      'Include the property configuration (e.g., 2 BHK, 3 BHK) for specificity.',
      'Add geo-modifiers like city name or area name to attract local search traffic.',
      'Use separator characters like — or | to structure the title clearly.',
      'Avoid keyword stuffing — one primary keyword and one secondary keyword is ideal.',
      'Each property must have a unique title — never duplicate across listings.',
      'Example: "Prestige Lakeside Habitat — 2, 3, 4 BHK in Whitefield, Bangalore"',
    ],
  },
  {
    id: 'descriptions',
    icon: 'mdi:text-box-outline',
    color: '#10B981',
    title: 'How to Write Descriptions That Increase CTR',
    content: [
      'Target 140–160 characters — Google truncates descriptions beyond 160 characters.',
      'Start with an action word: Explore, Discover, Find, Buy, Book a visit.',
      'Mention the property name, developer, and location within the first 80 characters.',
      'Include pricing information or possession status to set expectations.',
      'Highlight a unique selling point (USP) of the property.',
      'End with a soft call-to-action like "Book a site visit today" or "Check pricing".',
      'Make each description unique — never copy the same description for multiple properties.',
      'Example: "Explore Prestige Lakeside Habitat by Prestige Group in Whitefield, Bangalore. 2-4 BHK apartments from 1200-2500 sqft. Ready to move. Schedule a visit today."',
    ],
  },
  {
    id: 'keywords',
    icon: 'mdi:key-variant',
    color: '#F59E0B',
    title: 'How to Choose Keywords Properly',
    content: [
      'Use 3–8 keywords per property — enough for relevance, not so many it becomes spam.',
      'Include the property name as the first keyword (branded keyword).',
      'Add location-based keywords: "[property type] in [area]", "[property type] in [city]".',
      'Include transaction-type keywords: "buy apartments in [city]", "rent villas in [area]".',
      'Use long-tail keywords for better targeting: "3 BHK apartment in Sarjapur Road under 1.5 Cr".',
      'Research what people actually search for — use Google autocomplete for ideas.',
      'Avoid generic terms alone like "property" or "home" — always pair with location or type.',
      'Update keywords seasonally or when market trends change.',
    ],
  },
  {
    id: 'schema',
    icon: 'mdi:code-json',
    color: '#8B5CF6',
    title: 'How Schema (JSON-LD) Helps Ranking',
    content: [
      'Schema markup tells Google exactly what your page is about in a structured format.',
      'Google uses schema to generate rich snippets — enhanced search results with pricing, ratings, images.',
      'Use RealEstateListing as the primary @type for property listings.',
      'Include address, geo coordinates, pricing (Offer), and property features (amenities).',
      'Add BreadcrumbList schema to show navigation hierarchy in search results.',
      'Always set @context to "https://schema.org" — this is required for all schema markup.',
      'Validate your schema using Google\'s Rich Results Test tool.',
      'Keep schema in sync with the visible page content — mismatches can trigger penalties.',
    ],
  },
  {
    id: 'canonical',
    icon: 'mdi:link-variant',
    color: '#EC4899',
    title: 'Importance of Canonical URLs',
    content: [
      'Canonical URLs tell Google which version of a page is the "official" one.',
      'Prevents duplicate content issues when the same property is accessible via multiple URLs.',
      'Always set the canonical URL to the clean, slug-based URL of the property page.',
      'Format: https://yourdomain.com/properties/[property-slug]',
      'Without canonical tags, Google may index the wrong URL or split ranking signals.',
      'Critical for paginated content, filtered views, and URL parameters.',
      'Self-referencing canonicals (pointing to themselves) are a best practice for every page.',
    ],
  },
  {
    id: 'internal-linking',
    icon: 'mdi:vector-link',
    color: '#06B6D4',
    title: 'Internal Linking Importance',
    content: [
      'Internal links distribute "link equity" across your site — helping deeper pages rank.',
      'Link from high-authority pages (homepage, popular listings) to newer or weaker pages.',
      'Use descriptive anchor text: "3 BHK apartments in Whitefield" is better than "click here".',
      'Similar properties sections create natural internal links between related listings.',
      'Blog articles about locations should link to properties in those locations.',
      'Ensure every property page is reachable within 3 clicks from the homepage.',
      'Broken internal links (404s) waste crawl budget — audit them regularly.',
    ],
  },
  {
    id: 'page-speed',
    icon: 'mdi:speedometer',
    color: '#F97316',
    title: 'Page Speed Importance',
    content: [
      'Google\'s Core Web Vitals directly impact rankings — fast sites rank higher.',
      'Target under 2.5 seconds for Largest Contentful Paint (LCP).',
      'Optimize images: use WebP format, lazy loading, and responsive srcset.',
      'Minimize JavaScript bundle size — code-split routes and lazy-load components.',
      'Use a CDN for static assets and images.',
      'Enable GZIP/Brotli compression on your server.',
      'Monitor Core Web Vitals using Google Search Console and PageSpeed Insights.',
    ],
  },
  {
    id: 'mobile',
    icon: 'mdi:cellphone',
    color: '#14B8A6',
    title: 'Mobile Friendliness',
    content: [
      'Google uses mobile-first indexing — your mobile site IS your primary site for ranking.',
      'All property pages must be fully responsive and touch-friendly.',
      'Buttons and links should have at least 48x48px touch targets.',
      'Text must be readable without zooming — minimum 16px font size on mobile.',
      'No horizontal scrolling — content must fit the viewport.',
      'Test every page using Google\'s Mobile-Friendly Test tool.',
      'Ensure images resize properly and don\'t cause layout shifts on mobile.',
    ],
  },
  {
    id: 'images',
    icon: 'mdi:image-outline',
    color: '#A855F7',
    title: 'Image Optimization',
    content: [
      'Every gallery image should have descriptive alt text for accessibility and SEO.',
      'Alt text pattern: "[Property Name] - [What the image shows] in [Location]".',
      'Compress images before upload — aim for under 200KB per image.',
      'Use modern formats (WebP) with JPEG fallback for broader compatibility.',
      'Set explicit width and height to prevent Cumulative Layout Shift (CLS).',
      'Use descriptive file names: "prestige-lakeside-swimming-pool.webp" not "IMG_4523.jpg".',
      'Set a dedicated OG image (1200x630px) for each property for optimal social sharing.',
    ],
  },
  {
    id: 'keyword-stuffing',
    icon: 'mdi:alert-octagon-outline',
    color: '#EF4444',
    title: 'Avoiding Keyword Stuffing',
    content: [
      'Keyword stuffing = repeating keywords unnaturally to manipulate rankings.',
      'Google penalizes keyword stuffing — it can cause your page to drop from search results entirely.',
      'Never repeat the same keyword more than 2-3 times in the meta description.',
      'Keyword density should be under 2% of total page content.',
      'Use natural language — write for humans first, search engines second.',
      'Use synonyms and related terms (LSI keywords) instead of repeating the same phrase.',
      'Example of BAD: "Bangalore apartments, apartments Bangalore, buy apartments Bangalore cheap apartments"',
      'Example of GOOD: "Premium apartments in Bangalore\'s Whitefield area with modern amenities and excellent connectivity."',
    ],
  },
  {
    id: 'local-seo',
    icon: 'mdi:map-marker-radius',
    color: '#0EA5E9',
    title: 'Local SEO Tips for Real Estate',
    content: [
      'Real estate is inherently local — most buyers search with city or area names.',
      'Include the full address (area, city, state) in your schema markup.',
      'Add geo coordinates (latitude, longitude) for map-based search results.',
      'Create location-specific landing pages: "/apartments-in-whitefield-bangalore".',
      'Mention nearby landmarks, schools, hospitals, and IT parks in your property description.',
      'Use Google Business Profile (formerly GMB) for your main office location.',
      'Encourage reviews from clients — local reviews significantly boost local rankings.',
      'Include local phone numbers and area-specific contact information.',
    ],
  },
  {
    id: 'geo-modifiers',
    icon: 'mdi:earth',
    color: '#6366F1',
    title: 'Geo Modifiers Usage',
    content: [
      'Geo modifiers are location-specific terms added to keywords for local targeting.',
      'Primary geo modifier: City name (e.g., "apartments in Bangalore").',
      'Secondary geo modifier: Area/locality (e.g., "apartments in Whitefield, Bangalore").',
      'Tertiary geo modifier: Micro-market (e.g., "apartments near ITPL Whitefield").',
      'Add geo modifiers to: title tags, meta descriptions, H1 headings, and schema.',
      'Use "near" for proximity targeting: "apartments near Sarjapur Road".',
      'Include state name for broader reach: "flats in Bangalore, Karnataka".',
      'Combine with property type: "3 BHK villa in Devanahalli, Bangalore".',
    ],
  },
  {
    id: 'how-google-ranks',
    icon: 'mdi:google',
    color: '#4285F4',
    title: 'Why Google Ranks Pages',
    content: [
      'Google\'s goal is to show the most relevant, trustworthy, and useful result for every query.',
      'Relevance: Does your page content match what the user is searching for?',
      'Authority: Do other reputable sites link to your content?',
      'User Experience: Is your page fast, mobile-friendly, and easy to navigate?',
      'Content Quality: Is your content original, comprehensive, and up-to-date?',
      'Technical SEO: Can Google crawl and index your page properly?',
      'Engagement: Do users stay on your page or bounce back to search results?',
      'Google uses 200+ ranking factors — focus on the ones you can control.',
    ],
  },
  {
    id: 'indexing',
    icon: 'mdi:database-search',
    color: '#84CC16',
    title: 'How to Improve Indexing',
    content: [
      'Submit your XML sitemap to Google Search Console — this tells Google about all your pages.',
      'Ensure robots.txt allows crawling of all important pages.',
      'Use "Request Indexing" in Search Console for new or updated pages.',
      'Internal links help Google discover new pages — link new properties from the homepage.',
      'Avoid orphan pages (pages with no internal links pointing to them).',
      'Use proper HTTP status codes: 200 for live pages, 301 for redirects, 404 for removed.',
      'Monitor the "Coverage" report in Search Console for crawl errors.',
      'Avoid noindex tags on pages you want indexed.',
    ],
  },
  {
    id: 'sitemap-robots',
    icon: 'mdi:file-tree',
    color: '#D946EF',
    title: 'Sitemap & Robots.txt',
    content: [
      'sitemap.xml is a file that lists all pages you want Google to index.',
      'Include all property pages, category pages, articles, and static pages.',
      'Update the sitemap automatically whenever a new property is added or removed.',
      'Format: XML sitemap with <url>, <loc>, <lastmod>, <changefreq>, and <priority>.',
      'robots.txt controls which pages search engines can and cannot crawl.',
      'Allow: /properties/, /insights/, /about, /contact — key public pages.',
      'Disallow: /admin/, /api/ — keep admin and API endpoints out of search.',
      'Point to your sitemap in robots.txt: "Sitemap: https://yourdomain.com/sitemap.xml".',
      'Submit your sitemap URL in Google Search Console for faster discovery.',
    ],
  },
  {
    id: 'eeat',
    icon: 'mdi:shield-star',
    color: '#B45309',
    title: 'E-E-A-T: Experience, Expertise, Authoritativeness, Trust',
    content: [
      'E-E-A-T is Google\'s framework for evaluating content quality — critical for YMYL (Your Money or Your Life) topics like real estate.',
      'Experience: Show that your team has first-hand experience in the real estate market.',
      'Expertise: Include detailed property specifications, market insights, and professional analysis.',
      'Authoritativeness: Build backlinks from reputable real estate portals, news sites, and industry publications.',
      'Trustworthiness: Display RERA registration numbers, developer credentials, and verified data.',
      'Add an "About Us" page with team profiles, credentials, and company history.',
      'Publish original market research, price trend articles, and buying guides.',
      'Display client testimonials and Google reviews for social proof.',
      'Ensure all factual claims (prices, dates, areas) are accurate and up-to-date.',
      'Use HTTPS, display privacy policy, and provide clear contact information.',
    ],
  },
];

const SeoGuidelines = () => {
  const [expanded, setExpanded] = useState(false);

  const handleAccordionChange = (panel) => (_, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        border: '1px solid #F3F4F6',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderBottom: '1px solid #F3F4F6',
          bgcolor: '#FAFAFA',
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: '#FEF3C7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon icon="mdi:school-outline" style={{ fontSize: 22, color: '#B45309' }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#1B2A4A' }}>
            How to Optimize Properties for Google Ranking
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', mt: 0.25 }}>
            Comprehensive SEO guidelines for real estate listings — {guidelines.length} topics
          </Typography>
        </Box>
        <Chip
          label="2026 Best Practices"
          size="small"
          sx={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            bgcolor: '#ECFDF5',
            color: '#059669',
          }}
        />
      </Box>

      {/* Guideline Sections */}
      <Box sx={{ p: { xs: 1, md: 1.5 } }}>
        {guidelines.map((guide) => (
          <Accordion
            key={guide.id}
            expanded={expanded === guide.id}
            onChange={handleAccordionChange(guide.id)}
            disableGutters
            elevation={0}
            sx={{
              '&:before': { display: 'none' },
              borderRadius: '8px !important',
              mb: 0.5,
              border: expanded === guide.id ? `1px solid ${guide.color}20` : '1px solid transparent',
              bgcolor: expanded === guide.id ? `${guide.color}05` : 'transparent',
              '&:hover': { bgcolor: `${guide.color}08` },
            }}
          >
            <AccordionSummary
              expandIcon={
                <Icon
                  icon="mdi:chevron-down"
                  style={{ fontSize: 20, color: '#9CA3AF' }}
                />
              }
              sx={{
                minHeight: 48,
                px: 2,
                '& .MuiAccordionSummary-content': { gap: 1.5, alignItems: 'center', my: 0.75 },
              }}
            >
              <Icon
                icon={guide.icon}
                style={{ fontSize: 20, color: guide.color, flexShrink: 0 }}
              />
              <Typography
                sx={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#1B2A4A',
                }}
              >
                {guide.title}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 2, pb: 2, pt: 0 }}>
              <Box
                component="ul"
                sx={{
                  m: 0,
                  pl: 2.5,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                {guide.content.map((point, idx) => (
                  <Box
                    component="li"
                    key={idx}
                    sx={{
                      fontSize: '0.8125rem',
                      color: '#4B5563',
                      lineHeight: 1.6,
                      '&::marker': { color: guide.color },
                    }}
                  >
                    {point}
                  </Box>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Paper>
  );
};

export default SeoGuidelines;
