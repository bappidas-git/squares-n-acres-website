import { useState } from 'react';
import { Icon } from '@iconify/react';

import FormSection, { FormColumn } from '../../../../../components/admin/FormSection';
import ImageField from '../../../../../components/admin/ImageField';
import SortableList from '../../../../../components/admin/SortableList';
import {
  Alert,
  Button,
  ConfirmDialog,
  IconButton,
  NumberField,
  SelectField,
  UrlField,
  TextField,
} from '../../../../../components/ui';
import { AREA_UNITS } from '../../../../../config/enums';
import { formatPrice } from '../../../../../utils/format';
import { makeFloorPlan } from '../initialState';
import NumberWithUnit from '../components/NumberWithUnit';
import { showsBhk } from '../fieldRules';
import { usePropertyFormContext } from '../PropertyFormContext';

import styles from './PropertyTabs.module.css';

const has = (value) => value !== null && value !== undefined && value !== '';

const key = (title) =>
  String(title ?? '')
    .trim()
    .toLowerCase();

/**
 * The floor plans a set of unit configurations already describes.
 *
 * A unit configuration carries a plan image of its own (§6.1); this turns the
 * ones that have one into the image cards the public gallery prints, and skips
 * a unit the list already covers, so pressing the button twice adds nothing
 * the second time (§7 of prompt 20).
 *
 * "Already covered" is either the title or the drawing: an editor who renamed
 * a generated plan "2 BHK — 1,180 sq ft" has not thereby asked for a second
 * card of the same image.
 *
 * @param {Array<object>} units `unitConfigurations`
 * @param {Array<object>} existing `floorPlans`
 * @returns {Array<object>} the rows to add, without ids
 */
export function floorPlansFromUnits(units = [], existing = []) {
  const titles = new Set(existing.map((plan) => key(plan.title)).filter(Boolean));
  const images = new Set(existing.map((plan) => key(plan.imageUrl)).filter(Boolean));

  return units
    .filter((unit) => unit.isActive !== false && String(unit.floorPlanImageUrl ?? '').trim() !== '')
    .filter((unit) => {
      const title = key(unit.name);
      const image = key(unit.floorPlanImageUrl);
      if (!title || titles.has(title) || images.has(image)) return false;
      titles.add(title);
      images.add(image);
      return true;
    })
    .map((unit) => ({
      title: String(unit.name).trim(),
      imageUrl: String(unit.floorPlanImageUrl).trim(),
      pdfUrl: String(unit.floorPlanPdfUrl ?? '').trim(),
      area: unit.superBuiltUpArea ?? unit.carpetArea ?? null,
      areaUnit: unit.areaUnit || 'sqft',
      bedrooms: unit.bedrooms ?? null,
      price: unit.priceOnRequest === true ? null : (unit.price ?? null),
    }));
}

/**
 * Tab 9 — Floor plans.
 *
 * The images. The price table lives one tab back, because the boilerplate kept
 * both in one list and a project with four plans and two price points could
 * describe neither (D61). What is left here is what a buyer zooms into: a
 * title, a drawing, and optionally the PDF, the area, the BHK and the price
 * that go under it.
 */
