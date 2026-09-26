import { useMemo } from 'react';

import RequirementFields, {
  useRequirementFields,
} from '../../../components/common/RequirementFields';
import { TextField } from '../../../components/ui';

import styles from './LeadDetailPage.module.css';

const isBlank = (value) => value === '' || value === null || value === undefined;

/** A stored number as a box's text, `''` for none. */
const asText = (value) => (value === null || value === undefined ? '' : String(value));

/**
 * A lead's `requirement` as the editor's values — every answer a string, as the
 * selects and boxes hold them (prompt 51).
 *
 * @param {object|null} requirement
 * @returns {object}
 */
export function requirementToValues(requirement) {
  const wanted = requirement ?? {};
  return {
    listingType: wanted.listingType ?? '',
    propertyTypeId: asText(wanted.propertyTypeId),
    localityId: asText(wanted.localityId),
    bedrooms: asText(wanted.bedrooms),
    budgetMin: asText(wanted.budgetMin),
    budgetMax: asText(wanted.budgetMax),
    timeline: wanted.timeline ?? '',
  };
}

/**
 * The editor's values as the `requirement` the API stores, or `null` when
 * nothing is answered — a lead that said nothing about what it wants has no
 * requirement, not six empty ones.
 *
 * @param {object} values
 * @returns {object|null}
 */
export function valuesToRequirement(values = {}) {
  const number = (value) => (isBlank(value) ? null : Number(value));
  const requirement = {
    listingType: isBlank(values.listingType) ? null : values.listingType,
    propertyTypeId: number(values.propertyTypeId),
    localityId: number(values.localityId),
    bedrooms: number(values.bedrooms),
    budgetMin: number(values.budgetMin),
    budgetMax: number(values.budgetMax),
    areaUnit: null,
    timeline: isBlank(values.timeline) ? null : values.timeline,
  };
  return Object.values(requirement).some((value) => value !== null) ? requirement : null;
}

/**
 * What is wrong with a requirement's budget, by box: a figure that is not a
 * positive number, and a maximum below the minimum.
 *
 * @param {object} values
 * @returns {{budgetMin?: string, budgetMax?: string}}
 */
export function requirementErrors(values = {}) {
  const errors = {};
  const figure = (value) => (isBlank(value) ? null : Number(value));
  const min = figure(values.budgetMin);
  const max = figure(values.budgetMax);
  if (min !== null && !(Number.isFinite(min) && min >= 0)) {
    errors.budgetMin = 'Enter the budget in rupees, digits only.';
  }
  if (max !== null && !(Number.isFinite(max) && max >= 0)) {
    errors.budgetMax = 'Enter the budget in rupees, digits only.';
  }
  if (!errors.budgetMin && !errors.budgetMax && min !== null && max !== null && max < min) {
    errors.budgetMax = 'The maximum is below the minimum.';
  }
  return errors;
}

/**
 * The requirement a desk records or corrects (prompt 51): the site's own five
 * selects — the ones a visitor answers — and the budget as two figures rather
 * than a price band, because the desk heard a number.
 *
 * @param {object} props
 * @param {object} props.values from {@link requirementToValues}
 * @param {(name: string, value: string) => void} props.onChange
 * @param {object} [props.errors]
 * @param {boolean} [props.disabled]
 * @param {string} [props.legend]
 */
export default function LeadRequirementEditor({
  values,
  onChange,
  errors = {},
  disabled = false,
  legend = 'What they are looking for',
}) {
  const all = useRequirementFields();
  const fields = useMemo(() => all.filter((field) => field.name !== 'budget'), [all]);

  return (
    <div className={styles.requirementEditor}>
      <RequirementFields
        fields={fields}
        values={values}
        onChange={onChange}
        disabled={disabled}
        legend={legend}
      />
      <div className={styles.budgetRow}>
        <TextField
          label="Budget from (₹)"
          inputMode="numeric"
          value={values.budgetMin ?? ''}
          error={errors.budgetMin}
          disabled={disabled}
          onChange={(event) => onChange('budgetMin', event.target.value.replace(/[^\d]/g, ''))}
        />
        <TextField
          label="Budget up to (₹)"
          inputMode="numeric"
          value={values.budgetMax ?? ''}
          error={errors.budgetMax}
          disabled={disabled}
          onChange={(event) => onChange('budgetMax', event.target.value.replace(/[^\d]/g, ''))}
        />
      </div>
    </div>
  );
}
