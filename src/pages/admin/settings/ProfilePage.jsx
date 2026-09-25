import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import authService from '../../../services/authService';
import focusFirstError from '../../../components/admin/focusFirstError';
import useUnsavedChanges from '../../../hooks/useUnsavedChanges';
import validate from '../../../utils/validation';
import {
  Alert,
  Avatar,
  Button,
  Card,
  PhoneField,
  TextField,
  UrlField,
} from '../../../components/ui';
import { FORMS, TOASTS } from '../../../config/adminCopy';
import { GENERIC_MESSAGE } from '../../../services/apiError';
import { relabel } from '../../../hooks/useForm';
import { schemas } from '../../../services/schemas';
import { tidyPhone } from '../../../utils/validators';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import { useToast } from '../../../components/common/ToastProvider';

import styles from './ProfilePage.module.css';

/**
 * The one screen every role has (§7 `profile`): your own name, phone, avatar
 * and password.
 *
 * Both forms speak `/auth/*`, never `/admin/users/*` — a sales user changing
 * their own password must not need the users permission. Changing the password
 * revokes the account's other tokens server-side, which the success note says
 * out loud.
 *
 * What QA-65 settled here:
 *
 *   - the screen reads the account again when it opens, and a box nobody has
 *     typed in follows the account — so a change made in another tab, on
 *     another device or on the Users screen is shown, and never written back
 *     over by a save of the older copy;
 *   - a save locks its boxes until the answer is in, is sent once however the
 *     form is submitted, and is not sent at all when nothing changed;
 *   - the form checks what the API would refuse before asking it, and a refusal
 *     — the form's or the API's, about a field or not — is brought into view;
 *   - leaving during a save says the save carries on, and a failure after
 *     leaving is still reported.
 */

const PASSWORD_RULE = 'Use at least 8 characters with a letter and a digit.';
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const PASSWORD_MAX_LENGTH = schemas['auth.password'].newPassword.maxLength;

/** The login screen's words for the same answer (§5.11). */
const RATE_LIMITED = 'Too many attempts. Try again in a minute.';

/**
 * A URL complete enough to be worth requesting. Without this the preview would
 * fire an image request for every prefix while the field is being typed, and
 * each half-written host would fail loudly in the console.
 */
