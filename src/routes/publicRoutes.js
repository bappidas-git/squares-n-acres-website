import React, { lazy } from 'react';
import { Route } from 'react-router-dom';

import MainLayout from '../components/layout/MainLayout';
import { LISTING_ROUTES } from '../components/listing/listingRoutes';

/**
 * The public website's routes (D11: every boilerplate URL keeps working).
 *
 * Moved out of `routes/index.js` in prompt 12 so that the admin table can grow
 * without the file becoming unreadable. Prompt 14 added the two locality URLs,
 * prompt 16 the two builder ones and prompt 31 the job detail route; prompt 34
 * adds the article ones.
 *
 * Prompt 26 replaced the five hand-written category pages (`PreLaunch`,
 * `UnderConstruction`, `ReadyToMove`, `RentApartments`, `RentVillas`) with the
 * route table of `components/listing/listingRoutes.js`: every listing URL
 * renders the same page, which differs only by the filters its route fixes.
 * `/buy/pre-launch` and `/rent/apartments` therefore still answer, and so do
 * the twelve URLs the boilerplate never had.
 *
 * **Prompt 30 did the same to the company and service pages.** `About.jsx`,
 * `Contact.jsx`, `SellLet.jsx`, `Partnership.jsx`, `HomeLoan.jsx`,
 * `LegalAssistance.jsx`, `InteriorDesigning.jsx`, `FlexibleWorkspace.jsx` and
 * `DirectLeaseRetails.jsx` are gone: every one of them is a CMS record now, and
 * `CmsPage` renders all of them from their blocks (BUG-11). Their URLs are
 * spelled out below rather than left to the catch-all so that a route table is
 * still a readable list of what the site answers.
 *
 * **Prompt 31 finished the job.** `Careers.jsx` and `RealEstateAwareness.js`
 * are gone too: `/careers` and `/insights/real-estate-awareness` are CMS
 * records whose blocks — the jobs list, the facts, the quiz, the checklist —
 * `PageRenderer` draws. What stayed a page of its own is `/careers/:jobSlug`,
 * because one opening is a record rather than a block (§6.11, D12).
 *
 * The catch-all is registered **last**, after every static route, so a reserved
 * prefix — `/properties`, `/buy`, `/localities`, `/insights`, `/admin` — is
 * matched by its own route and never reaches the CMS (D11).
 */

const Home = lazy(() => import('../pages/public/Home'));
const PropertyListing = lazy(() => import('../pages/public/PropertyListing'));
const PropertyDetails = lazy(() => import('../pages/public/PropertyDetails'));
const Localities = lazy(() => import('../pages/public/Localities'));
const LocalityDetail = lazy(() => import('../pages/public/LocalityDetail'));
const Builders = lazy(() => import('../pages/public/Builders'));
const BuilderDetail = lazy(() => import('../pages/public/BuilderDetail'));
const Shortlist = lazy(() => import('../pages/public/Shortlist'));
const Articles = lazy(() => import('../pages/public/Articles'));
const ArticleDetail = lazy(() => import('../pages/public/ArticleDetail'));
const FAQs = lazy(() => import('../pages/public/FAQs'));
const JobDetail = lazy(() => import('../pages/public/JobDetail'));
const CmsPage = lazy(() => import('../pages/public/CmsPage'));

/** Header, footer and bottom navigation around every public page. */
export const PublicRoute = ({ children }) => <MainLayout>{children}</MainLayout>;

/** `[path, page]` — the public URLs that are not CMS pages. */
const PUBLIC_PAGES = [
  ['/', Home],
  ['/properties/:slug', PropertyDetails],
  ['/shortlist', Shortlist],

  ['/localities', Localities],
  ['/localities/:slug', LocalityDetail],

  ['/builders', Builders],
  ['/builders/:slug', BuilderDetail],

  ['/insights/articles', Articles],
  ['/insights/articles/:slug', ArticleDetail],
  ['/insights/faqs', FAQs],

  ['/careers/:jobSlug', JobDetail],
];

/**
 * `[path, slug]` — the CMS pages that keep a spelled-out route.
 *
 * They would all resolve through the catch-all anyway; naming them keeps the
 * route table honest about what the site answers, and pins the URL of a page
 * whose slug an editor could otherwise change out from under a printed link.
 */
const CMS_PAGES = [
  ['/about', 'about'],
  ['/contact', 'contact'],
  ['/careers', 'careers'],
  ['/sell-let', 'sell-let'],
  ['/partnership', 'partnership'],
  ['/flexible-workspace', 'flexible-workspace'],
  ['/direct-lease-retails', 'direct-lease-retails'],
  ['/privacy-policy', 'privacy-policy'],
  ['/terms-of-use', 'terms-of-use'],
  ['/disclaimer', 'disclaimer'],

  // A nested slug whose prefix is reserved (`insights`), so the route has to
  // be spelled out: the catch-all would refuse it and the CMS would never be
  // asked (D11). The `slug` prop is what tells `CmsPage` this is deliberate.
  ['/insights/real-estate-awareness', 'insights/real-estate-awareness'],
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

  ...CMS_PAGES.map(([path, slug]) => (
    <Route
      key={path}
      path={path}
      element={
        <PublicRoute>
          <CmsPage slug={slug} />
        </PublicRoute>
      }
    />
  )),

  // The three buyer-assistance pages are CMS records with nested slugs
  // (`buyer-assistance/home-loan`), so one route serves all of them and the
  // segment is put back behind the prefix that owns it.
  <Route
    key="/buyer-assistance/:slug"
    path="/buyer-assistance/:slug"
    element={
      <PublicRoute>
        <CmsPage prefix="buyer-assistance" />
      </PublicRoute>
    }
  />,

  // The catch-all: everything else the CMS may hold, nested slugs included.
  // `:slug/*` rather than `*` so that it outranks the 404 route `routes/index.js`
  // registers after it, while every static route above still outranks this.
  <Route
    key="cms-catch-all"
    path="/:slug/*"
    element={
      <PublicRoute>
        <CmsPage />
      </PublicRoute>
    }
  />,
];

export default publicRoutes;
