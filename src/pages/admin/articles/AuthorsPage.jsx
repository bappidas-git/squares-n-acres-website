import { useMemo } from 'react';

import MasterDataPage from '../../../components/admin/MasterDataPage';
import { authorsConfig } from './taxonomyConfigs';

/**
 * Admin → Articles → Authors (`/admin/articles/authors`).
 *
 * A byline is a public page: a photograph, a biography and everything the
 * author has written. The e-mail on the form is the one private field —
 * §5.10 strips it from every public response.
 */
export default function AuthorsPage() {
  const config = useMemo(() => authorsConfig(), []);

  return <MasterDataPage config={config} />;
}
