import { Outlet } from 'react-router-dom';

import Forbidden from './Forbidden';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

/**
 * The role gate of the admin panel (§7, guard 1).
 *
 * `permission={['leads', 'export']}` is the form every route uses: it asks the
 * §7 matrix through `useAdminAuth().can()` instead of naming roles, so a change
 * to the matrix reaches every route at once. `allowedRoles` stays for the rare
 * screen that really is about the role itself.
 *
 * A route the role may not open renders `Forbidden` in place — never a
 * redirect, which would bounce between the route and the dashboard.
 *
 * @param {object} props
 * @param {[string, string]} [props.permission] `[area, action]` of `rbac.js`
 * @param {string[]} [props.allowedRoles]
 * @param {React.ReactNode} [props.children] renders `<Outlet />` when omitted
 */
export default function RoleRoute({ permission, allowedRoles, children }) {
  const { role, can } = useAdminAuth();

  const allowed = permission
    ? can(permission[0], permission[1])
    : !allowedRoles || allowedRoles.includes(role);

  if (!allowed) return <Forbidden />;

  return children ?? <Outlet />;
}
