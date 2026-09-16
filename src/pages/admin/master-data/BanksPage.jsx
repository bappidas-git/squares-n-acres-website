import { useMemo } from 'react';

import MasterDataPage from '../../../components/admin/MasterDataPage';
import { banksConfig } from './masterDataConfigs';
import { useMasterData } from '../../../contexts/MasterDataContext';

/**
 * Admin → Master data → Banks (`/admin/master-data/banks`).
 *
 * The lenders behind the finance section of a listing. Nothing else points at
 * them, so nothing blocks a delete — and with none active the finance section
 * hides itself rather than falling back to a hardcoded list (§6.6).
 */
export default function BanksPage() {
  const { refresh } = useMasterData();
  const config = useMemo(() => banksConfig({ onMutated: refresh }), [refresh]);

  return <MasterDataPage config={config} />;
}
