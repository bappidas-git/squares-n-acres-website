import { useMemo } from 'react';

import MasterDataPage from '../../../components/admin/MasterDataPage';
import { propertyTypesConfig } from './masterDataConfigs';
import { useMasterData } from '../../../contexts/MasterDataContext';
import { useSegments } from '../../../hooks/useMasterData';

/**
 * Admin → Master data → Property types (`/admin/master-data/property-types`).
 *
 * Seventeen records that the whole site reads: the URL of `/buy/:slug`, the
 * filter select, the icon on a card, the segment a listing belongs to (D25,
 * §6.3). The screen itself is `MasterDataPage`; everything that makes it about
 * property types is in `masterDataConfigs.js`.
 */
export default function PropertyTypesPage() {
  // The public lists are loaded once and cached (D93); a write here is what
  // makes that cache wrong, so it is refreshed from here.
  const { refresh, propertyTypes } = useMasterData();
  // Every segment, the retired ones too: a type may still be filed under one,
  // and its row has to say which (QA-52).
  const segments = useSegments({ activeOnly: false });
  const config = useMemo(
    () => propertyTypesConfig({ onMutated: refresh, segments, types: propertyTypes }),
    [refresh, segments, propertyTypes]
  );

  return <MasterDataPage config={config} />;
}
