import { useEffect, useState } from 'react';

import Modal from '../../../components/ui/Modal';
import { Button, SelectField } from '../../../components/ui';
import { ROLES } from '../../../config/enums';

import styles from './LeadsListPage.module.css';

/** What "nobody" is worth in a `<select>`, which cannot hold `null`. */
const UNASSIGNED = '';

/** "Sales User (Sales)" — the role as the users screen names it, not `sales`. */
const optionLabel = (user) => {
  const role = ROLES.labelOf(user.role);
  return role ? `${user.name} (${role})` : user.name;
};

/**
 * Hands a lead — or a batch of them — to a colleague (§7 `leads.assign`).
 *
 * The directory is passed in rather than searched: a sales desk is a list of
 * people one screen long, and `useAssignableUsers()` has already fetched it for
 * the filter row. "Unassigned" is one of the choices, because taking a lead
 * back off somebody is as much a part of assigning as giving it away.
 *
 * The directory holds active accounts only. A lead that already sits with a
 * deactivated one still shows its owner, marked as such, rather than a select
 * that silently reads "Unassigned" (QA-53).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {React.ReactNode} props.title
 * @param {React.ReactNode} [props.message]
 * @param {Array<{id: number|string, name: string, role?: string}>} props.users
 * @param {number|string|null} [props.value] the current assignee
 * @param {{id: number|string, name: string}|null} [props.current] the current
 *   assignee's record, for one the directory does not list
 * @param {boolean} [props.requireChange] one lead: confirmable only once changed
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
  current = null,
  requireChange = false,
  onConfirm,
  onClose,
  loading = false,
}) {
  const initial = value === null || value === undefined ? UNASSIGNED : String(value);
  const [selected, setSelected] = useState(initial);

  useEffect(() => {
    if (open) setSelected(initial);
  }, [open, initial]);

  const listed = users.some((user) => String(user.id) === initial);
  const options = [
    { value: UNASSIGNED, label: 'Unassigned' },
    ...(initial !== UNASSIGNED && !listed && current
      ? [{ value: initial, label: `${current.name} (inactive)`, disabled: true }]
      : []),
    ...users.map((user) => ({ value: String(user.id), label: optionLabel(user) })),
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
            disabled={requireChange && selected === initial}
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
