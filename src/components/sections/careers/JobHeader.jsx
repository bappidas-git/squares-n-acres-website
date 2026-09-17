import { Icon } from '@iconify/react';

import { Breadcrumbs, Button, Chip } from '../../ui';
import { EMPLOYMENT_TYPES } from '../../../config/enums';
import { formatDate } from '../../../utils/format';

import styles from './careers.module.css';

/**
 * The head of a job page: what the role is, where it is and what it pays.
 *
 * Everything here is a field of §6.11 and every one of them is optional apart
 * from the title, so a posting written in a hurry is a short header rather
 * than a row of empty chips.
 *
 * The Apply button scrolls rather than navigates: the form is on the same
 * page, and moving the focus to it is what makes the button work for somebody
 * who is not using a mouse.
 *
 * @param {object} props
 * @param {object} props.job
 * @param {Array<{label: string, to?: string}>} props.breadcrumbs
 * @param {boolean} [props.closed]
 * @param {string} [props.applyId] the id of the form to scroll to
 */
export default function JobHeader({ job, breadcrumbs = [], closed = false, applyId = 'apply' }) {
  const chips = [
    { key: 'department', icon: 'mdi:domain', label: job.department },
    { key: 'location', icon: 'mdi:map-marker-outline', label: job.location },
    {
      key: 'type',
      icon: 'mdi:clock-outline',
      label: job.employmentType ? EMPLOYMENT_TYPES.labelOf(job.employmentType) : '',
    },
    { key: 'experience', icon: 'mdi:briefcase-outline', label: job.experience },
  ].filter((chip) => Boolean(chip.label));

  const apply = () => {
    const target = document.getElementById(applyId);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // The panel is not focusable in its own right, so it is made so for this
    // one move and gives the attribute back afterwards.
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  };

  return (
    <header className={styles.header}>
      <Breadcrumbs items={breadcrumbs} className={styles.crumbs} />

      <h1 className={styles.title}>{job.title}</h1>

      {chips.length > 0 ? (
        <ul className={styles.chips}>
          {chips.map((chip) => (
            <li key={chip.key}>
              <Chip icon={<Icon icon={chip.icon} width="14" height="14" />}>{chip.label}</Chip>
            </li>
          ))}
        </ul>
      ) : null}

      <dl className={styles.facts}>
        {job.postedAt ? (
          <div className={styles.fact}>
            <dt>Posted</dt>
            <dd>{formatDate(job.postedAt)}</dd>
          </div>
        ) : null}
        {job.closesAt ? (
          <div className={styles.fact}>
            <dt>{closed ? 'Closed' : 'Applications close'}</dt>
            <dd>{formatDate(job.closesAt)}</dd>
          </div>
        ) : null}
        {job.salaryRange ? (
          <div className={styles.fact}>
            <dt>Compensation</dt>
            <dd>{job.salaryRange}</dd>
          </div>
        ) : null}
      </dl>

      {closed ? null : (
        <Button
          className={styles.applyButton}
          icon={<Icon icon="mdi:send-outline" width="18" height="18" />}
          onClick={apply}
        >
          Apply for this role
        </Button>
      )}
    </header>
  );
}
