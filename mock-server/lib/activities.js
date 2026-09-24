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
const { formatIstDate, formatIstDateTime } = require('./ist');
const { nextId } = require('./ids');

/**
 * A date as the timeline prints it: `05 Sep 2026`, in IST (D22, QA-53).
 *
 * @param {string|null} value an ISO date or datetime
 * @returns {string} the formatted date, or `''` when it cannot be read
 */
const formatDate = formatIstDate;

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

/**
 * "Status changed from New to Contacted".
 *
 * A move to Lost carries its reason — "… to Lost — Bought elsewhere" — because
 * the lead's `lostReason` is cleared when it is reopened, and the timeline is
 * then the one place that still says why it was closed (QA-53).
 */
const describeStatusChange = (from, to, reason) =>
  `Status changed from ${LEAD_STATUS.labelOf(from) || from} to ${LEAD_STATUS.labelOf(to) || to}${
    to === 'lost' && reason ? ` — ${reason}` : ''
  }`;

/** "Priority changed from Medium to High". */
const describePriorityChange = (from, to) =>
  `Priority changed from ${LEAD_PRIORITY.labelOf(from) || from} to ${
    LEAD_PRIORITY.labelOf(to) || to
  }`;

/** "Assigned to Sales User", or "Unassigned" when the lead was let go. */
const describeAssignment = (name) => (name ? `Assigned to ${name}` : 'Unassigned');

/**
 * "Follow-up set for 05 Sep 2026, 10:00 am", or "Follow-up cleared".
 *
 * In IST and with the time: the follow-up is a date **and** a time, entered in
 * IST, and printing the UTC date of a 01:30 call put it on the day before
 * (QA-53).
 */
const describeFollowUp = (value) =>
  value ? `Follow-up set for ${formatIstDateTime(value)}` : 'Follow-up cleared';

module.exports = {
  addActivity,
  formatDate,
  describeCreated,
  describeStatusChange,
  describePriorityChange,
  describeAssignment,
  describeFollowUp,
};
