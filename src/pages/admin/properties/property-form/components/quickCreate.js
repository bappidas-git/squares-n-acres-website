/**
 * What the Basics tab's "Add a …" dialogs share (QA-52).
 */

/**
 * The record of `records` whose name is `name`, ignoring case and the space
 * around it — the duplicate a dialog refuses before the API would quietly
 * answer it with a suffixed slug.
 *
 * @param {Array<{name?: string}>} records
 * @param {string} name
 * @returns {object|undefined}
 */
export const findByName = (records, name) => {
  const wanted = String(name ?? '')
    .trim()
    .toLowerCase();
  return (Array.isArray(records) ? records : []).find(
    (record) =>
      String(record?.name ?? '')
        .trim()
        .toLowerCase() === wanted
  );
};

/**
 * The position after the last one: a record added from a form goes to the end
 * of its list, not ahead of the ones an editor arranged — the API's default
 * `order` of 0 would put a new segment before Residential.
 *
 * @param {Array<{order?: number}>} records
 * @returns {number}
 */
export const nextOrder = (records) =>
  (Array.isArray(records) ? records : []).reduce(
    (highest, record) => Math.max(highest, Number(record?.order) || 0),
    0
  ) + 1;
