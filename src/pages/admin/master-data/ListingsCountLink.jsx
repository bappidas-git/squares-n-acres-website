import { Link } from 'react-router-dom';

import PATHS from '../../../routes/paths';
import { formatNumber } from '../../../utils/format';

/**
 * A master-data record's "Properties" count as the way to them (prompt 51):
 * the property list, filtered the way the count is counted — the live
 * listings that name the record. A count of none is a number, not a link.
 *
 * The row around it opens the record; the click stops here, so following the
 * count is not also opening the row.
 *
 * @param {object} props
 * @param {number} props.count
 * @param {string} props.param the property list's filter — `localityId`,
 *   `segment`, `amenityIds`…
 * @param {string|number} props.value the record's id, or a segment's slug
 * @param {string} props.describe how the listings relate to the record, for a
 *   screen reader: "in Hebbal", "by Prestige", "with Swimming pool"
 * @param {string} [props.className] the screen's own `.countLink` — each list
 *   keeps its styles in its own sheet
 */
export default function ListingsCountLink({ count, param, value, describe, className }) {
  const total = Number(count) || 0;
  if (total === 0 || value === null || value === undefined || value === '') {
    return formatNumber(total);
  }
  const search = new URLSearchParams({ [param]: String(value), isActive: 'true' });
  return (
    <Link
      className={className}
      to={`${PATHS.adminProperties}?${search}`}
      aria-label={`${formatNumber(total)} live ${total === 1 ? 'listing' : 'listings'} ${describe}`}
      onClick={(event) => event.stopPropagation()}
    >
      {formatNumber(total)}
    </Link>
  );
}
