import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import Button from '../../../components/ui/Button';
import LeadStatusMenu from './LeadStatusMenu';
import PATHS from '../../../routes/paths';
import StatusChip from '../../../components/admin/StatusChip';
import Tooltip from '../../../components/ui/Tooltip';
import { LEAD_PRIORITY, LEAD_SOURCES } from '../../../config/enums';
import {
  formatDate,
  formatDateTime,
  formatPhoneForTel,
  formatRelative,
  whatsappLink,
} from '../../../utils/format';

import styles from './LeadsListPage.module.css';

/**
 * What the CRM table shows (§6.7).
 *
 * Two of the cells are controls rather than labels — the status opens its menu
 * and an unassigned lead offers a sales user the "Claim" button — so the
 * columns are built from the screen's handlers rather than declared once. A
 * role without those handlers gets the same columns as plain text, which is
 * what read-only means here (§7).
 */

/** Statuses a follow-up date can no longer be late for. */
const CLOSED_STATUSES = new Set(['converted', 'lost']);

/**
 * Whether a lead's follow-up has come and gone.
 *
 * A converted or lost lead is never overdue: the date was a promise about a
 * conversation that has since happened one way or the other.
 *
 * @param {object} lead
 * @param {number} [now]
 * @returns {boolean}
 */
export function isFollowUpOverdue(lead, now = Date.now()) {
  if (!lead?.followUpAt || CLOSED_STATUSES.has(lead.status)) return false;
  const due = Date.parse(lead.followUpAt);
  return Number.isFinite(due) && due < now;
}

/** The message a WhatsApp click opens with — the lead's name and ours. */
export const leadWhatsappMessage = (lead) =>
  `Hello${lead?.name ? ` ${lead.name}` : ''}, this is Squares N Acres following up on your enquiry.`;

/** `https://wa.me/…`, or `''` when the record has no usable number. */
export const leadWhatsappLink = (lead) => whatsappLink(lead?.phone, leadWhatsappMessage(lead));

/** `tel:+919876543210`, or `''`. */
export const leadTelLink = (lead) => {
  const number = formatPhoneForTel(lead?.phone);
  return number ? `tel:${number}` : '';
};

/** Name, contact details, and the warning that this may be the second time. */
function NameCell({ row }) {
  return (
    <span className={styles.nameCell}>
      <Link className={styles.name} to={PATHS.adminLead(row.id)}>
        {row.name}
      </Link>
      <span className={styles.contact}>
        {row.phone ? <span className={styles.contactLine}>{row.phone}</span> : null}
        {row.email ? <span className={styles.contactLine}>{row.email}</span> : null}
      </span>
      {row.isPossibleDuplicate ? (
        <StatusChip
          tone="warning"
          icon="mdi:content-duplicate"
          label="Possible duplicate"
          title="Another lead carries this number from the last 30 days."
        />
      ) : null}
    </span>
  );
}

/** The assignee, or the button a sales user takes an open lead with (D89). */
function AssignedCell({ row, canClaim, claiming, onClaim }) {
  if (row.assignedUser?.name) return <span>{row.assignedUser.name}</span>;

  if (canClaim && onClaim) {
    return (
      <Button
        size="sm"
        variant="outline"
        loading={claiming}
        icon={<Icon icon="mdi:hand-back-right-outline" width="16" height="16" />}
        onClick={(event) => {
          event.stopPropagation();
          onClaim(row);
        }}
      >
        Claim
      </Button>
    );
  }

  return <span className={styles.muted}>Unassigned</span>;
}

/** The follow-up date, and whether it has already passed. */
function FollowUpCell({ row }) {
  if (!row.followUpAt) return <span className={styles.muted}>—</span>;

  return (
    <span className={styles.stack}>
      <span>{formatDate(row.followUpAt)}</span>
      {isFollowUpOverdue(row) ? (
        <StatusChip tone="error" icon="mdi:alert-outline" label="Overdue" />
      ) : null}
    </span>
  );
}

/**
 * The table's columns.
 *
 * The sortable keys are the five `GET /admin/leads` sorts by (§5.14) — a
 * header that cannot be answered is not offered.
 *
 * @param {object} [options]
 * @param {Array<string>} [options.busyIds] rows with a PATCH in flight
 * @param {(row: object, status: string) => void} [options.onStatusChange]
 * @param {(row: object) => void} [options.onLost] opens the reason dialog
 * @param {boolean} [options.canClaim] a sales user, who claims rather than assigns
 * @param {(row: object) => void} [options.onClaim]
 * @param {string|number|null} [options.claimingId]
 * @returns {Array<object>} `DataTable` columns
 */
