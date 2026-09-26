import { useCallback, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link, useNavigate, useParams } from 'react-router-dom';

// First, out of alphabetical order: the leads list reaches its stylesheet and
// then the table's before the picker's and the page header's, and this page
// shares a chunk with it — two orders for one chunk is a mini-css-extract
// "Conflicting order", which `build:ci` refuses.
import LostReasonDialog from './LostReasonDialog';
import { useAssignableUsers } from './leadFilters';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import EmptyState from '../../../components/ui/EmptyState';
import EntityPicker from '../../../components/admin/EntityPicker';
import ErrorState from '../../../components/ui/ErrorState';
import LazyImage from '../../../components/ui/LazyImage';
import LeadContactCard from './LeadContactCard';
import LeadFollowUp from './LeadFollowUp';
import LeadMetaCard from './LeadMetaCard';
import LeadNotes from './LeadNotes';
import LeadPipeline from './LeadPipeline';
import LeadRequirementCard from './LeadRequirementCard';
import LeadTimeline from './LeadTimeline';
import LogActivityPanel from './LogActivityPanel';
import PATHS from '../../../routes/paths';
import PageHeader from '../../../components/admin/PageHeader';
import StatusChip from '../../../components/admin/StatusChip';
import leadService from '../../../services/leadService';
import propertyService from '../../../services/propertyService';
import useApi from '../../../hooks/useApi';
import userService from '../../../services/userService';
import { DuplicateChip, leadWhatsappMessage } from './leadColumns';
import { LEAD_CONTACT_TYPES, LEAD_PRIORITY, LEAD_STATUS } from '../../../config/enums';
import { SelectField } from '../../../components/ui';
import { TableSkeleton } from '../../../components/common/SkeletonLoaders';
import { firstFieldMessage } from '../../../services/apiError';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import { useLeadNotifications } from '../../../contexts/LeadNotificationsContext';
import { useToast } from '../../../components/common/ToastProvider';
import { formatDateTime, whatsappLink } from '../../../utils/format';
import { publicUrlOf, viewUrlOf } from '../properties/publicUrl';

import styles from './LeadDetailPage.module.css';
import { TOASTS } from '../../../config/adminCopy';

/**
 * Admin → Leads → one lead (`/admin/leads/:id`).
 *
 * The screen is a conversation in two columns. The left one is what the
 * visitor told us — who they are and how to reach them, what they are looking
 * for, which listing they were on, whatever the form attached (D56) — plus the
 * notes the desk has written and the timeline the server keeps. The right one
 * is what we decide: where the lead stands in the funnel, how urgent it is,
 * whose it is, and when we said we would call back.
 *
 * Below 1 200 px the two become one column, and the decisions come straight
 * after the contact card: they used to follow the notes and the whole
 * timeline, the length of a phone screen away from the lead's name (QA-53).
 *
 * Every decision is a `PATCH`, every `PATCH` appends an activity server-side,
 * and the lead is re-read afterwards — so the timeline on the left is always
 * the record of what the rail on the right was just used to do. The re-read
 * keeps the page on screen: it used to blank the whole screen to a skeleton
 * and throw the reader back to the top after every change (QA-53).
 *
 * A sales user opening somebody else's lead by its URL gets a 404 from the
 * API, and this page renders that as "not found" rather than as an error:
 * inside their scope, it genuinely does not exist (D15).
 */
