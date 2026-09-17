import ImageField from '../../../components/admin/ImageField';
import { TextField } from '../../../components/ui';

import styles from './ArticleFormPage.module.css';

/**
 * The rail's featured-image card (§6.8 `featuredImage`).
 *
 * The hint is `og`: this one picture is the card on the archive, the hero of the
 * article and the Open Graph image a shared link renders, so 1200 × 630 is the
 * size that serves all three.
 *
 * **Alt text is a field, not an afterthought.** It is required as soon as there
 * is an image — before publication, not at it — because the alternative is a
 * hero picture that a screen reader announces as nothing (§8.3). The focus
 * keyword is offered as a nudge rather than pasted in: alt text describes a
 * photograph, and a keyword stuffed into it describes nothing.
 *
 * @param {object} props
 * @param {ReturnType<import('./useArticleForm').default>} props.form
 */
export default function ArticleImageCard({ form }) {
  const { values, errors, setField, readOnly, saving } = form;
  const disabled = readOnly || saving;
  const image = values.featuredImage ?? {};
  const keyword = values.seo?.focusKeyword ?? '';

  return (
    <aside className={styles.card} aria-labelledby="article-image">
      <h2 className={styles.cardTitle} id="article-image">
        Featured image
      </h2>

      <ImageField
        label="Image"
        hint="og"
        alt={image.alt ?? ''}
        value={image.url ?? ''}
        error={errors['featuredImage.url']}
        disabled={disabled}
        onChange={(next) => setField('featuredImage.url', next ?? '')}
      />

      <TextField
        label="Alt text"
        required
        value={image.alt ?? ''}
        error={errors['featuredImage.alt']}
        disabled={disabled}
        maxLength={200}
        hint={
          keyword
            ? `What the picture shows, in a few words. Mention “${keyword}” only if the picture actually shows it.`
            : 'What the picture shows, in a few words — for readers who cannot see it.'
        }
        onChange={(event) => setField('featuredImage.alt', event.target.value)}
      />

      <TextField
        label="Caption"
        value={image.caption ?? ''}
        error={errors['featuredImage.caption']}
        disabled={disabled}
        maxLength={300}
        hint="Optional, printed under the image on the article."
        onChange={(event) => setField('featuredImage.caption', event.target.value)}
      />

      <p className={styles.cardNote}>
        An image and its alt text are both required before the article goes live.
      </p>
    </aside>
  );
}
