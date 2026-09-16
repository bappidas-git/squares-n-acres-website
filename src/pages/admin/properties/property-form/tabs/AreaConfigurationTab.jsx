import { Icon } from '@iconify/react';

import FormSection, { FormColumn } from '../../../../../components/admin/FormSection';
import { Alert, NumberField, SelectField, SwitchField } from '../../../../../components/ui';
import { AREA_UNITS, KITCHEN_TYPES } from '../../../../../config/enums';
import { formatArea } from '../../../../../utils/format';
import {
  PLOT_DIMENSION_UNITS,
  isCommercial,
  isPlot,
  plotAreaFrom,
  showsBhk,
  showsBuiltAreas,
  showsPlotDimensions,
} from '../fieldRules';
import NumberWithUnit from '../components/NumberWithUnit';
import { usePropertyFormContext } from '../PropertyFormContext';

import styles from './PropertyTabs.module.css';

/** A number the editor actually entered. */
const has = (value) => value !== null && value !== undefined && value !== '';

const toNumber = (value) => {
  if (!has(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Carpet ≤ built-up ≤ super built-up, when all three are given.
 *
 * It is a warning rather than an error: the three areas come off a builder's
 * sheet, the sheet is sometimes wrong, and refusing to save a listing over an
 * arithmetic quibble helps nobody. The listing page prints all three, so the
 * editor is told and left to decide.
 *
 * @param {object} area
 * @returns {string|null}
 */
export function areaOrderWarning(area = {}) {
  const carpet = toNumber(area.carpetArea);
  const built = toNumber(area.builtUpArea);
  const superBuilt = toNumber(area.superBuiltUpArea);

  if (carpet !== null && built !== null && carpet > built) {
    return 'The carpet area is larger than the built-up area. Carpet ≤ built-up ≤ super built-up is what a buyer expects.';
  }
  if (built !== null && superBuilt !== null && built > superBuilt) {
    return 'The built-up area is larger than the super built-up area. Carpet ≤ built-up ≤ super built-up is what a buyer expects.';
  }
  if (carpet !== null && superBuilt !== null && carpet > superBuilt) {
    return 'The carpet area is larger than the super built-up area. Carpet ≤ built-up ≤ super built-up is what a buyer expects.';
  }
  return null;
}

/**
 * Tab 4 — Area & configuration.
 *
 * Three different properties share this tab, and each shows only its own half:
 * a home is measured in carpet and super built-up and counted in bedrooms; a
 * plot is measured in length and width and counted in nothing; an office is
 * measured like a home and its washrooms and pantry are specifications, not
 * fields of their own. `fieldRules.js` decides which of the three this is.
 */
export default function AreaConfigurationTab() {
  const { values, errors, setField, setFields, disabled } = usePropertyFormContext();

  const area = values.area ?? {};
  const configuration = values.configuration ?? {};
  const unitLabel = AREA_UNITS.labelOf(area.areaUnit || 'sqft');
  const warning = areaOrderWarning(area);

  const setArea = (key) => (value) => setField(`area.${key}`, value);

  /**
   * Writes one plot dimension and, while the plot area is still empty, fills it
   * in from length × width. A typed area is never overwritten: a survey number
   * and an arithmetic product disagree more often than not.
   */
  const setDimension = (field, value) => {
    const patch = { [`area.${field}`]: value };
    const next = { ...area, [field]: value };
    if (has(next.plotArea)) {
      setFields(patch);
      return;
    }
    const computed = plotAreaFrom(
      next.plotLength,
      next.plotWidth,
      next.plotDimensionUnit,
      next.areaUnit
    );
    setFields(computed === null ? patch : { ...patch, 'area.plotArea': computed });
  };

  const count = (key, label, hint) => (
    <NumberField
      label={label}
      min={0}
      max={99}
      step={1}
      value={configuration[key] ?? ''}
      error={errors[`configuration.${key}`]}
      disabled={disabled}
      hint={hint}
      onChange={(event) =>
        setField(
          `configuration.${key}`,
          event.target.value === '' ? null : Math.trunc(Number(event.target.value))
        )
      }
    />
  );

  return (
    <>
      <FormSection
        title="Area"
        description="Every area on a listing is stored in one unit, so the whole page adds up. Change the unit here and the figures below follow it."
      >
        <FormColumn half>
          <SelectField
            label="Area unit"
            options={AREA_UNITS.options}
            value={area.areaUnit || 'sqft'}
            error={errors['area.areaUnit']}
            disabled={disabled}
            hint="Sq ft is the Bengaluru default; plots are often quoted in sq yd, cent or guntha."
            onChange={(event) => setField('area.areaUnit', event.target.value)}
          />
        </FormColumn>

        {showsBuiltAreas(values) ? (
          <>
            <FormColumn half>
              <NumberWithUnit
                label="Super built-up area"
                suffix={unitLabel}
                min={0}
                value={area.superBuiltUpArea ?? ''}
                error={errors['area.superBuiltUpArea']}
                disabled={disabled}
                hint="What the price is usually quoted against."
                readout={
                  has(area.superBuiltUpArea) ? formatArea(area.superBuiltUpArea, unitLabel) : null
                }
                onChange={setArea('superBuiltUpArea')}
              />
            </FormColumn>

            <FormColumn half>
              <NumberWithUnit
                label="Built-up area"
                suffix={unitLabel}
                min={0}
                value={area.builtUpArea ?? ''}
                error={errors['area.builtUpArea']}
                disabled={disabled}
                onChange={setArea('builtUpArea')}
              />
            </FormColumn>

            <FormColumn half>
              <NumberWithUnit
                label="Carpet area"
                suffix={unitLabel}
                min={0}
                value={area.carpetArea ?? ''}
                error={errors['area.carpetArea']}
                disabled={disabled}
                hint="The RERA figure — the floor a buyer can actually walk on."
                readout={has(area.carpetArea) ? formatArea(area.carpetArea, unitLabel) : null}
                onChange={setArea('carpetArea')}
              />
            </FormColumn>

            {warning ? (
              <FormColumn className={styles.conditional}>
                <Alert tone="warning" title="Check these areas">
                  {warning}
                </Alert>
              </FormColumn>
            ) : null}
          </>
        ) : null}

        {showsPlotDimensions(values) ? (
          <>
            <FormColumn half>
              <NumberWithUnit
                label="Plot area"
                suffix={unitLabel}
                min={0}
                value={area.plotArea ?? ''}
                error={errors['area.plotArea']}
                disabled={disabled}
                hint="Filled in from the length and the width while it is empty."
                readout={has(area.plotArea) ? formatArea(area.plotArea, unitLabel) : null}
                onChange={setArea('plotArea')}
              />
            </FormColumn>

            <FormColumn half>
              <SelectField
                label="Dimension unit"
                placeholder="Not specified"
                options={PLOT_DIMENSION_UNITS}
                value={area.plotDimensionUnit ?? ''}
                error={errors['area.plotDimensionUnit']}
                disabled={disabled}
                hint="The unit the length and the width below are measured in."
                onChange={(event) => setDimension('plotDimensionUnit', event.target.value || null)}
              />
            </FormColumn>

            <FormColumn half>
              <div className={styles.pair}>
                <NumberWithUnit
                  label="Length"
                  min={0}
                  step={0.01}
                  value={area.plotLength ?? ''}
                  error={errors['area.plotLength']}
                  disabled={disabled}
                  onChange={(value) => setDimension('plotLength', value)}
                />
                <NumberWithUnit
                  label="Width"
                  min={0}
                  step={0.01}
                  value={area.plotWidth ?? ''}
                  error={errors['area.plotWidth']}
                  disabled={disabled}
                  onChange={(value) => setDimension('plotWidth', value)}
                />
              </div>
            </FormColumn>
          </>
        ) : null}
      </FormSection>

      {showsBhk(values) ? (
        <FormSection
          title="Configuration"
          description="What the home is made of. These are the numbers the search filters and the card headline read."
        >
          <FormColumn>
            <div className={styles.counts}>
              {count('bedrooms', 'Bedrooms', 'Whole numbers. Five or more is shown as “5+ BHK”.')}
              {count('bathrooms', 'Bathrooms')}
              {count('balconies', 'Balconies')}
              {count('parkingCovered', 'Covered parking')}
              {count('parkingOpen', 'Open parking')}
            </div>
          </FormColumn>

          <FormColumn half>
            <SelectField
              label="Kitchen"
              placeholder="Not specified"
              options={KITCHEN_TYPES.options}
              value={configuration.kitchenType ?? ''}
              error={errors['configuration.kitchenType']}
              disabled={disabled}
              onChange={(event) => setField('configuration.kitchenType', event.target.value)}
            />
          </FormColumn>

          <FormColumn>
            <div className={styles.switches}>
              <SwitchField
                label="Servant room"
                checked={configuration.servantRoom === true}
                disabled={disabled}
                onChange={(checked) => setField('configuration.servantRoom', checked)}
              />
              <SwitchField
                label="Study room"
                checked={configuration.studyRoom === true}
                disabled={disabled}
                onChange={(checked) => setField('configuration.studyRoom', checked)}
              />
              <SwitchField
                label="Pooja room"
                checked={configuration.poojaRoom === true}
                disabled={disabled}
                onChange={(checked) => setField('configuration.poojaRoom', checked)}
              />
            </div>
          </FormColumn>
        </FormSection>
      ) : null}

      {isCommercial(values) ? (
        <Alert
          tone="info"
          title="Washrooms, pantry and the rest"
          icon={<Icon icon="mdi:clipboard-list-outline" width="20" height="20" />}
        >
          A commercial unit's fittings vary too much to be fields of their own. Add them on the
          Highlights &amp; specifications tab — each one becomes a labelled row in the
          specifications table on the listing page.
        </Alert>
      ) : null}

      {isPlot(values) ? (
        <Alert
          tone="info"
          title="Approvals and khata"
          icon={<Icon icon="mdi:file-certificate-outline" width="20" height="20" />}
        >
          A plot is bought on its paperwork. BBMP, BDA or BMRDA approval belongs on the Project
          &amp; builder tab, and the khata type and conversion order on Highlights &amp;
          specifications.
        </Alert>
      ) : null}
    </>
  );
}
