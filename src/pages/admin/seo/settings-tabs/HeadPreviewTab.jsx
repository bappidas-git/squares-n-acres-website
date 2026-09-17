import { useMemo } from 'react';

import FormSection, { FormColumn } from '../../../../components/admin/FormSection';
import styles from '../SeoSettingsPage.module.css';
import { resolveSeoOutput, schema } from '../../../../seo';

/**
 * Head output preview (§4.6 of prompt 37).
 *
 * The settings on the other tabs are abstract until you see what they produce.
 * This tab resolves the **home page** through the very function the public
 * `<Seo>` component uses (`resolveSeoOutput`, §6a of `docs/SEO_ENGINE.md`), so
 * what is printed here is what the page will send — including while a template
 * is still being typed, because the preview reads the form's values rather than
 * the stored settings.
 *
 * The JSON-LD block underneath is the organisation and website graph the same
 * settings generate: the knowledge-graph tab's fields, as a search engine will
 * read them.
 *
 * @param {object} props
 * @param {ReturnType<typeof import('../../../../hooks/useForm').default>} props.form
 * @param {object} [props.context] master data and site settings
 * @param {object} [props.homePage] the `home` CMS record, when the site has one
 */
export default function HeadPreviewTab({ form, context = {}, homePage = null }) {
  const settings = form.values;

  const resolved = useMemo(
    () =>
      resolveSeoOutput('home', homePage ?? {}, settings, {
        ...context,
        seoSettings: settings,
        siteUrl: settings.siteUrl ?? '',
      }),
    [settings, context, homePage]
  );

  const jsonLd = useMemo(() => {
    const siteUrl = settings.siteUrl ?? '';
    const nodeContext = { seoSettings: settings, siteSettings: context.siteSettings, siteUrl };
    const nodes = [
      schema.organizationNode({}, nodeContext),
      schema.websiteNode({}, nodeContext),
    ].filter(Boolean);

    return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }, null, 2);
  }, [settings, context.siteSettings]);

  const rows = [
    { label: 'Title', value: resolved.title, note: `from the ${resolved.titleSource} value` },
    {
      label: 'Description',
      value: resolved.description,
      note:
        resolved.descriptionSource === 'own'
          ? 'from the home page’s own description'
          : resolved.descriptionSource === 'default'
            ? 'from the default description on the Titles & meta tab'
            : 'nothing is set',
    },
    { label: 'Canonical', value: resolved.canonical, note: `${resolved.canonicalSource} value` },
    {
      label: 'Robots',
      value: resolved.robots,
      note: resolved.indexable ? 'indexable' : 'not indexable',
    },
    { label: 'og:title', value: resolved.og.title },
    { label: 'og:description', value: resolved.og.description },
    { label: 'og:image', value: resolved.og.imageUrl },
    { label: 'og:type', value: resolved.og.type },
    { label: 'og:site_name', value: resolved.og.siteName },
    { label: 'og:locale', value: resolved.og.locale },
    { label: 'twitter:card', value: resolved.twitter.card },
    { label: 'twitter:image', value: resolved.twitter.imageUrl },
  ];

  return (
    <div className={styles.tab}>
      <p className={styles.notice}>
        The home page, resolved through the same function the site uses. It updates as you type on
        the other tabs — nothing here is saved.
      </p>

      <FormSection title="Meta tags">
        <FormColumn>
          <dl className={styles.previewList}>
            {rows.map((row) => (
              <div key={row.label} className={styles.previewRow}>
                <dt>{row.label}</dt>
                <dd>
                  <span className={styles.previewValue}>{row.value || '—'}</span>
                  {row.note ? <span className={styles.previewNote}>{row.note}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        </FormColumn>
      </FormSection>

      <FormSection
        title="Structured data"
        description="The organisation and website graph every page carries."
      >
        <FormColumn>
          <pre className={styles.jsonBlock}>
            <code>{jsonLd}</code>
          </pre>
        </FormColumn>
      </FormSection>
    </div>
  );
}
