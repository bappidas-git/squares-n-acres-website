import RedirectFields from '../parts/RedirectFields';
import ResolvedValues from '../parts/ResolvedValues';
import RobotsFields from '../parts/RobotsFields';
import SitemapFields from '../parts/SitemapFields';
import { TextField, UrlField } from '../../../ui/FormField';
import { formatDateTime } from '../../../../utils/format';
import { fieldId } from '../SeoPanel';
import { useSeoPanel } from '../SeoPanelContext';

import styles from '../SeoPanel.module.css';

/**
 * Everything that is not the words: what crawlers may do with the page, which
 * address is the real one, where it sits in the sitemap and where it sends
 * visitors if it has moved.
 *
 * It ends with the read-only "Resolved values" box, because this is the tab
 * where a mistake is silent — a canonical pointing at the wrong page costs a
 * ranking without changing anything an editor can see.
 */
export default function AdvancedTab() {
  const { entityType, entity, seo, setField, resolved, context, errors, disabled } = useSeoPanel();

  // A single category is a fact about the record rather than a choice to make
  // here: the article form owns the picker, and this is the value it produced.
  const primaryCategory =
    entity?.category?.name ??
    (context?.categories ?? []).find((row) => String(row?.id) === String(entity?.categoryId))
      ?.name ??
    '';

  return (
    <div className={styles.split}>
      <div className={styles.column}>
        <section className={styles.stack} aria-labelledby="seo-robots-heading">
          <h3 className={styles.heading} id="seo-robots-heading">
            Robots
          </h3>
          <RobotsFields />
        </section>

        <section className={styles.stack} aria-labelledby="seo-canonical-heading">
          <h3 className={styles.heading} id="seo-canonical-heading">
            Canonical &amp; breadcrumb
          </h3>

          <UrlField
            id={fieldId('seo.canonicalUrl')}
            label="Canonical URL"
            value={seo.canonicalUrl ?? ''}
            error={errors['seo.canonicalUrl']}
            disabled={disabled}
            placeholder={resolved.canonical ?? 'https://…'}
            hint={
              seo.canonicalUrl
                ? 'This overrides the computed address. Use it only when another page is the original.'
                : `Automatic — ${resolved.canonical ?? 'the page needs an address first'}`
            }
            onChange={(event) => setField('canonicalUrl', event.target.value)}
          />

          <TextField
            id={fieldId('seo.breadcrumbTitle')}
            label="Breadcrumb title"
            value={seo.breadcrumbTitle ?? ''}
            error={errors['seo.breadcrumbTitle']}
            disabled={disabled}
            maxLength={120}
            hint="What the trail above the page calls it. Empty uses the record's own title."
            onChange={(event) => setField('breadcrumbTitle', event.target.value)}
          />

          {entityType === 'article' ? (
            <TextField
              label="Primary category"
              value={primaryCategory || 'Not assigned'}
              readOnly
              disabled
              hint="An article has one category, set on the article form; it is the section a result shows."
            />
          ) : null}

          <TextField
            label="Last modified"
            value={entity?.updatedAt ? formatDateTime(entity.updatedAt) : 'Not saved yet'}
            readOnly
            disabled
            hint="What this page reports as dateModified. It moves on every save."
          />
        </section>
      </div>

      <div className={styles.column}>
        <section className={styles.stack} aria-labelledby="seo-sitemap-heading">
          <h3 className={styles.heading} id="seo-sitemap-heading">
            Sitemap
          </h3>
          <SitemapFields />
        </section>

        <section className={styles.stack} aria-labelledby="seo-redirect-heading">
          <h3 className={styles.heading} id="seo-redirect-heading">
            Redirect
          </h3>
          <RedirectFields />
        </section>

        <ResolvedValues />
      </div>
    </div>
  );
}
