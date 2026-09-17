import React, { lazy } from 'react';
import { Route } from 'react-router-dom';

import MainLayout from '../components/layout/MainLayout';
import { LISTING_ROUTES } from '../components/listing/listingRoutes';

/**
 * The public website's routes (D11: every boilerplate URL keeps working).
 *
 * Moved out of `routes/index.js` in prompt 12 so that the admin table can grow
 * without the file becoming unreadable. Prompt 14 added the two locality URLs
 * and prompt 16 the two builder ones; prompts 30, 31 and 34 add the CMS,
 * careers and article routes.
 *
 * Prompt 26 replaced the five hand-written category pages (`PreLaunch`,
 * `UnderConstruction`, `ReadyToMove`, `RentApartments`, `RentVillas`) with the
 * route table of `components/listing/listingRoutes.js`: every listing URL
 * renders the same page, which differs only by the filters its route fixes.
 * `/buy/pre-launch` and `/rent/apartments` therefore still answer, and so do
 * the twelve URLs the boilerplate never had.
 */

const Home = lazy(() => import('../pages/public/Home'));
const PropertyListing = lazy(() => import('../pages/public/PropertyListing'));
const PropertyDetails = lazy(() => import('../pages/public/PropertyDetails'));
const Localities = lazy(() => import('../pages/public/Localities'));
const LocalityDetail = lazy(() => import('../pages/public/LocalityDetail'));
const Builders = lazy(() => import('../pages/public/Builders'));
const BuilderDetail = lazy(() => import('../pages/public/BuilderDetail'));
const Shortlist = lazy(() => import('../pages/public/Shortlist'));
const HomeLoan = lazy(() => import('../pages/public/HomeLoan'));
const LegalAssistance = lazy(() => import('../pages/public/LegalAssistance'));
const InteriorDesigning = lazy(() => import('../pages/public/InteriorDesigning'));
const Articles = lazy(() => import('../pages/public/Articles'));
const ArticleDetail = lazy(() => import('../pages/public/ArticleDetail'));
const FAQs = lazy(() => import('../pages/public/FAQs'));
const RealEstateAwareness = lazy(() => import('../pages/public/RealEstateAwareness'));
const Contact = lazy(() => import('../pages/public/Contact'));
const About = lazy(() => import('../pages/public/About'));
const SellLet = lazy(() => import('../pages/public/SellLet'));
const Careers = lazy(() => import('../pages/public/Careers'));
const Partnership = lazy(() => import('../pages/public/Partnership'));
const FlexibleWorkspace = lazy(() => import('../pages/public/FlexibleWorkspace'));
const DirectLeaseRetails = lazy(() => import('../pages/public/DirectLeaseRetails'));

/** Header, footer and bottom navigation around every public page. */
export const PublicRoute = ({ children }) => <MainLayout>{children}</MainLayout>;

/** `[path, page]` — the whole public URL map. */
const PUBLIC_PAGES = [
  ['/', Home],
  ['/properties/:slug', PropertyDetails],
  ['/shortlist', Shortlist],

  ['/localities', Localities],
  ['/localities/:slug', LocalityDetail],

  ['/builders', Builders],
  ['/builders/:slug', BuilderDetail],

  ['/buyer-assistance/home-loan', HomeLoan],
  ['/buyer-assistance/legal-assistance', LegalAssistance],
  ['/buyer-assistance/interior-designing', InteriorDesigning],

  ['/insights/articles', Articles],
  ['/insights/articles/:slug', ArticleDetail],
  ['/insights/faqs', FAQs],
  ['/insights/real-estate-awareness', RealEstateAwareness],

  ['/contact', Contact],
  ['/about', About],
  ['/sell-let', SellLet],
  ['/careers', Careers],
  ['/partnership', Partnership],
  ['/flexible-workspace', FlexibleWorkspace],
  ['/direct-lease-retails', DirectLeaseRetails],
];

/** One `<Route>` per listing URL, all rendering the same engine. */
const listingRoutes = LISTING_ROUTES.map((route) => (
  <Route
    key={route.key}
    path={route.path}
    element={
      <PublicRoute>
        <PropertyListing routeKey={route.key} />
      </PublicRoute>
    }
  />
));

const publicRoutes = [
  ...PUBLIC_PAGES.map(([path, Page]) => (
    <Route
      key={path}
      path={path}
      element={
        <PublicRoute>
          <Page />
        </PublicRoute>
      }
    />
  )),
  ...listingRoutes,
];

export default publicRoutes;