export default function FloorPlansTab() {
  const { values, errors, addItem, removeItem, moveItem, updateItem, disabled } =
    usePropertyFormContext();

  const plans = values.floorPlans ?? [];
  const units = values.unitConfigurations ?? [];
  const [removing, setRemoving] = useState(null);
  const residential = showsBhk(values);

  const generated = floorPlansFromUnits(units, plans);

  const generate = () => generated.forEach((plan) => addItem('floorPlans', makeFloorPlan(plan)));

  return (
    <>
      <FormSection
        title="Floor plans"
        description="One card per drawing. They become the floor-plan gallery on the listing page; the areas and prices per unit type belong on Unit configurations."
      >
        <FormColumn>
          {plans.length === 0 ? (
            <p className={styles.counter}>
              No plans yet. A drawing is the second thing a buyer looks for, after the photographs.
            </p>
          ) : (
            <SortableList
              label="Floor plans in order"
              items={plans}
              disabled={disabled}
              getLabel={(plan, index) => plan.title || `Floor plan ${index + 1}`}
              onReorder={(_next, { from, to }) => moveItem('floorPlans', from, to)}
              renderItem={(plan, index) => {
                const path = `floorPlans.${index}`;
                const unitLabel = AREA_UNITS.labelOf(plan.areaUnit || 'sqft');

                return (
                  <div className={styles.unitCard}>
                    <div className={styles.unitHead}>
                      <h4 className={styles.unitTitle}>
                        {plan.title || `Floor plan ${index + 1}`}
                      </h4>
                      <IconButton
                        label={`Remove ${plan.title || `floor plan ${index + 1}`}`}
                        size="sm"
                        disabled={disabled}
                        onClick={() => setRemoving(plan)}
                      >
                        <Icon icon="mdi:delete-outline" width="18" height="18" />
                      </IconButton>
                    </div>

                    <div className={styles.unitGrid}>
                      <TextField
                        label="Title"
                        required
                        value={plan.title ?? ''}
                        error={errors[`${path}.title`]}
                        disabled={disabled}
                        maxLength={120}
                        placeholder="e.g. 3 BHK — Type A"
                        onChange={(event) =>
                          updateItem('floorPlans', plan.id, { title: event.target.value })
                        }
                      />

                      <SelectField
                        label="Area unit"
                        options={AREA_UNITS.options}
                        value={plan.areaUnit || 'sqft'}
                        disabled={disabled}
                        onChange={(event) =>
                          updateItem('floorPlans', plan.id, { areaUnit: event.target.value })
                        }
                      />

                      <NumberWithUnit
                        label="Area"
                        suffix={unitLabel}
                        min={0}
                        value={plan.area ?? ''}
                        error={errors[`${path}.area`]}
                        disabled={disabled}
                        onChange={(value) => updateItem('floorPlans', plan.id, { area: value })}
                      />

                      {residential ? (
                        <NumberField
                          label="Bedrooms"
                          min={0}
                          max={20}
                          value={plan.bedrooms ?? ''}
                          error={errors[`${path}.bedrooms`]}
                          disabled={disabled}
                          onChange={(event) =>
                            updateItem('floorPlans', plan.id, {
                              bedrooms:
                                event.target.value === ''
                                  ? null
                                  : Math.trunc(Number(event.target.value)),
                            })
                          }
                        />
                      ) : null}

                      <NumberWithUnit
                        label="Price"
                        prefix="₹"
                        min={0}
                        value={plan.price ?? ''}
                        error={errors[`${path}.price`]}
                        disabled={disabled}
                        readout={has(plan.price) ? formatPrice(plan.price) : null}
                        onChange={(value) => updateItem('floorPlans', plan.id, { price: value })}
                      />

                      <div className={styles.unitWide}>
                        <ImageField
                          label="Floor plan image"
                          hint="floorPlan"
                          required
                          value={plan.imageUrl ?? ''}
                          error={errors[`${path}.imageUrl`]}
                          disabled={disabled}
                          alt={`${plan.title || 'Floor plan'} drawing`}
                          onChange={(url) => updateItem('floorPlans', plan.id, { imageUrl: url })}
                        />
                      </div>

                      <div className={styles.unitWide}>
                        <UrlField
                          label="PDF"
                          value={plan.pdfUrl ?? ''}
                          error={errors[`${path}.pdfUrl`]}
                          disabled={disabled}
                          hint="Optional. Offered as a download beside the drawing."
                          onChange={(event) =>
                            updateItem('floorPlans', plan.id, { pdfUrl: event.target.value })
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
            {generated.length > 0 ? (
              <Button
                variant="ghost"
                disabled={disabled}
                onClick={generate}
                icon={<Icon icon="mdi:auto-fix" width="18" height="18" />}
              >
                Generate from unit configurations ({generated.length})
              </Button>
            ) : null}
            <Button
              variant="outline"
              disabled={disabled}
              onClick={() => addItem('floorPlans', makeFloorPlan())}
              icon={<Icon icon="mdi:plus" width="18" height="18" />}
            >
              Add floor plan
            </Button>
          </div>
        </FormColumn>

        {units.length > 0 && generated.length === 0 ? (
          <FormColumn>
            <Alert tone="info" title="Nothing left to generate">
              Every unit configuration with a plan image is already listed here. Give a
              configuration a floor-plan image on the Unit configurations tab and the button comes
              back.
            </Alert>
          </FormColumn>
        ) : null}
      </FormSection>

      <ConfirmDialog
        open={Boolean(removing)}
        title="Remove this floor plan?"
        message={`“${removing?.title || 'This floor plan'}” will be removed from the listing. This cannot be undone once the listing is saved.`}
        confirmLabel="Remove"
        danger
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          removeItem('floorPlans', removing.id);
          setRemoving(null);
        }}
      />
    </>
  );
}
