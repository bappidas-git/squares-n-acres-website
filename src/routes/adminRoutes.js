import React, { lazy } from 'react';
import { Navigate, Route } from 'react-router-dom';

import ADMIN_ROUTES from './adminRouteConfig';
import AdminLayout from '../components/layout/AdminLayout';
import PATHS from './paths';
import ProtectedRoute from '../components/admin/ProtectedRoute';
import RoleRoute from '../components/admin/RoleRoute';
import { AdminNotFound } from '../components/admin/Forbidden';

/**
 * The admin panel's routes, built from `adminRouteConfig.js`.
 *
 * Three layers, in the order §7 requires: `ProtectedRoute` (is anyone signed
 * in?), `AdminLayout` (the shell, and the only place the lead poller runs),
 * then `RoleRoute` per screen (may *this* role open it?). The login page sits
 * outside all three — it is where a session begins.
 *
 * An `/admin/…` address no screen answers is the panel's own 404, inside the
 * layout: it used to fall through to the public site's (QA-56).
 */

const AdminLogin = lazy(() => import('../pages/admin/AdminLogin'));

const adminRoutes = [
  <Route key="admin-login" path={PATHS.adminLogin} element={<AdminLogin />} />,

  <Route
    key="admin"
    path={PATHS.adminRoot}
    element={
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    }
  >
    <Route index element={<Navigate to="dashboard" replace />} />
    {ADMIN_ROUTES.map((route) => (
      <Route
        key={route.path}
        path={route.path}
        element={<RoleRoute permission={route.permission}>{route.element}</RoleRoute>}
      />
    ))}
    <Route path="*" element={<AdminNotFound />} />
  </Route>,
];

export default adminRoutes;
