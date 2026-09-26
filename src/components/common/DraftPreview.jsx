import { Icon } from '@iconify/react';

import { Button, Container, ErrorState } from '../ui';

import styles from './DraftPreview.module.css';

/**
 * The strip a "Preview changes" page carries (prompt 51): what is on screen is
 * the editor's unsaved form, from this browser, and not the page visitors get.
 * Fixed to the bottom of the window, so it is never scrolled out of sight.
 */
export default function DraftPreviewBanner() {
  return (
    <div className={styles.banner} role="status">
      <Icon icon="mdi:eye-outline" aria-hidden="true" />
      <span>Previewing unsaved changes — not what visitors see.</span>
    </div>
  );
}

/**
 * A "Preview changes" link opened a second time, or in another browser: the
 * hand-off is spent, and says so rather than answering 404.
 *
 * @param {object} props
 * @param {string} [props.livePath] where the saved page is
 */
export function DraftPreviewExpired({ livePath }) {
  return (
    <Container className={styles.expired}>
      <ErrorState
        icon={<Icon icon="mdi:eye-off-outline" width="40" height="40" />}
        title="This preview has expired"
        text="A preview of unsaved changes opens once, in the browser it was made in. Use “Preview changes” in the editor again."
        action={livePath ? <Button to={livePath}>Open the saved page</Button> : null}
      />
    </Container>
  );
}
