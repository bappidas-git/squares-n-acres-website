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
 *
 * @param {object} [props]
 * @param {string} [props.code]
 * @param {string} [props.title]
 * @param {string} [props.text]
 */
export default function Forbidden({
  code = '403',
  title = "You don't have access to this page.",
  text = 'Ask an administrator if you need it — your role does not include this area.',
}) {
  return (
    <EmptyState
      className={styles.forbidden}
      titleAs="h1"
      icon={
        <span className={styles.mark}>
          <img src={BRAND.iconUrl} alt="" width={48} height={48} className={styles.monogram} />
          <span className={styles.code}>{code}</span>
        </span>
      }
      title={title}
      text={text}
      action={
        <Button to={PATHS.adminDashboard} icon={<Icon icon="mdi:arrow-left" />}>
          Go to dashboard
        </Button>
      }
    />
  );
}

/**
 * The admin panel's own 404: an `/admin/…` address no screen answers.
 *
 * It used to fall through to the public site's 404 — the public header, a
 * property search, "Browse properties" — so a mistyped admin address, or
 * `/admin/pages/edit/` with its id missing, threw a signed-in editor out of the
 * panel altogether (QA-56). It stays in the admin layout like the 403.
 */
export function AdminNotFound() {
  return (
    <Forbidden
      code="404"
      title="There is no such screen in the admin panel."
      text="The address may be mistyped, or the screen may have moved. The sidebar lists every screen your role can open."
    />
  );
}