const IMAGE_URL_RE = /^https?:\/\/[^\s/?#]+\.[^\s/?#]{2,}(\/\S*)?$/i;

/**
 * What leaving asks while a save is on its way. "Discard unsaved changes?"
 * was the question, and "Discard changes" discarded nothing: the save went on
 * and landed after the editor had left — a password among them (QA-65, as
 * QA-64 found on Site settings).
 */
const PROFILE_SAVING_QUESTION = {
  title: 'Leave while your profile is saving?',
  message: 'The save carries on after you leave, and a message says if it fails.',
  confirmLabel: 'Leave',
  cancelLabel: 'Stay until it is saved',
};

const PASSWORD_SAVING_QUESTION = {
  title: 'Leave while your password is being changed?',
  message: 'The change carries on after you leave, and a message says whether it went through.',
  confirmLabel: 'Leave',
  cancelLabel: 'Stay until it is done',
};

/**
 * What the API's sentences call these fields: "The avatarUrl must be a valid
 * URL." reached the screen as it was (QA-64).
 */
const FIELD_LABELS = {
  phone: 'phone number',
  avatarUrl: 'avatar URL',
  currentPassword: 'current password',
  newPassword: 'new password',
};

const PROFILE_FIELDS = ['name', 'phone', 'avatarUrl'];
const PASSWORD_FIELDS = ['currentPassword', 'newPassword'];

/** What a failure says, when it says nothing a person could act on. */
const messageOf = (error) => {
  if (error?.status === 429) return RATE_LIMITED;
  return error?.message || GENERIC_MESSAGE;
};

/**
 * A failure as a form shows it: each message about one of its own fields
 * under that field, and everything else above the form. A 422 about a field
 * the form does not have — or about none — used to paint nothing at all: the
 * button stopped spinning and the screen said nothing (QA-65).
 *
 * @returns {{fieldErrors: Record<string, string>, formError: string}}
 */
function failureOf(error, fields) {
  if (error?.status !== 422) return { fieldErrors: {}, formError: messageOf(error) };

  const fieldErrors = {};
  let formError = '';
  for (const [key, messages] of Object.entries(error.errors ?? {})) {
    const message = Array.isArray(messages) ? messages[0] : messages;
    if (!message) continue;
    if (fields.includes(key)) fieldErrors[key] = String(message);
    else if (!formError) formError = String(message);
  }
  if (Object.keys(fieldErrors).length === 0 && !formError) formError = messageOf(error);
  return { fieldErrors: relabel(fieldErrors, FIELD_LABELS), formError };
}

/** The one sentence of a failure, for the toast of a save the editor left. */
const failureSentence = (error, fields) => {
  const { fieldErrors, formError } = failureOf(error, fields);
  return Object.values(fieldErrors)[0] || formError;
};

/** The three boxes of the profile form, as the signed-in user holds them. */
const profileValues = (user) => ({
  name: user?.name ?? '',
  phone: user?.phone ?? '',
  avatarUrl: user?.avatarUrl ?? '',
});

/**
 * The body a save sends. `PUT` states the whole profile (§5.8): an emptied
 * field becomes null, a phone number is the ten digits every record stores,
 * however it was typed (QA-61), and a name is its words with one space
 * between them — "Admin     User" was stored as typed (QA-65).
 */
const profileBody = (values) => ({
  name: values.name.trim().replace(/\s+/g, ' '),
  phone: tidyPhone(values.phone.trim()) || null,
  avatarUrl: values.avatarUrl.trim() || null,
});

/**
 * What the API would refuse, said before asking it: a phone number, an
 * address or a name it cannot take cost a request and a red 422 in the console
 * each, and the name box took 5 000 characters without a word (QA-65). The
 * rules are the API's own descriptors (`schemas['auth.profile']`).
 */
function profileProblems(body) {
  if (!body.name) return { name: 'Enter your full name.' };
  return relabel(validate(body, schemas['auth.profile']), FIELD_LABELS);
}

const sameValues = (left, right) => JSON.stringify(left) === JSON.stringify(right);

/**
 * The boxes after the signed-in user changed underneath them: a box nobody
 * has typed in takes the new value, a box with an edit keeps it. All or
 * nothing, a name typed in one box froze the other two, and a phone number
 * changed on another device went back to the old one with the next save.
 */
const followUntouched = (typed, was, now) =>
  Object.fromEntries(
    Object.keys(now).map((field) => [
      field,
      typed[field] === was[field] ? now[field] : typed[field],
    ])
  );

/** A record the profile form can show — not a message, nor a proxy's HTML page. */
const isUserRecord = (data) =>
  Boolean(data) && typeof data === 'object' && typeof data.name === 'string';

/** Whether the component is still on the screen, for answers that arrive late. */
function useMountedRef() {
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
}

/**
 * After a refused submit has drawn its messages: the cursor in the first field
 * in error, or — for a refusal about no field — the message above the form in
 * view. On a phone the name box and the message sit above the fold of the
 * Save button, and a refused save did nothing that could be seen (QA-65, as
 * QA-60 found elsewhere).
 */
function useShowRefusal(refusals, formRef, alertRef) {
  useEffect(() => {
    if (refusals === 0) return;
    if (focusFirstError(formRef.current)) return;
    alertRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [refusals, formRef, alertRef]);
}

const ProfileCard = () => {
  const toast = useToast();
  const { user, updateUser } = useAdminAuth();
  const mounted = useMountedRef();
  const formRef = useRef(null);
  const alertRef = useRef(null);

  const [values, setValues] = useState(() => profileValues(user));
  // The signed-in user the boxes were filled from. It changes after the
  // screen has opened — the account is read again when it opens, and a save in
  // another tab or of your own row on the Users screen reaches it too — and
  // each box nobody has typed in follows it (QA-64, QA-65).
  const [baseline, setBaseline] = useState(() => profileValues(user));
  const current = profileValues(user);
  if (!sameValues(current, baseline)) {
    setBaseline(current);
    setValues((typed) => followUntouched(typed, baseline, current));
  }

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  // Read and set in the same event: five submits dispatched before a render
  // were five requests, however disabled the button was about to become.
  const savingRef = useRef(false);
  const [refusals, setRefusals] = useState(0);
  // The preview address that could not be loaded.
  const [brokenSrc, setBrokenSrc] = useState(null);

  const dirty = !sameValues(values, baseline);

  // Leaving with an edit asks first, as every other form of the admin does;
  // leaving while it saves says the save carries on (QA-65).
  useUnsavedChanges(dirty, { question: saving ? PROFILE_SAVING_QUESTION : undefined });
  useShowRefusal(refusals, formRef, alertRef);

  const setField = (field) => (event) => {
    const { value } = event.target;
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => (previous[field] ? { ...previous, [field]: undefined } : previous));
    if (formError) setFormError('');
  };

  const refuse = ({ fieldErrors = {}, formError: message = '' }) => {
    setErrors(fieldErrors);
    setFormError(message);
    setRefusals((count) => count + 1);
  };

  const discard = () => {
    setValues(baseline);
    setErrors({});
    setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (savingRef.current) return;
    setErrors({});
    setFormError('');

    const body = profileBody(values);
    const problems = profileProblems(body);
    if (Object.keys(problems).length > 0) {
      refuse({ fieldErrors: problems });
      return;
    }

    // Nothing to write: say so, as every other editor of the admin does, and
    // show the stored values — the spaces around the name gone, the number as
    // it is kept. A request here only moved `updatedAt` (QA-65).
    if (sameValues(body, profileBody(baseline))) {
      setValues(baseline);
      toast.info(FORMS.noChanges);
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const { data } = await authService.updateProfile(body);
      // A 200 that is not the record — a proxy's page, an empty answer — is
      // not a save anybody can confirm; taken as one, it emptied the boxes.
      if (!isUserRecord(data)) {
        throw new Error(
          'The server’s answer could not be read. Reload the page to see whether your profile was saved.'
        );
      }
      updateUser(data);
      // The boxes show what is stored — the number's ten digits, the name
      // without the spaces around it — not what was typed. Nothing can have
      // been typed since: the boxes are locked while the save is on its way.
      if (mounted.current) setValues(profileValues(data));
      toast.success(TOASTS.saved('Profile'));
    } catch (error) {
      // A session that ended says so itself, and takes the screen with it.
      if (error?.status === 401) return;
      if (!mounted.current) {
        toast.error(`Your profile could not be saved. ${failureSentence(error, PROFILE_FIELDS)}`);
        return;
      }
      refuse(failureOf(error, PROFILE_FIELDS));
    } finally {
      savingRef.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  const previewSrc = IMAGE_URL_RE.test(values.avatarUrl.trim()) ? values.avatarUrl.trim() : null;
  const previewBroken = Boolean(previewSrc) && brokenSrc === previewSrc;

  return (
    <Card padding="lg" as="section" aria-labelledby="profile-card-title">
      <h2 className={styles.cardTitle} id="profile-card-title">
        Profile
      </h2>
      <p className={styles.cardHint}>
        Your name appears on the leads you work and in the admin header.
      </p>

      {formError ? (
        <div ref={alertRef} className={styles.alert}>
          <Alert tone="error">{formError}</Alert>
        </div>
      ) : null}

      <form
        ref={formRef}
        className={styles.form}
        onSubmit={handleSubmit}
        noValidate
        aria-busy={saving || undefined}
      >
        <TextField
          label="Full name"
          name="name"
          autoComplete="name"
          required
          readOnly={saving}
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
          readOnly={saving}
          value={values.phone}
          onChange={setField('phone')}
          error={errors.phone}
        />

        <UrlField
          label="Avatar URL"
          name="avatarUrl"
          hint="A square image reads best. Leave empty to use your initials."
          readOnly={saving}
          value={values.avatarUrl}
          onChange={setField('avatarUrl')}
          error={errors.avatarUrl}
        />

        {previewSrc ? (
          <div className={styles.preview}>
            {/* The avatar the header will draw — round, with the initials when
                the picture does not load — rather than a square picture that
                showed the company's monogram for an address that led nowhere
                (QA-65). */}
            <Avatar
              src={previewSrc}
              name={values.name.trim() || user?.name || ''}
              size={72}
              onImageError={setBrokenSrc}
            />
            <span className={styles.previewText}>
              <span className={styles.previewLabel}>Avatar preview</span>
              <span className={styles.previewWarning} role="status">
                {previewBroken
                  ? 'This picture could not be loaded, so your initials show instead. Check the address.'
                  : ''}
              </span>
            </span>
          </div>
        ) : null}

        <div className={styles.actions}>
          <Button type="submit" loading={saving}>
            Save profile
          </Button>
          {dirty && !saving ? (
            <Button variant="ghost" onClick={discard}>
              {FORMS.discard}
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  );
};

const EMPTY_PASSWORDS = { currentPassword: '', newPassword: '', confirmPassword: '' };

const PasswordCard = () => {
  const toast = useToast();
  const { user } = useAdminAuth();
  const mounted = useMountedRef();
  const formRef = useRef(null);
  const alertRef = useRef(null);

  const [values, setValues] = useState(EMPTY_PASSWORDS);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [refusals, setRefusals] = useState(0);

  // A half-typed password is work too; leaving asks first (QA-64), and while
  // the change is on its way, says that it carries on (QA-65).
  useUnsavedChanges(Object.values(values).some(Boolean), {
    question: saving ? PASSWORD_SAVING_QUESTION : undefined,
  });
  useShowRefusal(refusals, formRef, alertRef);

  const setField = (field) => (event) => {
    const { value } = event.target;
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => (previous[field] ? { ...previous, [field]: undefined } : previous));
    if (formError) setFormError('');
  };

  const refuse = ({ fieldErrors = {}, formError: message = '' }) => {
    setErrors(fieldErrors);
    setFormError(message);
    setRefusals((count) => count + 1);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (savingRef.current) return;
    setErrors({});
    setFormError('');

    const next = {};
    if (!values.currentPassword) next.currentPassword = 'Enter your current password.';
    if (!PASSWORD_RE.test(values.newPassword)) next.newPassword = PASSWORD_RULE;
    else if (values.newPassword.length > PASSWORD_MAX_LENGTH) {
      // The API's limit, said before the request (QA-65).
      next.newPassword = `Use at most ${PASSWORD_MAX_LENGTH} characters.`;
    }
    // Changing it to itself signed every other session out and changed
    // nothing else (QA-64).
    else if (values.newPassword === values.currentPassword) {
      next.newPassword = 'Choose a password different from the current one.';
    }
    if (values.confirmPassword !== values.newPassword) {
      next.confirmPassword = 'The two passwords do not match.';
    }
    if (Object.keys(next).length > 0) {
      refuse({ fieldErrors: next });
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      await authService.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      if (mounted.current) setValues(EMPTY_PASSWORDS);
      toast.success('Password changed. Your other sessions have been signed out.');
    } catch (error) {
      if (error?.status === 401) return;
      if (!mounted.current) {
        toast.error(`Your password was not changed. ${failureSentence(error, PASSWORD_FIELDS)}`);
        return;
      }
      refuse(failureOf(error, PASSWORD_FIELDS));
    } finally {
      savingRef.current = false;
      if (mounted.current) setSaving(false);
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
        <div ref={alertRef} className={styles.alert}>
          <Alert tone="error">{formError}</Alert>
        </div>
      ) : null}

      <form
        ref={formRef}
        className={styles.form}
        onSubmit={handleSubmit}
        noValidate
        aria-busy={saving || undefined}
      >
        {/* Whose password this is, for the browser's password manager: without
            it the new password could not be filed under the account, and
            Chrome said "Password forms should have (optionally hidden)
            username fields" (QA-65). */}
        <input
          type="email"
          name="username"
          autoComplete="username"
          value={user?.email ?? ''}
          readOnly
          hidden
        />

        <TextField
          label="Current password"
          type="password"
          name="currentPassword"
          autoComplete="current-password"
          required
          readOnly={saving}
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
          readOnly={saving}
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
          readOnly={saving}
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
  const { user, role, refreshProfile } = useAdminAuth();

  // The account as it is now, not as it was when the panel was opened: a name
  // changed on another device, or by an administrator on the Users screen, was
  // shown stale here — and a save put it back (QA-65). The boxes nobody has
  // typed in follow what comes back; a failed read leaves the screen as it is,
  // and a revoked session is ended by the 401 itself.
  useEffect(() => {
    refreshProfile?.().catch(() => {});
  }, [refreshProfile]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>My profile</h1>
        <p className={styles.subtitle}>
          <Icon
            icon="mdi:shield-account-outline"
            width={18}
            height={18}
            aria-hidden="true"
            className={styles.subtitleIcon}
          />
          <span className={styles.email}>{user?.email}</span>
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