export function buildLeadColumns({
  busyIds = [],
  onStatusChange,
  onLost,
  canClaim = false,
  onClaim,
  claimingId = null,
} = {}) {
  const isBusy = (row) => busyIds.includes(String(row?.id));

  return [
    {
      key: 'name',
      label: 'Name / Contact',
      primary: true,
      width: '22%',
      render: (row) => <NameCell row={row} />,
    },
    {
      key: 'source',
      label: 'Source',
      hideBelow: 'lg',
      render: (row) => <StatusChip label={LEAD_SOURCES.labelOfAny(row.source) || '—'} />,
    },
    {
      key: 'property',
      label: 'Property',
      width: '18%',
      hideBelow: 'lg',
      render: (row) =>
        row.property ? (
          <Link
            className={styles.propertyLink}
            to={PATHS.adminPropertyEdit(row.property.id)}
            onClick={(event) => event.stopPropagation()}
          >
            {row.property.title}
          </Link>
        ) : (
          <span className={styles.muted}>—</span>
        ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      mobile: true,
      render: (row) => (
        <LeadStatusMenu
          value={row.status}
          name={row.name}
          busy={isBusy(row)}
          onChange={onStatusChange ? (status) => onStatusChange(row, status) : undefined}
          onLost={onLost ? () => onLost(row) : undefined}
        />
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      render: (row) => (
        <StatusChip
          tone={LEAD_PRIORITY.meta[row.priority]?.tone ?? 'neutral'}
          label={LEAD_PRIORITY.labelOf(row.priority) || '—'}
        />
      ),
    },
    {
      key: 'assignedTo',
      label: 'Assigned',
      render: (row) => (
        <AssignedCell
          row={row}
          canClaim={canClaim}
          claiming={String(claimingId) === String(row.id)}
          onClaim={onClaim}
        />
      ),
    },
    {
      key: 'followUpAt',
      label: 'Follow-up',
      sortable: true,
      mobile: true,
      render: (row) => <FollowUpCell row={row} />,
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      align: 'right',
      render: (row) => (
        <Tooltip title={formatDateTime(row.createdAt)}>
          <span className={styles.created}>{formatRelative(row.createdAt)}</span>
        </Tooltip>
      ),
    },
  ];
}

/**
 * One lead as a phone card: who it is, where it stands, and the two things a
 * sales user does from a phone — call and message (§6 of prompt 29).
 *
 * @param {object} row
 * @param {object} [options] the same handlers `buildLeadColumns` takes
 * @returns {React.ReactNode}
 */
export function renderLeadCard(row, options = {}) {
  const { busyIds = [], onStatusChange, onLost, canClaim = false, onClaim, claimingId } = options;
  const tel = leadTelLink(row);
  const wa = leadWhatsappLink(row);

  return (
    <div className={styles.card}>
      <NameCell row={row} />

      <div className={styles.cardChips}>
        <LeadStatusMenu
          value={row.status}
          name={row.name}
          busy={busyIds.includes(String(row.id))}
          onChange={onStatusChange ? (status) => onStatusChange(row, status) : undefined}
          onLost={onLost ? () => onLost(row) : undefined}
        />
        <StatusChip
          tone={LEAD_PRIORITY.meta[row.priority]?.tone ?? 'neutral'}
          label={LEAD_PRIORITY.labelOf(row.priority) || '—'}
        />
        <StatusChip label={LEAD_SOURCES.labelOfAny(row.source) || '—'} />
        {isFollowUpOverdue(row) ? (
          <StatusChip tone="error" icon="mdi:alert-outline" label="Overdue" />
        ) : null}
      </div>

      <dl className={styles.cardMeta}>
        <div>
          <dt>Assigned</dt>
          <dd>
            <AssignedCell
              row={row}
              canClaim={canClaim}
              claiming={String(claimingId) === String(row.id)}
              onClaim={onClaim}
            />
          </dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{formatDate(row.createdAt)}</dd>
        </div>
      </dl>

      <div className={styles.cardActions}>
        {tel ? (
          <Button
            size="sm"
            variant="outline"
            href={tel}
            icon={<Icon icon="mdi:phone-outline" width="16" height="16" />}
          >
            Call
          </Button>
        ) : null}
        {wa ? (
          <Button
            size="sm"
            variant="outline"
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            icon={<Icon icon="mdi:whatsapp" width="16" height="16" />}
          >
            WhatsApp
          </Button>
        ) : null}
      </div>
    </div>
  );
}
