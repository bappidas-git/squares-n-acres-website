import React, { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

import adminRoutes from './adminRoutes';
import publicRoutes, { PublicRoute } from './publicRoutes';
import { PageLoader } from '../components/common/SkeletonLoaders';

/** Everything the app can navigate to: public pages, the admin panel, 404. */

const NotFound = lazy(() => import('../pages/public/NotFound'));

const AppRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
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
    </Routes>
  </Suspense>
);

export default AppRoutes;
