import { useMemo } from 'react';

import PATHS from '../../../routes/paths';
import PropertyRow from '../../sections/home/PropertyRow';

/**
 * A rail of listings (§6.10 `properties`).
 *
 * Three modes, one request each: the featured stock, a hand-picked set (`ids`,
 * which the API returns in the order they were picked, §5.7), or a saved search
 * (`filter`). `PropertyRow` owns the request, the carousel and the rule that a
 * rail too short to be a rail is not rendered at all — relaxed to one card for
 * a hand-picked set, where three is the editor's decision rather than the
 * market's.
 */
export default function PropertiesBlock({ data = {} }) {
  const mode = data.mode || 'featured';

  const { params, viewAllHref, minItems } = useMemo(() => {
    if (mode === 'ids') {
      const ids = (Array.isArray(data.ids) ? data.ids : []).join(',');
      return {
        params: { ids, perPage: (data.ids ?? []).length || 1 },
        viewAllHref: PATHS.properties,
        minItems: 1,
      };
    }

    if (mode === 'filter') {
      const filter = data.filter ?? {};
      const query = Object.fromEntries(
        Object.entries({
          listingType: filter.listingType,
          localityId: filter.localityId,
          propertyTypeId: filter.propertyTypeId,
          constructionStatus: filter.constructionStatus,
        }).filter(([, value]) => value !== null && value !== undefined && value !== '')
      );
      const search = new URLSearchParams(
        Object.entries(query).map(([key, value]) => [key, String(value)])
      ).toString();
      return {
        params: query,
        viewAllHref: search ? `${PATHS.properties}?${search}` : PATHS.properties,
        minItems: 1,
      };
    }

    return { params: undefined, viewAllHref: `${PATHS.properties}?isFeatured=true`, minItems: 3 };
  }, [mode, data.ids, data.filter]);

  if (mode === 'ids' && (data.ids ?? []).length === 0) return null;

  return (
    <PropertyRow
      title={data.title || 'Properties'}
      params={params}
      featured={mode === 'featured'}
      viewAllHref={viewAllHref}
      minItems={minItems}
    />
  );
}

PropertiesBlock.isEmpty = (data) =>
  data?.mode === 'ids' && (Array.isArray(data?.ids) ? data.ids : []).length === 0;
