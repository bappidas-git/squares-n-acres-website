import { Navigate, Outlet, useLocation } from 'react-router-dom';

import PATHS from '../../routes/paths';
import { PageLoader } from '../common/SkeletonLoaders';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

/**
 * The authentication gate of the admin panel (§7, guard 1).
 *
 * While the stored session is being restored nothing is decided yet — the
 * loader holds the screen, because redirecting first and restoring second is
 * what makes a reload bounce a signed-in user to the login page. An anonymous
 * visitor is sent to the login screen with the location they asked for, so
 * signing in lands them where they were going.
 *
 * Roles are not its business: `RoleRoute` does that, one level in.
 *
 * @param {object} props
 * @param {React.ReactNode} [props.children] renders `<Outlet />` when omitted
 */
export default function ProtectedRoute({ children }) {
  const { status } = useAdminAuth();
  const location = useLocation();

  if (status === 'loading') return <PageLoader />;

  if (status !== 'authenticated') {
    return <Navigate to={PATHS.adminLogin} state={{ from: location }} replace />;
  }

  return children ?? <Outlet />;
}
