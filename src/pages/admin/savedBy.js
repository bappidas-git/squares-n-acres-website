import { formatDateTime } from '../../utils/format';

/**
 * "Saved 26 Sep 2026, 10:14 am by Priya" — the tooltip on a list's date cell
 * (prompt 51): the admin reads name whoever saved a record last.
 *
 * @param {{updatedAt?: string, updatedByName?: string|null}} row
 * @returns {string|undefined} nothing to say without both
 */
export const savedBy = (row) =>
  row?.updatedAt && row?.updatedByName
    ? `Saved ${formatDateTime(row.updatedAt)} by ${row.updatedByName}`
    : undefined;

export default savedBy;
