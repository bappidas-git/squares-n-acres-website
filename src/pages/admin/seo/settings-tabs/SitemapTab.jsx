import { Icon } from '@iconify/react';

import Button from '../../../../components/ui/Button';
import FormSection, { FormColumn } from '../../../../components/admin/FormSection';
import MultiSelect from '../../../../components/admin/MultiSelect';
import styles from '../SeoSettingsPage.module.css';
import { NumberField, SelectField, SwitchField } from '../../../../components/ui/FormField';
import { SITEMAP_CHANGEFREQ } from '../../../../config/enums';
import { buildUrl } from '../../../../services/http';
import { endpoints } from '../../../../services/endpoints';

/** The five collections that get a sitemap of their own (§6.14, §5.13). */
export const SITEMAP_ENTITIES = [
  { key: 'property', include: 'includeProperties', label: 'Properties', endpoint: 'properties' },
  { key: 'locality', include: 'includeLocalities', label: 'Localities', endpoint: 'localities' },
  { key: 'developer', include: 'includeDevelopers', label: 'Builders', endpoint: 'developers' },
  { key: 'article', include: 'includeArticles', label: 'Articles', endpoint: 'articles' },
  { key: 'page', include: 'includePages', label: 'CMS pages', endpoint: 'pages' },
];

/**
 * The sitemaps (§5.13, §6.14).
 *
 * The files are generated from the data on every request, so nothing here
 * publishes a sitemap — it decides what goes in one and what each entry claims
 * about itself. Both claims are hints: a change frequency of "weekly" is a
 * suggestion a crawler may ignore, and a priority is a statement about this
 * site's own pages relative to each other, not a bid against anybody else's.
 *
 * The "Open" links point at the **API**, because that is where the documents
 * are served from (D21) — which means they work against the mock on a laptop
 * and against the real API in production without a second setting.
 *
 * @param {object} props
 * @param {ReturnType<typeof import('../../../../hooks/useForm').default>} props.form
 * @param {boolean} [props.disabled]
 */
export default function SitemapTab({ form, disabled = false }) {
  const { values, setField, getError } = form;
  const sitemap = values.sitemap ?? {};
  const enabled = sitemap.enabled !== false;

  return (
    <div className={styles.tab}>
      <FormSection title="Sitemaps">
        <FormColumn>
          <SwitchField
            label="Publish sitemaps"
            checked={enabled}
            onChange={(next) => setField('sitemap.enabled', next)}
            hint="The sitemap index is what you submit once in Search Console; everything after that is automatic."
            disabled={disabled}
          />
        </FormColumn>

        <FormColumn>
          <div className={styles.linkRow}>
            <Button
              variant="outline"
              size="sm"
              href={buildUrl(endpoints.sitemap.index)}
              target="_blank"
              rel="noopener noreferrer"
              icon={<Icon icon="mdi:open-in-new" width="16" height="16" />}
            >
              sitemap.xml
            </Button>
            {SITEMAP_ENTITIES.map((entity) => (
              <Button
                key={entity.key}
                variant="ghost"
                size="sm"
                href={buildUrl(endpoints.sitemap[entity.endpoint])}
                target="_blank"
                rel="noopener noreferrer"
              >
                {entity.label}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              href={buildUrl(endpoints.sitemap.rss)}
              target="_blank"
              rel="noopener noreferrer"
            >
              RSS
            </Button>
          </div>
        </FormColumn>
      </FormSection>

      <FormSection
        title="What each sitemap contains"
        description="Priority is 0 to 1 and is only meaningful relative to this site’s own pages."
      >
        {SITEMAP_ENTITIES.map((entity) => (
          <FormColumn key={entity.key}>
            <div className={styles.sitemapRow}>
              <SwitchField
                label={entity.label}
                checked={sitemap[entity.include] !== false}
                onChange={(next) => setField(`sitemap.${entity.include}`, next)}
                disabled={disabled || !enabled}
              />
              <SelectField
                label="Change frequency"
                value={sitemap.changefreq?.[entity.key] ?? 'monthly'}
                onChange={(event) =>
                  setField(`sitemap.changefreq.${entity.key}`, event.target.value)
                }
                options={SITEMAP_CHANGEFREQ.options}
                error={getError(`sitemap.changefreq.${entity.key}`)}
                disabled={disabled || !enabled}
              />
              <NumberField
                label="Priority"
                min={0}
                max={1}
                step={0.1}
                value={sitemap.priority?.[entity.key] ?? 0.5}
                onChange={(event) =>
                  setField(`sitemap.priority.${entity.key}`, Number(event.target.value))
                }
                error={getError(`sitemap.priority.${entity.key}`)}
                disabled={disabled || !enabled}
              />
            </div>
          </FormColumn>
        ))}
      </FormSection>

      <FormSection
        title="Exclusions"
        description="Paths to keep out of every sitemap. A page worth having is usually a page worth listing — use this sparingly."
      >
        <FormColumn>
          <MultiSelect
            label="Excluded URLs"
            options={(sitemap.excludeUrls ?? []).map((value) => ({ value, label: value }))}
            value={sitemap.excludeUrls ?? []}
            onChange={(next) => setField('sitemap.excludeUrls', next)}
            creatable
            onCreate={(label) => ({ value: label.trim(), label: label.trim() })}
            hint="Full paths, e.g. /thank-you. A record can also be excluded from its own SEO panel."
            error={getError('sitemap.excludeUrls')}
            disabled={disabled || !enabled}
          />
        </FormColumn>
      </FormSection>
    </div>
  );
}
