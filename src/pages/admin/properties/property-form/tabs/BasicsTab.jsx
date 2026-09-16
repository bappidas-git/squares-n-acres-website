import { useMemo, useState } from 'react';

import FormSection, { FormColumn } from '../../../../../components/admin/FormSection';
import MultiSelect from '../../../../../components/admin/MultiSelect';
import SlugField from '../../../../../components/admin/SlugField';
import {
  ConfirmDialog,
  NumberField,
  RadioGroup,
  SelectField,
  SwitchField,
  TextField,
  TextareaField,
} from '../../../../../components/ui';
import {
  AVAILABILITY,
  CONSTRUCTION_STATUS,
  FACING,
  FURNISHING,
  LISTING_TYPES,
  OWNERSHIP,
  SEGMENTS,
} from '../../../../../config/enums';
import propertyService from '../../../../../services/propertyService';
import { useBadgeMap, usePropertyTypes } from '../../../../../hooks/useMasterData';
import { DESCRIPTION_MIN, plainText, wordCount } from '../validators/property';
import {
  anyFilled,
  clearedBySegment,
  pricingFieldsClearedBy,
  showsAge,
  showsFloors,
  showsFurnishing,
  showsPossessionDate,
} from '../fieldRules';
import { usePropertyFormContext } from '../PropertyFormContext';

import styles from './PropertyTabs.module.css';

/** The API's cap on `shortDescription` (§6.1), shown as a live counter. */
const SHORT_DESCRIPTION_MAX = 300;

/** `SlugField` hands `(slug, { excludeId, signal })`; the service takes a params object. */
const checkSlug = (slug, { excludeId, signal } = {}) =>
  propertyService.checkSlug({ slug, excludeId }, { signal });

/** `yyyy-mm-dd` → the `yyyy-mm` an `<input type="month">` holds. */
const toMonth = (value) => String(value ?? '').slice(0, 7);

/** `yyyy-mm` → the first of that month, which is what the contract stores. */
const fromMonth = (value) => (value ? `${value}-01` : '');

/**
 * Tab 1 — Basics.
 *
 * What a listing *is*: its name, what it is being offered for, what kind of
 * property it is, what state it is in, and the two pieces of prose every other
 * screen quotes. Where it is lives on the Location tab and what it costs on
 * Pricing; nothing here needs either.
 *
 * Two of these controls change what the rest of the form shows, so both ask
 * before they throw anything away (§7 of prompt 19): switching a priced sale to
 * a rental, and moving a listing between segments.
 */
