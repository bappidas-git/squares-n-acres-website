import { useState } from 'react';
import { Icon } from '@iconify/react';

import authService from '../../../services/authService';
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

const ProfileCard = () => {
  const toast = useToast();
  const { user, updateUser } = useAdminAuth();

  const [values, setValues] = useState({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    avatarUrl: user?.avatarUrl ?? '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

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
      // `PUT` states the whole profile (§5.8): an emptied field becomes null.
      const { data } = await authService.updateProfile({
        name,
        phone: values.phone.trim() || null,
        avatarUrl: values.avatarUrl.trim() || null,
      });
      updateUser(data);
      toast.success(TOASTS.saved('Profile'));
    } catch (error) {
      if (error?.status === 422) {
        setErrors({
          name: error.fieldError?.('name'),
          phone: error.fieldError?.('phone'),
          avatarUrl: error.fieldError?.('avatarUrl'),
        });
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
        setErrors({
          currentPassword: error.fieldError?.('currentPassword'),
          newPassword: error.fieldError?.('newPassword'),
        });
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
