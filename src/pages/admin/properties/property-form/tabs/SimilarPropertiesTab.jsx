import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import FormSection, { FormColumn } from '../../../../../components/admin/FormSection';
import EntityPicker from '../../../../../components/admin/EntityPicker';
import propertyService from '../../../../../services/propertyService';
import { Alert, Button, LazyImage, Modal } from '../../../../../components/ui';
import { CONSTRUCTION_STATUS } from '../../../../../config/enums';
import { SIMILAR_MAX } from '../validators';
import { formatPrice } from '../../../../../utils/format';
import { isCanceled } from '../../../../../services/apiError';
import { useToast } from '../../../../../components/common/ToastProvider';
import { usePropertyFormContext } from '../PropertyFormContext';

import styles from './PropertyTabs.module.css';

/** The cover of a listing, whichever shape the record arrived in. */
const coverOf = (record) => {
  const images = Array.isArray(record?.images) ? record.images : [];
  const cover = images.find((image) => image?.isCover) ?? images[0];
  return cover?.url ?? '';
};

/** "Whitefield, Bengaluru" from the embeds `/admin/properties` sends (§5.5). */
const placeOf = (record) =>
  [record?.location?.locality?.name, record?.location?.city?.name].filter(Boolean).join(', ');

/** The figure a card prints: the sale price, the rent, or "Price on Request". */
const priceOf = (record) => {
  const pricing = record?.pricing ?? {};
  const rental = record?.listingType === 'rent' || record?.listingType === 'lease';
  return formatPrice(rental ? pricing.rentPerMonth : (pricing.price ?? pricing.priceRangeMin), {
    priceOnRequest: pricing.priceOnRequest === true,
    perMonth: rental,
  });
};

/** The public endpoint's own order for the fill: featured, then priority, then newest. */
const byRelevance = (a, b) =>
  Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)) ||
  (Number(b.priorityOrder) || 0) - (Number(a.priorityOrder) || 0) ||
  String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? ''));

/**
 * The fill rule of `GET /properties/:id/similar` — published listings of the
 * same listing type, in the same locality or of the same property type —
 * asked of the admin list.
 *
 * The public endpoint answers 404 for a listing that is not published, so
 * "Suggest similar" on a draft used to end in "Property not found".
 *
 * @param {object} values the form's values
 * @returns {Promise<Array<object>>}
 */
