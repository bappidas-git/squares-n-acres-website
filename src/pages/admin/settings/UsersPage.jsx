import { useMemo, useState } from 'react';

import Avatar from '../../../components/ui/Avatar';
import Button from '../../../components/ui/Button';
import MasterDataPage from '../../../components/admin/MasterDataPage';
import Modal from '../../../components/ui/Modal';
import StatusChip from '../../../components/admin/StatusChip';
import userService from '../../../services/userService';
import { PASSWORD_PATTERN } from '../../../services/schemas/auth';
import { ROLES } from '../../../config/enums';
import { TextField } from '../../../components/ui/FormField';
import { firstFieldMessage } from '../../../services/apiError';
import { formatDate } from '../../../utils/format';
import { schemas } from '../../../services/schemas';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import { useToast } from '../../../components/common/ToastProvider';

import styles from './UsersPage.module.css';

/** Which tone each role wears, so the chip is the same colour everywhere. */
const ROLE_TONE = { admin: 'primary', manager: 'info', sales: 'success' };

/** The API refuses a password under 8 characters (§5.4, `user.create`). */
const PASSWORD_MIN = 8;

/**
 * What a password must be — eight characters, a letter and a digit — the rule
 * "My profile" and `PUT /auth/password` already kept, and the one the API now
 * keeps for an account created or reset here (QA-64).
 */
export const PASSWORD_RULE = `Use at least ${PASSWORD_MIN} characters, with a letter and a digit.`;

/**
 * Whether a password is one the API accepts.
 *
 * @param {string} password
 * @returns {string|null} the sentence to show, or `null` when it is fine
 */
export function passwordProblem(password) {
  const value = String(password ?? '');
  if (value.length < PASSWORD_MIN || !PASSWORD_PATTERN.test(value)) return PASSWORD_RULE;
  return null;
}

const sameId = (left, right) => String(left) === String(right);

/** The fields of an account the admin header and "My profile" read. */
const sessionFields = (record) => ({
  name: record.name,
  email: record.email,
  role: record.role,
  phone: record.phone ?? null,
  avatarUrl: record.avatarUrl ?? null,
});

/**
 * Admin → Settings → Users (`/admin/settings/users`, admins only, §7).
 *
 * The screen is a `MasterDataPage` configuration: the list, the filters, the
 * dialog, the toggles, the bulk bar and the delete confirm are the kit's, and
 * what is specific to users lives here — the "(You)" marker, the role chip, the
 * password rules and the reset-password action.
 *
 * The safety rules are owned by the API — you cannot deactivate, demote or
 * delete yourself, and the last active admin cannot be removed — which answers
 * 422 with the sentence to show. The screen only stops offering what is
 * certain to be refused for your own row: its role select, its Delete (which
 * asked "This cannot be undone." and was then refused, QA-64) and its Active
 * switch.
 *
 * Your own row is also the signed-in session: a name, an e-mail or an avatar
 * saved here is handed to the session, so the header and "My profile" show it
 * at once — "My profile" used to open on the old name and, saved, put it back
 * (QA-64).
 */
