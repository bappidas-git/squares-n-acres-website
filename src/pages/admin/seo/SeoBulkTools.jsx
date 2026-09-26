import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { CheckboxGroup } from '../../../components/ui/FormField';
import { analyze, generateDefaults } from '../../../seo';
import { firstFieldMessage } from '../../../services/apiError';
import { serviceFor, typeLabel } from './seoEntityServices';
import { toSeoPayload, withSeoDefaults } from '../../../components/seo/seoValues';
import { useToast } from '../../../components/common/ToastProvider';

import styles from './SeoDashboardPage.module.css';

/** Trimmed text, so `null`, `undefined` and `'  '` are all "nothing". */
const text = (value) => String(value ?? '').trim();

/**
 * The `seo` patch a re-analysis implies, or `null` when nothing moved.
 *
 * Re-writing forty records to store the same numbers they already hold is
 * forty requests nobody asked for, so the comparison is on the answer rather
 * than on the run: the score, the two counts and every test's status.
 *
 * @param {string} entityType
 * @param {object} entity the record as the API answered it
 * @param {object} [context] what `analyze` reads — settings, site index, master data
 * @returns {object|null} the fields to store
 */
export function planReanalysis(entityType, entity, context = {}) {
  const result = analyze(entityType, entity ?? {}, context);
  const stored = entity?.seo ?? {};

  const same =
    stored.score === result.score &&
    stored.scoreBand === result.band &&
    stored.testsPassed === result.testsPassed &&
    stored.testsTotal === result.testsTotal &&
    signatureOf(stored.analysis) === signatureOf(result.groups);

  if (same) return null;

  return {
    score: result.score,
    scoreBand: result.band,
    testsPassed: result.testsPassed,
    testsTotal: result.testsTotal,
    analysis: result.groups,
    lastAnalyzedAt: new Date().toISOString(),
  };
}

/** Every test's verdict as one comparable string. */
const signatureOf = (groups) =>
  Object.values(groups ?? {})
    .flat()
    .map((test) => `${test?.id}:${test?.status}:${test?.message}`)
    .join('|');

/**
 * The `seo` patch "auto-generate missing" implies, or `null` when the record
 * already says everything.
 *
 * The rule the boilerplate got wrong (ADD-20) and this does not: **a generated
 * value never replaces one a person wrote** unless "overwrite" was ticked, and
 * ticking it is a separate, confirmed decision. `generateDefaults` enforces
 * that; this function only stores what actually came back different, so a run
 * over a well-written site writes nothing at all.
 *
 * @param {string} entityType
 * @param {object} entity
 * @param {object} [seoSettings]
 * @param {{overwrite?: boolean, context?: object}} [options]
 * @returns {object|null}
 */