export default function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { can, user } = useAdminAuth();
  const { refresh: refreshNotifications } = useLeadNotifications();

  const canAssign = can('leads', 'assign');
  const canClaim = can('leads', 'claim');
  const canDelete = can('leads', 'delete');
  const canEditListing = can('properties', 'edit');

  const { users } = useAssignableUsers({ enabled: canAssign });

  const { data, error, refetch } = useApi((signal) => leadService.adminGet(id, { signal }), [id], {
    keepPreviousData: true,
  });

  // The previous answer is kept while the next one loads, which is what stops
  // a re-read from blanking the page — but a lead is only this page's lead
  // while its id is the one in the address.
  const lead = data && String(data.id) === String(id) ? data : null;

  const [busy, setBusy] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // Set by the contact card's Call and WhatsApp buttons (prompt 51).
  const [activityPrefill, setActivityPrefill] = useState(null);

  const { data: property } = useApi(
    (signal) => propertyService.adminGet(lead.propertyId, { signal }),
    [lead?.propertyId ?? null],
    { enabled: Boolean(lead?.propertyId) }
  );

  /** One change, one toast, one re-read — the timeline is the proof it stuck. */
  const patch = useCallback(
    async (changes, message) => {
      setBusy(true);
      try {
        await leadService.patch(id, changes);
        toast.success(message);
        await refetch();
        // The sidebar badge and the bell count new leads; a status change is
        // news to them now, not at the poller's next tick.
        refreshNotifications();
        return true;
      } catch (thrown) {
        toast.error(firstFieldMessage(thrown, 'The change could not be saved.'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [id, refetch, refreshNotifications, toast]
  );

  /**
   * A conversation, logged — and the status or follow-up that came of it,
   * sent beside it (prompt 51). The two are separate requests, so a refusal
   * of the second says the first went through.
   */
  const logActivity = useCallback(
    async (entry, changes) => {
      setBusy(true);
      const label = LEAD_CONTACT_TYPES.labelOf(entry.type);
      try {
        await leadService.logActivity(id, entry);
      } catch (thrown) {
        toast.error(firstFieldMessage(thrown, 'The activity could not be logged.'));
        setBusy(false);
        return false;
      }

      const said = [`${label} logged.`];
      let saved = true;
      if (changes) {
        try {
          await leadService.patch(id, changes);
          if (changes.status) said.push(`Now ${LEAD_STATUS.labelOf(changes.status)}.`);
          if (changes.followUpAt)
            said.push(`Next follow-up ${formatDateTime(changes.followUpAt)}.`);
        } catch (thrown) {
          saved = false;
          toast.error(
            `${label} logged, but the change was not saved: ${firstFieldMessage(
              thrown,
              'try again'
            )}`
          );
        }
      }
      if (saved) toast.success(said.join(' '));
      await refetch();
      refreshNotifications();
      setBusy(false);
      return saved;
    },
    [id, refetch, refreshNotifications, toast]
  );

  /** `true` once the note is saved; the box keeps its text until then. */
  const addNote = useCallback(
    async (text) => {
      try {
        await leadService.addNote(id, text);
        toast.success('Note added.');
        await refetch();
        return true;
      } catch (thrown) {
        toast.error(firstFieldMessage(thrown, 'The note could not be added.'));
        return false;
      }
    },
    [id, refetch, toast]
  );

  const deleteNote = useCallback(
    async (noteId) => {
      setBusy(true);
      try {
        await leadService.removeNote(id, noteId);
        toast.success('Note deleted.');
        await refetch();
      } catch (thrown) {
        toast.error(firstFieldMessage(thrown, 'The note could not be deleted.'));
      } finally {
        setBusy(false);
      }
    },
    [id, refetch, toast]
  );

  const claim = useCallback(async () => {
    setBusy(true);
    try {
      await leadService.claim(id);
      toast.success('This lead is yours.');
      await refetch();
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'This lead could not be claimed.'));
      if (thrown?.status === 409) refetch();
    } finally {
      setBusy(false);
    }
  }, [id, refetch, toast]);

  const remove = useCallback(async () => {
    setBusy(true);
    try {
      await leadService.remove(id);
      toast.success(TOASTS.deleted('Lead'));
      refreshNotifications();
      // Replaced, not pushed: Back must not lead to "This lead does not exist".
      navigate(PATHS.adminLeads, { replace: true });
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'The lead could not be deleted.'));
      setDeleteOpen(false);
    } finally {
      setBusy(false);
    }
  }, [id, navigate, refreshNotifications, toast]);

  /** A note is the author's to withdraw; the record is an editor's (§7). */
  const canDeleteNote = useCallback(
    (note) => canDelete || String(note.createdBy) === String(user?.id),
    [canDelete, user]
  );

  const nameOf = useCallback(
    (userId) => {
      if (userId === null || userId === undefined) return null;
      if (String(userId) === String(user?.id)) return user?.name ?? null;
      if (String(userId) === String(lead?.assignedTo)) return lead?.assignedUser?.name ?? null;
      return users.find((entry) => String(entry.id) === String(userId))?.name ?? null;
    },
    [lead, user, users]
  );

  const selectedUsers = useMemo(
    () => (lead?.assignedUser ? [lead.assignedUser] : []),
    [lead?.assignedUser]
  );

  // Active colleagues only: a deactivated account cannot sign in to work the
  // lead, and the API refuses it as a new owner (QA-53).
  const searchColleagues = useCallback(
    (query, options) => userService.list({ ...query, isActive: true }, options),
    []
  );

  const assign = (value) => {
    const assignedTo = value === null ? null : Number(value);
    const owner = users.find((entry) => String(entry.id) === String(assignedTo));
    patch(
      { assignedTo },
      assignedTo === null
        ? 'The lead is unassigned.'
        : `The lead is now ${owner?.name ? `${owner.name}’s` : 'handed over'}.`
    );
  };

  if (error?.status === 404) {
    return (
      <>
        <PageHeader title="Lead" breadcrumbs={[{ label: 'Leads', to: PATHS.adminLeads }]} />
        <EmptyState
          icon={<Icon icon="mdi:account-question-outline" width="40" height="40" />}
          title="This lead does not exist"
          text="It may have been deleted, or it belongs to a colleague."
          action={<Button to={PATHS.adminLeads}>Back to leads</Button>}
        />
      </>
    );
  }

  if (error && !lead) {
    return (
      <>
        <PageHeader title="Lead" breadcrumbs={[{ label: 'Leads', to: PATHS.adminLeads }]} />
        <ErrorState text={error.message} onRetry={refetch} />
      </>
    );
  }

  // The first answer, or another lead's page opened from this one (the bell,
  // "Possible duplicate"): the skeleton, never the previous lead's details.
  if (!lead) {
    return (
      <>
        <PageHeader title="Lead" breadcrumbs={[{ label: 'Leads', to: PATHS.adminLeads }]} />
        <TableSkeleton rows={6} columns={2} />
      </>
    );
  }

  const statusMeta = LEAD_STATUS.meta[lead.status] ?? {};
  // The details are the desk's to correct: an admin's or a manager's on any
  // lead, a sales user's on their own (prompt 51).
  const canEditDetails = canAssign || String(lead.assignedTo ?? '') === String(user?.id ?? '');
  // "Send listing on WhatsApp": the lead's message, with the listing's address
  // after it when the template does not already carry it (prompt 51).
  const listingLive = Boolean(lead.property?.slug) && property?.isActive === true;
  const listingUrl = listingLive ? publicUrlOf(lead.property.slug) : '';
  const listingMessage = listingUrl
    ? leadWhatsappMessage(lead).includes(listingUrl)
      ? leadWhatsappMessage(lead)
      : `${leadWhatsappMessage(lead)}\n${listingUrl}`
    : '';
  const sendListing = listingUrl ? whatsappLink(lead.phone, listingMessage) : '';

  return (
    <>
      <PageHeader
        title={lead.name}
        breadcrumbs={[{ label: 'Leads', to: PATHS.adminLeads }, { label: lead.name }]}
        subtitle={`Lead #${lead.id}`}
        actions={
          <>
            <StatusChip
              tone={statusMeta.tone ?? 'neutral'}
              icon={statusMeta.icon}
              label={LEAD_STATUS.labelOf(lead.status) || '—'}
            />
            {lead.isPossibleDuplicate ? <DuplicateChip lead={lead} /> : null}
          </>
        }
      />

      <div className={styles.layout}>
        <div className={styles.lead}>
          <LeadContactCard
            lead={lead}
            canEdit={canEditDetails}
            onSave={(changes) => patch(changes, 'The details are saved.')}
            onContact={(type) => setActivityPrefill({ type, nonce: Date.now() })}
          />
        </div>

        <aside className={styles.rail} aria-label="Lead controls">
          <LogActivityPanel lead={lead} busy={busy} prefill={activityPrefill} onLog={logActivity} />

          <Card className={styles.railCard}>
            <LeadPipeline
              status={lead.status}
              lostReason={lead.lostReason}
              busy={busy}
              onChange={(status) =>
                patch({ status }, `The lead is now ${LEAD_STATUS.labelOf(status)}.`)
              }
              onLost={() => setLostOpen(true)}
            />
          </Card>

          <Card className={styles.railCard}>
            <div className={styles.railBlock}>
              <h2 className={styles.railTitle} id="lead-priority-heading">
                Priority
              </h2>
              <SelectField
                aria-labelledby="lead-priority-heading"
                value={lead.priority ?? 'medium'}
                options={LEAD_PRIORITY.options}
                disabled={busy}
                onChange={(event) =>
                  patch(
                    { priority: event.target.value },
                    `Priority set to ${LEAD_PRIORITY.labelOf(event.target.value)}.`
                  )
                }
              />
            </div>

            <div className={styles.railBlock}>
              <h2 className={styles.railTitle}>Assigned to</h2>
              {canAssign ? (
                <EntityPicker
                  label="Assign to a colleague"
                  labelClassName={styles.srOnly}
                  placeholder={lead.assignedTo ? 'Hand it to…' : 'Unassigned — search colleagues…'}
                  multiple={false}
                  value={lead.assignedTo ?? null}
                  selectedRecords={selectedUsers}
                  disabled={busy}
                  fetcher={searchColleagues}
                  onChange={assign}
                />
              ) : (
                <>
                  <p className={styles.railValue}>
                    {lead.assignedUser?.name ?? <span className={styles.muted}>Unassigned</span>}
                  </p>
                  {canClaim && !lead.assignedTo ? (
                    <Button
                      size="sm"
                      variant="outline"
                      loading={busy}
                      icon={<Icon icon="mdi:hand-back-right-outline" width="16" height="16" />}
                      onClick={claim}
                    >
                      Claim this lead
                    </Button>
                  ) : null}
                </>
              )}
            </div>

            <LeadFollowUp
              lead={lead}
              busy={busy}
              onSave={(followUpAt) =>
                patch(
                  { followUpAt },
                  followUpAt ? 'The follow-up is set.' : 'The follow-up was cleared.'
                )
              }
            />
          </Card>
        </aside>

        <div className={styles.main}>
          <LeadRequirementCard
            requirement={lead.requirement}
            canEdit={canEditDetails}
            onSave={(requirement) => patch({ requirement }, 'The requirement is saved.')}
          />

          {lead.property?.deleted ? (
            <Card as="section" className={styles.card} aria-labelledby="lead-property-heading">
              <h2 className={styles.cardTitle} id="lead-property-heading">
                Enquired about
              </h2>
              <p className={styles.propertyTitle}>{lead.property.title}</p>
              <p className={styles.emptyLine}>
                The listing has been deleted. The lead keeps the name it had when the enquiry came
                in.
              </p>
            </Card>
          ) : lead.property ? (
            <Card as="section" className={styles.card} aria-labelledby="lead-property-heading">
              <h2 className={styles.cardTitle} id="lead-property-heading">
                Enquired about
              </h2>
              <div className={styles.propertyRow}>
                <LazyImage
                  className={styles.propertyCover}
                  src={coverOf(property)}
                  alt=""
                  ratio="4/3"
                  sizes="96px"
                  loading="lazy"
                />
                <div className={styles.propertyBody}>
                  <Link
                    className={styles.propertyTitle}
                    to={PATHS.adminPropertyEdit(lead.property.id)}
                  >
                    {lead.property.title}
                  </Link>
                  <div className={styles.propertyLinks}>
                    <Button
                      size="sm"
                      variant="outline"
                      href={viewUrlOf(lead.property.slug, property ? property.isActive : true)}
                      target="_blank"
                      rel="noopener noreferrer"
                      icon={<Icon icon="mdi:open-in-new" width="16" height="16" />}
                    >
                      View on site
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      to={PATHS.adminPropertyEdit(lead.property.id)}
                      icon={
                        <Icon
                          icon={canEditListing ? 'mdi:pencil-outline' : 'mdi:eye-outline'}
                          width="16"
                          height="16"
                        />
                      }
                    >
                      {/* A sales user opens the form read-only (§7). */}
                      {canEditListing ? 'Edit listing' : 'View listing'}
                    </Button>
                    {sendListing ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        href={sendListing}
                        target="_blank"
                        rel="noopener noreferrer"
                        icon={<Icon icon="mdi:whatsapp" width="16" height="16" />}
                        onClick={() => setActivityPrefill({ type: 'whatsapp', nonce: Date.now() })}
                      >
                        Send listing on WhatsApp
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          <LeadMetaCard meta={lead.meta} source={lead.source} />

          <LeadNotes
            notes={lead.notes}
            busy={busy}
            canDelete={canDeleteNote}
            onAdd={addNote}
            onDelete={deleteNote}
          />

          <LeadTimeline activities={lead.activities} nameOf={nameOf} />

          {/* At the end of the record rather than in the rail: on a phone the
              rail follows the contact card, and "Delete lead" does not belong
              between the follow-up and the requirement. */}
          {canDelete ? (
            <Card as="section" className={styles.card} aria-labelledby="lead-danger-heading">
              <div className={styles.railBlock}>
                <h2 className={styles.railTitle} id="lead-danger-heading">
                  Danger zone
                </h2>
                <p className={styles.emptyLine}>
                  Deleting a lead removes its notes and its timeline with it.
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  className={styles.dangerButton}
                  disabled={busy}
                  icon={<Icon icon="mdi:delete-outline" width="16" height="16" />}
                  onClick={() => setDeleteOpen(true)}
                >
                  Delete lead
                </Button>
              </div>
            </Card>
          ) : null}
        </div>
      </div>

      <LostReasonDialog
        open={lostOpen}
        name={lead.name}
        loading={busy}
        onClose={() => setLostOpen(false)}
        onConfirm={async (lostReason) => {
          // Open until the API agrees, so a refused reason is not lost with it.
          const saved = await patch({ status: 'lost', lostReason }, 'The lead was marked as lost.');
          if (saved) setLostOpen(false);
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this lead?"
        message={`“${lead.name}” will be deleted, with its notes and its timeline. This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={busy}
        onClose={() => setDeleteOpen(false)}
        onConfirm={remove}
      />
    </>
  );
}

/** The listing's cover, or nothing — `LazyImage` draws the monogram then. */
function coverOf(property) {
  const images = Array.isArray(property?.images) ? property.images : [];
  return (images.find((image) => image?.isCover) ?? images[0])?.url;
}
