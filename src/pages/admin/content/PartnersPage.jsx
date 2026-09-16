import { useMemo } from 'react';

import MasterDataPage from '../../../components/admin/MasterDataPage';
import { partnersConfig } from './contentConfigs';

/**
 * Admin → Partners (`/admin/partners`).
 *
 * The rewrite of the boilerplate's `AdminPartners`, which still spoke the old
 * field names (`logo`, `website`) through an adapter. The record is §6.9's:
 * `logoUrl`, `websiteUrl`, a category and an order.
 */
export default function PartnersPage() {
  const config = useMemo(() => partnersConfig(), []);

  return <MasterDataPage config={config} />;
}
