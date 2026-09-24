import { Icon } from '@iconify/react';

import Card from '../../../components/ui/Card';
import { LEAD_ACTIVITY_TYPES } from '../../../config/enums';
import { formatDateTime, formatRelative } from '../../../utils/format';

import styles from './LeadDetailPage.module.css';

/**
 * What has happened to this lead, newest first (§6.7 `activities[]`).
 *
 * The entries are the server's: every status change, assignment, note and
 * follow-up appends one as it is made, so the timeline is a record rather than
 * a reconstruction — the boilerplate's version invented three events from the
 * `createdAt` and `updatedAt` columns and called it a history (ADD-21).
 *
 * Each entry is credited to `createdByName`, which the API reads from the
 * directory; `nameOf` covers a response without it. A sales user cannot read
 * the directory, so the manager's "Assigned to Sales User" used to show no
 * author at all (QA-53).
 *
 * @param {object} props
 * @param {Array<object>} props.activities
 * @param {(userId: number|string|null) => string|null} [props.nameOf] resolves
 *   `createdBy` to a colleague's name
 */
export default function LeadTimeline({ activities = [], nameOf }) {
  const ordered = [...activities].sort(
    (left, right) => Date.parse(right.createdAt ?? 0) - Date.parse(left.createdAt ?? 0)
  );

  return (
    <Card as="section" className={styles.card} aria-labelledby="lead-timeline-heading">
      <h2 className={styles.cardTitle} id="lead-timeline-heading">
        Activity
      </h2>

      {ordered.length === 0 ? (
        <p className={styles.emptyLine}>Nothing has happened to this lead yet.</p>
      ) : (
        <ol className={styles.timeline}>
          {ordered.map((activity) => {
            const author = activity.createdByName || nameOf?.(activity.createdBy) || null;
            return (
              <li key={activity.id} className={styles.event}>
                <span className={styles.eventIcon} aria-hidden="true">
                  <Icon icon={iconOf(activity.type)} width="16" height="16" />
                </span>
                <div className={styles.eventBody}>
                  <p className={styles.eventText}>
                    {activity.description ||
                      LEAD_ACTIVITY_TYPES.labelOf(activity.type) ||
                      'Updated'}
                  </p>
                  <p className={styles.eventMeta}>
                    {author ? <span>{author}</span> : null}
                    <time dateTime={activity.createdAt} title={formatDateTime(activity.createdAt)}>
                      {formatRelative(activity.createdAt)}
                    </time>
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

/**
 * The icon of one activity type (§6.17 `LEAD_ACTIVITY_TYPES`).
 *
 * The mapping lives here rather than on the enum because it is a fact about
 * this timeline's design, not about the data: the same nine values are
 * rendered as plain labels wherever else they appear.
 */
const ICONS = {
  created: 'mdi:plus-circle-outline',
  'status-changed': 'mdi:flag-outline',
  assigned: 'mdi:account-arrow-right-outline',
  'note-added': 'mdi:note-text-outline',
  'follow-up-set': 'mdi:calendar-clock',
  contacted: 'mdi:phone-check-outline',
  'email-sent': 'mdi:email-outline',
  'call-logged': 'mdi:phone-log-outline',
  'priority-changed': 'mdi:alert-octagon-outline',
};

const iconOf = (type) => ICONS[type] ?? 'mdi:circle-small';
