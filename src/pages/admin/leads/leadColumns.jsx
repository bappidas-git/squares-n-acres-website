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
  formatPhone,
  formatPhoneForTel,
  formatRelative,
  whatsappLink,
} from '../../../utils/format';
import { localPhoneDigits } from '../../../utils/validators';
import { DEFAULT_WHATSAPP_TEMPLATE, fillWhatsappTemplate } from '../../../config/leadWhatsapp';
import { SITE } from '../../../config/site';

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

/**
 * The message a WhatsApp click opens with (prompt 51): the one the API filled
 * in from `settings.leads.whatsappTemplate`, or the default template with the
 * site's name for an API that does not send one.
 */
export const leadWhatsappMessage = (lead) =>
  lead?.whatsappMessage ||
  fillWhatsappTemplate(DEFAULT_WHATSAPP_TEMPLATE, { name: lead?.name, brand: SITE.name });

/** `https://wa.me/…`, or `''` when the record has no usable number. */
export const leadWhatsappLink = (lead) => whatsappLink(lead?.phone, leadWhatsappMessage(lead));

/** `tel:+919876543210`, or `''`. */
export const leadTelLink = (lead) => {
  const number = formatPhoneForTel(lead?.phone);
  return number ? `tel:${number}` : '';
};

/**
 * The lead list searched for this lead's number — where "Possible duplicate"
 * leads, so the other enquiry is one press away rather than a hunt (QA-53).
 * The ten digits match however either lead stored the number.
 *
 * @param {object} lead
 * @returns {string}
 */
export const duplicatesPathOf = (lead) => {
  const digits = localPhoneDigits(lead?.phone);
  return digits ? `${PATHS.adminLeads}?q=${encodeURIComponent(digits)}` : PATHS.adminLeads;
};

/**
 * An e-mail address that breaks after its `@` rather than anywhere:
 * `geetha.srinivasan@example.co` / `m` reads as `…@` / `example.com` (QA-53).
 */
function BreakableEmail({ email }) {
  const text = String(email);
  const at = text.lastIndexOf('@');
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at + 1)}
      <wbr />
      {text.slice(at + 1)}
    </>
  );
}

/** "Possible duplicate", as the way to the other enquiry. */
export function DuplicateChip({ lead }) {
  return (
    <Link
      className={styles.duplicateLink}
      to={duplicatesPathOf(lead)}
      title="Another lead carries this number from the last 30 days. Show every lead with it."
      onClick={(event) => event.stopPropagation()}
    >
      <StatusChip tone="warning" icon="mdi:content-duplicate" label="Possible duplicate" />
    </Link>
  );
}

/** Name, contact details, and the warning that this may be the second time. */
function NameCell({ row }) {
  return (
    <span className={styles.nameCell}>
      <Link className={styles.name} to={PATHS.adminLead(row.id)}>
        {row.name}
      </Link>
      <span className={styles.contact}>
        {row.phone ? <span className={styles.contactLine}>{formatPhone(row.phone)}</span> : null}
        {row.email ? (
          <span className={styles.contactLine}>
            <BreakableEmail email={row.email} />
          </span>
        ) : null}
      </span>
      {row.isPossibleDuplicate ? <DuplicateChip lead={row} /> : null}
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

/** The follow-up date — its time on hover — and whether it has already passed. */
function FollowUpCell({ row }) {
  if (!row.followUpAt) return <span className={styles.muted}>—</span>;

  return (
    <span className={styles.stack}>
      <Tooltip title={formatDateTime(row.followUpAt)}>
        <span className={styles.nowrap}>{formatDate(row.followUpAt)}</span>
      </Tooltip>
      {isFollowUpOverdue(row) ? (
        <StatusChip tone="error" icon="mdi:alert-outline" label="Overdue" />
      ) : null}
    </span>
  );
}

/** How urgent the lead is, as its chip. */
function PriorityChip({ priority }) {
  return (
    <StatusChip
      tone={LEAD_PRIORITY.meta[priority]?.tone ?? 'neutral'}
      label={LEAD_PRIORITY.labelOf(priority) || '—'}
    />
  );
}

/** The listing the enquiry was about. */
function PropertyLink({ property }) {
  return (
    <Link
      className={styles.propertyLink}
      to={PATHS.adminPropertyEdit(property.id)}
      title={property.title}
      onClick={(event) => event.stopPropagation()}
    >
      {property.title}
    </Link>
  );
}

/**
 * The listing, and — below 1 536 px, where the Source column is folded away —
 * the form the enquiry came through, under it.
 *
 * Nine columns did not fit a laptop: the Created column slid under the pinned
 * actions ("9 days agc") and Follow-up and Created sat past the scroller's
 * edge at 1 280 px (QA-53). Where the enquiry came from and what it was about
 * are one question, so they share a cell when the room runs out.
 */
function EnquiryCell({ row }) {
  const source = LEAD_SOURCES.labelOfAny(row.source);
  return (
    <span className={styles.enquiry}>
      {row.property ? (
        <PropertyLink property={row.property} />
      ) : (
        <span className={[styles.muted, source ? styles.noProperty : ''].join(' ')}>—</span>
      )}
      {source ? <span className={styles.sourceInline}>{`via ${source}`}</span> : null}
    </span>
  );
}

/**
 * The table's columns.
 *
 * The sortable keys are the five `GET /admin/leads` sorts by (§5.14) — a
 * header that cannot be answered is not offered. Status and priority sort by
 * rank (the funnel; Low to High), not alphabetically (QA-53).
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
      hideBelow: 'xl',
      render: (row) => <StatusChip label={LEAD_SOURCES.labelOfAny(row.source) || '—'} />,
    },
    {
      key: 'property',
      label: 'Property',
      width: '20%',
      hideBelow: 'lg',
      render: (row) => <EnquiryCell row={row} />,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      mobile: true,
      // Below 1 200 px the Priority column is folded in here, under the status
      // — two chips in one cell rather than a Created column cut in half.
      render: (row) => (
        <span className={styles.statusCell}>
          <LeadStatusMenu
            value={row.status}
            name={row.name}
            busy={isBusy(row)}
            onChange={onStatusChange ? (status) => onStatusChange(row, status) : undefined}
            onLost={onLost ? () => onLost(row) : undefined}
          />
          <span className={styles.priorityInline}>
            <PriorityChip priority={row.priority} />
          </span>
        </span>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      hideBelow: 'lg',
      render: (row) => <PriorityChip priority={row.priority} />,
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
 * One lead as a phone card: who it is, where it stands, what it is about, when
 * somebody said they would call, and the two things a sales user does from a
 * phone — call and message (§6 of prompt 29).
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
        <PriorityChip priority={row.priority} />
        <StatusChip label={LEAD_SOURCES.labelOfAny(row.source) || '—'} />
        {isFollowUpOverdue(row) ? (
          <StatusChip tone="error" icon="mdi:alert-outline" label="Overdue" />
        ) : null}
      </div>

      {row.property ? (
        <p className={styles.cardProperty}>
          <PropertyLink property={row.property} />
        </p>
      ) : null}

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
          <dt>Follow-up</dt>
          <dd>{row.followUpAt ? formatDateTime(row.followUpAt) : '—'}</dd>
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
