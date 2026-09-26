import { useState } from 'react';
import { Icon } from '@iconify/react';

import Button from '../../../ui/Button';
import ConfirmDialog from '../../../ui/ConfirmDialog';
import Skeleton from '../../../ui/Skeleton';
import { SEO } from '../../../../config/adminCopy';
import { SEO_SCORE_BANDS } from '../../../../config/enums';
import { generateDefaults } from '../../../../seo';
import { useSeoPanel } from '../SeoPanelContext';
import { useToast } from '../../../common/ToastProvider';

import styles from '../SeoPanel.module.css';

const GAUGE_CLASS = {
  good: styles.gaugeGood,
  ok: styles.gaugeOk,
  poor: styles.gaugePoor,
  none: styles.gaugeNone,
};

/** The gauge is a 40 px-radius circle, so its circumference is this. */
const CIRCUMFERENCE = 2 * Math.PI * 40;

/**
 * The four values "Auto-fill" and "Regenerate all" write, in the order their
 * toasts name them, with what each is called and why the generator may have
 * nothing for it.
 */
export const FILLABLE = [
  {
    key: 'title',
    label: 'title',
    read: (seo) => seo.title,
    made: (generated) => generated.title,
    patch: (value) => ({ title: value }),
    reason: 'the record has no title or name yet',
  },
  {
    key: 'description',
    label: 'description',
    read: (seo) => seo.description,
    made: (generated) => generated.description,
    patch: (value) => ({ description: value }),
    reason: 'no summary or body text on this record',
  },
  {
    key: 'focusKeyword',
    label: 'focus keyword',
    read: (seo) => seo.focusKeyword,
    made: (generated) => generated.focusKeyword,
    patch: (value) => ({ focusKeyword: value }),
    reason: 'nothing on this record to suggest one from',
  },
  {
    key: 'og.imageUrl',
    label: 'share image',
    read: (seo) => seo.og?.imageUrl,
    made: (generated) => generated.og?.imageUrl,
    patch: (value, seo) => ({ og: { ...seo.og, imageUrl: value } }),
    reason: 'no image on this record',
  },
];

const isEmpty = (value) => !String(value ?? '').trim();

/** One patch out of several `{ og: … }`/`{ title: … }` pieces, `og` merged. */
function mergePatches(patches) {
  return patches.reduce(
    (merged, patch) => ({
      ...merged,
      ...patch,
      ...(patch.og ? { og: { ...(merged.og ?? {}), ...patch.og } } : {}),
    }),
    {}
  );
}

/**
 * The number, the band and the three buttons that change them.
 *
 * Every button answers (prompt 51). The panel already re-analyses 400 ms after
 * each keystroke, so a "Re-analyse" that only ran the analysis again changed
 * nothing anybody could see; it now reads the site-wide index the uniqueness
 * tests compare against, runs, pulses the gauge and says what it found.
 *
 * "Auto-fill missing" is `generateDefaults` without `overwrite`: it writes a
 * title, a description, a focus keyword and a share image **only where there is
 * none** — a generated value never replaces one a person wrote (ADD-27) — and
 * says which it filled, which it could not, or that there was nothing to fill.
 * "Regenerate all" is the one that replaces, behind a confirmation.
 */
