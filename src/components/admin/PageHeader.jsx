import { Icon } from '@iconify/react';

import Breadcrumbs from '../ui/Breadcrumbs';

import styles from './PageHeader.module.css';

/**
 * The top of an admin screen: the `<h1>` every page needs exactly one of
 * (§8.3), the record count beside it, and the primary action on the right.
 *
 * @param {object} props
 * @param {React.ReactNode} props.title
 * @param {React.ReactNode} [props.subtitle]
 * @param {number} [props.count] rendered as a pill next to the title
 * @param {string} [props.icon] an Iconify id
 * @param {Array<{label: string, to?: string}>} [props.breadcrumbs]
 * @param {React.ReactNode} [props.actions]
 */
export default function PageHeader({
  title,
  subtitle,
  count,
  icon,
  breadcrumbs,
  actions,
  children,
}) {
  return (
    <header className={styles.header}>
      {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}
      <div className={styles.row}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>
            {icon ? (
              <Icon icon={icon} width="24" height="24" className={styles.icon} aria-hidden="true" />
            ) : null}
            {title}
            {typeof count === 'number' ? <span className={styles.count}>{count}</span> : null}
          </h1>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      {children}
    </header>
  );
}
