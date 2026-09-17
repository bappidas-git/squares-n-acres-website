/**
 * Brand and site constants — the only module that reads the brand environment
 * variables. Components import `BRAND` / `SITE` from here and never hardcode a
 * logo URL, a site name or the production domain.
 *
 * `BRAND.*Url` point at the Cloudinary originals; `BRAND.local*` point at the
 * copies downloaded into `public/brand/` by `npm run generate:brand-assets`,
 * which `public/index.html` and `public/manifest.json` reference.
 *
 * Authored in CommonJS (D36b, extended in prompt 38) because `src/seo` reaches
 * it through `variables.js`, and `scripts/validate-jsonld.js` has to `require`
 * that chain from Node with no bundler in front of it.
 */

const BRAND = {
  name: 'Squares N Acres',
  shortName: 'SNA',
  logoUrl: 'https://res.cloudinary.com/dn9gyaiik/image/upload/v1789465788/sna-logo_o09ugt.png',
  iconUrl: 'https://res.cloudinary.com/dn9gyaiik/image/upload/v1789465791/sna-icon_efty7z.png',
  iconSquareUrl:
    'https://res.cloudinary.com/dn9gyaiik/image/upload/c_crop,x_375,y_655,w_395,h_390/v1789465791/sna-icon_efty7z.png',
  ogImageUrl:
    'https://res.cloudinary.com/dn9gyaiik/image/upload/w_1200,h_630,c_pad,b_white/v1789465788/sna-logo_o09ugt.png',
  localLogo: '/brand/logo.png',
  localIcon: '/brand/icon.png',
  localOgImage: '/brand/og-default.png',
};

const SITE = {
  name: process.env.REACT_APP_SITE_NAME || BRAND.name,
  url: (process.env.REACT_APP_SITE_URL || 'https://www.squaresnacres.com').replace(/\/+$/, ''),
  defaultLocale: 'en-IN',
  placeholderDomain: 'https://www.squaresnacres.com',
};

module.exports = { BRAND, SITE };
