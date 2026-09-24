import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';

import Button from '../ui/Button';
import ConfirmDialog from '../ui/ConfirmDialog';
import IconButton from '../ui/IconButton';
import useLingering from '../../hooks/useLingering';
import { DIALOGS, TABLES } from '../../config/adminCopy';

import styles from './BulkActionsBar.module.css';

/**
 * "3 selected · Activate · Deactivate · Delete" — the bar that slides in above
 * a table as soon as a row is ticked (§6 of prompt 13).
 *
 * A destructive action never fires straight from the bar: `confirm` turns it
 * into a `ConfirmDialog` naming what it is about to change (§8.2).
 *
 * @param {object} props
 * @param {Array<string|number>} props.selectedIds
 * @param {string} [props.nounOne] what one selected row is called ("property")
 * @param {string} [props.nounMany] and several ("properties")
 * @param {Array<{key: string, label: string, icon?: string, danger?: boolean,
 *   confirm?: {title: string, message: string}}>} props.actions
 * @param {(key: string, ids: Array<string|number>) => void} props.onAction
 * @param {() => void} props.onClear
 * @param {boolean} [props.busy]
 */
export default function BulkActionsBar({
  selectedIds = [],
  actions = [],
  onAction,
  onClear,
  busy = false,
  nounOne = 'record',
  nounMany = 'records',
}) {
  const [pending, setPending] = useState(null);
  // The confirm fades out after it is answered; it keeps its sentence — and the
  // count it was asked about — until it has gone (QA-55).
  const asked = useMemo(
    () => (pending ? { action: pending, count: selectedIds.length } : null),
    [pending, selectedIds.length]
  );
  const [shown, release] = useLingering(asked);

  if (selectedIds.length === 0 || actions.length === 0) return null;

  const count = selectedIds.length;

  const run = (action) => {
    if (action.confirm) {
      setPending(action);
      return;
    }
    onAction?.(action.key, selectedIds);
  };

  const shownCount = shown?.count ?? count;
  const shownNoun = shownCount === 1 ? nounOne : nounMany;
  const confirmText = (template) =>
    String(template ?? '').replace('{count}', `${shownCount} ${shownNoun}`);
  const shownAction = shown?.action ?? null;

  return (
    <div className={styles.bar} role="region" aria-label={TABLES.bulkActions}>
      <span className={styles.count}>{count} selected</span>
      <span className={styles.actions}>
        {actions.map((action) => (
          <Button
            key={action.key}
            size="sm"
            variant={action.danger ? 'danger' : 'secondary'}
            disabled={busy}
            icon={action.icon ? <Icon icon={action.icon} width="16" height="16" /> : undefined}
            onClick={() => run(action)}
          >
            {action.label}
          </Button>
        ))}
      </span>
      <IconButton label={TABLES.clearSelection} size="sm" onClick={onClear}>
        <Icon icon="mdi:close" width="18" height="18" />
      </IconButton>

      <ConfirmDialog
        open={Boolean(pending)}
        // A confirm always names what it is about to change (§8.2); with no
        // title of its own the action's own verb and the selection are it.
        title={
          confirmText(shownAction?.confirm?.title) ||
          `${shownAction?.label ?? DIALOGS.deleteConfirm} ${shownCount} ${shownNoun}?`
        }
        message={confirmText(shownAction?.confirm?.message)}
        confirmLabel={shownAction?.label ?? DIALOGS.deleteConfirm}
        danger={Boolean(shownAction?.danger)}
        loading={busy}
        onClose={() => setPending(null)}
        onExited={release}
        onConfirm={() => {
          const action = pending;
          setPending(null);
          if (action) onAction?.(action.key, selectedIds);
        }}
      />
    </div>
  );
}
