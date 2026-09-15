/**
 * Integer auto-increment ids (00_MASTER_CONTEXT.md §5.5, decision D14).
 *
 * The mock assigns `max(id) + 1` per collection, which is what MySQL's
 * `AUTO_INCREMENT` does for a table that has never had a row deleted — close
 * enough that the seed's ids and the API's ids cannot diverge in a way the
 * frontend could notice.
 */

/** The highest numeric id in `records`, or 0 when there is none. */
function maxId(records) {
  if (!Array.isArray(records)) return 0;
  return records.reduce((highest, record) => {
    const id = Number(record?.id);
    return Number.isFinite(id) && id > highest ? id : highest;
  }, 0);
}

/**
 * The id the next record of `records` gets: 1 for an empty collection.
 *
 * @param {Array<object>} records the collection's current rows
 * @returns {number}
 */
function nextId(records) {
  return maxId(records) + 1;
}

module.exports = { maxId, nextId };
