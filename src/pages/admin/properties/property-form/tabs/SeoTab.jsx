import { useMemo } from 'react';

import SeoPanel from '../../../../../components/seo/SeoPanel';
import { toSeoPaths } from '../../../../../components/seo/seoValues';
import propertyService from '../../../../../services/propertyService';
import { usePropertyFormContext } from '../PropertyFormContext';

/**
 * `SlugField`'s availability check, in the shape it hands over.
 *
 * Module level so its identity is stable: the field debounces on it, and a new
 * arrow on every render would ask the API after every keystroke.
 */
const checkPropertySlug = (slug, { excludeId, signal } = {}) =>
  propertyService.checkSlug({ slug, excludeId }, { signal });

/**
 * Tab 16 — SEO (D87).
 *
 * The whole panel, bound to the form's own `seo` branch. Two things make it
 * behave like part of the property form rather than like a component sitting
 * inside one:
 *
 * - **The slug is the listing's slug.** Editing the permalink here writes
 *   `slug` as well as `seo.slug`, which is D34: one URL, two fields that can
 *   never disagree.
 * - **A hint opens the tab that owns the field.** `keyword-in-content` points
 *   at `content`, which is the description on Basics; `image-count` points at
 *   `images`, which is Media. `focusField` is the form's, so the jump is a real
 *   one — and a save refused over `seo.title` comes back the other way, as
 *   `seoFocusRequest`, for the panel to open its own sub-tab on.
 * - **The record is this listing.** The form's values carry no `id`, and the
 *   "no other record uses this" checks exclude the record by it — so a saved
 *   listing was reported as the duplicate of its own focus keyword.
 */
export default function SeoTab() {
  const {
    values,
    errors,
    setField,
    setFields,
    setComputed,
    focusField,
    seoFocusRequest,
    disabled,
    propertyId,
  } = usePropertyFormContext();

  const entity = useMemo(() => ({ ...values, id: propertyId ?? null }), [values, propertyId]);

  return (
    <SeoPanel
      entityType="property"
      entity={entity}
      seo={values.seo}
      variant="full"
      errors={errors}
      disabled={disabled}
      excludeId={propertyId}
      checkSlug={checkPropertySlug}
      slugBase="/properties/"
      onFocusField={focusField}
      focusRequest={seoFocusRequest}
      onSlugChange={(slug) => setField('slug', slug)}
      onChange={(patch, meta) =>
        // The analysis writing its own score back is not an edit, so it must
        // not make an untouched form warn about unsaved changes.
        (meta?.computed ? setComputed : setFields)(toSeoPaths(patch))
      }
    />
  );
}
