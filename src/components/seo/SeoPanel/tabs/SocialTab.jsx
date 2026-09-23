import { Icon } from '@iconify/react';

import Button from '../../../ui/Button';
import ImageField from '../../../admin/ImageField';
import SocialPreview from '../parts/SocialPreview';
import { SelectField, TextField, TextareaField } from '../../../ui/FormField';
import { fieldId } from '../SeoPanel';
import { useSeoPanel } from '../SeoPanelContext';

import styles from '../SeoPanel.module.css';

/** The card shapes X draws (`twitter:card`). */
export const TWITTER_CARDS = [
  { value: 'summary_large_image', label: 'Large image' },
  { value: 'summary', label: 'Summary' },
];

/**
 * What a share looks like.
 *
 * Every field here is an **override**: leave it empty and the page falls back
 * to the search title, the meta description and the record's cover image
 * (§9.3), which is right far more often than not. "Use default" is therefore
 * the button that fills a field with what it would have said anyway — so an
 * editor who wants to change one word does not have to retype the sentence.
 */
export default function SocialTab() {
  const { seo, setField, resolved, errors, disabled } = useSeoPanel();
  const og = seo.og ?? {};
  const twitter = seo.twitter ?? {};

  const useDefault = (path, value) => (
    <Button
      variant="ghost"
      size="sm"
      disabled={disabled || !value}
      icon={<Icon icon="mdi:arrow-down-left" width="16" height="16" />}
      onClick={() => setField(path, value)}
    >
      Use default
    </Button>
  );

  return (
    <div className={styles.split}>
      <div className={styles.column}>
        <section className={styles.stack} aria-labelledby="seo-og-heading">
          <div className={styles.fieldHead}>
            <h3 className={styles.heading} id="seo-og-heading">
              Open Graph — Facebook, LinkedIn, WhatsApp
            </h3>
            <span className={styles.note}>
              og:type is <span className={styles.resolvedMono}>{resolved.ogType}</span>
            </span>
          </div>

          <div className={styles.fieldHead}>
            <span className={styles.note}>Title</span>
            {useDefault('og.title', resolved.title)}
          </div>
          <TextField
            id={fieldId('seo.og.title')}
            label="Share title"
            value={og.title ?? ''}
            error={errors['seo.og.title']}
            disabled={disabled}
            maxLength={200}
            placeholder={resolved.title}
            onChange={(event) => setField('og.title', event.target.value)}
          />

          <div className={styles.fieldHead}>
            <span className={styles.note}>Description</span>
            {useDefault('og.description', resolved.description)}
          </div>
          <TextareaField
            id={fieldId('seo.og.description')}
            label="Share description"
            rows={3}
            value={og.description ?? ''}
            error={errors['seo.og.description']}
            disabled={disabled}
            maxLength={320}
            placeholder={resolved.description}
            onChange={(event) => setField('og.description', event.target.value)}
          />

          <ImageField
            id={fieldId('seo.og.imageUrl')}
            label="Share image"
            hint="og"
            value={og.imageUrl ?? ''}
            error={errors['seo.og.imageUrl']}
            disabled={disabled}
            onChange={(next) => setField('og.imageUrl', next ?? '')}
          />
          <p className={styles.note}>
            Empty uses this record&rsquo;s own cover image, then the site-wide share image.
          </p>
        </section>

        <section className={styles.stack} aria-labelledby="seo-twitter-heading">
          <h3 className={styles.heading} id="seo-twitter-heading">
            X
          </h3>

          <SelectField
            id={fieldId('seo.twitter.card')}
            label="Card"
            options={TWITTER_CARDS}
            value={twitter.card || 'summary_large_image'}
            disabled={disabled}
            hint="A large image fills the post; a summary sits beside the text."
            onChange={(event) => setField('twitter.card', event.target.value)}
          />

          <div className={styles.fieldHead}>
            <span className={styles.note}>Title</span>
            {useDefault('twitter.title', resolved.og.title)}
          </div>
          <TextField
            id={fieldId('seo.twitter.title')}
            label="X title"
            value={twitter.title ?? ''}
            error={errors['seo.twitter.title']}
            disabled={disabled}
            maxLength={200}
            placeholder={resolved.og.title}
            onChange={(event) => setField('twitter.title', event.target.value)}
          />

          <div className={styles.fieldHead}>
            <span className={styles.note}>Description</span>
            {useDefault('twitter.description', resolved.og.description)}
          </div>
          <TextareaField
            id={fieldId('seo.twitter.description')}
            label="X description"
            rows={2}
            value={twitter.description ?? ''}
            error={errors['seo.twitter.description']}
            disabled={disabled}
            maxLength={320}
            placeholder={resolved.og.description}
            onChange={(event) => setField('twitter.description', event.target.value)}
          />

          <ImageField
            id={fieldId('seo.twitter.imageUrl')}
            label="X image"
            hint="og"
            value={twitter.imageUrl ?? ''}
            error={errors['seo.twitter.imageUrl']}
            disabled={disabled}
            onChange={(next) => setField('twitter.imageUrl', next ?? '')}
          />
        </section>
      </div>

      <div className={styles.column}>
        <SocialPreview />
      </div>
    </div>
  );
}
