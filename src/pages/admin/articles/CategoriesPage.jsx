import { useMemo } from 'react';

import MasterDataPage from '../../../components/admin/MasterDataPage';
import { categoriesConfig } from './taxonomyConfigs';

/**
 * Admin → Articles → Categories (`/admin/articles/categories`).
 *
 * The four sections of the insights archive (D76). Each is a public landing
 * page with its own URL, so the order decides the archive's navigation and a
 * delete is refused while articles still point at it (D88).
 */
export default function CategoriesPage() {
  const config = useMemo(() => categoriesConfig(), []);

  return <MasterDataPage config={config} />;
}
