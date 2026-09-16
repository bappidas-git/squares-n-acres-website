import { useMemo } from 'react';

import MasterDataPage from '../../../components/admin/MasterDataPage';
import { faqsConfig } from './contentConfigs';
import { useMasterData } from '../../../contexts/MasterDataContext';

/**
 * Admin → FAQs (`/admin/faqs`).
 *
 * The rewrite of the boilerplate's `FaqManager` (NEW-23, ADD-21): the reorder
 * is one `PATCH` on the row that moved and stays correct while the list is
 * filtered to a category, the answer keeps its HTML, and a question can be
 * tied to a property type so it also appears on those listings.
 */
export default function FaqsPage() {
  const { propertyTypes } = useMasterData();

  const config = useMemo(() => faqsConfig({ propertyTypes }), [propertyTypes]);

  return <MasterDataPage config={config} />;
}
