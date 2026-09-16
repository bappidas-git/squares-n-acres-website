import { useState } from 'react';
import { Icon } from '@iconify/react';

import FormSection, { FormColumn } from '../../../../../components/admin/FormSection';
import ImageField from '../../../../../components/admin/ImageField';
import SortableList from '../../../../../components/admin/SortableList';
import {
  Button,
  ConfirmDialog,
  IconButton,
  NumberField,
  SelectField,
  SwitchField,
  TextField,
  UrlField,
} from '../../../../../components/ui';
import { AREA_UNITS } from '../../../../../config/enums';
import { formatPrice, formatPriceRange } from '../../../../../utils/format';
import { makeUnitConfiguration } from '../initialState';
import NumberWithUnit from '../components/NumberWithUnit';
import { showsBhk } from '../fieldRules';
import { usePropertyFormContext } from '../PropertyFormContext';

import styles from './PropertyTabs.module.css';

const has = (value) => value !== null && value !== undefined && value !== '';

/** The lowest and highest price across the rows that are switched on. */
export function priceRangeOf(units = []) {
  const prices = units
    .filter((unit) => unit.isActive !== false && unit.priceOnRequest !== true)
    .map((unit) => Number(unit.price))
    .filter((price) => Number.isFinite(price) && price > 0);

  if (prices.length === 0) return null;
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** Everything but the name and the identity — what "copy from previous" carries. */
const copyableOf = (unit) => ({
  bedrooms: unit.bedrooms,
  bathrooms: unit.bathrooms,
  superBuiltUpArea: unit.superBuiltUpArea,
  carpetArea: unit.carpetArea,
  areaUnit: unit.areaUnit,
  price: unit.price,
  priceOnRequest: unit.priceOnRequest,
  availableUnits: unit.availableUnits,
  isActive: unit.isActive,
});

/**
 * Tab 5 — Unit configurations.
 *
 * The price table of a project: one row per unit type, each with its own area,
 * its own price and its own floor plan. The boilerplate carried this and the
 * floor-plan images in one list, which meant a project with four plans and two
 * price points could describe neither; they are two lists now (D61), and this
 * is the one the public page prints as a table.
 *
 * The range at the foot is the reason the tab is worth filling in: it is what
 * the listing quotes as "₹85 L – ₹1.2 Cr", and one button copies it into the
 * Pricing tab rather than asking anybody to retype it.
 */
export default function UnitConfigurationsTab() {
  const { values, errors, setFields, addItem, removeItem, moveItem, updateItem, disabled } =
    usePropertyFormContext();

  const units = values.unitConfigurations ?? [];
  const [removing, setRemoving] = useState(null);
  const residential = showsBhk(values);
  const range = priceRangeOf(units);

  const add = (patch = {}) => addItem('unitConfigurations', makeUnitConfiguration(patch));

  const applyRange = () => {
    if (!range) return;
    setFields({ 'pricing.priceRangeMin': range.min, 'pricing.priceRangeMax': range.max });
  };

  return (
    <>
      <FormSection
        title="Unit configurations"
        description="One row for every unit type on offer. They become the price table on the listing page, and the range under the title."
      >
        <FormColumn>
          {units.length === 0 ? (
            <p className={styles.counter}>
              Nothing here yet. A project with more than one unit type needs a row for each — a
              single resale flat does not need this tab at all.
            </p>
          ) : (
            <SortableList
              label="Unit configurations in order"
              items={units}
              disabled={disabled}
              getLabel={(unit, index) => unit.name || `Configuration ${index + 1}`}
              onReorder={(_next, { from, to }) => moveItem('unitConfigurations', from, to)}
              renderItem={(unit, index) => {
                const path = `unitConfigurations.${index}`;
                const onRequest = unit.priceOnRequest === true;
                const unitLabel = AREA_UNITS.labelOf(unit.areaUnit || 'sqft');

                return (
                  <div className={styles.unitCard}>
                    <div className={styles.unitHead}>
                      <h4 className={styles.unitTitle}>
                        {unit.name || `Configuration ${index + 1}`}
                      </h4>
                      <span className={styles.actions}>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={disabled}
                          onClick={() => add({ ...copyableOf(unit), name: `${unit.name} (copy)` })}
                          icon={<Icon icon="mdi:content-duplicate" width="16" height="16" />}
                        >
                          Duplicate
                        </Button>
                        <IconButton
                          label={`Remove ${unit.name || `configuration ${index + 1}`}`}
                          size="sm"
                          disabled={disabled}
                          onClick={() => setRemoving(unit)}
                        >
                          <Icon icon="mdi:delete-outline" width="18" height="18" />
                        </IconButton>
                      </span>
                    </div>

                    <div className={styles.unitGrid}>
                      <TextField
                        label="Name"
                        required
                        value={unit.name ?? ''}
                        error={errors[`${path}.name`]}
                        disabled={disabled}
                        maxLength={120}
                        placeholder="e.g. 3 BHK + Study"
                        onChange={(event) =>
                          updateItem('unitConfigurations', unit.id, { name: event.target.value })
                        }
                      />

                      <SelectField
                        label="Area unit"
                        options={AREA_UNITS.options}
                        value={unit.areaUnit || 'sqft'}
                        disabled={disabled}
                        onChange={(event) =>
                          updateItem('unitConfigurations', unit.id, {
                            areaUnit: event.target.value,
                          })
                        }
                      />

                      {residential ? (
                        <>
                          <NumberField
                            label="Bedrooms"
                            min={0}
                            max={20}
                            value={unit.bedrooms ?? ''}
                            error={errors[`${path}.bedrooms`]}
                            disabled={disabled}
                            onChange={(event) =>
                              updateItem('unitConfigurations', unit.id, {
                                bedrooms:
                                  event.target.value === ''
                                    ? null
                                    : Math.trunc(Number(event.target.value)),
                              })
                            }
                          />
                          <NumberField
                            label="Bathrooms"
                            min={0}
                            max={20}
                            value={unit.bathrooms ?? ''}
                            error={errors[`${path}.bathrooms`]}
                            disabled={disabled}
                            onChange={(event) =>
                              updateItem('unitConfigurations', unit.id, {
                                bathrooms:
                                  event.target.value === ''
                                    ? null
                                    : Math.trunc(Number(event.target.value)),
                              })
                            }
                          />
                        </>
                      ) : null}

                      <NumberWithUnit
                        label="Super built-up area"
                        suffix={unitLabel}
                        min={0}
                        value={unit.superBuiltUpArea ?? ''}
                        error={errors[`${path}.superBuiltUpArea`]}
                        disabled={disabled}
                        onChange={(value) =>
                          updateItem('unitConfigurations', unit.id, { superBuiltUpArea: value })
                        }
                      />

                      <NumberWithUnit
                        label="Carpet area"
                        suffix={unitLabel}
                        min={0}
                        value={unit.carpetArea ?? ''}
                        error={errors[`${path}.carpetArea`]}
                        disabled={disabled}
                        onChange={(value) =>
                          updateItem('unitConfigurations', unit.id, { carpetArea: value })
                        }
                      />

                      <NumberWithUnit
                        label="Price"
                        prefix="₹"
                        min={0}
                        value={unit.price ?? ''}
                        error={errors[`${path}.price`]}
                        disabled={disabled || onRequest}
                        readout={has(unit.price) && !onRequest ? formatPrice(unit.price) : null}
                        onChange={(value) =>
                          updateItem('unitConfigurations', unit.id, { price: value })
                        }
                      />

                      <NumberField
                        label="Units available"
                        min={0}
                        value={unit.availableUnits ?? ''}
                        error={errors[`${path}.availableUnits`]}
                        disabled={disabled}
                        hint="Shown as “4 units left” when it is set."
                        onChange={(event) =>
                          updateItem('unitConfigurations', unit.id, {
                            availableUnits:
                              event.target.value === ''
                                ? null
                                : Math.trunc(Number(event.target.value)),
                          })
                        }
                      />

                      <SwitchField
                        label="Price on request"
                        checked={onRequest}
                        disabled={disabled}
                        onChange={(checked) =>
                          updateItem('unitConfigurations', unit.id, {
                            priceOnRequest: checked,
                            ...(checked ? { price: null } : {}),
                          })
                        }
                      />

                      <SwitchField
                        label="Shown on the listing"
                        checked={unit.isActive !== false}
                        disabled={disabled}
                        hint="Turn a sold-out configuration off rather than deleting it."
                        onChange={(checked) =>
                          updateItem('unitConfigurations', unit.id, { isActive: checked })
                        }
                      />

                      <div className={styles.unitWide}>
                        <ImageField
                          label="Floor plan image"
                          hint="floorPlan"
                          value={unit.floorPlanImageUrl ?? ''}
                          error={errors[`${path}.floorPlanImageUrl`]}
                          disabled={disabled}
                          alt={`${unit.name || 'Unit'} floor plan`}
                          onChange={(url) =>
                            updateItem('unitConfigurations', unit.id, { floorPlanImageUrl: url })
                          }
                        />
                      </div>

                      <div className={styles.unitWide}>
                        <UrlField
                          label="Floor plan PDF"
                          value={unit.floorPlanPdfUrl ?? ''}
                          error={errors[`${path}.floorPlanPdfUrl`]}
                          disabled={disabled}
                          hint="Optional. Offered as a download beside the plan."
                          onChange={(event) =>
                            updateItem('unitConfigurations', unit.id, {
                              floorPlanPdfUrl: event.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          )}
        </FormColumn>

        <FormColumn>
          <div className={[styles.actions, styles.actionsEnd].join(' ')}>
            {units.length > 0 ? (
              <Button
                variant="ghost"
                disabled={disabled}
                onClick={() => add(copyableOf(units[units.length - 1]))}
                icon={<Icon icon="mdi:content-copy" width="18" height="18" />}
              >
                Copy from previous
              </Button>
            ) : null}
            <Button
              variant="outline"
              disabled={disabled}
              onClick={() => add()}
              icon={<Icon icon="mdi:plus" width="18" height="18" />}
            >
              Add configuration
            </Button>
          </div>
        </FormColumn>

        {range ? (
          <FormColumn className={styles.conditional}>
            <div className={styles.summary}>
              <p className={styles.summaryText}>
                Price range across the configurations shown:{' '}
                <span className={styles.summaryValue}>
                  {formatPriceRange(range.min, range.max, { listingType: values.listingType })}
                </span>
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={applyRange}
                icon={<Icon icon="mdi:arrow-right-bold-outline" width="16" height="16" />}
              >
                Apply as pricing range
              </Button>
            </div>
          </FormColumn>
        ) : null}
      </FormSection>

      <ConfirmDialog
        open={Boolean(removing)}
        title="Remove this configuration?"
        message={`“${removing?.name || 'This configuration'}” and its floor plan will be removed from the listing. This cannot be undone once the listing is saved.`}
        confirmLabel="Remove"
        danger
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          removeItem('unitConfigurations', removing.id);
          setRemoving(null);
        }}
      />
    </>
  );
}
