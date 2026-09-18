import { Suspense, lazy, useMemo, useState } from 'react';

import { AREA_UNITS } from '../../../config/enums';
import { Button, Chip, LazyImage, Price } from '../../ui';
import { formatArea, formatBhk, formatNumber } from '../../../utils/format';
import SectionShell from './SectionShell';
import useBreakpoint from '../../../hooks/useBreakpoint';
import { useLeadCapture } from '../../../contexts/LeadCaptureContext';

import styles from './UnitConfigurationsSection.module.css';

const PropertyLightbox = lazy(() => import('./PropertyLightbox'));

/** A value the record actually carries — `0` counts, `''` and `null` do not. */
const has = (value) => value !== null && value !== undefined && value !== '';

const areaLabel = (unit) => AREA_UNITS.labelOf(unit) || 'sq ft';

/**
 * The active units, in the order a buyer reads them: the editor's `order`
 * first, then by size, so "2 BHK" precedes "3 BHK" whatever order they were
 * typed in.
 *
 * Exported for the unit test.
 *
 * @param {Array<object>} units
 * @returns {Array<object>}
 */
export function activeUnits(units) {
  return (Array.isArray(units) ? units : [])
    .filter((unit) => unit && unit.isActive !== false)
    .map((unit, index) => ({ unit, index }))
    .sort((a, b) => {
      const order = (entry) => (has(entry.unit.order) ? Number(entry.unit.order) : null);
      if (order(a) !== null && order(b) !== null && order(a) !== order(b))
        return order(a) - order(b);
      const beds = (entry) => (has(entry.unit.bedrooms) ? Number(entry.unit.bedrooms) : null);
      if (beds(a) !== null && beds(b) !== null && beds(a) !== beds(b)) return beds(a) - beds(b);
      return a.index - b.index;
    })
    .map((entry) => entry.unit);
}

/** "3 BHK · 3 baths", or nothing at all for a unit that counts neither. */
function configurationLine(unit) {
  const parts = [];
  if (has(unit.bedrooms)) parts.push(formatBhk(unit.bedrooms));
  if (has(unit.bathrooms)) {
    const baths = Number(unit.bathrooms);
    parts.push(`${formatNumber(baths)} ${baths === 1 ? 'bath' : 'baths'}`);
  }
  return parts.join(' · ');
}

/**
 * What the project sells, unit by unit: the sizes, the prices and the drawing.
 *
 * A desktop gets a real table — captioned, with `scope="col"` headers — because
 * that is what the data is; a phone gets the same rows as cards, because a
 * six-column table on a 390 px screen is a horizontal scroll nobody makes.
 *
 * A unit priced on request shows "On request" and asks for the enquiry; a unit
 * with a drawing opens it full screen. Neither ever prints an em dash.
 *
 * @param {object} props
 * @param {object} props.property a record of §6.1
 * @param {'bg'|'surface'} [props.background]
 */