export default function UsersPage() {
  const { user: currentUser, updateUser } = useAdminAuth();
  const toast = useToast();
  const [resetting, setResetting] = useState(null);

  const config = useMemo(
    () => ({
      key: 'users',
      title: 'Users',
      singular: 'user',
      service: userService,
      schema: schemas['user.update'],
      createSchema: schemas['user.create'],
      defaultSort: { field: 'name', order: 'asc' },
      activeToggle: true,
      usageGuard: false,
      canDelete: (row) => !sameId(row.id, currentUser?.id),
      canToggleActive: (row) => !sameId(row.id, currentUser?.id),
      deleteMessage: (row) =>
        `“${row.name}” will be removed and their leads left unassigned. This cannot be undone.`,
      flagMessage: (label, field, on) =>
        field === 'isActive'
          ? `${label} ${on ? 'can sign in again' : 'can no longer sign in'}`
          : undefined,

      columns: [
        {
          key: 'name',
          label: 'Name',
          sortable: true,
          primary: true,
          width: '240px',
          render: (row) => (
            <span className={styles.person}>
              <Avatar name={row.name} src={row.avatarUrl} size={32} />
              <span>
                <span className={styles.name}>{row.name}</span>
                {sameId(row.id, currentUser?.id) ? (
                  <span className={styles.you}> (You)</span>
                ) : null}
              </span>
            </span>
          ),
        },
        { key: 'email', label: 'Email', hideBelow: 'md' },
        {
          key: 'role',
          label: 'Role',
          render: (row) => (
            <StatusChip tone={ROLE_TONE[row.role] ?? 'neutral'} label={ROLES.labelOf(row.role)} />
          ),
        },
        {
          key: 'lastLoginAt',
          label: 'Last login',
          sortable: true,
          hideBelow: 'lg',
          mobile: false,
          render: (row) => (row.lastLoginAt ? formatDate(row.lastLoginAt) : 'Never'),
        },
        {
          key: 'createdAt',
          label: 'Created',
          sortable: true,
          hideBelow: 'lg',
          mobile: false,
          render: (row) => formatDate(row.createdAt),
        },
      ],

      filters: [
        { key: 'q', type: 'search', label: 'Search', placeholder: 'Name or email' },
        {
          key: 'role',
          type: 'select',
          label: 'Role',
          placeholder: 'All roles',
          options: ROLES.options,
        },
        {
          key: 'isActive',
          type: 'toggle',
          label: 'Status',
          trueLabel: 'Active',
          falseLabel: 'Inactive',
          placeholder: 'Any status',
        },
      ],

      bulkActions: [
        { key: 'activate', label: 'Activate', icon: 'mdi:account-check-outline' },
        { key: 'deactivate', label: 'Deactivate', icon: 'mdi:account-off-outline' },
        {
          key: 'delete',
          label: 'Delete',
          icon: 'mdi:delete-outline',
          danger: true,
          confirm: {
            title: 'Delete the selected users?',
            message:
              '{count} will be deleted, and the leads of each unassigned. This cannot be undone.',
          },
        },
      ],

      // The fields depend on the record: a password is required only when there
      // is no account yet, and nobody may change their own role (§7).
      formFields: (record) => {
        const isSelf = record?.id && sameId(record.id, currentUser?.id);
        return [
          { name: 'name', type: 'text', label: 'Full name', required: true, half: true },
          { name: 'email', type: 'email', label: 'Email address', required: true, half: true },
          {
            name: 'password',
            type: 'password',
            label: record?.id ? 'New password' : 'Password',
            required: !record?.id,
            half: true,
            hint: record?.id
              ? `Leave blank to keep the current password. ${PASSWORD_RULE}`
              : PASSWORD_RULE,
          },
          {
            name: 'role',
            type: 'select',
            label: 'Role',
            required: true,
            half: true,
            options: ROLES.options,
            disabled: Boolean(isSelf),
            hint: isSelf ? 'You cannot change your own role.' : undefined,
          },
          { name: 'phone', type: 'phone', label: 'Phone', half: true },
          { name: 'avatarUrl', type: 'image', label: 'Avatar', hint: 'avatar' },
          { name: 'isActive', type: 'switch', label: 'Active' },
        ];
      },

      newValues: { role: 'sales', isActive: true },

      // The API's rule, before the request: a new account's password, and a
      // new one typed into an existing account's form.
      validate: (values) => {
        if (!values.password) return {};
        const problem = passwordProblem(values.password);
        return problem ? { password: problem } : {};
      },

      afterSave: (saved) => {
        if (saved?.id !== undefined && sameId(saved.id, currentUser?.id)) {
          updateUser(sessionFields(saved));
        }
      },

      toFormValues: (record) => ({
        name: record.name ?? '',
        email: record.email ?? '',
        password: '',
        role: record.role ?? 'sales',
        phone: record.phone ?? '',
        avatarUrl: record.avatarUrl ?? '',
        isActive: record.isActive !== false,
      }),

      // An empty password means "unchanged", not "empty" — sending `''` would
      // fail the API's minimum and wipe nothing (§5.14).
      toPayload: (values) => {
        const payload = {
          ...values,
          phone: values.phone ? values.phone : null,
          avatarUrl: values.avatarUrl ? values.avatarUrl : null,
        };
        if (!payload.password) delete payload.password;
        return payload;
      },

      extraRowActions: (row) => [
        {
          key: 'reset-password',
          label: `Reset the password of ${row.name}`,
          icon: 'mdi:lock-reset',
          onClick: () => setResetting(row),
        },
      ],

      emptyState: {
        title: 'No users yet',
        text: 'Add the people who will work in this panel.',
      },
    }),
    [currentUser, updateUser]
  );

  return (
    <>
      <MasterDataPage config={config} />
      <ResetPasswordDialog
        user={resetting}
        isSelf={Boolean(resetting) && sameId(resetting.id, currentUser?.id)}
        onClose={() => setResetting(null)}
        onDone={(name) => {
          setResetting(null);
          toast.success(`The password of ${name} has been reset.`);
        }}
      />
    </>
  );
}

/** Sets a new password for one account, without touching anything else. */
function ResetPasswordDialog({ user, isSelf = false, onClose, onDone }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (saving) return;
    const problem = passwordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }

    setSaving(true);
    try {
      await userService.patch(user.id, { password });
      setPassword('');
      setError('');
      onDone?.(user.name);
    } catch (thrown) {
      setError(firstFieldMessage(thrown, 'The password could not be reset.'));
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    setPassword('');
    setError('');
    onClose?.();
  };

  return (
    <Modal
      open={Boolean(user)}
      onClose={saving ? undefined : close}
      size="sm"
      mobile="fullscreen"
      title="Reset password"
      description={user ? `A new password for ${user.name}.` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Reset password
          </Button>
        </>
      }
    >
      {/* A form, so Enter in the box resets the password as the button does;
          it did nothing (QA-64). */}
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          submit();
        }}
      >
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          error={error}
          hint={
            isSelf
              ? `${PASSWORD_RULE} Your other sessions are signed out; this one stays.`
              : `${PASSWORD_RULE} ${user?.name ?? 'The user'} is signed out everywhere.`
          }
          onChange={(event) => {
            setPassword(event.target.value);
            setError('');
          }}
        />
      </form>
    </Modal>
  );
}
