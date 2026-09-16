import { Icon } from '@iconify/react';

import { Card, EmptyState } from '../ui';

import styles from './AdminPlaceholderPage.module.css';

/**
 * A stand-in for an admin screen a later prompt builds.
 *
 * Every route of `routes/adminRouteConfig.js` exists from prompt 12 onward, so
 * the sidebar, the RBAC guards and the page titles can be finished and tested
 * as a whole. A route whose screen has not been written yet renders this and
 * names the prompt that will replace it. **Nothing may still point here after
 * prompt 43.**
 *
 * @param {object} props
 * @param {string} props.title the page title, from the route config
 * @param {number} props.prompt the prompt number that implements this screen
 */
export default function AdminPlaceholderPage({ title, prompt }) {
  return (
    <div className={styles.placeholder}>
      <h1 className={styles.title}>{title}</h1>
      <Card padding="lg" flat>
        <EmptyState
          icon={<Icon icon="mdi:progress-wrench" width={40} height={40} />}
          title={`Coming in prompt ${prompt}`}
          text="This screen is planned and its route, title and permissions are already in place."
        />
      </Card>
    </div>
  );
}
