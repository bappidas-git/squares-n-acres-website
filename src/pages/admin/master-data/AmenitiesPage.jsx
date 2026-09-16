import { useMemo } from 'react';

import MasterDataPage from '../../../components/admin/MasterDataPage';
import { amenitiesConfig } from './masterDataConfigs';
import { useMasterData } from '../../../contexts/MasterDataContext';

/**
 * Admin → Master data → Amenities (`/admin/master-data/amenities`).
 *
 * Grouped by category, because that is how the property form ticks them and
 * how a listing page prints them (§6.4).
 */
export default function AmenitiesPage() {
  const { refresh } = useMasterData();
  const config = useMemo(() => amenitiesConfig({ onMutated: refresh }), [refresh]);

  return <MasterDataPage config={config} />;
}
