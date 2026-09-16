import { useMemo } from 'react';

import MasterDataPage from '../../../components/admin/MasterDataPage';
import { badgesConfig } from './masterDataConfigs';
import { useMasterData } from '../../../contexts/MasterDataContext';

/**
 * Admin → Master data → Badges (`/admin/master-data/badges`).
 *
 * The labels a card carries — "New Launch", "Price Drop" — each holding a tone
 * name rather than a colour, so the chip is painted from the design tokens
 * wherever it lands (§2.4, §6.4).
 */
export default function BadgesPage() {
  const { refresh } = useMasterData();
  const config = useMemo(() => badgesConfig({ onMutated: refresh }), [refresh]);

  return <MasterDataPage config={config} />;
}
