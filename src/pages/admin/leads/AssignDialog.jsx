import { useEffect, useState } from 'react';

import Modal from '../../../components/ui/Modal';
import { Button, SelectField } from '../../../components/ui';

import styles from './LeadsListPage.module.css';

/** What "nobody" is worth in a `<select>`, which cannot hold `null`. */
const UNASSIGNED = '';

/**
 * Hands a lead — or a batch of them — to a colleague (§7 `leads.assign`).
 *
 * The directory is passed in rather than searched: a sales desk is a list of
 * people one screen long, and `useAssignableUsers()` has already fetched it for
 * the filter row. "Unassigned" is one of the choices, because taking a lead
 * back off somebody is as much a part of assigning as giving it away.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {React.ReactNode} props.title
 * @param {React.ReactNode} [props.message]
 * @param {Array<{id: number|string, name: string, role?: string}>} props.users
 * @param {number|string|null} [props.value] the current assignee
 * @param {(assignedTo: number|null) => void} props.onConfirm
 * @param {() => void} props.onClose
 * @param {boolean} [props.loading]
 */
export default function AssignDialog({
  open,
  title,
  message,
  users = [],
  value = null,
  onConfirm,
  onClose,
  loading = false,
}) {
  const [selected, setSelected] = useState(value === null ? UNASSIGNED : String(value));

  useEffect(() => {
    if (open) setSelected(value === null || value === undefined ? UNASSIGNED : String(value));
  }, [open, value]);

  const options = [
    { value: UNASSIGNED, label: 'Unassigned' },
    ...users.map((user) => ({
      value: String(user.id),
      label: user.role ? `${user.name} (${user.role})` : user.name,
    })),
  ];

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
          <Button
            loading={loading}
            onClick={() => onConfirm(selected === UNASSIGNED ? null : Number(selected))}
          >
            Assign
          </Button>
        </>
      }
    >
      {message ? <p className={styles.dialogText}>{message}</p> : null}
      <SelectField
        label="Assign to"
        value={selected}
        options={options}
        onChange={(event) => setSelected(event.target.value)}
      />
    </Modal>
  );
}
