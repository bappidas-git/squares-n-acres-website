import { useMemo } from 'react';

import FormSection, { FormColumn } from '../../../../../components/admin/FormSection';
import SlugField from '../../../../../components/admin/SlugField';
import { DateField, SelectField, TextField, TextareaField } from '../../../../../components/ui';
import {
  AVAILABILITY,
  CONSTRUCTION_STATUS,
  LISTING_TYPES,
  SEGMENTS,
} from '../../../../../config/enums';
import propertyService from '../../../../../services/propertyService';
import { useLocalities, usePropertyTypes } from '../../../../../hooks/useMasterData';
import { usePropertyFormContext } from '../PropertyFormContext';
import PlaceholderTab from './PlaceholderTab';

/** The API's cap on `shortDescription` (§6.1), shown as a live counter. */
const SHORT_DESCRIPTION_MAX = 300;

/** `SlugField` hands `(slug, { excludeId, signal })`; the service takes a params object. */
const checkSlug = (slug, { excludeId, signal } = {}) =>
  propertyService.checkSlug({ slug, excludeId }, { signal });

/**
 * Tab 1 — Basics.
 *
 * Prompt 19 writes the tab proper. Until then it carries the fields the shell
 * itself needs to create a listing at all: without a title, a URL, a type and a
 * locality the API answers 422, so a form that could not edit them would be a
 * form that cannot save. Everything else on this tab (furnishing, facing,
 * ownership, floors, RERA, the description editor) arrives with prompt 19.
 */
export default function BasicsTab() {
  const { values, errors, setField, disabled, propertyId } = usePropertyFormContext();

  const propertyTypes = usePropertyTypes({ segment: values.segment });
  const localities = useLocalities();

  const typeOptions = useMemo(
    () => propertyTypes.map((type) => ({ value: type.id, label: type.name })),
    [propertyTypes]
  );
  const localityOptions = useMemo(
    () => localities.map((locality) => ({ value: locality.id, label: locality.name })),
    [localities]
  );

  /** The city follows the locality: one choice, never two (§6.2). */
  const chooseLocality = (raw) => {
    const id = raw === '' ? null : Number(raw);
    const locality = localities.find((entry) => entry.id === id);
    setField('location.localityId', id);
    setField('location.cityId', locality?.cityId ?? null);
  };

  /** A property type belongs to one segment, so changing the segment clears it. */
  const chooseSegment = (segment) => {
    if (segment === values.segment) return;
    setField('segment', segment);
    setField('propertyTypeId', null);
  };

  const short = values.shortDescription ?? '';
  // The contract makes the date mandatory for these two statuses (§6.1), so the
  // field has to be here rather than wait for prompt 19 — a listing chosen as
  // under construction could otherwise never be saved.
  const needsPossessionDate =
    values.constructionStatus === 'pre-launch' ||
    values.constructionStatus === 'under-construction';

  return (
    <PlaceholderTab
      prompt={19}
      label="The full Basics tab"
      note="The fields below are the ones a listing cannot be created without; the rest of this section — furnishing, facing, ownership, floors, RERA and the description editor — arrives with that prompt."
    >
      <FormSection title="Identity">
        <FormColumn>
          <TextField
            label="Title"
            required
            value={values.title ?? ''}
            error={errors.title}
            disabled={disabled}
            maxLength={200}
            hint="At least 10 characters — this is the listing's heading and its SEO title."
            onChange={(event) => setField('title', event.target.value)}
          />
        </FormColumn>

        <FormColumn>
          <SlugField
            label="URL"
            required
            base="/properties/"
            source={values.title ?? ''}
            value={values.slug ?? ''}
            error={errors.slug}
            disabled={disabled}
            checkSlug={checkSlug}
            excludeId={propertyId ?? undefined}
            onChange={(slug) => setField('slug', slug)}
          />
        </FormColumn>

        <FormColumn>
          <TextareaField
            label="Short description"
            rows={3}
            maxLength={SHORT_DESCRIPTION_MAX}
            value={short}
            error={errors.shortDescription}
            disabled={disabled}
            hint={`${short.length}/${SHORT_DESCRIPTION_MAX} characters — the sentence under the title on cards and in search results.`}
            onChange={(event) => setField('shortDescription', event.target.value)}
          />
        </FormColumn>
      </FormSection>

      <FormSection title="Classification">
        <FormColumn half>
          <SelectField
            label="Listing type"
            required
            options={LISTING_TYPES.options}
            value={values.listingType ?? ''}
            error={errors.listingType}
            disabled={disabled}
            onChange={(event) => setField('listingType', event.target.value)}
          />
        </FormColumn>
        <FormColumn half>
          <SelectField
            label="Segment"
            required
            options={SEGMENTS.options}
            value={values.segment ?? ''}
            error={errors.segment}
            disabled={disabled}
            onChange={(event) => chooseSegment(event.target.value)}
          />
        </FormColumn>

        <FormColumn half>
          <SelectField
            label="Property type"
            required
            placeholder="Select a property type"
            options={typeOptions}
            value={values.propertyTypeId ?? ''}
            error={errors.propertyTypeId}
            disabled={disabled}
            hint="The list follows the segment."
            onChange={(event) =>
              setField(
                'propertyTypeId',
                event.target.value === '' ? null : Number(event.target.value)
              )
            }
          />
        </FormColumn>
        <FormColumn half>
          <SelectField
            label="Locality"
            required
            placeholder="Select a locality"
            options={localityOptions}
            value={values.location?.localityId ?? ''}
            error={errors['location.localityId']}
            disabled={disabled}
            hint="The city is filled in from the locality."
            onChange={(event) => chooseLocality(event.target.value)}
          />
        </FormColumn>

        <FormColumn half>
          <SelectField
            label="Construction status"
            required
            options={CONSTRUCTION_STATUS.options}
            value={values.constructionStatus ?? ''}
            error={errors.constructionStatus}
            disabled={disabled}
            onChange={(event) => setField('constructionStatus', event.target.value)}
          />
        </FormColumn>
        <FormColumn half>
          <SelectField
            label="Availability"
            required
            options={AVAILABILITY.options}
            value={values.availability ?? ''}
            error={errors.availability}
            disabled={disabled}
            onChange={(event) => setField('availability', event.target.value)}
          />
        </FormColumn>

        <FormColumn half>
          <DateField
            label="Possession date"
            required={needsPossessionDate}
            value={values.possessionDate ?? ''}
            error={errors.possessionDate}
            disabled={disabled}
            hint={
              needsPossessionDate
                ? 'Required while the listing is pre-launch or under construction.'
                : 'Optional for a ready or resale listing.'
            }
            onChange={(event) => setField('possessionDate', event.target.value)}
          />
        </FormColumn>
      </FormSection>
    </PlaceholderTab>
  );
}
