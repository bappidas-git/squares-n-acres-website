import { useCallback, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import AdminTabs, { AdminTabPanel } from '../../../components/admin/AdminTabs';
import Alert from '../../../components/ui/Alert';
import Button from '../../../components/ui/Button';
import ContactTab from './tabs/ContactTab';
import ErrorState from '../../../components/ui/ErrorState';
import GeneralTab from './tabs/GeneralTab';
import HeroTab from './tabs/HeroTab';
import IntegrationsTab from './tabs/IntegrationsTab';
import LeadNotificationsTab from './tabs/LeadNotificationsTab';
import NavigationFooterTab from './tabs/NavigationFooterTab';
import NewsletterTab from './tabs/NewsletterTab';
import PATHS from '../../../routes/paths';
import PageHeader from '../../../components/admin/PageHeader';
import Skeleton from '../../../components/ui/Skeleton';
import settingsService from '../../../services/settingsService';
import useApi from '../../../hooks/useApi';
import useForm from '../../../hooks/useForm';
import useUnsavedChanges from '../../../hooks/useUnsavedChanges';
import { EVENTS, emit } from '../../../utils/events';
import { firstFieldMessage } from '../../../services/apiError';
import {
  normalizeSettings,
  settingsErrors,
  settingsSchema,
  validateSettings,
} from './settingsSchema';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import { useSiteSettings } from '../../../contexts/SiteSettingsContext';
import { useToast } from '../../../components/common/ToastProvider';

import styles from './SettingsPage.module.css';
import { TOASTS } from '../../../config/adminCopy';

/** The seven panels of §6.13, in the order an editor meets them. */
export const SETTINGS_TABS = [
  { key: 'general', label: 'General', icon: 'mdi:office-building-outline' },
  { key: 'contact', label: 'Contact', icon: 'mdi:phone-outline' },
  { key: 'hero', label: 'Hero', icon: 'mdi:image-text' },
  { key: 'navigation', label: 'Navigation & footer', icon: 'mdi:page-layout-footer' },
  { key: 'newsletter', label: 'Newsletter', icon: 'mdi:email-newsletter' },
  { key: 'integrations', label: 'Integrations', icon: 'mdi:puzzle-outline' },
  { key: 'leads', label: 'Lead notifications', icon: 'mdi:bell-ring-outline' },
];

/**
 * Which tab owns a dotted path — so a message lands on a panel an editor can
 * find. `general` is split across two of them: the identity half is General and
 * everything a visitor would dial, write to or drive to is Contact.
 */
const TAB_OF_FIELD = [
  [
    'contact',
    [
      'general.contactEmail',
      'general.contactPhone',
      'general.alternatePhone',
      'general.whatsappNumber',
      'general.whatsappDefaultMessage',
      'general.address',
      'general.mapEmbedUrl',
      'general.latitude',
      'general.longitude',
      'general.workingHours',
    ],
  ],
  ['general', ['general']],
  ['hero', ['hero']],
  ['navigation', ['navigation', 'social', 'footer']],
  ['newsletter', ['newsletter']],
  ['integrations', ['integrations']],
  ['leads', ['leads']],
];

const owns = (prefix, path) => path === prefix || path.startsWith(`${prefix}.`);

/**
 * The tab a dotted path belongs to, or `null`.
 *
 * @param {string} path
 * @returns {string|null}
 */
export function tabOfSettingsField(path) {
  const key = String(path ?? '');
  const found = TAB_OF_FIELD.find(([, prefixes]) => prefixes.some((prefix) => owns(prefix, key)));
  return found ? found[0] : null;
}

/**
 * Admin → Site settings (`/admin/settings`, §6.13).
 *
 * One singleton behind seven panels and one `PUT`. The form holds the whole
 * record and sends the whole record; the API's deep merge (§5.14) is a safety
 * net rather than something this screen leans on, and `normalizeSettings`
 * already drops anything the model does not declare.
 *
 * What makes it more than a form is the last three lines of a save: the public
 * site reads every one of these values through `SiteSettingsContext`, so the
 * header, the hero, the footer and the WhatsApp buttons are stale the moment
 * the record changes. `updateLocal` moves them immediately and `refresh`
 * confirms them against the server's own copy (D93).
 *
 * §7: the settings area is admin **and** manager for reading, administrator
 * only for writing. A manager sees the whole record, disabled, under a banner
 * that says why — and the API answers 403 to the `PUT` regardless.
 */
export default function SettingsPage() {
  const toast = useToast();
  const { can } = useAdminAuth();
  const siteSettings = useSiteSettings();

  const canEdit = can('settings', 'edit');
  const [tab, setTab] = useState('general');

  const { data, loading, error, refetch } = useApi(
    (signal) => settingsService.admin({ signal }),
    []
  );

  // A 422 names fields; this is where the first of them is kept, so the tab
  // that holds it can be opened even though `form.errors` is painted a render
  // later than the `await` that fails.
  const serverFieldRef = useRef(null);

  const form = useForm({
    initialValues: data ?? {},
    schema: settingsSchema,
    validate: validateSettings,
    normalize: normalizeSettings,
    onSubmit: async (payload) => {
      try {
        return await settingsService.update(payload);
      } catch (thrown) {
        serverFieldRef.current = Object.keys(thrown?.errors ?? {})[0] ?? null;
        throw thrown;
      }
    },
  });

  // `useApi` answers after the first render and `useForm` keeps the values it
  // was created with, so the record is moved into the form once, when it lands.
  const [loadedAt, setLoadedAt] = useState(null);
  if (data && data.updatedAt !== loadedAt) {
    setLoadedAt(data.updatedAt ?? 'loaded');
    form.reset(data);
  }

  useUnsavedChanges(form.dirty);

  const save = useCallback(async () => {
    serverFieldRef.current = null;
    // Computed before the submit rather than read after it: `form.errors` in
    // this closure is a render behind the validation the submit runs.
    const firstProblem = Object.keys(settingsErrors(form.values))[0] ?? null;

    const saved = await form.submit();
    if (saved === false) {
      const owner = tabOfSettingsField(firstProblem ?? serverFieldRef.current ?? '');
      if (owner) setTab(owner);
      return;
    }

    const record = saved?.data ?? saved;
    siteSettings.updateLocal(record);
    siteSettings.refresh();
    emit(EVENTS.settingsChanged, record);
    toast.success(TOASTS.saved('Site settings'));
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
    () => SETTINGS_TABS.map((entry) => ({ ...entry, errorCount: errorsByTab[entry.key] ?? 0 })),
    [errorsByTab]
  );

  if (loading && !data) {
    return (
      <div className={styles.page}>
        <PageHeader title="Site settings" icon="mdi:cog-outline" />
        <div role="status" aria-label="Loading the site settings">
          <Skeleton variant="rounded" height={48} sx={{ marginBottom: 'var(--space-4)' }} />
          <Skeleton variant="rounded" height={420} />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className={styles.page}>
        <PageHeader title="Site settings" icon="mdi:cog-outline" />
        <ErrorState
          title="The site settings could not be loaded."
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
        title="Site settings"
        icon="mdi:cog-outline"
        subtitle="Everything the public site says about the firm: the brand, the contact details, the hero, the footer and the services it talks to."
        actions={
          <div className={styles.headerActions}>
            {can('users', 'view') ? (
              <Button
                variant="ghost"
                size="sm"
                to={PATHS.adminUsers}
                icon={<Icon icon="mdi:account-group-outline" width="18" height="18" />}
              >
                Users
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              to={PATHS.adminProfile}
              icon={<Icon icon="mdi:account-circle-outline" width="18" height="18" />}
            >
              My profile
            </Button>
            {canEdit ? (
              <Button onClick={save} loading={form.submitting} disabled={!form.dirty}>
                Save settings
              </Button>
            ) : null}
          </div>
        }
      />

      {canEdit ? null : (
        <Alert
          tone="info"
          title="Read-only: only administrators can change settings"
          icon={<Icon icon="mdi:lock-outline" width="20" height="20" />}
        >
          You can read every value here. Ask an administrator to change one.
        </Alert>
      )}

      <AdminTabs label="Site settings sections" tabs={tabs} value={tab} onChange={setTab} />

      <AdminTabPanel tabKey="general" value={tab}>
        <GeneralTab form={form} disabled={disabled} />
      </AdminTabPanel>
      <AdminTabPanel tabKey="contact" value={tab}>
        <ContactTab form={form} disabled={disabled} />
      </AdminTabPanel>
      <AdminTabPanel tabKey="hero" value={tab}>
        <HeroTab form={form} disabled={disabled} />
      </AdminTabPanel>
      <AdminTabPanel tabKey="navigation" value={tab}>
        <NavigationFooterTab form={form} disabled={disabled} />
      </AdminTabPanel>
      <AdminTabPanel tabKey="newsletter" value={tab}>
        <NewsletterTab form={form} disabled={disabled} />
      </AdminTabPanel>
      <AdminTabPanel tabKey="integrations" value={tab}>
        <IntegrationsTab form={form} disabled={disabled} />
      </AdminTabPanel>
      <AdminTabPanel tabKey="leads" value={tab}>
        <LeadNotificationsTab form={form} disabled={disabled} />
      </AdminTabPanel>

      {canEdit && form.dirty ? (
        <div className={styles.saveBar}>
          <span className={styles.saveText}>You have unsaved changes.</span>
          <Button variant="outline" onClick={() => form.reset()} disabled={form.submitting}>
            Discard changes
          </Button>
          <Button onClick={save} loading={form.submitting}>
            Save settings
          </Button>
        </div>
      ) : null}
    </div>
  );
}
