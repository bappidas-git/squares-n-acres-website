import { useMemo, useState } from 'react';

import MasterDataPage from '../../../components/admin/MasterDataPage';
import ReassignListingsDialog from './ReassignListingsDialog';
import { teamConfig } from './contentConfigs';

/**
 * Admin → Team (`/admin/team`).
 *
 * The advisors the About page lists and the listings name. They have no page
 * of their own, so the slug identifies them rather than addressing them, and a
 * delete is refused while a property or a page still points at one (D88).
 *
 * Switching off an advisor who still answers for listings asks first whether
 * the listings go to somebody else (prompt 51) — from the Active switch, the
 * form and the bulk bar alike.
 */
export default function TeamPage() {
  const [reassigning, setReassigning] = useState(null);

  const config = useMemo(
    () =>
      teamConfig({
        // A delete is refused while listings name the member (D88); only the
        // switch-off leaves them answering for listings nobody can reach.
        intercept: async (action, targets, proceed) => {
          if (action !== 'deactivate') return false;
          const holding = targets.filter(
            (row) => row.isActive !== false && Number(row.listingCount) > 0
          );
          if (holding.length === 0) return false;
          setReassigning({ holding, count: targets.length, proceed });
          return true;
        },
      }),
    []
  );

  return (
    <>
      <MasterDataPage config={config} />
      <ReassignListingsDialog request={reassigning} onClose={() => setReassigning(null)} />
    </>
  );
}
