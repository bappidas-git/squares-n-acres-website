import StatusChip from '../admin/StatusChip';
import { SEO_SCORE_BANDS } from '../../config/enums';

/**
 * An entity's SEO score as a chip (§6.17 `SEO_SCORE_BANDS`).
 *
 * Every screen that lists entities carrying a `seo` object shows the same
 * chip — the property table here, articles and the SEO dashboard later — so
 * the band, its tone and the wording are decided once.
 *
 * A record that has never been analysed has no number to show: it reads "Not
 * analysed" in the muted tone rather than `0`, which would be a bad score
 * rather than a missing one.
 *
 *   <SeoScoreChip seo={property.seo} />
 *   <SeoScoreChip score={82} />
 *
 * @param {object} props
 * @param {{score?: number|null, scoreBand?: string}} [props.seo] the §9.6 object
 * @param {number|null} [props.score] overrides `seo.score`
 * @param {'good'|'ok'|'poor'|'none'} [props.band] overrides the derived band
 */
export default function SeoScoreChip({ seo, score, band, ...rest }) {
  const value = Number.isFinite(score) ? score : (seo?.score ?? null);
  const analysed = Number.isFinite(value);

  const resolved = analysed ? (band ?? SEO_SCORE_BANDS.bandOf(value)) : 'none';
  const bandLabel = SEO_SCORE_BANDS.labelOf(resolved);

  return (
    <StatusChip
      tone={SEO_SCORE_BANDS.meta[resolved]?.tone ?? 'neutral'}
      label={analysed ? `${value} · ${bandLabel}` : bandLabel}
      title={
        analysed
          ? `SEO score ${value} of 100 — ${bandLabel}`
          : 'This record has not been analysed yet.'
      }
      {...rest}
    />
  );
}
