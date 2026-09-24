import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import Modal from '../ui/Modal';
import Button from '../ui/Button';
import PATHS from '../../routes/paths';

import styles from './DeleteGuardDialog.module.css';

/**
 * Where an admin route can be found for each kind of usage the API reports.
 * A type without an entry is still listed — just without a link.
 */
const USAGE_LINK = {
  property: (usage) => PATHS.adminPropertyEdit(usage.id),
  lead: (usage) => PATHS.adminLead(usage.id),
  article: (usage) => PATHS.adminArticleEdit(usage.id),
  page: (usage) => PATHS.adminPageEdit(usage.id),
  locality: (usage) => PATHS.adminLocalityEdit(usage.id),
  developer: (usage) => PATHS.adminDeveloperEdit(usage.id),
  faq: () => PATHS.adminFaqs,
  testimonial: () => PATHS.adminTestimonials,
  teamMember: () => PATHS.adminTeam,
  partner: () => PATHS.adminPartners,
  job: () => PATHS.adminJobs,
  // The desk, searched for the applicant: an application has no page of its
  // own, and it was listed as a bare "jobApplication" with no way to it (QA-61).
  jobApplication: (usage) =>
    `${PATHS.adminJobApplications}?q=${encodeURIComponent(usage.title ?? '')}`,
  user: () => PATHS.adminUsers,
};

const TYPE_LABEL = {
  property: 'Property',
  lead: 'Lead',
  article: 'Article',
  page: 'Page',
  locality: 'Locality',
  developer: 'Developer',
  faq: 'FAQ',
  testimonial: 'Testimonial',
  teamMember: 'Team member',
  partner: 'Partner',
  job: 'Job opening',
  jobApplication: 'Application',
  user: 'User',
};

/**
 * "This is still in use" — the 409 of a master-data delete, rendered (D88).
 *
 * Deleting a locality eleven listings point at does not make those listings
 * better, it makes them wrong, so the API refuses and names what is in the way.
 * This dialog turns that list into links: unlink them, come back, delete.
 *
 * The same list answers a second question — "are you sure?" — for a change the
 * API *does* allow but that reaches further than the form suggests: moving a
 * property type to another segment. Pass `onConfirm` and it becomes a confirm
 * over the usages instead of a dead end.
 *
 * A bulk delete refused whole hands over `refused` — each selected record the
 * API would not delete, with what holds it — and the list is drawn per record
 * (QA-59): the union of the usages alone said which pages were in the way, not
 * which of the selected FAQs they were holding.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.title the record the admin tried to delete
 * @param {string} [props.message] the API's message
 * @param {Array<{type: string, id: number|string, title: string}>} props.usedBy
 * @param {Array<{id: number|string, label: string, reason?: string,
 *   usedBy?: Array<object>}>} [props.refused] the records of a refused bulk delete
 * @param {string} [props.heading] the dialog's own title
 * @param {string} [props.hint] the line under the list
 * @param {() => void} [props.onConfirm] renders the confirm button
 * @param {string} [props.confirmLabel]
 * @param {boolean} [props.loading]
 * @param {() => void} [props.onExited] once the close transition has finished
 */
export default function DeleteGuardDialog({
  open,
  onClose,
  title,
  message,
  usedBy = [],
  refused = [],
  heading = 'Still in use',
  hint = 'Remove the reference on each record above, then delete this one.',
  onConfirm,
  confirmLabel = 'Continue',
  loading = false,
  onExited,
}) {
  const usageItem = (usage) => {
    const to = USAGE_LINK[usage.type]?.(usage);
    const typeLabel = TYPE_LABEL[usage.type] ?? usage.type;

    return (
      <li key={`${usage.type}-${usage.id}`} className={styles.item}>
        <span className={styles.type}>{typeLabel}</span>
        {to ? (
          <Link to={to} className={styles.link} onClick={onClose}>
            {usage.title}
            <Icon icon="mdi:open-in-new" width="14" height="14" aria-hidden="true" />
          </Link>
        ) : (
          <span>{usage.title}</span>
        )}
      </li>
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      mobile="fullscreen"
      title={heading}
      slotProps={{ transition: { onExited } }}
      footer={
        onConfirm ? (
          <>
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={onConfirm} loading={loading}>
              {confirmLabel}
            </Button>
          </>
        ) : (
          <Button variant="primary" onClick={onClose}>
            Got it
          </Button>
        )
      }
    >
      <p className={styles.lead}>
        {message || `“${title}” cannot be deleted while other records point at it.`}
      </p>

      {refused.length > 0 ? (
        <ul className={styles.groups}>
          {refused.map((entry) => (
            <li key={entry.id} className={styles.group}>
              <p className={styles.groupTitle}>“{entry.label}”</p>
              {Array.isArray(entry.usedBy) && entry.usedBy.length > 0 ? (
                <ul className={styles.list}>{entry.usedBy.map(usageItem)}</ul>
              ) : entry.reason ? (
                <p className={styles.groupReason}>{entry.reason}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : usedBy.length > 0 ? (
        <ul className={styles.list}>{usedBy.map(usageItem)}</ul>
      ) : null}

      {hint ? <p className={styles.hint}>{hint}</p> : null}
    </Modal>
  );
}
