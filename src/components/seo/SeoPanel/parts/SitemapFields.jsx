import { NumberField, SelectField, SwitchField } from '../../../ui/FormField';
import { SITEMAP_CHANGEFREQ } from '../../../../config/enums';
import { useSeoPanel } from '../SeoPanelContext';

import styles from '../SeoPanel.module.css';

const CHANGEFREQ_OPTIONS = [
  { value: '', label: 'Use the type default' },
  ...SITEMAP_CHANGEFREQ.options,
];

/**
 * Whether this record is in the sitemap, and — for the rare record that needs
 * it — how it is described there.
 *
 * Priority and change frequency are overrides of the per-type defaults in SEO
 * settings, so both are empty by default and both say so: a sitemap where every
 * page claims priority 1.0 tells a crawler nothing at all.
 */
export default function SitemapFields() {
  const { seo, setField, disabled } = useSeoPanel();
  const sitemap = seo.sitemap ?? {};

  return (
    <div className={styles.stack}>
      <SwitchField
        label="Include in the sitemap"
        checked={sitemap.include !== false}
        disabled={disabled}
        hint="Off leaves the page on the site and out of sitemap.xml."
        onChange={(next) => setField('sitemap.include', next)}
      />

      <div className={styles.grid2}>
        <NumberField
          label="Priority"
          value={sitemap.priority ?? ''}
          min={0}
          max={1}
          step={0.1}
          disabled={disabled || sitemap.include === false}
          hint="0.0 to 1.0, relative to the rest of this site. Empty uses the type's default."
          onChange={(event) =>
            setField(
              'sitemap.priority',
              event.target.value === '' ? null : Number(event.target.value)
            )
          }
        />
        <SelectField
          label="Change frequency"
          options={CHANGEFREQ_OPTIONS}
          value={sitemap.changefreq ?? ''}
          disabled={disabled || sitemap.include === false}
          hint="A hint, not a promise — crawlers weigh it against what actually changes."
          onChange={(event) => setField('sitemap.changefreq', event.target.value || null)}
        />
      </div>
    </div>
  );
}
