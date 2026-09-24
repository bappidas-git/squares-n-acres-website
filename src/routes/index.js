import React, { Suspense, lazy } from 'react';
import { LazyMotion } from 'framer-motion';
import {
  Outlet,
  Route,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
} from 'react-router-dom';

import AnalyticsScripts from '../components/seo/AnalyticsScripts';
import RedirectHandler from '../components/common/RedirectHandler';
import RouteBoundary from './RouteBoundary';
import adminRoutes from './adminRoutes';
import publicRoutes, { PublicRoute } from './publicRoutes';
import { AdminAuthProvider } from '../contexts/AdminAuthContext';
import { LeadCaptureProvider } from '../contexts/LeadCaptureContext';
import { MasterDataProvider } from '../contexts/MasterDataContext';
import { NavigationGuardProvider } from '../contexts/NavigationGuardContext';
import { PageLoader } from '../components/common/SkeletonLoaders';
import { ShortlistProvider } from '../contexts/ShortlistContext';
import { SiteSettingsProvider } from '../contexts/SiteSettingsContext';
import ToastProvider from '../components/common/ToastProvider';

/**
 * Everything the app can navigate to: public pages, the admin panel, 404.
 *
 * The router is a **data router** (`createBrowserRouter`, D97): it is what
 * makes `useBlocker` — and with it the unsaved-changes guard every admin form
 * relies on — work at all. The route table itself is unchanged: the same
 * `<Route>` elements `publicRoutes` and `adminRoutes` already declared are read
 * by `createRoutesFromElements`.
 *
 * Because a data router replaces `BrowserRouter`, every provider that uses a
 * router hook has to live *inside* it — `AdminAuthProvider` navigates on a 401
 * — so the providers are the root route's element rather than `App`'s children.
 *
 * `RedirectHandler` and `AnalyticsScripts` are mounted here for the same
 * reason: both read a router hook and both read `SiteSettingsProvider`, and
 * prompt 38's "in `App`" is where those providers lived before D97 moved them
 * (D104). Mounted once, above the outlet, they survive every route change —
 * which is the whole point of a tag manager that must not re-run.
 *
 * `LazyMotion` is the outermost of them (prompt 41, D107). Every animated
 * element on the site is an `m.*` component, which carries no features of its
 * own, and this is the one ancestor that hands them the `domAnimation` bundle —
 * asynchronously, so the library's feature code is a chunk that arrives after
 * the first paint rather than bytes in front of it. `strict` is on: it turns a
 * future `motion.div` into an error at the point somebody writes it, which is
 * the only thing that keeps the saving from leaking back in.
 */

/** `domAnimation`, imported only when the first animated element mounts. */
const loadMotionFeatures = () => import('../utils/motionFeatures').then((mod) => mod.default);

const NotFound = lazy(() => import('../pages/public/NotFound'));

/** The app's providers, mounted once inside the router. */
const AppShell = () => (
  <LazyMotion features={loadMotionFeatures} strict>
    <ToastProvider>
      <SiteSettingsProvider>
        <MasterDataProvider>
          <AdminAuthProvider>
            <NavigationGuardProvider>
              <ShortlistProvider>
                <LeadCaptureProvider>
                  <RedirectHandler />
                  <AnalyticsScripts />
                  {/* A crashed page gets a `noindex` head and recovers on the
                      next navigation; the admin shell below it is not
                      remounted by one (`RouteBoundary`). */}
                  <RouteBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <Outlet />
                    </Suspense>
                  </RouteBoundary>
                </LeadCaptureProvider>
              </ShortlistProvider>
            </NavigationGuardProvider>
          </AdminAuthProvider>
        </MasterDataProvider>
      </SiteSettingsProvider>
    </ToastProvider>
  </LazyMotion>
);

export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<AppShell />}>
      {publicRoutes}
      {adminRoutes}
      <Route
        path="*"
        element={
          <PublicRoute>
            <NotFound />
          </PublicRoute>
        }
      />
    </Route>
  )
);

const AppRoutes = () => <RouterProvider router={router} />;

export default AppRoutes;
