import React, { lazy } from 'react';
import { Route } from 'react-router-dom';

import MainLayout from '../components/layout/MainLayout';

/**
 * The public website's routes (D11: every boilerplate URL keeps working).
 *
 * Moved out of `routes/index.js` in prompt 12 so that the admin table can grow
 * without the file becoming unreadable; the set of URLs is unchanged. Prompts
 * 26, 27, 30, 31 and 34 add the localities, builders, CMS and article routes.
 */

const Home = lazy(() => import('../pages/public/Home'));
const PropertyListing = lazy(() => import('../pages/public/PropertyListing'));
const PropertyDetails = lazy(() => import('../pages/public/PropertyDetails'));
const PreLaunch = lazy(() => import('../pages/public/PreLaunch'));
const UnderConstruction = lazy(() => import('../pages/public/UnderConstruction'));
const ReadyToMove = lazy(() => import('../pages/public/ReadyToMove'));
const RentApartments = lazy(() => import('../pages/public/RentApartments'));
const RentVillas = lazy(() => import('../pages/public/RentVillas'));
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
  ['/properties', PropertyListing],
  ['/properties/:slug', PropertyDetails],

  ['/buy/pre-launch', PreLaunch],
  ['/buy/under-construction', UnderConstruction],
  ['/buy/ready-to-move', ReadyToMove],

  ['/rent/apartments', RentApartments],
  ['/rent/villas', RentVillas],

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

const publicRoutes = PUBLIC_PAGES.map(([path, Page]) => (
  <Route
    key={path}
    path={path}
    element={
      <PublicRoute>
        <Page />
      </PublicRoute>
    }
  />
));

export default publicRoutes;
