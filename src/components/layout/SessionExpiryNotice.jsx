import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';

import Button from '../ui/Button';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

import styles from './SessionExpiryNotice.module.css';

/** How often the countdown moves while the notice is up. */
const TICK_MS = 15000;

/**
 * "in 4 minutes", "in less than a minute".
 *
 * @param {string|null} expiresAt
 * @param {number} [now]
 * @returns {string}
 */
export function timeLeft(expiresAt, now = Date.now()) {
  const ms = Date.parse(expiresAt ?? '') - now;
  if (!Number.isFinite(ms) || ms <= 60000) return 'in less than a minute';
  const minutes = Math.ceil(ms / 60000);
  return `in ${minutes} minute${minutes === 1 ? '' : 's'}`;
}

/**
 * "Your session ends in 4 minutes. — Stay signed in" (prompt 51).
 *
 * The session used to end without a word at its 24th hour, mid-sentence. It
 * now says so five minutes before, under the top bar of every admin screen,
 * and one click gives it a full lifetime again. Nothing is drawn otherwise.
 */
export default function SessionExpiryNotice() {
  const { expiringSoon, expiresAt, staySignedIn } = useAdminAuth();
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!expiringSoon) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [expiringSoon]);

  if (!expiringSoon) return null;

  const stay = async () => {
    setBusy(true);
    try {
      await staySignedIn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.notice} aria-label="Session ending">
      <Icon icon="mdi:timer-sand" width="20" height="20" aria-hidden="true" />
      <p className={styles.text} role="alert">
        Your session ends {timeLeft(expiresAt, now)}. Stay signed in to keep working without signing
        in again.
      </p>
      <Button size="sm" loading={busy} onClick={stay}>
        Stay signed in
      </Button>
    </section>
  );
}
