import React, { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { useLocation, useNavigate } from 'react-router-dom';

import PATHS from '../../routes/paths';
import Seo from '../../components/seo/Seo';
import { Alert, Button, IconButton, Logo, TextField } from '../../components/ui';
import { BRAND } from '../../config/site';
import { GENERIC_MESSAGE } from '../../services/apiError';
import { canAccessAdminRoute } from '../../routes/adminRouteConfig';
import { getEmailErrorMessage } from '../../utils/validators';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

import styles from './AdminLogin.module.css';

/**
 * The only way into the admin panel (D24).
 *
 * There is no "Remember me": §5.4 persists every session for the token's TTL
 * and enforces the expiry client-side, so the checkbox could only have lied.
 * Seed credentials are never printed on the page.
 *
 * Two fields and one submit: the screen keeps them in local state rather than
 * reaching for `useForm`, which exists for the forty-field forms behind it.
 */

const INVALID_CREDENTIALS = 'Invalid email or password.';
const RATE_LIMITED = 'Too many attempts. Try again in a minute.';

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, role } = useAdminAuth();

  const [values, setValues] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from;

  /**
   * Back to where the session was interrupted — but only when this role may
   * open it; otherwise the dashboard, which every role can (D32).
   */
  const destinationFor = useCallback(
    (forRole) => {
      const pathname = from?.pathname;
      if (!pathname || pathname === PATHS.adminLogin) return PATHS.adminDashboard;
      if (!canAccessAdminRoute(forRole, pathname)) return PATHS.adminDashboard;
      return { pathname, search: from.search || '', hash: from.hash || '' };
    },
    [from]
  );

  useEffect(() => {
    if (isAuthenticated && role) navigate(destinationFor(role), { replace: true });
  }, [isAuthenticated, role, destinationFor, navigate]);

  const handleChange = (field) => (event) => {
    const { value } = event.target;
    setValues((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) =>
      previous[field] ? { ...previous, [field]: undefined } : previous
    );
    if (formError) setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setFieldErrors({});

    // `POST /auth/login` allows ten attempts a minute per IP (§5.11), and an
    // address with no `@` in it was spending one of them to be told so by the
    // server. The shape of the address is the one thing the page can answer on
    // its own; everything else — whether the account exists, whether the
    // password is right, how long it has to be — stays the server's to say.
    const emailError = getEmailErrorMessage(values.email.trim(), true, { label: 'Email address' });
    if (emailError) {
      setFieldErrors({ email: emailError });
      return;
    }

    setSubmitting(true);

    try {
      await login(values.email.trim(), values.password);
      // The redirect is the effect above: it runs as soon as the session lands.
    } catch (error) {
      if (error?.status === 401) setFormError(INVALID_CREDENTIALS);
      else if (error?.status === 429) setFormError(RATE_LIMITED);
      else if (error?.status === 422) {
        setFieldErrors({
          email: error.fieldError?.('email'),
          password: error.fieldError?.('password'),
        });
        if (!error.errors || Object.keys(error.errors).length === 0) setFormError(error.message);
      } else setFormError(error?.message || GENERIC_MESSAGE);
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <Seo type="admin" title="Sign in" description={`Sign in to the ${BRAND.name} admin panel.`} />

      <main className={styles.card}>
        <div className={styles.brand}>
          <Logo variant="wordmark" height={56} />
          <p className={styles.caption}>Admin panel</p>
        </div>

        <h1 className={styles.heading}>Sign in</h1>

        {formError ? (
          <Alert tone="error" className={styles.alert}>
            {formError}
          </Alert>
        ) : null}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <TextField
            label="Email address"
            type="email"
            name="email"
            autoComplete="username"
            autoFocus
            required
            value={values.email}
            onChange={handleChange('email')}
            error={fieldErrors.email}
          />

          <div className={styles.passwordRow}>
            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              required
              value={values.password}
              onChange={handleChange('password')}
              error={fieldErrors.password}
              fieldClassName={styles.passwordField}
            />
            <IconButton
              label={showPassword ? 'Hide password' : 'Show password'}
              className={styles.passwordToggle}
              onClick={() => setShowPassword((previous) => !previous)}
            >
              <Icon
                icon={showPassword ? 'mdi:eye-off-outline' : 'mdi:eye-outline'}
                width={20}
                height={20}
              />
            </IconButton>
          </div>

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={submitting}
            disabled={!values.email || !values.password}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        {/* There is no self-service reset yet (prompt 51): the way back in is
            an administrator, and the screen says so rather than leaving a
            locked-out user to guess. */}
        <p className={styles.forgot}>
          Forgot your password? Ask an administrator to reset it from Settings → Users.
        </p>
      </main>
    </div>
  );
};

export default AdminLogin;
