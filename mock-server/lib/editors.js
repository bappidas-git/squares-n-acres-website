/**
 * Who last saved a record, by name — for the admin reads that print "Last
 * saved 5 minutes ago by Priya" (prompt 51). The record keeps the id
 * (`updated_by`); the name is joined on read, as a note's author is, so a
 * renamed account reads by its current name. The public reads never carry it.
 */

const sameId = (left, right) => String(left) === String(right);

/**
 * @param {object} record a stored record with `updatedBy`
 * @param {Array<object>} [users] `adminUsers`
 * @returns {object} the record with `updatedByName` (`null` when unknown)
 */
function withEditorName(record, users = []) {
  if (!record || typeof record !== 'object') return record;
  const editor =
    record.updatedBy === null || record.updatedBy === undefined
      ? null
      : (users ?? []).find((user) => sameId(user?.id, record.updatedBy));
  return { ...record, updatedByName: editor?.name ?? null };
}

module.exports = { withEditorName };
