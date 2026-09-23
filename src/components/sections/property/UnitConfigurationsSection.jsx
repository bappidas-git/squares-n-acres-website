import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';

import { AREA_UNITS } from '../../../config/enums';
import { Button, Chip, LazyImage, Price } from '../../ui';
import { formatArea, formatBhk, formatNumber } from '../../../utils/format';
import FloorPlanSketch from './FloorPlanSketch';
import LeadCaptureModal from '../../common/LeadCaptureModal';
import SectionShell from './SectionShell';
import { leadFormProps } from '../../../utils/leadSources';
import useBreakpoint from '../../../hooks/useBreakpoint';
import useGatedContent from '../../../hooks/useGatedContent';
import useGatedFiles from '../../../hooks/useGatedFiles';
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
 * The drawings sit behind the floor plans' gate (QA-51 OPEN-1): a public read
 * carries no address for them, so a visitor who has not shared their details
 * sees a locked stand-in, and one who has sees the drawing, fetched with the
 * token of their lead (`useGatedFiles`, shared with the floor plans section).
 * Asking from a thumbnail opens that unit's plan once it arrives.
 *
 * @param {object} props
 * @param {object} props.property a record of §6.1
 * @param {'bg'|'surface'} [props.background]
 */
export default function UnitConfigurationsSection({ property, background = 'bg' }) {
  const { isMobile } = useBreakpoint();
  const [lightbox, setLightbox] = useState(null);
  const { openLeadModal, leadTriggerProps } = useLeadCapture();
  const propertyId = property?.id ?? null;
  const { unlocked, unlock } = useGatedContent(propertyId, 'floorPlans');
  // The unit whose drawing the dialog is asking for, and the one to open full
  // size as soon as its drawing is here.
  const [asking, setAsking] = useState(null);
  const [wanted, setWanted] = useState(null);

  const units = useMemo(() => activeUnits(property?.unitConfigurations), [property]);

  const needsFiles = units.some(
    (unit) => !has(unit.floorPlanImageUrl) && unit.hasFloorPlanImage === true
  );
  const { files, status, fetchFiles } = useGatedFiles(propertyId, {
    enabled: unlocked && needsFiles,
  });

  // The drawings this visitor may look at now, in the table's order.
  const plans = useMemo(() => {
    if (!unlocked) return [];
    return units
      .map((unit) => ({
        unit,
        src: has(unit.floorPlanImageUrl)
          ? unit.floorPlanImageUrl
          : (files?.unitConfigurations?.[String(unit.id)]?.floorPlanImageUrl ?? null),
      }))
      .filter((plan) => Boolean(plan.src));
  }, [unlocked, units, files]);

  useEffect(() => {
    if (wanted === null || asking) return;
    const at = plans.findIndex((plan) => String(plan.unit.id) === String(wanted));
    if (at < 0) return;
    setWanted(null);
    setLightbox(at);
  }, [wanted, asking, plans]);

  if (units.length === 0) return null;

  const listingType = property?.listingType;
  const slides = plans.map((plan) => ({
    src: plan.src,
    alt: `${plan.unit.name} floor plan`,
    description: plan.unit.name,
  }));

  const openPlan = (unit) => {
    const at = plans.findIndex((plan) => plan.unit === unit);
    if (at >= 0) setLightbox(at);
  };

  const arriving = unlocked && (status === 'idle' || status === 'loading');

  /**
   * A locked drawing asked for: the dialog, unless the gate is already open —
   * then a failed request is made again, and one on its way is waited for.
   */
  const requestPlan = (unit) => {
    setWanted(unit.id);
    if (unlocked && status === 'failed') {
      fetchFiles();
      return;
    }
    if (arriving) return;
    setAsking(unit);
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

  const thumbnail = (unit) => {
    if (!has(unit.floorPlanImageUrl) && unit.hasFloorPlanImage !== true) return null;

    const plan = plans.find((entry) => entry.unit === unit);
    if (plan) {
      return (
        <button
          type="button"
          className={styles.thumbButton}
          onClick={() => openPlan(unit)}
          aria-label={`View the ${unit.name} floor plan full screen`}
        >
          <LazyImage
            src={plan.src}
            alt={`${unit.name} floor plan`}
            ratio="4/3"
            fit="contain"
            sizes="120px"
            className={styles.thumb}
          />
        </button>
      );
    }

    // Handed over without this drawing — taken down since the page loaded.
    if (unlocked && status === 'ready') return null;

    const label = arriving
      ? `Loading the ${unit.name} floor plan`
      : unlocked && status === 'failed'
        ? `Load the ${unit.name} floor plan again`
        : `Unlock the ${unit.name} floor plan`;

    return (
      <button
        type="button"
        className={[styles.thumbButton, styles.thumbLocked].join(' ')}
        onClick={() => requestPlan(unit)}
        disabled={arriving}
        aria-label={label}
      >
        <FloorPlanSketch className={styles.thumbSketch} />
        <span className={styles.thumbLock} aria-hidden="true">
          <span className={styles.thumbLockIcon}>
            <Icon
              icon={arriving ? 'mdi:loading' : 'mdi:lock-outline'}
              width="16"
              height="16"
              className={arriving ? styles.thumbSpinner : undefined}
            />
          </span>
        </span>
      </button>
    );
  };

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

      {lightbox !== null && slides.length > 0 ? (
        <Suspense fallback={null}>
          <PropertyLightbox
            open
            index={Math.min(lightbox, slides.length - 1)}
            slides={slides}
            onClose={() => setLightbox(null)}
            onIndexChange={setLightbox}
          />
        </Suspense>
      ) : null}

      {asking ? (
        <LeadCaptureModal
          key={asking.id}
          {...leadFormProps('floor-plan-request')}
          open
          onClose={() => {
            setAsking(null);
            // Nothing was opened, so nothing opens later on its own.
            if (!unlocked) setWanted(null);
          }}
          propertyId={propertyId}
          propertyTitle={property?.title ?? ''}
          // Name and number only, so the unit travels as a hidden field.
          hiddenFields={{ message: `Floor plan for ${asking.name}` }}
          deliver={{
            kind: 'unlock',
            unlockKind: 'floorPlans',
            // A visitor the dialog does not ask again still needs a token
            // that opens the drawings.
            resolveAccess: () => fetchFiles(),
          }}
          agent={property?.agent?.showOnListing ? property.agent : null}
          onSuccess={() => unlock()}
        />
      ) : null}
    </SectionShell>
  );
}
