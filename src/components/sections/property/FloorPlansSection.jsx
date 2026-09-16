import { Suspense, lazy, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';

import { AREA_UNITS } from '../../../config/enums';
import { Button, LazyImage, Price, Tabs } from '../../ui';
import { formatArea, formatBhk } from '../../../utils/format';
import GatedOverlay from './GatedOverlay';
import LeadModalTemp from './LeadModalTemp';
import SectionShell from './SectionShell';
import { track } from '../../../utils/analytics';
import useGatedContent from '../../../hooks/useGatedContent';

import styles from './FloorPlansSection.module.css';

const PropertyLightbox = lazy(() => import('./PropertyLightbox'));

/** A value the record actually carries — `0` counts, `''` and `null` do not. */
const has = (value) => value !== null && value !== undefined && value !== '';

const areaLabel = (unit) => AREA_UNITS.labelOf(unit) || 'sq ft';

/**
 * The drawings, in `order`, with anything that has no image dropped.
 *
 * Exported for the unit test.
 *
 * @param {Array<object>} plans
 * @returns {Array<object>}
 */
export function orderedPlans(plans) {
  return (Array.isArray(plans) ? plans : [])
    .filter((plan) => plan && has(plan.imageUrl))
    .map((plan, index) => ({ plan, index }))
    .sort((a, b) => {
      const order = (entry) => (has(entry.plan.order) ? Number(entry.plan.order) : null);
      if (order(a) !== null && order(b) !== null && order(a) !== order(b)) {
        return order(a) - order(b);
      }
      return a.index - b.index;
    })
    .map((entry) => entry.plan);
}

/**
 * The floor plans, behind the one gate on this page that is worth a visitor's
 * phone number.
 *
 * A locked plan is blurred rather than hidden, so the visitor can see there is
 * something to unlock and the box never changes size when it opens. Sharing
 * details once opens every plan on the listing for the rest of the visit
 * (`sna_lead`, per kind — prompt 24 §7) and turns the drawing into what the
 * boilerplate promised but never delivered: a full-size view and the PDF
 * itself (BUG-08).
 *
 * @param {object} props
 * @param {object} props.property a record of §6.1
 * @param {'bg'|'surface'} [props.background]
 */
export default function FloorPlansSection({ property, background = 'bg' }) {
  const propertyId = property?.id ?? null;
  const { unlocked, unlock } = useGatedContent(propertyId, 'floorPlans');
  const [askingForAccess, setAskingForAccess] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  // Set when the gate has just opened: the drawing is shown full size as soon
  // as the dialog is out of the way, never stacked underneath it.
  const [showOnDismiss, setShowOnDismiss] = useState(false);

  const plans = useMemo(() => orderedPlans(property?.floorPlans), [property]);
  const [active, setActive] = useState(() => String(plans[0]?.id ?? '0'));

  if (plans.length === 0) return null;

  const current = plans.find((plan) => String(plan.id) === active) ?? plans[0];
  const index = Math.max(
    plans.findIndex((plan) => plan === current),
    0
  );

  const slides = plans.map((plan) => ({
    src: plan.imageUrl,
    alt: `${plan.title} floor plan`,
    description: plan.title,
  }));

  const meta = [
    has(current.bedrooms) ? formatBhk(current.bedrooms) : null,
    has(current.area) ? formatArea(current.area, areaLabel(current.areaUnit)) : null,
  ].filter(Boolean);

  const drawing = (
    <LazyImage
      src={current.imageUrl}
      alt={`${current.title} floor plan`}
      ratio="4/3"
      fit="contain"
      sizes="(min-width: 900px) 640px, 100vw"
      className={styles.drawing}
    />
  );

  const panel = (
    <div className={styles.panel}>
      {unlocked ? (
        <button
          type="button"
          className={styles.openButton}
          onClick={() => setLightboxOpen(true)}
          aria-label={`Open the ${current.title} floor plan full size`}
        >
          {drawing}
        </button>
      ) : (
        <GatedOverlay
          title="Share your details to view floor plans"
          text="An advisor sends the drawings and the current price list for this project."
          actionLabel="View floor plans"
          onAction={() => setAskingForAccess(true)}
        >
          {drawing}
        </GatedOverlay>
      )}

      <div className={styles.details}>
        <h3 className={styles.planTitle}>{current.title}</h3>

        {meta.length > 0 ? <p className={styles.meta}>{meta.join(' · ')}</p> : null}

        {has(current.price) ? (
          <Price
            value={current.price}
            listingType={property?.listingType}
            size="md"
            accent
            className={styles.price}
          />
        ) : null}

        {unlocked ? (
          <div className={styles.actions}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLightboxOpen(true)}
              icon={<Icon icon="mdi:arrow-expand-all" aria-hidden="true" />}
            >
              Open full size
            </Button>

            {has(current.pdfUrl) ? (
              <Button
                variant="secondary"
                size="sm"
                href={current.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('floor_plan_download', { propertyId, plan: current.title })}
                icon={<Icon icon="mdi:file-pdf-box" aria-hidden="true" />}
              >
                Download PDF
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <SectionShell
      id="floorPlans"
      title="Floor plans"
      subtitle={`${plans.length} ${plans.length === 1 ? 'layout' : 'layouts'} in this project.`}
      background={background}
    >
      {plans.length > 1 ? (
        <Tabs
          items={plans.map((plan) => ({ value: String(plan.id), label: plan.title }))}
          value={active}
          onChange={setActive}
          variant="pills"
          label="Floor plans"
        >
          {panel}
        </Tabs>
      ) : (
        panel
      )}

      {lightboxOpen ? (
        <Suspense fallback={null}>
          <PropertyLightbox
            open
            index={index}
            slides={slides}
            onClose={() => setLightboxOpen(false)}
            onIndexChange={(next) => setActive(String(plans[next]?.id ?? active))}
          />
        </Suspense>
      ) : null}

      <LeadModalTemp
        open={askingForAccess}
        onClose={() => {
          setAskingForAccess(false);
          if (showOnDismiss) {
            setShowOnDismiss(false);
            setLightboxOpen(true);
          }
        }}
        source="floor-plan-request"
        propertyId={propertyId}
        propertyTitle={property?.title ?? ''}
        message={`Floor plans for ${property?.projectName || property?.title || 'this project'}`}
        onCaptured={() => {
          unlock();
          setShowOnDismiss(true);
        }}
        agent={property?.agent?.showOnListing ? property.agent : null}
      />
    </SectionShell>
  );
}