export default function BasicsTab() {
  const { values, errors, setField, setFields, disabled, propertyId } = usePropertyFormContext();
  const [pending, setPending] = useState(null);

  const propertyTypes = usePropertyTypes({ segment: values.segment });
  const badgeMap = useBadgeMap();

  const typeOptions = useMemo(
    () => propertyTypes.map((type) => ({ value: type.id, label: type.name })),
    [propertyTypes]
  );
  // `useBadgeMap` is keyed by id because most screens hold ids and nothing
  // else; a picker wants the records, in the order an editor arranged them.
  const badgeOptions = useMemo(
    () =>
      Array.from(badgeMap.values())
        .filter((badge) => badge.isActive !== false)
        .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
        .map((badge) => ({ value: badge.id, label: badge.name })),
    [badgeMap]
  );

  // A type belongs to exactly one segment (§6.3); one that no longer does is
  // not a choice the editor made, so it goes rather than becoming a silent 422.
  const typeBelongs = propertyTypes.some((type) => type.id === values.propertyTypeId);

  /** Applies a patch, after the dialog if it would discard something. */
  const applyOrConfirm = (patch, cleared, dialog) => {
    if (!anyFilled(values, Object.keys(cleared))) {
      setFields({ ...patch, ...cleared });
      return;
    }
    setPending({ ...dialog, patch, cleared });
  };

  const chooseListingType = (next) => {
    if (next === values.listingType) return;

    const dropped = pricingFieldsClearedBy(values.listingType, next);
    const cleared = Object.fromEntries(dropped.map((field) => [`pricing.${field}`, null]));

    applyOrConfirm({ listingType: next }, cleared, {
      title: `Change this listing to ${LISTING_TYPES.labelOf(next)}?`,
      message: `A ${LISTING_TYPES.labelOf(next).toLowerCase()} listing does not use the prices this one already holds, so they will be cleared. Everything else is kept.`,
      confirmLabel: 'Change and clear',
    });
  };

  const chooseSegment = (next) => {
    if (next === values.segment) return;

    const cleared = clearedBySegment(next);
    // The type list is filtered by segment, so the current pick cannot survive.
    const patch = { segment: next, propertyTypeId: null };

    applyOrConfirm(patch, cleared, {
      title: `Move this listing to ${SEGMENTS.labelOf(next)}?`,
      message: `${SEGMENTS.labelOf(next)} listings do not use some of the area and configuration fields this one has filled in. They will be cleared, and moving back does not bring them back.`,
      confirmLabel: 'Move and clear',
    });
  };

  const short = values.shortDescription ?? '';
  const descriptionText = plainText(values.description);
  const descriptionWords = wordCount(values.description);
  const longEnough = descriptionText.length >= DESCRIPTION_MIN;

  return (
    <>
      <FormSection
        title="Identity"
        description="The heading a buyer reads first, and the address this listing lives at."
      >
        <FormColumn>
          <TextField
            label="Title"
            required
            value={values.title ?? ''}
            error={errors.title}
            disabled={disabled}
            maxLength={200}
            hint="At least 10 characters — this is the listing's heading and the basis of its SEO title."
            onChange={(event) => setField('title', event.target.value)}
          />
        </FormColumn>

        <FormColumn half>
          <TextField
            label="Project name"
            value={values.projectName ?? ''}
            error={errors.projectName}
            disabled={disabled}
            maxLength={150}
            hint="The development this unit belongs to, when it has one."
            onChange={(event) => setField('projectName', event.target.value)}
          />
        </FormColumn>

        <FormColumn half>
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
      </FormSection>

      <FormSection
        title="Classification"
        description="What this listing is offered for and what kind of property it is. Both decide which fields the rest of the form shows."
      >
        <FormColumn half>
          <RadioGroup
            label="Listing type"
            required
            options={LISTING_TYPES.options}
            value={values.listingType ?? ''}
            error={errors.listingType}
            disabled={disabled}
            onChange={chooseListingType}
          />
        </FormColumn>

        <FormColumn half>
          <RadioGroup
            label="Segment"
            required
            options={SEGMENTS.options}
            value={values.segment ?? ''}
            error={errors.segment}
            disabled={disabled}
            onChange={chooseSegment}
          />
        </FormColumn>

        <FormColumn half>
          <SelectField
            label="Property type"
            required
            placeholder="Select a property type"
            options={typeOptions}
            value={typeBelongs ? values.propertyTypeId : ''}
            error={errors.propertyTypeId}
            disabled={disabled}
            hint="The list follows the segment above."
            onChange={(event) =>
              setField(
                'propertyTypeId',
                event.target.value === '' ? null : Number(event.target.value)
              )
            }
          />
        </FormColumn>

        <FormColumn half>
          <MultiSelect
            label="Badges"
            options={badgeOptions}
            value={values.badgeIds ?? []}
            error={errors.badgeIds}
            disabled={disabled}
            placeholder="New Launch, RERA Approved…"
            hint="The ribbons shown on the card and above the title."
            onChange={(ids) => setField('badgeIds', ids)}
          />
        </FormColumn>
      </FormSection>

      <FormSection
        title="Status"
        description="Where the building is in its life, and whether this unit is still on the market."
      >
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

        {showsPossessionDate(values) ? (
          <FormColumn half className={styles.conditional}>
            <TextField
              type="month"
              label="Possession"
              required
              value={toMonth(values.possessionDate)}
              error={errors.possessionDate}
              disabled={disabled}
              hint="The month handover is promised for — buyers compare listings by quarter, not by day."
              onChange={(event) => setField('possessionDate', fromMonth(event.target.value))}
            />
          </FormColumn>
        ) : null}

        {showsAge(values) ? (
          <FormColumn half className={styles.conditional}>
            <NumberField
              label="Age of the property"
              min={0}
              max={200}
              value={values.ageOfPropertyYears ?? ''}
              error={errors.ageOfPropertyYears}
              disabled={disabled}
              hint="In years since completion. Leave empty for a new building."
              onChange={(event) =>
                setField(
                  'ageOfPropertyYears',
                  event.target.value === '' ? null : Number(event.target.value)
                )
              }
            />
          </FormColumn>
        ) : null}

        <FormColumn half>
          <SwitchField
            label="RERA registered"
            checked={values.reraRegistered === true}
            disabled={disabled}
            hint="Karnataka RERA registration, shown as a verified line on the listing."
            onChange={(checked) => {
              // Turning it off drops the number with it: a registration number
              // under "not registered" is a claim nobody made.
              setFields(
                checked ? { reraRegistered: true } : { reraRegistered: false, reraNumber: '' }
              );
            }}
          />
        </FormColumn>

        {values.reraRegistered ? (
          <FormColumn half className={styles.conditional}>
            <TextField
              label="RERA number"
              required
              value={values.reraNumber ?? ''}
              error={errors.reraNumber}
              disabled={disabled}
              maxLength={60}
              placeholder="PRM/KA/RERA/…"
              onChange={(event) => setField('reraNumber', event.target.value)}
            />
          </FormColumn>
        ) : null}
      </FormSection>

      {showsFurnishing(values) || showsFloors(values) ? (
        <FormSection
          title="The unit"
          description="How the unit is handed over and where it sits in the building."
        >
          {showsFurnishing(values) ? (
            <>
              <FormColumn half>
                <SelectField
                  label="Furnishing"
                  placeholder="Not specified"
                  options={FURNISHING.options}
                  value={values.furnishing ?? ''}
                  error={errors.furnishing}
                  disabled={disabled}
                  onChange={(event) => setField('furnishing', event.target.value)}
                />
              </FormColumn>

              <FormColumn half>
                <SelectField
                  label="Facing"
                  placeholder="Not specified"
                  options={FACING.options}
                  value={values.facing ?? ''}
                  error={errors.facing}
                  disabled={disabled}
                  onChange={(event) => setField('facing', event.target.value)}
                />
              </FormColumn>

              <FormColumn half>
                <SelectField
                  label="Ownership"
                  placeholder="Not specified"
                  options={OWNERSHIP.options}
                  value={values.ownership ?? ''}
                  error={errors.ownership}
                  disabled={disabled}
                  hint="Freehold, leasehold, khata transfer — what the buyer receives."
                  onChange={(event) => setField('ownership', event.target.value)}
                />
              </FormColumn>
            </>
          ) : null}

          {showsFloors(values) ? (
            <FormColumn half>
              <div className={styles.pair}>
                <NumberField
                  label="Floor number"
                  min={-5}
                  max={200}
                  value={values.floorNumber ?? ''}
                  error={errors.floorNumber}
                  disabled={disabled}
                  hint="0 is the ground floor."
                  onChange={(event) =>
                    setField(
                      'floorNumber',
                      event.target.value === '' ? null : Number(event.target.value)
                    )
                  }
                />
                <NumberField
                  label="Total floors"
                  min={0}
                  max={200}
                  value={values.totalFloors ?? ''}
                  error={errors.totalFloors}
                  disabled={disabled}
                  onChange={(event) =>
                    setField(
                      'totalFloors',
                      event.target.value === '' ? null : Number(event.target.value)
                    )
                  }
                />
              </div>
            </FormColumn>
          ) : null}
        </FormSection>
      ) : null}

      <FormSection
        title="Description"
        description="The summary is the sentence under the title on cards and in search results; the description is the body of the listing page."
      >
        <FormColumn>
          <TextareaField
            label="Short description"
            rows={3}
            maxLength={SHORT_DESCRIPTION_MAX}
            value={short}
            error={errors.shortDescription}
            disabled={disabled}
            hint={`${short.length}/${SHORT_DESCRIPTION_MAX} characters.`}
            onChange={(event) => setField('shortDescription', event.target.value)}
          />
        </FormColumn>

        <FormColumn>
          <TextareaField
            label="Description"
            rows={8}
            value={values.description ?? ''}
            error={errors.description}
            disabled={disabled}
            onChange={(event) => setField('description', event.target.value)}
          />
          <p className={styles.counter}>
            <span className={longEnough ? styles.counterOk : styles.counterWarn}>
              {descriptionText.length} characters
            </span>
            <span>{descriptionWords} words</span>
            <span>
              Detailed description — at least {DESCRIPTION_MIN} characters to publish this listing.
            </span>
          </p>
        </FormColumn>
      </FormSection>

      <ConfirmDialog
        open={Boolean(pending)}
        title={pending?.title}
        message={pending?.message}
        confirmLabel={pending?.confirmLabel}
        danger
        onClose={() => setPending(null)}
        onConfirm={() => {
          setFields({ ...pending.patch, ...pending.cleared });
          setPending(null);
        }}
      />
    </>
  );
}
