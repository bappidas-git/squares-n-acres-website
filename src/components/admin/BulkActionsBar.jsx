import { useState } from 'react';
import { Icon } from '@iconify/react';

import Button from '../ui/Button';
import ConfirmDialog from '../ui/ConfirmDialog';
import IconButton from '../ui/IconButton';

import styles from './BulkActionsBar.module.css';

/**
 * "3 selected · Activate · Deactivate · Delete" — the bar that slides in above
 * a table as soon as a row is ticked (§6 of prompt 13).
 *
 * A destructive action never fires straight from the bar: `confirm` turns it
 * into a `ConfirmDialog` naming how many records it is about to change (§8.2).
 *
 * @param {object} props
 * @param {Array<string|number>} props.selectedIds
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
}) {
  const [pending, setPending] = useState(null);

  if (selectedIds.length === 0 || actions.length === 0) return null;

  const count = selectedIds.length;
  const noun = count === 1 ? 'record' : 'records';

  const run = (action) => {
    if (action.confirm) {
      setPending(action);
      return;
    }
    onAction?.(action.key, selectedIds);
  };

  const confirmText = (template) => String(template ?? '').replace('{count}', `${count} ${noun}`);

  return (
    <div className={styles.bar} role="region" aria-label="Bulk actions">
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
      <IconButton label="Clear selection" size="sm" onClick={onClear}>
        <Icon icon="mdi:close" width="18" height="18" />
      </IconButton>

      <ConfirmDialog
        open={Boolean(pending)}
        title={confirmText(pending?.confirm?.title) || 'Are you sure?'}
        message={confirmText(pending?.confirm?.message)}
        confirmLabel={pending?.label ?? 'Confirm'}
        danger={Boolean(pending?.danger)}
        loading={busy}
        onClose={() => setPending(null)}
        onConfirm={() => {
          const action = pending;
          setPending(null);
          if (action) onAction?.(action.key, selectedIds);
        }}
      />
    </div>
  );
}
