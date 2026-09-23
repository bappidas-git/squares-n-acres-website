import { useMemo } from 'react';

import MasterDataPage from '../../../components/admin/MasterDataPage';
import { segmentsConfig } from './masterDataConfigs';
import { useMasterData } from '../../../contexts/MasterDataContext';

/**
 * Admin → Master data → Segments (`/admin/master-data/segments`).
 *
 * The first choice on the property form — Residential, Commercial, Plots &
 * Land, and whatever an editor adds beside them (QA-52). Each segment carries
 * the layout its listings get; the three built-in ones keep theirs, because
 * the public site's own pages are built on them. The screen is `MasterDataPage`;
 * everything that makes it about segments is in `masterDataConfigs.js`.
 */
export default function SegmentsPage() {
  // A write here changes the property form's first choice and the layout
  // rules that read the registry, so the cached collection is refreshed (D93).
  const { refresh } = useMasterData();
  const config = useMemo(() => segmentsConfig({ onMutated: refresh }), [refresh]);

  return <MasterDataPage config={config} />;
}
