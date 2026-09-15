/**
 * The lead timeline (00_MASTER_CONTEXT.md §6.7, §10).
 *
 * Every change a lead goes through leaves an entry behind — that timeline is
 * the CRM's memory, and the admin lead detail renders nothing else. The
 * sentences are built here rather than in the route so that "Status changed
 * from New to Contacted" reads the same whether the change arrived from a
 * `PATCH`, a bulk action or a claim.
 *
 * Labels come from `src/config/enums.js`, so a renamed status renames itself
 * in the timeline of every lead written afterwards.
 */

const { LEAD_PRIORITY, LEAD_SOURCES, LEAD_STATUS } = require('./enums');
const { nextId } = require('./ids');

/**
 * The month names of `05 Sep 2026`.
 *
 * Written out rather than taken from `Intl`, whose `en-GB` short month for
 * September is "Sept" on some Node builds and "Sep" on others: a timeline entry
 * is stored text, and it must not depend on the ICU data of the machine that
 * wrote it.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * A date as the timeline prints it: `05 Sep 2026`, in UTC (D96).
 *
 * @param {string|null} value an ISO date or datetime
 * @returns {string} the formatted date, or `''` when it cannot be read
 */
function formatDate(value) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return '';

  const date = new Date(parsed);
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${day} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/**
 * Appends an entry to `lead.activities` and returns it.
 *
 * @param {object} lead the stored lead, mutated in place
 * @param {{type: string, description: string, createdBy?: number|null, at?: string}} entry
 * @returns {object} the appended activity
 */
function addActivity(lead, { type, description, createdBy = null, at }) {
  if (!Array.isArray(lead.activities)) lead.activities = [];

  const activity = {
    id: nextId(lead.activities),
    type,
    description,
    createdBy: createdBy ?? null,
    createdAt: at ?? new Date().toISOString(),
  };

  lead.activities.push(activity);
  return activity;
}

/** "Lead created via Property Enquiry". */
const describeCreated = (source) => `Lead created via ${LEAD_SOURCES.labelOf(source) ?? source}`;

/** "Status changed from New to Contacted". */
const describeStatusChange = (from, to) =>
  `Status changed from ${LEAD_STATUS.labelOf(from) ?? from} to ${LEAD_STATUS.labelOf(to) ?? to}`;

/** "Priority changed from Medium to High". */
const describePriorityChange = (from, to) =>
  `Priority changed from ${LEAD_PRIORITY.labelOf(from) ?? from} to ${
    LEAD_PRIORITY.labelOf(to) ?? to
  }`;

/** "Assigned to Sales User", or "Unassigned" when the lead was let go. */
const describeAssignment = (name) => (name ? `Assigned to ${name}` : 'Unassigned');

/** "Follow-up set for 05 Sep 2026", or "Follow-up cleared". */
const describeFollowUp = (value) =>
  value ? `Follow-up set for ${formatDate(value)}` : 'Follow-up cleared';

module.exports = {
  addActivity,
  formatDate,
  describeCreated,
  describeStatusChange,
  describePriorityChange,
  describeAssignment,
  describeFollowUp,
};
