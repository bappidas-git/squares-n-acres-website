import { useMemo } from 'react';

import MasterDataPage from '../../../components/admin/MasterDataPage';
import { teamConfig } from './contentConfigs';

/**
 * Admin → Team (`/admin/team`).
 *
 * The advisors the About page lists and the listings name. They have no page
 * of their own, so the slug identifies them rather than addressing them, and a
 * delete is refused while a property or a page still points at one (D88).
 */
export default function TeamPage() {
  const config = useMemo(() => teamConfig(), []);

  return <MasterDataPage config={config} />;
}