export function planGeneration(entityType, entity, seoSettings, options = {}) {
  const generated = generateDefaults(entityType, entity ?? {}, seoSettings ?? {}, options);
  const stored = withSeoDefaults(entity?.seo);
  const patch = {};

  if (text(generated.title) && text(generated.title) !== text(stored.title)) {
    patch.title = generated.title;
  }
  if (text(generated.description) && text(generated.description) !== text(stored.description)) {
    patch.description = generated.description;
  }
  if (text(generated.focusKeyword) && text(generated.focusKeyword) !== text(stored.focusKeyword)) {
    patch.focusKeyword = generated.focusKeyword;
  }

  const imageUrl = text(generated.og?.imageUrl);
  if (imageUrl && imageUrl !== text(stored.og?.imageUrl)) {
    patch.og = { ...stored.og, imageUrl: generated.og.imageUrl };
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

/**
 * The two site-wide runs of the SEO desk (§4.4 of prompt 37).
 *
 * Both walk the rows the desk is showing, one record at a time: read the whole
 * record, work out what should change, and write only that. Sequential on
 * purpose — forty parallel writes to a JSON file is a race, and a progress bar
 * that moves is worth more to an editor than a run that finishes two seconds
 * sooner.
 *
 * **Cancel keeps what it has already written.** The dialog stops at the record
 * it is on; the ones before it are saved, which is what an editor means when
 * they stop a run of two hundred after the first thirty.
 *
 * @param {object} props
 * @param {Array<object>} props.rows the overview rows to run over
 * @param {object} [props.seoSettings]
 * @param {object} [props.context] what `analyze` and the templates read
 * @param {boolean} [props.disabled]
 * @param {(summary: object) => void} [props.onFinished] the desk refreshes here
 * @param {boolean} [props.autoStart] "Re-analyse all" pressed somewhere else on the
 *   desk — the Issues tab's empty state, the table's — starts the run here, once
 * @param {() => void} [props.onAutoStarted] the request is spent
 */
export default function SeoBulkTools({
  rows = [],
  seoSettings,
  context,
  disabled = false,
  onFinished,
  autoStart = false,
  onAutoStarted,
}) {
  const toast = useToast();
  const [mode, setMode] = useState(null);
  const [overwrite, setOverwrite] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [progress, setProgress] = useState(null);
  const cancelled = useRef(false);
  // A closed dialog stays closed: the loop is still awaiting a request when
  // the dialog goes away, and the update it lands afterwards must not reopen it.
  const dismissed = useRef(false);

  const total = rows.length;

  const run = useCallback(
    async (kind, replaceExisting) => {
      cancelled.current = false;
      dismissed.current = false;
      setMode(kind);

      const report = (next) => {
        if (!dismissed.current) setProgress(next);
      };

      report({ done: 0, total, changed: 0, skipped: 0, failed: 0, errors: [], running: true });

      const summary = { done: 0, changed: 0, skipped: 0, failed: 0, errors: [] };

      for (const row of rows) {
        if (cancelled.current) break;

        const service = serviceFor(row.type);
        if (!service) {
          summary.skipped += 1;
          summary.done += 1;
          report({ ...summary, total, running: true });
          continue;
        }

        try {
          const { data: entity } = await service.get(row.id);
          const patch =
            kind === 'reanalyse'
              ? planReanalysis(row.type, entity, context)
              : planGeneration(row.type, entity, seoSettings, {
                  overwrite: replaceExisting,
                  context,
                });

          if (patch) {
            const seo = toSeoPayload(
              { ...withSeoDefaults(entity?.seo), ...patch },
              entity?.slug ?? ''
            );
            await service.patch(row.id, { seo });
            summary.changed += 1;
          } else {
            summary.skipped += 1;
          }
        } catch (thrown) {
          summary.failed += 1;
          summary.errors.push({
            key: row.key ?? `${row.type}:${row.id}`,
            title: row.title || typeLabel(row.type),
            message: firstFieldMessage(thrown, 'This record could not be saved.'),
          });
        }

        summary.done += 1;
        report({ ...summary, total, running: true });
      }

      report({ ...summary, total, running: false, cancelled: cancelled.current });

      const verb = kind === 'reanalyse' ? 'analysed' : 'updated';
      toast[summary.failed > 0 ? 'error' : 'success'](
        `${summary.changed} ${verb}, ${summary.skipped} already fine` +
          (summary.failed > 0 ? `, ${summary.failed} failed` : '') +
          (cancelled.current ? ' — stopped early.' : '.')
      );

      onFinished?.(summary);
    },
    [rows, total, context, seoSettings, toast, onFinished]
  );

  // A "Re-analyse all" pressed elsewhere on the desk runs here, where the
  // progress dialog is — once the rows it runs over have arrived.
  const runRef = useRef(run);
  runRef.current = run;
  const autoStartedRef = useRef(onAutoStarted);
  autoStartedRef.current = onAutoStarted;
  useEffect(() => {
    if (!autoStart || disabled) return;
    autoStartedRef.current?.();
    if (total === 0) {
      toast.info('There is nothing to analyse yet — the site has no records the desk can score.');
      return;
    }
    runRef.current('reanalyse', false);
  }, [autoStart, disabled, total, toast]);

  const start = (kind) => {
    // Overwriting what an editor wrote is the one irreversible thing here, so
    // it is confirmed rather than merely ticked (ADD-20).
    if (kind === 'generate' && overwrite) {
      setConfirming(kind);
      return;
    }
    run(kind, kind === 'generate' ? overwrite : false);
  };

  const close = () => {
    cancelled.current = true;
    dismissed.current = true;
    setProgress(null);
    setMode(null);
  };

  return (
    <div className={styles.bulkTools}>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || total === 0}
        icon={<Icon icon="mdi:refresh" width="18" height="18" />}
        onClick={() => start('reanalyse')}
      >
        Re-analyse all ({total})
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || total === 0}
        icon={<Icon icon="mdi:auto-fix" width="18" height="18" />}
        onClick={() => start('generate')}
      >
        Auto-generate missing
      </Button>
      <CheckboxGroup
        className={styles.overwriteToggle}
        options={[{ value: 'overwrite', label: 'Overwrite values that are already written' }]}
        value={overwrite ? ['overwrite'] : []}
        onChange={(next) => setOverwrite(next.includes('overwrite'))}
        disabled={disabled}
      />

      <Modal
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        title="Overwrite the titles and descriptions that are already written?"
        description={`This replaces the SEO title, description, focus keyword and share image of ${total} records with generated ones. It cannot be undone.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirming(null);
                run('generate', true);
              }}
            >
              Overwrite {total} records
            </Button>
          </>
        }
      >
        <p className={styles.dialogText}>
          Leave “Overwrite” unticked to fill only the fields nobody has written yet.
        </p>
      </Modal>

      <Modal
        open={progress !== null}
        onClose={close}
        // While the run is going the only way out is "Stop", which keeps
        // everything already written and says so: a dialog dismissed mid-run
        // would leave an editor watching nothing while the writes continued.
        dismissible={!progress?.running}
        showClose={!progress?.running}
        title={mode === 'reanalyse' ? 'Re-analysing the site' : 'Generating the missing values'}
        footer={
          progress?.running ? (
            <Button
              variant="outline"
              onClick={() => {
                cancelled.current = true;
              }}
            >
              Stop
            </Button>
          ) : (
            <Button onClick={close}>Close</Button>
          )
        }
      >
        <BulkProgress progress={progress} />
      </Modal>
    </div>
  );
}

/** The dialog's body: the bar, the counts and whatever went wrong. */
function BulkProgress({ progress }) {
  if (!progress) return null;

  const { done, total, changed, skipped, failed, errors, running, cancelled } = progress;
  const percent = total > 0 ? Math.round((done / total) * 100) : 100;

  return (
    <div className={styles.progress}>
      <div
        className={styles.progressBar}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label="Records processed"
      >
        <span className={styles.progressFill} style={{ width: `${percent}%` }} />
      </div>
      <p className={styles.progressText} aria-live="polite">
        {done} of {total} records
        {running ? '' : cancelled ? ' — stopped' : ' — finished'}
      </p>
      <ul className={styles.progressCounts}>
        <li>
          <strong>{changed}</strong> updated
        </li>
        <li>
          <strong>{skipped}</strong> already fine
        </li>
        <li>
          <strong>{failed}</strong> failed
        </li>
      </ul>
      {errors?.length > 0 ? (
        <div className={styles.progressErrors}>
          <p className={styles.progressErrorsTitle}>These records were not saved:</p>
          <ul>
            {errors.map((error) => (
              <li key={error.key}>
                <strong>{error.title}</strong> — {error.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
