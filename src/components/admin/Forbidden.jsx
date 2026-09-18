import { Icon } from '@iconify/react';

import PATHS from '../../routes/paths';
import { BRAND } from '../../config/site';
import { Button, EmptyState } from '../ui';

import styles from './Forbidden.module.css';

/**
 * The 403 screen (§7): what a role sees when it opens a route it may not have.
 *
 * It renders **inside** the admin layout and links back with a router `Link`,
 * so a wrong turn never costs a full page load and the sidebar stays put.
 * It is also mounted as a route of its own at `/admin/403`.
 */
export default function Forbidden() {
  return (
    <EmptyState
      className={styles.forbidden}
      titleAs="h1"
      icon={
        <span className={styles.mark}>
          <img src={BRAND.iconUrl} alt="" width={48} height={48} className={styles.monogram} />
          <span className={styles.code}>403</span>
        </span>
      }
      title="You don't have access to this page."
      text="Ask an administrator if you need it — your role does not include this area."
      action={
        <Button to={PATHS.adminDashboard} icon={<Icon icon="mdi:arrow-left" />}>
          Go to dashboard
        </Button>
      }
    />
  );
}