export default function ScoreCard() {
  const {
    entityType,
    entity,
    seo,
    setSeo,
    analysis,
    analysing,
    reanalyse,
    refreshSiteIndex,
    seoSettings,
    context,
    disabled,
  } = useSeoPanel();
  const toast = useToast();

  const [busy, setBusy] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);

  if (analysing || !analysis) {
    return (
      <div className={styles.card}>
        <div className={styles.score}>
          <Skeleton variant="circular" width={92} height={92} />
          <div className={styles.scoreMeta}>
            <Skeleton variant="text" width={120} />
            <Skeleton variant="text" width={160} />
          </div>
        </div>
      </div>
    );
  }

  const band = analysis.band ?? 'none';
  const score = Number.isFinite(analysis.score) ? analysis.score : 0;
  const filled = (score / 100) * CIRCUMFERENCE;

  const handleReanalyse = async () => {
    const before = { score, passed: analysis.testsPassed };
    setBusy(true);
    try {
      // A refused index (a sales user's 403) resolves with an empty list: the
      // three uniqueness tests skip, and the score is still worth reporting.
      const rows = refreshSiteIndex ? await refreshSiteIndex() : undefined;
      const result = reanalyse(Array.isArray(rows) ? { siteIndex: rows } : undefined);
      const now = {
        score: Number.isFinite(result?.score) ? result.score : 0,
        passed: result?.testsPassed ?? 0,
        total: result?.testsTotal ?? 0,
      };
      const same = now.score === before.score && now.passed === before.passed;
      toast.success(SEO.panel.reanalysed(now, same));
      // A new key remounts the gauge, which replays its 600 ms pulse.
      setPulse((count) => count + 1);
    } finally {
      setBusy(false);
    }
  };

  /** The fields that are empty, filled where the generator has something. */
  const autoFill = () => {
    const missing = FILLABLE.filter((field) => isEmpty(field.read(seo)));
    if (missing.length === 0) {
      toast.info(SEO.panel.nothingToFill);
      return;
    }

    const made = generateDefaults(entityType, entity, seoSettings, { context });
    const fillable = missing.filter((field) => !isEmpty(field.made(made)));
    const unfillable = missing.filter((field) => isEmpty(field.made(made)));

    if (fillable.length > 0) {
      setSeo(mergePatches(fillable.map((field) => field.patch(field.made(made), seo))));
    }

    const couldNot = unfillable.map((field) => `${field.label} (${field.reason})`);
    if (fillable.length === 0) {
      toast.warning(SEO.panel.couldNotFill(couldNot));
      return;
    }
    const message = SEO.panel.filled(fillable.map((field) => field.label));
    toast.success(
      couldNot.length > 0 ? `${message}. ${SEO.panel.couldNotFill(couldNot)}` : message
    );
  };

  /** All four replaced — except one the generator had nothing for, which is kept. */
  const regenerate = () => {
    setConfirmingRegenerate(false);
    const made = generateDefaults(entityType, entity, seoSettings, { overwrite: true, context });
    const replaced = FILLABLE.filter((field) => !isEmpty(field.made(made)));
    const kept = FILLABLE.filter((field) => isEmpty(field.made(made)));

    if (replaced.length > 0) {
      setSeo(mergePatches(replaced.map((field) => field.patch(field.made(made), seo))));
    }

    const keptReasons = kept.map((field) => `${field.label} (${field.reason})`);
    if (replaced.length === 0) {
      toast.warning(SEO.panel.couldNotFill(keptReasons));
      return;
    }
    const message = SEO.panel.regenerated(replaced.map((field) => field.label));
    toast.success(keptReasons.length > 0 ? `${message}. ${SEO.panel.kept(keptReasons)}` : message);
  };

  const inert = busy || analysing;

  return (
    <div className={styles.card}>
      <div className={styles.score}>
        <svg
          key={pulse}
          className={[styles.gauge, pulse > 0 ? styles.gaugePulse : ''].filter(Boolean).join(' ')}
          viewBox="0 0 100 100"
          role="img"
          aria-label={`SEO score ${score} of 100`}
        >
          <circle className={styles.gaugeTrack} cx="50" cy="50" r="40" />
          <circle
            className={[styles.gaugeValue, GAUGE_CLASS[band]].filter(Boolean).join(' ')}
            cx="50"
            cy="50"
            r="40"
            transform="rotate(-90 50 50)"
            strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
          />
          <text className={styles.gaugeNumber} x="50" y="52" textAnchor="middle">
            {score}
          </text>
          <text className={styles.gaugeUnit} x="50" y="66" textAnchor="middle">
            / 100
          </text>
        </svg>

        <div className={styles.scoreMeta}>
          <span className={styles.scoreBand}>{SEO_SCORE_BANDS.labelOf(band)}</span>
          <span className={styles.summaryTests}>
            {analysis.testsPassed} of {analysis.testsTotal} tests passed
          </span>
          <span className={styles.note}>
            {band === 'good'
              ? 'This page says what it is about, and says it once.'
              : band === 'ok'
                ? 'Readable, but something below is costing it.'
                : 'Start with the failures in Basic SEO.'}
          </span>
        </div>
      </div>

      {disabled ? null : (
        <div className={styles.scoreActions}>
          <Button
            variant="outline"
            size="sm"
            disabled={inert}
            aria-busy={busy || undefined}
            title={SEO.panel.reanalyseHint}
            aria-label={`${SEO.panel.reanalyse}: ${SEO.panel.reanalyseHint}`}
            icon={
              <Icon
                icon="mdi:refresh"
                width="16"
                height="16"
                className={busy ? styles.spinning : undefined}
              />
            }
            onClick={handleReanalyse}
          >
            {SEO.panel.reanalyse}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={inert}
            title={SEO.panel.autoFillHint}
            aria-label={`${SEO.panel.autoFill}: ${SEO.panel.autoFillHint}`}
            icon={<Icon icon="mdi:auto-fix" width="16" height="16" />}
            onClick={autoFill}
          >
            {SEO.panel.autoFill}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={inert}
            title={SEO.panel.regenerateHint}
            aria-label={`${SEO.panel.regenerate}: ${SEO.panel.regenerateHint}`}
            icon={<Icon icon="mdi:restore" width="16" height="16" />}
            onClick={() => setConfirmingRegenerate(true)}
          >
            {SEO.panel.regenerate}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmingRegenerate}
        title={SEO.panel.regenerateTitle}
        message={SEO.panel.regenerateMessage}
        confirmLabel={SEO.panel.regenerateConfirm}
        danger
        onClose={() => setConfirmingRegenerate(false)}
        onConfirm={regenerate}
      />
    </div>
  );
}
