import React, { Suspense, lazy } from 'react';
import {
  Outlet,
  Route,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
} from 'react-router-dom';

import adminRoutes from './adminRoutes';
import publicRoutes, { PublicRoute } from './publicRoutes';
import { AdminAuthProvider } from '../contexts/AdminAuthContext';
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
 */

const NotFound = lazy(() => import('../pages/public/NotFound'));

/** The app's providers, mounted once inside the router. */
const AppShell = () => (
  <ToastProvider>
    <SiteSettingsProvider>
      <MasterDataProvider>
        <AdminAuthProvider>
          <NavigationGuardProvider>
            <ShortlistProvider>
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            </ShortlistProvider>
          </NavigationGuardProvider>
        </AdminAuthProvider>
      </MasterDataProvider>
    </SiteSettingsProvider>
  </ToastProvider>
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
