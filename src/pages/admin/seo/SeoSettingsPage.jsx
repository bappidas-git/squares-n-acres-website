import { useCallback, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';

import AdminTabs, { AdminTabPanel } from '../../../components/admin/AdminTabs';
// Titles & meta is imported first, out of alphabetical order, because it is the
// tab that pulls in the SEO panel's stylesheet: the extracted CSS of this chunk
// has to hold `SeoPanel.module.css` before `ImageField.module.css`, as the
// panel's own chunk does (see the note in `settings-tabs/TitlesMetaTab.jsx`).
import TitlesMetaTab from './settings-tabs/TitlesMetaTab';
import AnalyticsTab from './settings-tabs/AnalyticsTab';
import BreadcrumbsTab from './settings-tabs/BreadcrumbsTab';
import Button from '../../../components/ui/Button';
import CustomHtmlTab from './settings-tabs/CustomHtmlTab';
import ErrorState from '../../../components/ui/ErrorState';
import HeadPreviewTab from './settings-tabs/HeadPreviewTab';
import KnowledgeGraphTab from './settings-tabs/KnowledgeGraphTab';
import LlmsTab from './settings-tabs/LlmsTab';
import PATHS from '../../../routes/paths';
import PageHeader from '../../../components/admin/PageHeader';
import RobotsTab from './settings-tabs/RobotsTab';
import SitemapTab from './settings-tabs/SitemapTab';
import Skeleton from '../../../components/ui/Skeleton';
import VerificationTab from './settings-tabs/VerificationTab';
import seoService from '../../../services/seoService';
import useApi from '../../../hooks/useApi';
import useForm from '../../../hooks/useForm';
import useUnsavedChanges from '../../../hooks/useUnsavedChanges';
import { firstFieldMessage } from '../../../services/apiError';
import { schemas } from '../../../services/schemas';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import { useMasterData } from '../../../contexts/MasterDataContext';
import { useSeoOverviewAll } from './useSeoOverview';
import { useSiteSettings } from '../../../contexts/SiteSettingsContext';
import { useToast } from '../../../components/common/ToastProvider';

import styles from './SeoSettingsPage.module.css';

/** The ten panels, in the order an editor meets them. */
export const SETTINGS_TABS = [
  { key: 'titles', label: 'Titles & meta', icon: 'mdi:format-title' },
  { key: 'knowledge', label: 'Knowledge graph', icon: 'mdi:domain' },
  { key: 'verification', label: 'Verification', icon: 'mdi:shield-check-outline' },
  { key: 'analytics', label: 'Analytics', icon: 'mdi:chart-box-outline' },
  { key: 'sitemap', label: 'Sitemap', icon: 'mdi:sitemap-outline' },
  { key: 'robots', label: 'robots.txt', icon: 'mdi:robot-outline' },
  { key: 'llms', label: 'llms.txt', icon: 'mdi:robot-happy-outline' },
  { key: 'breadcrumbs', label: 'Breadcrumbs', icon: 'mdi:chevron-right' },
  { key: 'customHtml', label: 'Custom HTML', icon: 'mdi:code-tags', adminOnly: true },
  { key: 'preview', label: 'Head preview', icon: 'mdi:eye-outline' },
];

/** Which tab owns a dotted path — so a 422 lands on a tab an editor can find. */
const TAB_OF_FIELD = [
  ['titles', ['siteUrl', 'separator', 'titleTemplates', 'defaults', 'noindex']],
  ['knowledge', ['knowledgeGraph']],
  ['verification', ['verification']],
  ['sitemap', ['sitemap']],
  ['robots', ['robotsTxt']],
  ['llms', ['llmsTxt']],
  ['breadcrumbs', ['breadcrumbs']],
  ['customHtml', ['customHeadHtml', 'customBodyEndHtml']],
];

const owns = (prefix, path) => path === prefix || path.startsWith(`${prefix}.`);

/** The tab a dotted path belongs to, or `null`. */
export function tabOfSettingsField(path) {
  const found = TAB_OF_FIELD.find(([, prefixes]) =>
    prefixes.some((prefix) => owns(prefix, String(path)))
  );
  return found ? found[0] : null;
}

/**
 * Admin → SEO → Settings (`/admin/seo/settings`, §6.14).
 *
 * One singleton, ten panels, one `PUT` — and the `PUT` deep-merges, so saving
 * from the robots tab cannot flatten the knowledge graph (§5.14). The form
 * holds the whole record and sends the whole record; the merge on the API is
 * what makes a partial save safe rather than what the screen relies on.
 *
 * Two rules from §7 are enforced here as well as on the API:
 *
 *   - the SEO area belongs to administrators **and** managers, so a manager
 *     edits and saves everything on this screen;
 *   - except `customHeadHtml` and `customBodyEndHtml`, which are rendered
 *     verbatim into every page and are therefore an administrator's decision.
 *     A manager sees the tab read-only, and the API answers 403 to a manager
 *     whose body changes either field.
 */
export default function SeoSettingsPage() {
  const toast = useToast();
  const { can, role } = useAdminAuth();
  const masterData = useMasterData();
  const siteSettings = useSiteSettings();
  const { rows } = useSeoOverviewAll();

  const isAdmin = role === 'admin';
  const canEdit = can('seo', 'edit');

  const [tab, setTab] = useState('titles');

  const { data, loading, error, refetch } = useApi(
    (signal) => seoService.adminSettings({ signal }),
    []
  );

  const form = useForm({
    initialValues: data ?? {},
    schema: schemas['seoSettings.update'],
    partial: true,
    onSubmit: (values) => seoService.updateSettings(values),
  });

  // `useApi` answers after the first render, and `useForm` keeps the values it
  // was created with: the record is moved into the form once, when it lands.
  const [loadedAt, setLoadedAt] = useState(null);
  if (data && data.updatedAt !== loadedAt) {
    setLoadedAt(data.updatedAt ?? 'loaded');
    form.reset(data);
  }

  useUnsavedChanges(form.dirty);

  const context = useMemo(
    () => ({
      localities: masterData.localities,
      cities: masterData.cities,
      propertyTypes: masterData.propertyTypes,
      developers: masterData.developers,
      siteSettings: siteSettings.settings,
    }),
    [masterData, siteSettings.settings]
  );

  const save = useCallback(async () => {
    const saved = await form.submit();
    if (saved === false) {
      // A 422 paints the fields; open the tab that holds the first of them, or
      // the messages sit on a panel nobody has looked at.
      const first = Object.keys(form.errors)[0];
      const owner = first ? tabOfSettingsField(first) : null;
      if (owner) setTab(owner);
      return;
    }

    toast.success('The SEO settings are saved.');
    // The public site reads `seoSettings` through this context, so the header,
    // the head component and the sitemap links are stale until it re-reads.
    siteSettings.refresh();
  }, [form, siteSettings, toast]);

  const errorsByTab = useMemo(() => {
    const counts = {};
    for (const path of Object.keys(form.errors ?? {})) {
      const owner = tabOfSettingsField(path);
      if (owner) counts[owner] = (counts[owner] ?? 0) + 1;
    }
    return counts;
  }, [form.errors]);

  const tabs = useMemo(
    () =>
      SETTINGS_TABS.filter((entry) => !entry.adminOnly || isAdmin).map((entry) => ({
        key: entry.key,
        label: entry.label,
        icon: entry.icon,
        errorCount: errorsByTab[entry.key] ?? 0,
      })),
    [isAdmin, errorsByTab]
  );

  if (loading && !data) {
    return (
      <div className={styles.page}>
        <PageHeader title="SEO settings" icon="mdi:cog-outline" />
        <div role="status" aria-label="Loading the SEO settings">
          <Skeleton variant="rounded" height={48} sx={{ marginBottom: 'var(--space-4)' }} />
          <Skeleton variant="rounded" height={420} />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className={styles.page}>
        <PageHeader title="SEO settings" icon="mdi:cog-outline" />
        <ErrorState
          title="The SEO settings could not be loaded."
          text={firstFieldMessage(error, 'Try again in a moment.')}
          onRetry={refetch}
        />
      </div>
    );
  }

  const disabled = !canEdit || form.submitting;

  return (
    <div className={styles.page}>
      <PageHeader
        title="SEO settings"
        icon="mdi:cog-outline"
        subtitle="What every page of the site says about itself when nobody has said otherwise."
        breadcrumbs={[{ label: 'SEO', to: PATHS.adminSeo }, { label: 'Settings' }]}
        actions={
          <div className={styles.headerActions}>
            <Button
              variant="ghost"
              size="sm"
              to={PATHS.adminSeoGuide}
              icon={<Icon icon="mdi:book-open-page-variant-outline" width="18" height="18" />}
            >
              Playbook
            </Button>
            <Button onClick={save} loading={form.submitting} disabled={!canEdit || !form.dirty}>
              Save settings
            </Button>
          </div>
        }
      />

      <AdminTabs label="SEO settings sections" tabs={tabs} value={tab} onChange={setTab} />

      <AdminTabPanel tabKey="titles" value={tab}>
        <TitlesMetaTab form={form} rows={rows} context={context} disabled={disabled} />
      </AdminTabPanel>
      <AdminTabPanel tabKey="knowledge" value={tab}>
        <KnowledgeGraphTab form={form} context={context} disabled={disabled} />
      </AdminTabPanel>
      <AdminTabPanel tabKey="verification" value={tab}>
        <VerificationTab form={form} disabled={disabled} />
      </AdminTabPanel>
      <AdminTabPanel tabKey="analytics" value={tab}>
        <AnalyticsTab />
      </AdminTabPanel>
      <AdminTabPanel tabKey="sitemap" value={tab}>
        <SitemapTab form={form} disabled={disabled} />
      </AdminTabPanel>
      <AdminTabPanel tabKey="robots" value={tab}>
        <RobotsTab form={form} disabled={disabled} />
      </AdminTabPanel>
      <AdminTabPanel tabKey="llms" value={tab}>
        <LlmsTab form={form} disabled={disabled} />
      </AdminTabPanel>
      <AdminTabPanel tabKey="breadcrumbs" value={tab}>
        <BreadcrumbsTab form={form} disabled={disabled} />
      </AdminTabPanel>
      {isAdmin ? (
        <AdminTabPanel tabKey="customHtml" value={tab}>
          <CustomHtmlTab form={form} disabled={disabled} />
        </AdminTabPanel>
      ) : null}
      <AdminTabPanel tabKey="preview" value={tab}>
        <HeadPreviewTab form={form} context={context} homePage={null} />
      </AdminTabPanel>

      {form.dirty ? (
        <div className={styles.saveBar}>
          <span className={styles.saveText}>You have unsaved changes.</span>
          <Button
            variant="outline"
            onClick={() => form.reset(data ?? {})}
            disabled={form.submitting}
          >
            Discard
          </Button>
          <Button onClick={save} loading={form.submitting} disabled={!canEdit}>
            Save settings
          </Button>
        </div>
      ) : null}
    </div>
  );
}
