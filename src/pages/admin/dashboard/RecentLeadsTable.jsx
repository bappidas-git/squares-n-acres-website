import { Link } from 'react-router-dom';

import Card from '../../../components/ui/Card';
import PATHS from '../../../routes/paths';
import StatusChip from '../../../components/admin/StatusChip';
import { Button } from '../../../components/ui';
import { LEAD_SOURCES, LEAD_STATUS } from '../../../config/enums';
import { formatRelative } from '../../../utils/format';

import styles from './DashboardPage.module.css';
import { DASHBOARD } from '../../../config/adminCopy';

/**
 * The ten newest leads (§6.16 `recentLeads`).
 *
 * The dashboard's job here is to be the shortest path to the work: a name, a
 * status and a link into the record. Anything more belongs on `/admin/leads`,
 * which is one button away.
 *
 * @param {object} props
 * @param {Array<object>} props.leads
 */
export default function RecentLeadsTable({ leads = [] }) {
  return (
    <Card as="section" className={styles.card} aria-labelledby="recent-leads-heading">
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle} id="recent-leads-heading">
          Latest leads
        </h2>
        <Button variant="link" size="sm" to={PATHS.adminLeads}>
          All leads
        </Button>
      </div>

      {leads.length === 0 ? (
        <p className={styles.emptyLine}>{DASHBOARD.leadsEmpty}</p>
      ) : (
        <div className={styles.tableScroller}>
          <table className={styles.table}>
            <caption className={styles.srOnly}>The ten most recent leads</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Source</th>
                <th scope="col">Status</th>
                <th scope="col">Received</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <th scope="row">
                    <Link className={styles.rowLink} to={PATHS.adminLead(lead.id)}>
                      {lead.name}
                    </Link>
                    {lead.property ? (
                      <span className={styles.rowMeta}>{lead.property.title}</span>
                    ) : null}
                  </th>
                  <td>{LEAD_SOURCES.labelOfAny(lead.source) || '—'}</td>
                  <td>
                    <StatusChip
                      tone={LEAD_STATUS.meta[lead.status]?.tone ?? 'neutral'}
                      label={LEAD_STATUS.labelOf(lead.status) || '—'}
                    />
                  </td>
                  <td className={styles.rowMuted}>{formatRelative(lead.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
