import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';

import { AREA_UNITS } from '../../../config/enums';
import { Button, LazyImage, Price, Tabs } from '../../ui';
import { formatArea, formatBhk } from '../../../utils/format';
import FloorPlanSketch from './FloorPlanSketch';
import GatedOverlay from './GatedOverlay';
import LeadCaptureModal from '../../common/LeadCaptureModal';
import SectionShell from './SectionShell';
import { leadFormProps } from '../../../utils/leadSources';
import { track } from '../../../utils/analytics';
import useGatedContent from '../../../hooks/useGatedContent';
import useGatedFiles from '../../../hooks/useGatedFiles';

import styles from './FloorPlansSection.module.css';

const PropertyLightbox = lazy(() => import('./PropertyLightbox'));

/** A value the record actually carries — `0` counts, `''` and `null` do not. */
const has = (value) => value !== null && value !== undefined && value !== '';

const areaLabel = (unit) => AREA_UNITS.labelOf(unit) || 'sq ft';

/**
 * The drawings, in `order`, with anything that has no image dropped.
 *
 * A public read carries no address for a drawing and says `hasImage` instead
 * (docs/backend-notes → "Gated files"), so that plan stays: its drawing is
 * fetched once the visitor has shared their details.
 *
 * Exported for the unit test.
 *
 * @param {Array<object>} plans
 * @returns {Array<object>}
 */
