import { useState } from 'react';
import { Icon } from '@iconify/react';

import authService from '../../../services/authService';
import useUnsavedChanges from '../../../hooks/useUnsavedChanges';
import {
  Alert,
  Button,
  Card,
  LazyImage,
  PhoneField,
  TextField,
  UrlField,
} from '../../../components/ui';
import { GENERIC_MESSAGE } from '../../../services/apiError';
import { relabel } from '../../../hooks/useForm';
import { tidyPhone } from '../../../utils/validators';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import { useToast } from '../../../components/common/ToastProvider';

import styles from './ProfilePage.module.css';
import { TOASTS } from '../../../config/adminCopy';

/**
 * The one screen every role has (§7 `profile`): your own name, phone, avatar
 * and password.
 *
 * Both forms speak `/auth/*`, never `/admin/users/*` — a sales user changing
 * their own password must not need the users permission. Changing the password
 * revokes the account's other tokens server-side, which the success note says
 * out loud.
 */

const PASSWORD_RULE = 'Use at least 8 characters with a letter and a digit.';
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

/**
 * A URL complete enough to be worth requesting. Without this the preview would
 * fire an image request for every prefix while the field is being typed, and
 * each half-written host would fail loudly in the console.
 */
const IMAGE_URL_RE = /^https?:\/\/[^\s/?#]+\.[^\s/?#]{2,}(\/\S*)?$/i;

const messageOf = (error, fallback = GENERIC_MESSAGE) => error?.message || fallback;

/**
 * What the API's sentences call these fields: "The avatarUrl must be a valid
 * URL." reached the screen as it was (QA-64).
 */
const FIELD_LABELS = {
  avatarUrl: 'avatar URL',
  currentPassword: 'current password',
  newPassword: 'new password',
};

/** The messages of a 422 for the given fields, in the words the form uses. */
const fieldErrors = (error, fields) =>
  relabel(
    Object.fromEntries(fields.map((field) => [field, error.fieldError?.(field)])),
    FIELD_LABELS
  );

/** The three boxes of the profile form, as the signed-in user holds them. */
const profileValues = (user) => ({
  name: user?.name ?? '',
  phone: user?.phone ?? '',
  avatarUrl: user?.avatarUrl ?? '',
});

const sameValues = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const ProfileCard = () => {
  const toast = useToast();
  const { user, updateUser } = useAdminAuth();

  const [values, setValues] = useState(() => profileValues(user));
  // The signed-in user the boxes were filled from. The session is confirmed
  // with the API after the screen has opened, and a name saved on the Users
  // screen reaches it too: the form kept what it had mounted with, and Save
  // wrote that back over the newer name (QA-64). While nothing has been
  // typed, the boxes follow the user; once something has, they are left alone.
  const [baseline, setBaseline] = useState(() => profileValues(user));
  const current = profileValues(user);
  if (!sameValues(current, baseline)) {
    setBaseline(current);
    if (sameValues(values, baseline)) setValues(current);
  }

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Leaving with an edit asks first, as every other form of the admin does.
  useUnsavedChanges(!sameValues(values, baseline));

  const setField = (field) => (event) => {
    const { value } = event.target;
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => (previous[field] ? { ...previous, [field]: undefined } : previous));
    if (formError) setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({});
    setFormError('');

    const name = values.name.trim();
    if (name.length < 2) {
      setErrors({ name: 'Enter your full name.' });
      return;
    }

    setSaving(true);
    try {
      // `PUT` states the whole profile (§5.8): an emptied field becomes null,
      // and a phone number is the ten digits every record stores, however it
      // was typed (QA-61).
      const { data } = await authService.updateProfile({
        name,
        phone: tidyPhone(values.phone.trim()) || null,
        avatarUrl: values.avatarUrl.trim() || null,
      });
      updateUser(data);
      // The boxes show what is stored — the number's ten digits, the name
      // without the spaces around it — not what was typed.
      setValues(profileValues(data));
      toast.success(TOASTS.saved('Profile'));
    } catch (error) {
      if (error?.status === 422) {
        setErrors(fieldErrors(error, ['name', 'phone', 'avatarUrl']));
      } else setFormError(messageOf(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card padding="lg" as="section" aria-labelledby="profile-card-title">
      <h2 className={styles.cardTitle} id="profile-card-title">
        Profile
      </h2>
      <p className={styles.cardHint}>
        Your name appears on the leads you work and in the admin header.
      </p>

      {formError ? (
        <Alert tone="error" className={styles.alert}>
          {formError}
        </Alert>
      ) : null}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          label="Full name"
          name="name"
          autoComplete="name"
          required
          value={values.name}
          onChange={setField('name')}
          error={errors.name}
        />

        <PhoneField
          label="Phone"
          name="phone"
          hint="10 digits, without the country code."
          // Room for a number as people write it — "98450 12345", "+91
          // 98450-12345" — which is sent as its ten digits. Capped at ten,
          // "98450 12345" was cut to "98450 1234" and refused (QA-61).
          maxLength={18}
          value={values.phone}
          onChange={setField('phone')}
          error={errors.phone}
        />

        <UrlField
          label="Avatar URL"
          name="avatarUrl"
          hint="A square image reads best. Leave empty to use your initials."
          value={values.avatarUrl}
          onChange={setField('avatarUrl')}
          error={errors.avatarUrl}
        />

        {IMAGE_URL_RE.test(values.avatarUrl.trim()) ? (
          <div className={styles.preview}>
            <LazyImage
              src={values.avatarUrl.trim()}
              alt={`${values.name || 'Avatar'} preview`}
              ratio="1"
              sizes="96px"
              className={styles.previewImage}
            />
            <span className={styles.previewLabel}>Avatar preview</span>
          </div>
        ) : null}

        <div className={styles.actions}>
          <Button type="submit" loading={saving}>
            Save profile
          </Button>
        </div>
      </form>
    </Card>
  );
};

const PasswordCard = () => {
  const toast = useToast();

  const [values, setValues] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // A half-typed password is work too; leaving asks first (QA-64).
  useUnsavedChanges(Object.values(values).some(Boolean));

  const setField = (field) => (event) => {
    const { value } = event.target;
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => (previous[field] ? { ...previous, [field]: undefined } : previous));
    if (formError) setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({});
    setFormError('');

    const next = {};
    if (!values.currentPassword) next.currentPassword = 'Enter your current password.';
    if (!PASSWORD_RE.test(values.newPassword)) next.newPassword = PASSWORD_RULE;
    // Changing it to itself signed every other session out and changed
    // nothing else (QA-64).
    else if (values.newPassword === values.currentPassword) {
      next.newPassword = 'Choose a password different from the current one.';
    }
    if (values.confirmPassword !== values.newPassword) {
      next.confirmPassword = 'The two passwords do not match.';
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setSaving(true);
    try {
      await authService.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setValues({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed. Your other sessions have been signed out.');
    } catch (error) {
      if (error?.status === 422) {
        setErrors(fieldErrors(error, ['currentPassword', 'newPassword']));
      } else setFormError(messageOf(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card padding="lg" as="section" aria-labelledby="password-card-title">
      <h2 className={styles.cardTitle} id="password-card-title">
        Change password
      </h2>
      <p className={styles.cardHint}>
        Changing it signs you out everywhere else — this device stays signed in.
      </p>

      {formError ? (
        <Alert tone="error" className={styles.alert}>
          {formError}
        </Alert>
      ) : null}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          label="Current password"
          type="password"
          name="currentPassword"
          autoComplete="current-password"
          required
          value={values.currentPassword}
          onChange={setField('currentPassword')}
          error={errors.currentPassword}
        />

        <TextField
          label="New password"
          type="password"
          name="newPassword"
          autoComplete="new-password"
          required
          hint={PASSWORD_RULE}
          value={values.newPassword}
          onChange={setField('newPassword')}
          error={errors.newPassword}
        />

        <TextField
          label="Confirm new password"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          value={values.confirmPassword}
          onChange={setField('confirmPassword')}
          error={errors.confirmPassword}
        />

        <div className={styles.actions}>
          <Button type="submit" variant="secondary" loading={saving}>
            Change password
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default function ProfilePage() {
  const { user, role } = useAdminAuth();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>My profile</h1>
        <p className={styles.subtitle}>
          <Icon icon="mdi:shield-account-outline" width={18} height={18} aria-hidden="true" />
          {user?.email}
          {role ? <span className={styles.role}>{role}</span> : null}
        </p>
      </header>

      <div className={styles.cards}>
        <ProfileCard />
        <PasswordCard />
      </div>
    </div>
  );
}
