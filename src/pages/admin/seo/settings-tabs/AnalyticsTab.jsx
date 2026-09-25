import { Icon } from '@iconify/react';

import Button from '../../../../components/ui/Button';
import FormSection from '../../../../components/admin/FormSection';
import PATHS from '../../../../routes/paths';
import styles from '../SeoSettingsPage.module.css';

/**
 * Analytics (§4.6 of prompt 37).
 *
 * The measurement ids are **not** here, and this tab exists to say so. GA4, Tag
 * Manager and the Pixel are integrations of the site rather than SEO settings:
 * they live in `siteSettings.integrations`, one screen away, and the public
 * `<Seo>` component injects their scripts from there (§9.3). Storing a second
 * copy under `seoSettings` would give the site two answers to "which property
 * are we measuring?" and no way to tell which one is live.
 */
export default function AnalyticsTab() {
  return (
    <div className={styles.tab}>
      <FormSection
        title="Analytics and tags"
        description="Measurement ids live with the site’s other integrations, not with the SEO settings."
      >
        <p className={styles.notice}>
          Google Analytics 4, Google Tag Manager and the Facebook Pixel are configured in Site
          settings → Integrations. The site injects their scripts once per page from there, and
          reports Core Web Vitals to GA4 when a measurement id is set.
        </p>
        <Button
          variant="outline"
          to={PATHS.adminSettingsTab('integrations')}
          icon={<Icon icon="mdi:open-in-new" width="18" height="18" />}
        >
          Open Site settings → Integrations
        </Button>
      </FormSection>

      <FormSection
        title="What to check after a change"
        description="Three reports answer nearly every SEO question this admin cannot."
      >
        <ul className={styles.list}>
          <li>
            <strong>Search Console → Pages</strong> — which pages are indexed, and the reason for
            each one that is not.
          </li>
          <li>
            <strong>Search Console → Queries</strong> — the searches that already reach the site,
            and the ones sitting just off the first page.
          </li>
          <li>
            <strong>Analytics → Landing pages</strong> — which of those visits become enquiries. A
            page with traffic and no enquiries has a content problem, not a ranking one.
          </li>
        </ul>
      </FormSection>
    </div>
  );
}