export default function UnitConfigurationsSection({ property, background = 'bg' }) {
  const { isMobile } = useBreakpoint();
  const [lightbox, setLightbox] = useState(null);
  const { openLeadModal, leadTriggerProps } = useLeadCapture();

  const units = useMemo(() => activeUnits(property?.unitConfigurations), [property]);

  if (units.length === 0) return null;

  const listingType = property?.listingType;
  const plans = units.filter((unit) => has(unit.floorPlanImageUrl));
  const slides = plans.map((unit) => ({
    src: unit.floorPlanImageUrl,
    alt: `${unit.name} floor plan`,
    description: unit.name,
  }));

  const openPlan = (unit) => {
    const at = plans.findIndex((plan) => plan === unit);
    if (at >= 0) setLightbox(at);
  };

  // "Get price" on one unit: the shared dialog, with the unit already named in
  // the message so the desk knows which configuration was asked about.
  const askForPrice = (unit) =>
    openLeadModal({
      entry: 'price-request',
      propertyId: property?.id ?? null,
      propertyTitle: property?.title ?? '',
      agent: property?.agent?.showOnListing ? property.agent : null,
      meta: { unit: unit.name },
      prefill: { message: `Price for ${unit.name}` },
    });

  const priceCell = (unit) => (
    <Price
      value={unit.price}
      listingType={listingType}
      onRequest={unit.priceOnRequest === true || !has(unit.price)}
      size="sm"
      className={styles.price}
    />
  );

  const areaLine = (unit, label, value) =>
    has(value) ? (
      <span className={styles.area}>
        <span className={styles.areaLabel}>{label}</span>
        {formatArea(value, areaLabel(unit.areaUnit))}
      </span>
    ) : null;

  const thumbnail = (unit) =>
    has(unit.floorPlanImageUrl) ? (
      <button
        type="button"
        className={styles.thumbButton}
        onClick={() => openPlan(unit)}
        aria-label={`View the ${unit.name} floor plan full screen`}
      >
        <LazyImage
          src={unit.floorPlanImageUrl}
          alt={`${unit.name} floor plan`}
          ratio="4/3"
          fit="contain"
          sizes="120px"
          className={styles.thumb}
        />
      </button>
    ) : null;

  const availability = (unit) =>
    has(unit.availableUnits) && Number(unit.availableUnits) > 0 ? (
      <Chip tone="success" variant="soft" size="sm">
        {formatNumber(unit.availableUnits)} available
      </Chip>
    ) : null;

  const cta = (unit) => (
    <Button
      variant={unit.priceOnRequest === true || !has(unit.price) ? 'primary' : 'outline'}
      size="sm"
      onClick={() => askForPrice(unit)}
      {...leadTriggerProps}
    >
      {unit.priceOnRequest === true || !has(unit.price) ? 'Get price' : 'Enquire'}
    </Button>
  );

  return (
    <SectionShell
      id="unitConfigurations"
      title="Unit configurations"
      subtitle={`${units.length} ${units.length === 1 ? 'configuration' : 'configurations'} in this project.`}
      background={background}
    >
      {isMobile ? (
        <ul className={styles.cards}>
          {units.map((unit) => (
            <li key={unit.id ?? unit.name} className={styles.card}>
              <div className={styles.cardHead}>
                <div>
                  <h3 className={styles.cardTitle}>{unit.name}</h3>
                  {configurationLine(unit) ? (
                    <p className={styles.cardMeta}>{configurationLine(unit)}</p>
                  ) : null}
                </div>
                {thumbnail(unit)}
              </div>

              <div className={styles.cardAreas}>
                {areaLine(unit, 'Carpet', unit.carpetArea)}
                {areaLine(unit, 'Super built-up', unit.superBuiltUpArea)}
              </div>

              <div className={styles.cardFoot}>
                <div className={styles.cardPrice}>
                  {priceCell(unit)}
                  {availability(unit)}
                </div>
                {cta(unit)}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className={styles.caption}>
              Unit configurations, areas and prices for {property?.title ?? 'this project'}.
            </caption>
            <thead>
              <tr>
                <th scope="col">Configuration</th>
                <th scope="col">Carpet area</th>
                <th scope="col">Super built-up</th>
                <th scope="col">Price</th>
                <th scope="col">Floor plan</th>
                <th scope="col">
                  <span className={styles.srOnly}>Enquire</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.id ?? unit.name}>
                  <th scope="row" className={styles.rowHead}>
                    <span className={styles.unitName}>{unit.name}</span>
                    {configurationLine(unit) ? (
                      <span className={styles.unitMeta}>{configurationLine(unit)}</span>
                    ) : null}
                    {availability(unit)}
                  </th>
                  <td>
                    {has(unit.carpetArea)
                      ? formatArea(unit.carpetArea, areaLabel(unit.areaUnit))
                      : ''}
                  </td>
                  <td>
                    {has(unit.superBuiltUpArea)
                      ? formatArea(unit.superBuiltUpArea, areaLabel(unit.areaUnit))
                      : ''}
                  </td>
                  <td>{priceCell(unit)}</td>
                  <td>{thumbnail(unit)}</td>
                  <td className={styles.actionCell}>{cta(unit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {lightbox !== null ? (
        <Suspense fallback={null}>
          <PropertyLightbox
            open
            index={lightbox}
            slides={slides}
            onClose={() => setLightbox(null)}
            onIndexChange={setLightbox}
          />
        </Suspense>
      ) : null}
    </SectionShell>
  );
}
