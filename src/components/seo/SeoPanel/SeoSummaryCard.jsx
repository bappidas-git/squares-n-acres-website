import { Icon } from '@iconify/react';

import Button from '../../ui/Button';
import SeoScoreChip from '../SeoScoreChip';

import styles from './SeoSummaryCard.module.css';
import { SEO } from '../../../config/adminCopy';

/**
 * The first failing test of a record, in the order the panel lists them.
 *
 * @param {object} [analysis] the §9.6 `seo.analysis` branch
 * @returns {{id: string, message: string, hint: string, field: string}|null}
 */
export function firstFailure(analysis) {
  const groups = ['basic', 'additional', 'titleReadability', 'contentReadability'];

  for (const group of groups) {
    const found = (analysis?.[group] ?? []).find((test) => test?.status === 'fail');
    if (found) return found;
  }
  return null;
}

/**
 * The SEO of a record, from the rail of the form editing it.
 *
 * A score in the rail is what makes the panel get used: the property form has
 * sixteen tabs and an editor who never opens the sixteenth has no idea the page
 * is scoring 34. So the rail says the number, says what is costing it most, and
 * offers the one button that goes there.
 *
 * @param {object} props
 * @param {{score?: number|null, scoreBand?: string, testsPassed?: number,
 *   testsTotal?: number, analysis?: object}} [props.seo] the §9.6 branch
 * @param {(field: string|null) => void} [props.onOpen] "Fix SEO" — the host opens
 *   its SEO tab and focuses the first failing field ("Open the SEO tab" while
 *   nothing is failing)
 * @param {boolean} [props.compact] drops the heading (a card that has its own)
 */
export default function SeoSummaryCard({ seo, onOpen, compact = false }) {
  const analysed = Number.isFinite(seo?.score);
  const failure = firstFailure(seo?.analysis);

  return (
    <div className={styles.summary}>
      {compact ? null : (
        <h2 className={styles.heading} id="rail-seo">
          {SEO.panelTitle}
        </h2>
      )}

      <div className={styles.row}>
        <SeoScoreChip seo={seo} />
        {analysed ? (
          <span className={styles.tests}>
            {seo.testsPassed ?? 0} of {seo.testsTotal ?? 0} passed
          </span>
        ) : null}
      </div>

      {failure ? (
        <p className={styles.fail}>{failure.message}</p>
      ) : analysed ? (
        <p className={styles.note}>Nothing is failing. The warnings are on the SEO tab.</p>
      ) : (
        <p className={styles.note}>Open the SEO tab and this page is analysed as you type.</p>
      )}

      {/* "Fix SEO" only when there is something failing to fix: over "Nothing
          is failing", or a page not analysed yet, it promised a repair and
          opened a tab. */}
      {onOpen ? (
        <Button
          variant="outline"
          size="sm"
          icon={
            <Icon icon={failure ? 'mdi:magnify-scan' : 'mdi:arrow-right'} width="16" height="16" />
          }
          onClick={() => onOpen(failure?.field ?? null)}
        >
          {failure ? 'Fix SEO' : 'Open the SEO tab'}
        </Button>
      ) : null}
    </div>
  );
}
