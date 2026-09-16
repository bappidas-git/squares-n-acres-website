import { Icon } from '@iconify/react';

import { Alert, Button } from '../../../../components/ui';
import { formatRelative } from '../../../../utils/format';

import styles from '../PropertyFormPage.module.css';

/**
 * "Restore unsaved draft from 5 minutes ago?"
 *
 * The form writes a draft to this browser every ten seconds while it is dirty,
 * so a closed tab, a reload or a crash does not cost an afternoon's work. On
 * the next visit the draft is **offered**, never applied: the record on the
 * server is the truth until an editor says otherwise.
 *
 * @param {object} props
 * @param {{savedAt: string}|null} props.draft
 * @param {() => void} props.onRestore
 * @param {() => void} props.onDiscard
 */
export default function DraftBanner({ draft, onRestore, onDiscard }) {
  if (!draft) return null;

  return (
    <Alert
      tone="warning"
      title="Unsaved changes were found in this browser"
      icon={<Icon icon="mdi:history" width="20" height="20" />}
    >
      <p>
        A draft of this property was saved {formatRelative(draft.savedAt)}, after the last time it
        reached the server. Restore it, or discard it and keep what is saved.
      </p>
      <div className={styles.draftActions}>
        <Button size="sm" onClick={onRestore}>
          Restore the draft
        </Button>
        <Button size="sm" variant="ghost" onClick={onDiscard}>
          Discard it
        </Button>
      </div>
    </Alert>
  );
}
