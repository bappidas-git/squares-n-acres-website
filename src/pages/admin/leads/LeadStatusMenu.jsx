import { useEffect, useState } from 'react';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

import Modal from '../../../components/ui/Modal';
import StatusChip from '../../../components/admin/StatusChip';
import { Button, SelectField } from '../../../components/ui';
import { LEAD_PRIORITY, LEAD_STATUS } from '../../../config/enums';

import styles from './LeadsListPage.module.css';

/**
 * A lead's status, as the control that changes it.
 *
 * The chip is the button: the cell shows where the lead stands and opens the
 * seven places it could stand instead, which is one press rather than a trip
 * to the detail page for the commonest edit in the CRM.
 *
 * "Lost" is handled by the caller rather than sent straight through — the API
 * wants a reason with it (§7 of prompt 29), and asking for one is
 * `LostReasonDialog`'s job.
 *
 * @param {object} props
 * @param {string} props.value
 * @param {(status: string) => void} [props.onChange] absent = read-only chip
 * @param {() => void} [props.onLost] opens the reason dialog
 * @param {boolean} [props.busy] a PATCH is in flight
 * @param {string} props.name the lead's name, for the button's accessible name
 */
export default function LeadStatusMenu({ value, onChange, onLost, busy = false, name }) {
  const [anchor, setAnchor] = useState(null);

  const entry = LEAD_STATUS.meta[value] ?? {};
  const label = LEAD_STATUS.labelOf(value) || '—';

  if (!onChange) {
    return <StatusChip tone={entry.tone ?? 'neutral'} label={label} icon={entry.icon} />;
  }

  const close = () => setAnchor(null);

  const choose = (status) => {
    close();
    if (status === value) return;
    if (status === 'lost' && onLost) {
      onLost();
      return;
    }
    onChange(status);
  };

  return (
    <>
      <StatusChip
        tone={entry.tone ?? 'neutral'}
        label={label}
        icon={busy ? 'mdi:loading' : entry.icon}
        className={busy ? styles.chipBusy : undefined}
        aria-label={`Status of ${name}: ${label}. Change it`}
        aria-haspopup="menu"
        aria-expanded={anchor ? true : undefined}
        aria-busy={busy || undefined}
        disabled={busy || undefined}
        onClick={(event) => {
          event.stopPropagation();
          setAnchor(event.currentTarget);
        }}
      />
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {LEAD_STATUS.entries.map((status) => (
          <MenuItem
            key={status.value}
            disableRipple
            selected={status.value === value}
            onClick={(event) => {
              event.stopPropagation();
              choose(status.value);
            }}
          >
            {status.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

/**
 * One field of a lead, chosen in a dialog — what the row's kebab and the bulk
 * bar open, neither of which has a chip to hang a menu off.
 */
function ChoiceDialog({
  open,
  title,
  message,
  label,
  options,
  initialValue,
  confirmLabel,
  onConfirm,
  onClose,
  loading = false,
}) {
  const [value, setValue] = useState(initialValue);

  // The dialog outlives one opening of it, so each opening starts where the
  // record it is about actually stands.
  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={title}
      size="sm"
      dismissible={!loading}
      showClose={!loading}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button loading={loading} onClick={() => onConfirm(value)}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message ? <p className={styles.dialogText}>{message}</p> : null}
      <SelectField
        label={label}
        value={value}
        options={options}
        onChange={(event) => setValue(event.target.value)}
      />
    </Modal>
  );
}

/**
 * The status choice as a dialog.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {React.ReactNode} props.title
 * @param {React.ReactNode} [props.message]
 * @param {string} [props.initialStatus]
 * @param {(status: string) => void} props.onConfirm
 * @param {() => void} props.onClose
 * @param {boolean} [props.loading]
 */
export function LeadStatusDialog({ initialStatus = 'new', ...rest }) {
  return (
    <ChoiceDialog
      label="Status"
      options={LEAD_STATUS.options}
      initialValue={initialStatus}
      confirmLabel="Change status"
      {...rest}
    />
  );
}

/**
 * The priority choice, which the bulk bar needs for the same reason.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {React.ReactNode} props.title
 * @param {React.ReactNode} [props.message]
 * @param {string} [props.initialPriority]
 * @param {(priority: string) => void} props.onConfirm
 * @param {() => void} props.onClose
 * @param {boolean} [props.loading]
 */
export function LeadPriorityDialog({ initialPriority = 'medium', ...rest }) {
  return (
    <ChoiceDialog
      label="Priority"
      options={LEAD_PRIORITY.options}
      initialValue={initialPriority}
      confirmLabel="Set priority"
      {...rest}
    />
  );
}
