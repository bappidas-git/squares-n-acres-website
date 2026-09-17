import { useState } from 'react';
import { Icon } from '@iconify/react';

import Button from '../../../components/ui/Button';
import redirectService from '../../../services/redirectService';
import { TextField } from '../../../components/ui/FormField';
import { firstFieldMessage } from '../../../services/apiError';

import styles from './RedirectsPage.module.css';

/**
 * "Check a URL" (§4.7 of prompt 37).
 *
 * The table says what the rules are; this says what the **API** does with one
 * path, which is not the same question the moment a rule is inactive, a path
 * has a trailing slash, or two editors wrote overlapping rules an hour apart.
 *
 * It asks the server (`GET /redirects/resolve`) rather than matching the loaded
 * rows in the browser, deliberately: a tester that repeats the screen's own
 * reading of the data can only ever agree with it.
 *
 * One consequence worth knowing: `resolve` is the one endpoint that counts a
 * hit (§9.10), so a path checked here is a path with one more hit against it.
 */
export default function RedirectTester() {
  const [path, setPath] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const check = async (event) => {
    event.preventDefault();
    const wanted = path.trim();
    if (!wanted) return;

    setBusy(true);
    setResult(null);
    try {
      const rule = await redirectService.resolve(wanted);
      setResult(rule ? { kind: 'hit', rule } : { kind: 'miss' });
    } catch (thrown) {
      setResult({
        kind: 'error',
        message: firstFieldMessage(thrown, 'The path could not be checked.'),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={styles.tester} onSubmit={check}>
      <TextField
        label="Check a URL"
        hint="A path on this site, e.g. /old-properties"
        value={path}
        onChange={(event) => setPath(event.target.value)}
        placeholder="/old-properties"
        className={styles.testerInput}
      />
      <Button
        type="submit"
        variant="outline"
        loading={busy}
        disabled={path.trim() === ''}
        icon={<Icon icon="mdi:magnify" width="18" height="18" />}
      >
        Check
      </Button>

      {result ? (
        <p className={styles.testerResult} role="status">
          {result.kind === 'hit' ? (
            <>
              <Icon
                icon="mdi:arrow-right-circle-outline"
                width="18"
                height="18"
                aria-hidden="true"
              />
              <span>
                <strong>{result.rule.fromPath}</strong> sends visitors to{' '}
                <strong>{result.rule.toPath}</strong> with a {result.rule.statusCode}.
              </span>
            </>
          ) : result.kind === 'miss' ? (
            <>
              <Icon icon="mdi:information-outline" width="18" height="18" aria-hidden="true" />
              <span>No redirect — this path is served as it is.</span>
            </>
          ) : (
            <>
              <Icon icon="mdi:alert-outline" width="18" height="18" aria-hidden="true" />
              <span>{result.message}</span>
            </>
          )}
        </p>
      ) : null}
    </form>
  );
}
