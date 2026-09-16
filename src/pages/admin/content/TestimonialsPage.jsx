import { useMemo } from 'react';

import MasterDataPage from '../../../components/admin/MasterDataPage';
import { testimonialsConfig } from './contentConfigs';

/**
 * Admin → Testimonials (`/admin/testimonials`).
 *
 * The quotes the home page, the About page and the CMS blocks show. Seeded
 * placeholders carry `isSample` and never reach a production build (D41), so
 * the flag is filterable: "show me what is still sample copy" is the question
 * this screen answers before go-live.
 */
export default function TestimonialsPage() {
  const config = useMemo(() => testimonialsConfig(), []);

  return <MasterDataPage config={config} />;
}
