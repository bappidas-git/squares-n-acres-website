import { useMemo } from 'react';

import MasterDataPage from '../../../components/admin/MasterDataPage';
import { tagsConfig } from './taxonomyConfigs';

/**
 * Admin → Articles → Tags (`/admin/articles/tags`).
 *
 * Most tags are created from the article form as they are needed; this screen
 * is where they are renamed, tidied and removed once nothing carries them.
 */
export default function TagsPage() {
  const config = useMemo(() => tagsConfig(), []);

  return <MasterDataPage config={config} />;
}
