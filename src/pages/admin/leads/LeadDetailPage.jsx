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
import PATHS from '../../../routes/paths';
import PageHeader from '../../../components/admin/PageHeader';
import StatusChip from '../../../components/admin/StatusChip';
import leadService from '../../../services/leadService';
import propertyService from '../../../services/propertyService';
import useApi from '../../../hooks/useApi';
import userService from '../../../services/userService';
import { LEAD_PRIORITY, LEAD_STATUS } from '../../../config/enums';
import { SelectField } from '../../../components/ui';
import { TableSkeleton } from '../../../components/common/SkeletonLoaders';
import { firstFieldMessage } from '../../../services/apiError';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import { useToast } from '../../../components/common/ToastProvider';
import { viewUrlOf } from '../properties/publicUrl';

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
 * Every decision is a `PATCH`, every `PATCH` appends an activity server-side,
 * and the lead is re-read afterwards — so the timeline on the left is always
 * the record of what the rail on the right was just used to do.
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

  const canAssign = can('leads', 'assign');
  const canClaim = can('leads', 'claim');
  const canDelete = can('leads', 'delete');

  const { users } = useAssignableUsers({ enabled: canAssign });

  const {
    data: lead,
    loading,
    error,
    refetch,
  } = useApi((signal) => leadService.adminGet(id, { signal }), [id]);

  const [busy, setBusy] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
        return true;
      } catch (thrown) {
        toast.error(firstFieldMessage(thrown, 'The change could not be saved.'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [id, refetch, toast]
  );

  const addNote = useCallback(
    async (text) => {
      try {
        await leadService.addNote(id, text);
        await refetch();
      } catch (thrown) {
        toast.error(firstFieldMessage(thrown, 'The note could not be added.'));
      }
    },
    [id, refetch, toast]
  );

  const deleteNote = useCallback(
    async (noteId) => {
      setBusy(true);
      try {
        await leadService.removeNote(id, noteId);
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
      navigate(PATHS.adminLeads);
    } catch (thrown) {
      toast.error(firstFieldMessage(thrown, 'The lead could not be deleted.'));
      setDeleteOpen(false);
    } finally {
      setBusy(false);
    }
  }, [id, navigate, toast]);

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

  if (loading && !lead) {
    return (
      <>
        <PageHeader title="Lead" breadcrumbs={[{ label: 'Leads', to: PATHS.adminLeads }]} />
        <TableSkeleton rows={6} columns={2} />
      </>
    );
  }

  if (error?.status === 404 || (!loading && !lead)) {
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

  if (error) {
    return (
      <>
        <PageHeader title="Lead" breadcrumbs={[{ label: 'Leads', to: PATHS.adminLeads }]} />
        <ErrorState text={error.message} onRetry={refetch} />
      </>
    );
  }

  const statusMeta = LEAD_STATUS.meta[lead.status] ?? {};

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
            {lead.isPossibleDuplicate ? (
              <StatusChip
                tone="warning"
                icon="mdi:content-duplicate"
                label="Possible duplicate"
                title="Another lead carries this number from the last 30 days."
              />
            ) : null}
          </>
        }
      />

      <div className={styles.layout}>
        <div className={styles.main}>
          <LeadContactCard lead={lead} />
          <LeadRequirementCard requirement={lead.requirement} />

          {lead.property ? (
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
                      icon={<Icon icon="mdi:pencil-outline" width="16" height="16" />}
                    >
                      Edit listing
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          <LeadMetaCard meta={lead.meta} />

          <LeadNotes
            notes={lead.notes}
            busy={busy}
            canDelete={canDeleteNote}
            onAdd={addNote}
            onDelete={deleteNote}
          />

          <LeadTimeline activities={lead.activities} nameOf={nameOf} />
        </div>

        <aside className={styles.rail} aria-label="Lead controls">
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
              <h2 className={styles.railTitle}>Priority</h2>
              <SelectField
                label="Priority"
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
                  label="Owner"
                  placeholder="Search colleagues…"
                  multiple={false}
                  value={lead.assignedTo ?? null}
                  selectedRecords={selectedUsers}
                  disabled={busy}
                  fetcher={(query, options) => userService.list(query, options)}
                  onChange={(value) =>
                    patch(
                      { assignedTo: value === null ? null : Number(value) },
                      value === null ? 'The lead is unassigned.' : 'The lead was handed over.'
                    )
                  }
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

          {canDelete ? (
            <Card className={styles.railCard}>
              <div className={styles.railBlock}>
                <h2 className={styles.railTitle}>Danger zone</h2>
                <p className={styles.emptyLine}>
                  Deleting a lead removes its notes and its timeline with it.
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={busy}
                  icon={<Icon icon="mdi:delete-outline" width="16" height="16" />}
                  onClick={() => setDeleteOpen(true)}
                >
                  Delete lead
                </Button>
              </div>
            </Card>
          ) : null}
        </aside>
      </div>

      <LostReasonDialog
        open={lostOpen}
        name={lead.name}
        loading={busy}
        onClose={() => setLostOpen(false)}
        onConfirm={async (lostReason) => {
          setLostOpen(false);
          await patch({ status: 'lost', lostReason }, 'The lead was marked as lost.');
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
