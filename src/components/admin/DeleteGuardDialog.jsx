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
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.title the record the admin tried to delete
 * @param {string} [props.message] the API's message
 * @param {Array<{type: string, id: number|string, title: string}>} props.usedBy
 * @param {string} [props.heading] the dialog's own title
 * @param {string} [props.hint] the line under the list
 * @param {() => void} [props.onConfirm] renders the confirm button
 * @param {string} [props.confirmLabel]
 * @param {boolean} [props.loading]
 */
export default function DeleteGuardDialog({
  open,
  onClose,
  title,
  message,
  usedBy = [],
  heading = 'Still in use',
  hint = 'Remove the reference on each record above, then delete this one.',
  onConfirm,
  confirmLabel = 'Continue',
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      mobile="fullscreen"
      title={heading}
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

      {usedBy.length > 0 ? (
        <ul className={styles.list}>
          {usedBy.map((usage) => {
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
          })}
        </ul>
      ) : null}

      {hint ? <p className={styles.hint}>{hint}</p> : null}
    </Modal>
  );
}
