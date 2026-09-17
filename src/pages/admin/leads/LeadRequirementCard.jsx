import Card from '../../../components/ui/Card';
import { LISTING_TYPES, REQUIREMENT_TIMELINES } from '../../../config/enums';
import { formatBhk, formatPriceRange } from '../../../utils/format';
import { useLocalities, usePropertyTypes } from '../../../hooks/useMasterData';

import styles from './LeadDetailPage.module.css';

/**
 * What the visitor said they were looking for (§6.7 `requirement`).
 *
 * Only the fields the form actually captured are rendered: a requirement card
 * full of em dashes says "we asked and they did not answer", which is not what
 * happened — most forms ask for two of these six.
 *
 * The ids are resolved against the master data the panel already holds (D93),
 * so a locality that was renamed reads by its current name.
 *
 * @param {object} props
 * @param {object} props.requirement
 * @returns {React.ReactNode|null} `null` when nothing was captured
 */
export default function LeadRequirementCard({ requirement }) {
  const propertyTypes = usePropertyTypes({ activeOnly: false });
  const localities = useLocalities({ activeOnly: false });

  const wanted = requirement ?? {};
  const nameOf = (records, id) =>
    records.find((record) => String(record.id) === String(id))?.name ?? null;

  const budget =
    wanted.budgetMin || wanted.budgetMax
      ? formatPriceRange(wanted.budgetMin, wanted.budgetMax, {
          listingType: wanted.listingType,
        })
      : null;

  const rows = [
    ['Looking to', LISTING_TYPES.labelOf(wanted.listingType) || null],
    ['Property type', nameOf(propertyTypes, wanted.propertyTypeId)],
    ['Locality', nameOf(localities, wanted.localityId)],
    ['Configuration', wanted.bedrooms ? formatBhk(wanted.bedrooms) : null],
    ['Budget', budget],
    ['Timeline', REQUIREMENT_TIMELINES.labelOf(wanted.timeline) || null],
  ].filter(([, value]) => Boolean(value));

  if (rows.length === 0) return null;

  return (
    <Card as="section" className={styles.card} aria-labelledby="lead-requirement-heading">
      <h2 className={styles.cardTitle} id="lead-requirement-heading">
        Requirement
      </h2>
      <dl className={styles.facts}>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