export function orderedPlans(plans) {
  return (Array.isArray(plans) ? plans : [])
    .filter((plan) => plan && (has(plan.imageUrl) || plan.hasImage === true))
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
 * The API keeps the drawings and their PDFs behind the same gate (QA-51
 * OPEN-1): a public read carries no address for either, so the lock blurs a
 * stand-in sketch, and the real drawing and PDF are fetched with the token of
 * the visitor's lead (`useGatedFiles`) — shared with the unit configurations
 * and the documents, one request per token.
 *
 * @param {object} props
 * @param {object} props.property a record of §6.1
 * @param {'bg'|'surface'} [props.background]
 */
export default function FloorPlansSection({ property, background = 'bg' }) {
  const propertyId = property?.id ?? null;
  const { unlocked, unlock } = useGatedContent(propertyId, 'floorPlans');
  const [asking, setAsking] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  // Set when a lead has just opened the gate: the drawing is shown full size
  // once the dialog is out of the way and the drawings have arrived — never
  // stacked underneath it, never empty.
  const [justUnlocked, setJustUnlocked] = useState(false);
  const [showWhenReady, setShowWhenReady] = useState(false);

  const plans = useMemo(() => orderedPlans(property?.floorPlans), [property]);
  const [active, setActive] = useState(() => String(plans[0]?.id ?? '0'));

  const needsFiles = plans.some(
    (plan) =>
      (!has(plan.imageUrl) && plan.hasImage === true) || (!has(plan.pdfUrl) && plan.hasPdf === true)
  );
  const { files, status, fetchFiles } = useGatedFiles(propertyId, {
    enabled: unlocked && needsFiles,
  });

  const handed = (plan) => files?.floorPlans?.[String(plan.id)] ?? null;
  const imageOf = (plan) => (has(plan.imageUrl) ? plan.imageUrl : (handed(plan)?.imageUrl ?? null));
  const pdfOf = (plan) => (has(plan.pdfUrl) ? plan.pdfUrl : (handed(plan)?.pdfUrl ?? null));
  const allDrawn = plans.every((plan) => Boolean(imageOf(plan)));

  useEffect(() => {
    if (!showWhenReady || asking || !unlocked || !allDrawn) return;
    setShowWhenReady(false);
    setLightboxOpen(true);
  }, [showWhenReady, asking, unlocked, allDrawn]);

  if (plans.length === 0) return null;

  const current = plans.find((plan) => String(plan.id) === active) ?? plans[0];
  const index = Math.max(
    plans.findIndex((plan) => plan === current),
    0
  );
  const image = imageOf(current);
  const pdf = pdfOf(current);

  // The gate is open and the drawing is here.
  const open = unlocked && Boolean(image);
  // Open, and the drawings are on their way.
  const arriving = unlocked && !image && (status === 'idle' || status === 'loading');
  // Open, but the request failed; the visit's token may still work.
  const failed = unlocked && !image && status === 'failed';

  const slides = plans.map((plan) => ({
    src: imageOf(plan),
    alt: `${plan.title} floor plan`,
    description: plan.title,
  }));

  const meta = [
    has(current.bedrooms) ? formatBhk(current.bedrooms) : null,
    has(current.area) ? formatArea(current.area, areaLabel(current.areaUnit)) : null,
  ].filter(Boolean);

  const drawing = image ? (
    <LazyImage
      src={image}
      alt={`${current.title} floor plan`}
      ratio="4/3"
      fit="contain"
      sizes="(min-width: 900px) 640px, 100vw"
      className={styles.drawing}
    />
  ) : (
    <FloorPlanSketch className={styles.sketch} />
  );

  let figure;
  if (open) {
    figure = (
      <button
        type="button"
        className={styles.openButton}
        onClick={() => setLightboxOpen(true)}
        aria-label={`Open the ${current.title} floor plan full size`}
      >
        {drawing}
      </button>
    );
  } else if (arriving) {
    figure = (
      <div className={styles.arriving} role="status">
        {drawing}
        <span className={styles.arrivingText}>
          <Icon icon="mdi:loading" className={styles.spinner} aria-hidden="true" />
          Loading the drawings…
        </span>
      </div>
    );
  } else if (unlocked && status === 'ready') {
    // Handed over, but without this drawing — it was taken down since the page
    // loaded. The sketch holds its place; there is nothing to ask for.
    figure = <div className={styles.frame}>{drawing}</div>;
  } else if (failed) {
    figure = (
      <GatedOverlay
        title="The drawings did not load"
        text="Check your connection and try again."
        actionLabel="Try again"
        onAction={() => fetchFiles()}
      >
        {drawing}
      </GatedOverlay>
    );
  } else {
    figure = (
      <GatedOverlay
        title="Share your details to view floor plans"
        text="An advisor sends the drawings and the current price list for this project."
        actionLabel="View floor plans"
        onAction={() => setAsking(true)}
      >
        {drawing}
      </GatedOverlay>
    );
  }

  const panel = (
    <div className={styles.panel}>
      {figure}

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

        {open ? (
          <div className={styles.actions}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLightboxOpen(true)}
              disabled={!allDrawn}
              icon={<Icon icon="mdi:arrow-expand-all" aria-hidden="true" />}
            >
              Open full size
            </Button>

            {pdf ? (
              <Button
                variant="secondary"
                size="sm"
                href={pdf}
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

      {lightboxOpen && allDrawn ? (
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

      {/* Mounted per request, like the documents' dialog: the dialog decides
          when it opens whether this visitor is asked at all (P28), which a
          dialog mounted closed would decide once, too early, for good. */}
      {asking ? (
        <LeadCaptureModal
          {...leadFormProps('floor-plan-request')}
          open
          onClose={() => {
            setAsking(false);
            if (justUnlocked) {
              setJustUnlocked(false);
              setShowWhenReady(true);
            }
          }}
          propertyId={propertyId}
          propertyTitle={property?.title ?? ''}
          // Name and number only, so the project travels as a hidden field.
          hiddenFields={{
            message: `Floor plans for ${property?.projectName || property?.title || 'this project'}`,
          }}
          deliver={{
            kind: 'unlock',
            unlockKind: 'floorPlans',
            // A visitor the dialog does not ask again still needs a token
            // that opens the drawings.
            resolveAccess: () => fetchFiles(),
          }}
          agent={property?.agent?.showOnListing ? property.agent : null}
          onSuccess={() => {
            unlock();
            setJustUnlocked(true);
          }}
        />
      ) : null}
    </SectionShell>
  );
}