async function suggestByRule(values) {
  const base = { isActive: true, listingType: values.listingType, perPage: 24 };
  const localityId = values.location?.localityId;
  const propertyTypeId = values.propertyTypeId;
  const asks = [
    localityId ? propertyService.adminList({ ...base, localityId }) : null,
    propertyTypeId ? propertyService.adminList({ ...base, propertyTypeId }) : null,
  ].filter(Boolean);

  const answers = await Promise.all(asks);
  const seen = new Set();
  return answers
    .flatMap((envelope) => (Array.isArray(envelope?.data) ? envelope.data : []))
    .filter((record) => {
      const key = String(record.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(byRelevance);
}

/**
 * One listing, as both the search results and the chosen list print it.
 *
 * The same card in both places is the point: an editor picks by looking at a
 * thumbnail, a locality and a price, and then has to recognise what they picked.
 */
function PropertyOption({ record }) {
  const cover = coverOf(record);
  const place = placeOf(record);
  const status = CONSTRUCTION_STATUS.labelOf?.(record?.constructionStatus) || '';

  return (
    <span className={styles.similarCard}>
      <span className={styles.similarThumb}>
        {/* Through `LazyImage`, so a cover that no longer loads shows the house
            rather than the browser's broken-image mark. */}
        {cover ? (
          <LazyImage
            src={cover}
            alt=""
            ratio="1"
            sizes="56px"
            onErrorFallback={
              <Icon icon="mdi:home-outline" width="20" height="20" aria-hidden="true" />
            }
          />
        ) : (
          <Icon icon="mdi:home-outline" width="20" height="20" aria-hidden="true" />
        )}
      </span>
      <span className={styles.similarBody}>
        <span className={styles.similarTitle}>{record?.title ?? `#${record?.id}`}</span>
        <span className={styles.similarMeta}>
          {[place, priceOf(record), status].filter(Boolean).join(' · ')}
          {record?.isActive === false ? ' · not published' : ''}
        </span>
      </span>
    </span>
  );
}

/**
 * Tab 13 — Similar properties.
 *
 * The editor's own picks, in their own order, up to six (§6.1). The API tops
 * the list up by locality and type when it is short and drops the ones that are
 * no longer active, so this tab is about the listings somebody *chose* — the
 * comparable next door, the same builder's other tower — not about filling six
 * slots.
 *
 * "Suggest similar" asks the API what it would have shown
 * (`GET /properties/:id/similar`) and offers the answer; nothing is added until
 * it has been confirmed, because a suggestion is a guess and the order is an
 * editorial decision. A listing that is not published has no public answer, so
 * the same rule is asked of the admin list instead.
 */
export default function SimilarPropertiesTab() {
  const { state, values, errors, setField, disabled, isNew, propertyId } = usePropertyFormContext();
  const toast = useToast();
  const live = state?.initial?.isActive === true;

  const ids = useMemo(() => values.similarPropertyIds ?? [], [values.similarPropertyIds]);
  const [known, setKnown] = useState([]);
  const [suggesting, setSuggesting] = useState(false);
  const [offer, setOffer] = useState(null);
  const [offerByRule, setOfferByRule] = useState(false);
  const [picked, setPicked] = useState([]);

  /**
   * Remembers a record so a chosen id keeps its card after a reload.
   *
   * An answer that adds nothing leaves the array alone rather than replacing it
   * with an equal one: `known` is a dependency of the effect below, and a new
   * identity per answer would ask for the same ids for ever.
   */
  const remember = useCallback((records) => {
    setKnown((current) => {
      const seen = new Set(current.map((record) => String(record.id)));
      const fresh = records.filter((record) => !seen.has(String(record.id)));
      return fresh.length === 0 ? current : [...current, ...fresh];
    });
  }, []);

  // The cards of the ids the record arrived with: the form holds ids, and a
  // card needs a title, a thumbnail and a price (§5.7 `ids` keeps the order).
  const loadedFor = useRef('');
  useEffect(() => {
    const wanted = ids.filter((id) => !known.some((record) => String(record.id) === String(id)));
    if (wanted.length === 0) return undefined;

    const key = wanted.join(',');
    if (loadedFor.current === key) return undefined;
    loadedFor.current = key;

    const controller = new AbortController();
    propertyService
      .adminList({ ids: key, perPage: SIMILAR_MAX }, { signal: controller.signal })
      .then(({ data }) => remember(Array.isArray(data) ? data : []))
      .catch((thrown) => {
        // A card that cannot be drawn falls back to "#id" — the pick survives.
        if (!isCanceled(thrown)) toast.error('Some of the chosen listings could not be loaded.');
      });

    return () => {
      controller.abort();
      // The answer this run would have had is gone, so the key goes with it and
      // the next run asks again. `StrictMode` remounts every effect in
      // development, and a key that outlived its request would leave the cards
      // reading "#2" for the rest of the visit.
      if (loadedFor.current === key) loadedFor.current = '';
    };
  }, [ids, known, remember, toast]);

  /** The search: active listings, this one excluded (§5.7). */
  const search = useCallback(
    async ({ q, perPage }, options) => {
      const envelope = await propertyService.adminList({ q, isActive: true, perPage }, options);
      const data = (envelope?.data ?? []).filter(
        (record) => !propertyId || String(record.id) !== String(propertyId)
      );
      remember(data);
      return { ...envelope, data };
    },
    [propertyId, remember]
  );

  const full = ids.length >= SIMILAR_MAX;

  /**
   * `GET /properties/:id/similar` — what the public page would show today; the
   * same rule through the admin list while the listing is not published.
   */
  const suggest = async () => {
    if (!propertyId) return;
    setSuggesting(true);
    try {
      let byRule = !live;
      let found;
      if (live) {
        try {
          found = (await propertyService.similar(propertyId))?.data;
        } catch (thrown) {
          // Unpublished since the page was opened: the rule still answers.
          if (thrown?.status !== 404) throw thrown;
          byRule = true;
        }
      }
      if (byRule) found = await suggestByRule(values);

      const others = (Array.isArray(found) ? found : []).filter(
        (record) => String(record.id) !== String(propertyId)
      );
      const rows = others
        .filter((record) => !ids.some((id) => String(id) === String(record.id)))
        .slice(0, SIMILAR_MAX - ids.length);

      if (rows.length === 0) {
        toast.info(
          others.length === 0
            ? 'Nothing to suggest — no published listing shares this one’s locality or type yet.'
            : 'Nothing to suggest — everything this page would show is already chosen.'
        );
        return;
      }

      remember(rows);
      setPicked(rows.map((_record, index) => index));
      setOfferByRule(byRule);
      setOffer(rows);
    } catch (thrown) {
      toast.error(thrown?.message ?? 'The suggestions could not be loaded.');
    } finally {
      setSuggesting(false);
    }
  };

  const acceptOffer = () => {
    const chosen = (offer ?? []).filter((_record, index) => picked.includes(index));
    setField(
      'similarPropertyIds',
      [...ids, ...chosen.map((record) => record.id)].slice(0, SIMILAR_MAX)
    );
    setOffer(null);
  };

  return (
    <>
      <FormSection
        title="Similar properties"
        description={`Up to ${SIMILAR_MAX} listings, in the order you arrange them. Leave it empty and the page fills itself from the same locality and type.`}
      >
        <FormColumn>
          <EntityPicker
            label="Chosen listings"
            labelKey="title"
            placeholder="Search by title, project, locality or builder…"
            max={SIMILAR_MAX}
            orderable
            disabled={disabled}
            value={ids}
            error={errors.similarPropertyIds}
            hint={
              full
                ? `That is the maximum of ${SIMILAR_MAX}. Remove one to choose another.`
                : 'Only published listings can be searched — an unpublished one has no page to link to.'
            }
            fetcher={search}
            selectedRecords={known}
            renderOption={(record) => <PropertyOption record={record} />}
            renderSelected={(record) => <PropertyOption record={record} />}
            onChange={(next) => setField('similarPropertyIds', next.slice(0, SIMILAR_MAX))}
            action={
              isNew ? null : (
                <Button
                  variant="outline"
                  size="sm"
                  loading={suggesting}
                  disabled={disabled || full}
                  icon={<Icon icon="mdi:auto-fix" width="16" height="16" />}
                  onClick={suggest}
                >
                  Suggest similar
                </Button>
              )
            }
          />

          {full ? (
            <Alert tone="warning" icon={<Icon icon="mdi:alert-outline" width="20" height="20" />}>
              Six is the most a page shows. Remove one before choosing another.
            </Alert>
          ) : null}

          {isNew ? (
            <Alert
              tone="info"
              icon={<Icon icon="mdi:information-outline" width="20" height="20" />}
            >
              Suggestions are offered once this listing has been saved — they are built from its own
              locality and type.
            </Alert>
          ) : null}
        </FormColumn>
      </FormSection>

      <Modal
        open={Boolean(offer)}
        onClose={() => setOffer(null)}
        title="Suggested listings"
        description={
          offerByRule
            ? 'Published listings of the same kind, in the same locality or of the same type — what the page fills itself with once this listing is published. Nothing is added until you say so.'
            : 'What this page would show on its own, in that order. Nothing is added until you say so.'
        }
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOffer(null)}>
              Cancel
            </Button>
            <Button onClick={acceptOffer} disabled={picked.length === 0}>
              Add selected ({picked.length})
            </Button>
          </>
        }
      >
        <ul className={styles.suggestions}>
          {(offer ?? []).map((record, index) => (
            <li key={record.id} className={styles.suggestion}>
              <label className={styles.suggestionLabel}>
                <input
                  type="checkbox"
                  className={styles.suggestionCheckbox}
                  checked={picked.includes(index)}
                  onChange={(event) =>
                    setPicked((current) =>
                      event.target.checked
                        ? [...current, index]
                        : current.filter((entry) => entry !== index)
                    )
                  }
                />
                <PropertyOption record={record} />
              </label>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
