import { Link } from 'react-router-dom';

import Card from '../../../components/ui/Card';
import PATHS from '../../../routes/paths';
import StatusChip from '../../../components/admin/StatusChip';
import { LEAD_STATUS } from '../../../config/enums';
import { formatDateTime } from '../../../utils/format';

import styles from './DashboardPage.module.css';

/**
 * The follow-ups that are due (§6.16 `upcomingFollowUps`).
 *
 * The API sends the next ten inside a fortnight, newest promise first. The
 * overdue chip is still drawn here because a panel left open over lunch will
 * outlive a couple of them, and a promise that has quietly passed is exactly
 * the one worth marking.
 *
 * @param {object} props
 * @param {Array<object>} props.followUps
 * @param {boolean} [props.scoped] true for the sales role
 */
export default function FollowUpsCard({ followUps = [], scoped = false }) {
  const now = Date.now();

  return (
    <Card as="section" className={styles.card} aria-labelledby="follow-ups-heading">
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle} id="follow-ups-heading">
          Upcoming follow-ups
        </h2>
        {scoped ? <span className={styles.rowMeta}>Your leads</span> : null}
      </div>

      {followUps.length === 0 ? (
        <p className={styles.emptyLine}>Nothing is due in the next two weeks.</p>
      ) : (
        <ul className={styles.list}>
          {followUps.map((entry) => {
            const due = Date.parse(entry.followUpAt);
            const overdue = Number.isFinite(due) && due < now;

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
