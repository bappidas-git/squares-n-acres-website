import { Link } from 'react-router-dom';

import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import PATHS from '../../../routes/paths';
import StatusChip from '../../../components/admin/StatusChip';
import { LEAD_STATUS } from '../../../config/enums';
import { formatDateTime, formatNumber } from '../../../utils/format';

import styles from './DashboardPage.module.css';
import { DASHBOARD } from '../../../config/adminCopy';

/**
 * The follow-ups that are due (§6.16 `upcomingFollowUps`).
 *
 * The overdue ones first, then the next ones within a fortnight (prompt 51):
 * the card used to keep only what was still ahead, so a desk whose every
 * promise had already slipped read "Nothing is due". `overdueCount` counts all
 * of them, not only the ten listed, and "View all" opens the leads list on
 * exactly those — or on the week ahead when none is late.
 *
 * @param {object} props
 * @param {Array<object>} props.followUps
 * @param {number} [props.overdueCount]
 * @param {boolean} [props.scoped] true for the sales role
 */
export default function FollowUpsCard({ followUps = [], overdueCount = 0, scoped = false }) {
  const now = Date.now();
  const late = Number(overdueCount) || 0;
  const viewAll = `${PATHS.adminLeads}?followUp=${late > 0 ? 'overdue' : 'next7'}`;

  return (
    <Card as="section" className={styles.card} aria-labelledby="follow-ups-heading">
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle} id="follow-ups-heading">
          Follow-ups due
        </h2>
        {late > 0 ? (
          <StatusChip tone="error" icon="mdi:alarm-note" label={`${formatNumber(late)} overdue`} />
        ) : null}
        {scoped ? <span className={styles.rowMeta}>Your leads</span> : null}
        <Button variant="link" size="sm" to={viewAll}>
          {DASHBOARD.viewAll}
        </Button>
      </div>

      {followUps.length === 0 ? (
        <p className={styles.emptyLine}>{DASHBOARD.followUpsEmpty}</p>
      ) : (
        <ul className={styles.list}>
          {followUps.map((entry) => {
            const due = Date.parse(entry.followUpAt);
            // The server says which are late; a panel left open over lunch
            // outlives a couple more.
            const overdue = entry.isOverdue === true || (Number.isFinite(due) && due < now);

            return (
              <li key={entry.id} className={styles.listRow}>
                <div className={styles.listBody}>
                  <Link className={styles.rowLink} to={PATHS.adminLead(entry.id)}>
                    {entry.name}
                  </Link>
                  <span className={styles.rowMeta}>
                    {formatDateTime(entry.followUpAt)}
                    {entry.assignedUser ? ` · ${entry.assignedUser}` : ''}
                  </span>
                </div>
                {overdue ? (
                  <StatusChip tone="error" icon="mdi:alert-outline" label="Overdue" />
                ) : (
                  <StatusChip
                    tone={LEAD_STATUS.meta[entry.status]?.tone ?? 'neutral'}
                    label={LEAD_STATUS.labelOf(entry.status) || '—'}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
