import { NumberField, SelectField, SwitchField } from '../../../ui/FormField';
import { fieldId } from '../SeoPanel';
import { useSeoPanel } from '../SeoPanelContext';

import styles from '../SeoPanel.module.css';

/** What a crawler may show of an image (`max-image-preview`). */
export const IMAGE_PREVIEW_OPTIONS = [
  { value: '', label: 'Not set' },
  { value: 'none', label: 'None' },
  { value: 'standard', label: 'Standard' },
  { value: 'large', label: 'Large' },
];

/** The three "do not" flags, as one list so the switches stay in step. */
const FLAGS = [
  {
    key: 'noarchive',
    label: 'No cached copy (noarchive)',
    hint: 'Search engines may not keep a cached version of this page.',
  },
  {
    key: 'nosnippet',
    label: 'No snippet (nosnippet)',
    hint: 'No description in the result — only the title and the URL.',
  },
  {
    key: 'noimageindex',
    label: 'No image indexing (noimageindex)',
    hint: 'The images on this page stay out of image search.',
  },
];

/**
 * The robots directive, one switch at a time.
 *
 * Index and follow are the two that matter and are shown as what they are:
 * everything else on this card only narrows what a result may **show**, and
 * none of it is a reason a page ranks or does not. The string these produce is
 * printed in "Resolved values" at the bottom of the tab, because
 * `noindex, nofollow, max-snippet:-1` is not a sentence anybody should have to
 * assemble in their head.
 */
export default function RobotsFields() {
  const { seo, setField, resolved, disabled } = useSeoPanel();
  const robots = seo.robots ?? {};

  const number = (value) => (value === '' || value === null ? null : Number(value));

  return (
    <div className={styles.stack}>
      <SwitchField
        id={fieldId('seo.robots')}
        label="Allow indexing"
        checked={robots.index !== false}
        disabled={disabled}
        hint="Off means noindex: the page stays on the site but leaves the search results."
        onChange={(next) => setField('robots.index', next)}
      />
      <SwitchField
        label="Follow the links on this page"
        checked={robots.follow !== false}
        disabled={disabled}
        hint="Off means nofollow: crawlers read the page but do not walk its links."
        onChange={(next) => setField('robots.follow', next)}
      />

      {FLAGS.map((flag) => (
        <SwitchField
          key={flag.key}
          label={flag.label}
          checked={robots[flag.key] === true}
          disabled={disabled}
          hint={flag.hint}
          onChange={(next) => setField(`robots.${flag.key}`, next)}
        />
      ))}

      <div className={styles.grid2}>
        <NumberField
          label="Max snippet"
          value={robots.maxSnippet ?? ''}
          min={-1}
          disabled={disabled}
          hint="Characters of description a result may show. −1 is no limit; empty leaves it to Google."
          onChange={(event) => setField('robots.maxSnippet', number(event.target.value))}
        />
        <SelectField
          label="Max image preview"
          options={IMAGE_PREVIEW_OPTIONS}
          value={robots.maxImagePreview ?? ''}
          disabled={disabled}
          onChange={(event) => setField('robots.maxImagePreview', event.target.value || null)}
        />
        <NumberField
          label="Max video preview"
          value={robots.maxVideoPreview ?? ''}
          min={-1}
          disabled={disabled}
          hint="Seconds of video a result may play. −1 is no limit."
          onChange={(event) => setField('robots.maxVideoPreview', number(event.target.value))}
        />
      </div>

      <p className={styles.resolvedLine}>
        This page sends <span className={styles.resolvedMono}>{resolved.robots}</span>
      </p>
    </div>
  );
}
