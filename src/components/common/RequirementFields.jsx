import { useMemo } from 'react';

import LeadFormField from './LeadFormField';
import { requirementFields } from '../../utils/leadSources';
import { useLocalities, usePropertyTypes } from '../../hooks/useMasterData';

import styles from './LeadForm.module.css';

/**
 * The six selects of D82, with the live master data in them.
 *
 * What, where, how big, how much and by when — the answers the API stores
 * under `lead.requirement` (§6.7), which is what turns "somebody called" into
 * a lead a sales desk can act on. The property types and the localities come
 * from `MasterDataContext`, so the list a visitor picks from is the one the
 * site actually has listings in (D93).
 *
 * @returns {Array<object>} the field descriptors, memoised
 */
export function useRequirementFields() {
  const propertyTypes = usePropertyTypes();
  const localities = useLocalities();

  return useMemo(
    () => requirementFields({ propertyTypes, localities }),
    [propertyTypes, localities]
  );
}

/**
 * The requirement group as it appears in a form.
 *
 * A `<fieldset>` rather than six loose selects: a screen reader announces the
 * legend before each control, so "Budget" is heard as "What are you looking
 * for? Budget" and not as a stray box under a name and a phone number.
 *
 * @param {object} props
 * @param {Array<object>} props.fields from {@link useRequirementFields}
 * @param {object} props.values every answer in the form
 * @param {object} [props.errors]
 * @param {(name: string, value: string) => void} props.onChange
 * @param {boolean} [props.disabled]
 * @param {string} [props.legend]
 */
export default function RequirementFields({
  fields,
  values,
  errors = {},
  onChange,
  disabled = false,
  legend = 'What are you looking for?',
}) {
  if (!Array.isArray(fields) || fields.length === 0) return null;

  return (
    <fieldset className={styles.requirement}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.grid}>
        {fields.map((field) => (
          <div
            key={field.name}
            className={[styles.cell, field.half ? styles.half : ''].filter(Boolean).join(' ')}
          >
            <LeadFormField
              field={field}
              value={values?.[field.name] ?? ''}
              values={values}
              error={errors[field.name]}
              onChange={onChange}
              disabled={disabled}
            />
          </div>
        ))}
      </div>
    </fieldset>
  );
}
